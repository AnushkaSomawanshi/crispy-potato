import pytest
import asyncio
from backend.services.ground_blackout import global_blackout_manager
from backend.registry.service_registry import global_registry
from backend.services.task_manager import global_task_manager

@pytest.mark.asyncio
async def test_ground_blackout_lifecycle():
    # 1. Start blackout
    start_res = await global_blackout_manager.start_blackout("Test orbital shadow blackout")
    assert start_res["status"] == "BLACKOUT_ACTIVE"
    assert global_blackout_manager.is_blackout_active() is True
    assert "PEER_BEACONING" in start_res["permitted_operations"]
    assert "GROUND_TELECOMMAND_DISPATCH" in start_res["blocked_operations"]

    # 2. Buffer telemetry
    for i in range(5):
        buffered = global_blackout_manager.buffer_telemetry("SAT-01", {
            "battery": 95.0 - i,
            "temperature": 24.0,
            "cpu_usage": 20.0,
            "memory_usage": 35.0,
            "signal_strength": 90.0,
            "health_score": 98.0
        })
        assert buffered is True

    buffered = global_blackout_manager.buffer_telemetry("SAT-02", {
        "battery": 88.0,
        "temperature": 26.0,
        "cpu_usage": 25.0,
        "memory_usage": 40.0,
        "signal_strength": 85.0,
        "health_score": 92.0
    })
    assert buffered is True

    counts = global_blackout_manager.get_buffered_counts()
    assert counts["SAT-01"] == 5
    assert counts["SAT-02"] == 1

    # 3. Simulate coordinator failure during blackout
    # Ensure SAT-04 is leader initially
    global_registry.register("SAT-01", "N-01", "s1", "127.0.0.1", 5001, 6001, ["SENSOR"])
    global_registry.register("SAT-02", "N-02", "s2", "127.0.0.1", 5002, 6002, ["RELAY"])
    global_registry.register("SAT-04", "N-04", "s4", "127.0.0.1", 5004, 6004, ["COORDINATOR"])
    global_registry.current_leader = "SAT-04"

    failover_res = await global_blackout_manager.simulate_coordinator_failure()
    assert failover_res["failed_coordinator"] == "SAT-04"
    assert failover_res["new_coordinator"] != "SAT-04"
    assert failover_res["new_coordinator"] in ["SAT-01", "SAT-02", "SAT-03", "SAT-05"]
    assert failover_res["messages_exchanged"] > 0

    # 4. Reconnect ground
    reconnect_res = await global_blackout_manager.reconnect_ground()
    assert reconnect_res["status"] == "RECONCILED"
    assert reconnect_res["total_buffered_records"] == 6
    assert reconnect_res["reconciled_records_count"] == 6
    assert len(reconnect_res["assertions"]) >= 4
    for a in reconnect_res["assertions"]:
        assert a["status"] == "PASSED"
    assert global_blackout_manager.is_blackout_active() is False
