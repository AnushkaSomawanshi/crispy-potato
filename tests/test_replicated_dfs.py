import pytest
import hashlib
from backend.services.distributed_storage import global_distributed_storage

def test_replicated_dfs_store_and_retrieve():
    content = "MISSION_DATA: Star-tracker spectral imaging frames SAT-01 -> Mission Control. Payload status nominal."
    expected_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

    # Store file
    res = global_distributed_storage.store_file(
        file_id="TEST-FILE-001",
        filename="star_tracker_sample.dat",
        content_str=content,
        category="SCIENCE_PAYLOAD",
        chunk_size_bytes=32
    )
    assert res["status"] == "COMMITTED_REPLICATED"
    assert res["sha256_checksum"] == expected_hash
    assert len(res["chunks"]) > 1

    # Retrieve file
    retrieved = global_distributed_storage.retrieve_file("TEST-FILE-001")
    assert retrieved["status"] == "RETRIEVED_OK"
    assert retrieved["integrity_verified"] is True
    assert retrieved["content"] == content
    assert retrieved["actual_sha256"] == expected_hash

def test_replicated_dfs_fault_tolerance():
    content = "CRITICAL_TELEMETRY: Attitude control thruster firing log."
    global_distributed_storage.store_file(
        file_id="TEST-FILE-002",
        filename="thruster_log.dat",
        content_str=content,
        category="TELEMETRY_LOG",
        chunk_size_bytes=24
    )

    # Simulate SAT-01 and SAT-02 offline
    global_distributed_storage.simulate_node_outage("SAT-01", is_offline=True)
    global_distributed_storage.simulate_node_outage("SAT-02", is_offline=True)

    # Even with 2 nodes offline, because R=3, surviving replicas should fulfill read!
    retrieved = global_distributed_storage.retrieve_file("TEST-FILE-002")
    assert retrieved["status"] == "RETRIEVED_OK"
    assert retrieved["integrity_verified"] is True
    assert retrieved["content"] == content

    # Clean up outage simulation
    global_distributed_storage.simulate_node_outage("SAT-01", is_offline=False)
    global_distributed_storage.simulate_node_outage("SAT-02", is_offline=False)
