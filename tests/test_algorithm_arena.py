import pytest
from backend.services.election_manager import global_election_manager
from backend.services.mutex_manager import compare_mutex_algorithms, global_centralized_mutex, global_mutex_engine
from backend.registry.service_registry import global_registry

@pytest.mark.asyncio
async def test_election_arena_comparison():
    # Register 5 satellites
    for sat in ["SAT-01", "SAT-02", "SAT-03", "SAT-04", "SAT-05"]:
        global_registry.register(sat, f"N-{sat}", f"{sat.lower()}.local", "127.0.0.1", 5000, 6000, ["TEST"])

    res = await global_election_manager.compare_election_algorithms("SAT-01")
    assert "ring_election" in res
    assert "bully_election" in res
    assert res["ring_election"]["leader_elected"] == "SAT-05"
    assert res["bully_election"]["leader_elected"] == "SAT-05"
    assert res["comparison_verdict"]["both_agreed_on_leader"] is True
    assert res["ring_election"]["messages_exchanged"] > 0
    assert res["bully_election"]["messages_exchanged"] > 0

@pytest.mark.asyncio
async def test_mutex_arena_comparison():
    for sat in ["SAT-01", "SAT-02", "SAT-03", "SAT-04", "SAT-05"]:
        global_registry.register(sat, f"N-{sat}", f"{sat.lower()}.local", "127.0.0.1", 5000, 6000, ["TEST"])
    global_registry.current_leader = "SAT-04"

    res = await compare_mutex_algorithms("SAT-01", "COMM_TRANSMITTER")
    assert "ricart_agrawala" in res
    assert "centralized" in res
    assert res["centralized"]["messages_exchanged"] <= 4
    assert res["ricart_agrawala"]["messages_exchanged"] >= 4
    assert res["centralized"]["single_point_of_failure"] is True
    assert res["ricart_agrawala"]["single_point_of_failure"] is False
