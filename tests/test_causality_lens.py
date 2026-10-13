import pytest
from backend.services.causality_lens import global_causality_lens
from backend.services.distributed_clocks import VectorClock

def test_causality_lens_pairwise_comparison():
    # Test event 3 -> event 4 (Beacon sent by SAT-01 -> received by SAT-03)
    res_causal = global_causality_lens.compare_events("EVT-CAUSAL-003", "EVT-CAUSAL-004")
    assert res_causal["relationship"] == "HAPPENED_BEFORE"
    assert res_causal["is_concurrent"] is False
    assert "EVT-CAUSAL-003 \u2192 EVT-CAUSAL-004" in res_causal["symbolic_formula"]

    # Test reverse: event 4 was after event 3
    res_after = global_causality_lens.compare_events("EVT-CAUSAL-004", "EVT-CAUSAL-003")
    assert res_after["relationship"] == "HAPPENED_AFTER"
    assert res_after["is_concurrent"] is False

    # Test concurrent events: EVT-001 (SAT-01 local read) and EVT-002 (SAT-02 battery sample)
    res_conc = global_causality_lens.compare_events("EVT-CAUSAL-001", "EVT-CAUSAL-002")
    assert res_conc["relationship"] == "CONCURRENT"
    assert res_conc["is_concurrent"] is True
    assert "\u2225" in res_conc["symbolic_formula"]

    # Test concurrent events: EVT-002 and EVT-005
    res_conc2 = global_causality_lens.compare_events("EVT-CAUSAL-002", "EVT-CAUSAL-005")
    assert res_conc2["is_concurrent"] is True

def test_vector_clock_algebra():
    v1 = {"SAT-01": 2, "SAT-02": 0, "SAT-03": 0, "SAT-04": 0, "SAT-05": 0}
    v2 = {"SAT-01": 2, "SAT-02": 0, "SAT-03": 1, "SAT-04": 0, "SAT-05": 0}
    v3 = {"SAT-01": 1, "SAT-02": 2, "SAT-03": 0, "SAT-04": 0, "SAT-05": 0}

    assert VectorClock.compare(v1, v2) == "DOMINATED"  # v1 < v2
    assert VectorClock.compare(v2, v1) == "DOMINATES"  # v2 > v1
    assert VectorClock.compare(v1, v1) == "EQUAL"      # v1 == v1
    assert VectorClock.compare(v2, v3) == "CONCURRENT" # v2 || v3
