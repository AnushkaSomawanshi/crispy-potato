import pytest
from backend.services.clock_lab import run_physical_experiment, run_lamport_experiment


def test_berkeley_aligns_simulated_offsets():
    result = run_physical_experiment([{"node_id":"SAT-01","offset_ms":-100},{"node_id":"SAT-02","offset_ms":0},{"node_id":"SAT-03","offset_ms":200}], "BERKELEY", "SAT-01")
    assert result["after_offsets_ms"] == {"SAT-01": 33.333, "SAT-02": 33.333, "SAT-03": 33.333}
    assert result["post_sync_skew_ms"] == 0
    assert [step["step"] for step in result["steps"]] == [1, 2, 3, 4]


def test_baseline_does_not_change_offsets():
    result = run_physical_experiment([{"node_id":"A","offset_ms":-20},{"node_id":"B","offset_ms":80}], "BASELINE", "A")
    assert result["after_offsets_ms"] == {"A": -20, "B": 80}
    assert result["post_sync_skew_ms"] == 100


def test_duplicate_clock_nodes_are_rejected():
    with pytest.raises(ValueError):
        run_physical_experiment([{"node_id":"A"},{"node_id":"A"}])


def test_lamport_receive_exceeds_send_timestamp():
    result = run_lamport_experiment([{"node_id":"SAT-01","action":"SEND","message_id":"M1"},{"node_id":"SAT-02","action":"RECEIVE","message_id":"M1"}])
    assert result["trace"][0]["clock_after"] == 1
    assert result["trace"][1]["clock_after"] == 2


def test_lamport_rejects_unknown_message():
    with pytest.raises(ValueError):
        run_lamport_experiment([{"node_id":"SAT-02","action":"RECEIVE","message_id":"MISSING"}])
