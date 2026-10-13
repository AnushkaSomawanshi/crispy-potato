import pytest
from backend.services.distributed_clocks import global_clock_manager

def test_berkeley_clock_synchronization():
    # Inject diverse offsets
    global_clock_manager.physical_clocks["SAT-01"].offset_ms = -150.0
    global_clock_manager.physical_clocks["SAT-02"].offset_ms = 220.0
    global_clock_manager.physical_clocks["SAT-03"].offset_ms = -50.0
    global_clock_manager.physical_clocks["SAT-04"].offset_ms = 0.0
    global_clock_manager.physical_clocks["SAT-05"].offset_ms = 85.0

    res = global_clock_manager.run_berkeley_synchronization(coordinator_id="SAT-04", outlier_threshold_ms=800.0)
    assert res["status"] == "CONVERGED"
    assert res["algorithm"] == "Berkeley Distributed Clock Synchronization"
    assert "pre_sync_skew_ms" in res
    assert "post_sync_residual_skew_ms" in res
    assert res["post_sync_residual_skew_ms"] <= res["pre_sync_skew_ms"]
    assert len(res["correction_proposals"]) == 5
