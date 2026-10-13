import time
import pytest
import asyncio
from unittest.mock import patch, AsyncMock

from backend.registry.service_registry import global_registry
from backend.services.election_manager import global_election_manager
from backend.services.task_manager import global_task_manager
from backend.services.reallocation_engine import global_reallocation_engine
from backend.main import handle_automatic_coordinator_failover, reassign_orphaned_tasks


@pytest.fixture(autouse=True)
def setup_satellites():
    """Reset satellite registry to nominal state before each test."""
    for i in range(1, 6):
        sat_id = f"SAT-0{i}"
        reg = global_registry.register(
            satellite_id=sat_id,
            node_id=f"NODE-{sat_id}",
            hostname=f"{sat_id.lower()}.local",
            address="127.0.0.1",
            grpc_port=5000 + i,
            p2p_port=6000 + i,
        )
        reg.status = "HEALTHY"
        reg.last_heartbeat = time.time()
    global_registry.current_leader = "SAT-05"


@pytest.mark.asyncio
async def test_disconnected_node_excluded_from_election():
    """Verify disconnected/offline nodes are bypassed and not elected leader."""
    # Mark SAT-05 as DISCONNECTED
    global_registry.set_status("SAT-05", "DISCONNECTED")

    result = await global_election_manager.execute_ring_election(initiator_id="SAT-01")

    assert result["status"] == "SUCCESS"
    assert "SAT-05" in result["bypassed_nodes"]
    assert "SAT-05" in result["failed_nodes"]
    assert "SAT-05" not in result["participating_nodes"]
    assert result["current_leader"] == "SAT-04"
    assert result["new_leader"] == "SAT-04"
    assert global_registry.current_leader == "SAT-04"
    assert global_election_manager.current_leader == "SAT-04"


def test_heartbeat_ttl_exceeded_node_ineligible():
    """Verify a node past TTL is deemed ineligible even before sweeper runs."""
    reg = global_registry.lookup("SAT-04")
    reg.last_heartbeat = time.time() - 20.0  # Expired past 10s TTL

    assert global_election_manager.is_node_eligible("SAT-04") is False

    # Synchronous ring election check
    result = global_registry.run_ring_election(initiator_id="SAT-01")
    assert "SAT-04" in result["bypassed_nodes"]
    assert "SAT-04" not in result["participating_nodes"]


@pytest.mark.asyncio
async def test_no_eligible_nodes_remain_does_not_invent_leader():
    """Verify that when all nodes are unavailable, no leader is invented."""
    for i in range(1, 6):
        global_registry.set_status(f"SAT-0{i}", "DISCONNECTED")

    result = await global_election_manager.execute_ring_election(initiator_id="SAT-01")

    assert result["status"] == "NO_ELIGIBLE_LEADER"
    assert result["current_leader"] is None
    assert result["new_leader"] is None
    assert global_registry.current_leader is None
    assert global_election_manager.current_leader is None
    assert len(result["participating_nodes"]) == 0
    assert len(result["bypassed_nodes"]) == 5


def test_authoritative_sync_and_async_consistency():
    """Verify that SatelliteRegistry.run_ring_election delegates to ElectionManager."""
    sync_result = global_registry.run_ring_election(initiator_id="SAT-01")

    assert sync_result["status"] == "SUCCESS"
    assert sync_result["current_leader"] == "SAT-05"
    assert global_registry.current_leader == "SAT-05"
    assert global_election_manager.current_leader == "SAT-05"


@pytest.mark.asyncio
async def test_monotonic_election_term_increments():
    """Verify that the election term counter increments monotonically on every round."""
    initial_term = global_election_manager.current_term

    res1 = await global_election_manager.execute_ring_election("SAT-01")
    assert res1["term"] == initial_term + 1
    assert global_election_manager.current_term == initial_term + 1

    res2 = await global_election_manager.execute_ring_election("SAT-02")
    assert res2["term"] == initial_term + 2
    assert global_election_manager.current_term == initial_term + 2


@pytest.mark.asyncio
async def test_automatic_coordinator_failover_and_task_reassignment():
    """Verify heartbeat failover elects a new leader and reassigns orphaned tasks."""
    global_registry.current_leader = "SAT-05"
    global_registry.set_status("SAT-05", "DISCONNECTED")

    # Give SAT-05 an assigned task
    task = global_task_manager.get_task("T-050")
    if task:
        global_task_manager.reassign_task("T-050", "SAT-05", reason="TEST_SEED")

    with patch("backend.main.websocket_manager.broadcast", new_callable=AsyncMock) as mock_ws:
        await handle_automatic_coordinator_failover("SAT-05")

        # SAT-04 should be the elected leader
        assert global_registry.current_leader == "SAT-04"
        assert global_election_manager.current_leader == "SAT-04"

        # T-050 should have been reassigned to an active satellite
        updated_task = global_task_manager.get_task("T-050")
        if updated_task:
            assert updated_task["current_owner"] != "SAT-05"
            assert updated_task["current_owner"] in ["SAT-01", "SAT-02", "SAT-03", "SAT-04"]

        # Verify WebSocket events were broadcast
        assert mock_ws.call_count >= 2


@pytest.mark.asyncio
async def test_idempotent_repeated_failover_calls():
    """Verify repeated failure calls for an already transitioned leader are idempotent."""
    global_registry.current_leader = "SAT-05"
    global_registry.set_status("SAT-05", "DISCONNECTED")

    with patch("backend.main.websocket_manager.broadcast", new_callable=AsyncMock):
        # First failover
        await handle_automatic_coordinator_failover("SAT-05")
        term_after_first = global_election_manager.current_term
        leader_after_first = global_registry.current_leader
        assert leader_after_first == "SAT-04"

        # Second call with the same old coordinator ID should be safely ignored
        await handle_automatic_coordinator_failover("SAT-05")
        assert global_registry.current_leader == leader_after_first
        # Term must not have incremented a second time
        assert global_election_manager.current_term == term_after_first
