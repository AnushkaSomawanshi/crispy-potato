import pytest

from backend.services.vector_clock import compare_vectors, run_vector_experiment


def test_independent_local_events_are_concurrent():
    result = run_vector_experiment(
        ["P1", "P2", "P3"],
        [{"process_id": "P1", "action": "LOCAL"}, {"process_id": "P2", "action": "LOCAL"}],
    )
    a = result["trace"][0]["clock_after"]
    b = result["trace"][1]["clock_after"]
    assert a == [1, 0, 0]
    assert b == [0, 1, 0]
    assert compare_vectors(a, b)["relation"] == "CONCURRENT"


def test_receive_merges_message_vector_then_increments_receiver():
    result = run_vector_experiment(
        ["P1", "P2", "P3"],
        [
            {"process_id": "P1", "action": "LOCAL"},
            {"process_id": "P1", "action": "SEND", "message_id": "m1"},
            {"process_id": "P2", "action": "LOCAL"},
            {"process_id": "P2", "action": "RECEIVE", "message_id": "m1"},
        ],
    )
    send = result["trace"][1]
    receive = result["trace"][3]
    assert send["clock_after"] == [2, 0, 0]
    assert receive["message_timestamp"] == [2, 0, 0]
    assert receive["clock_before"] == [0, 1, 0]
    assert receive["clock_after"] == [2, 2, 0]
    assert compare_vectors(send["clock_after"], receive["clock_after"])["relation"] == "A_HAPPENED_BEFORE_B"


def test_transitive_causality_is_preserved():
    result = run_vector_experiment(
        ["P1", "P2", "P3"],
        [
            {"process_id": "P1", "action": "SEND", "message_id": "m1"},
            {"process_id": "P2", "action": "RECEIVE", "message_id": "m1"},
            {"process_id": "P2", "action": "SEND", "message_id": "m2"},
            {"process_id": "P3", "action": "RECEIVE", "message_id": "m2"},
        ],
    )
    assert compare_vectors(result["trace"][0]["clock_after"], result["trace"][3]["clock_after"])["relation"] == "A_HAPPENED_BEFORE_B"


def test_reverse_order_is_reported():
    assert compare_vectors([0, 2], [1, 2])["relation"] == "B_HAPPENED_BEFORE_A"


def test_equal_vectors_are_not_claimed_to_be_strictly_ordered():
    assert compare_vectors([1, 2], [1, 2])["relation"] == "EQUAL"


def test_unknown_process_rejected():
    with pytest.raises(ValueError, match="unknown process"):
        run_vector_experiment(["P1", "P2"], [{"process_id": "P3", "action": "LOCAL"}])


def test_receive_before_send_rejected():
    with pytest.raises(ValueError, match="not previously sent"):
        run_vector_experiment(["P1", "P2"], [{"process_id": "P2", "action": "RECEIVE", "message_id": "missing"}])


def test_duplicate_message_send_rejected():
    with pytest.raises(ValueError, match="already been sent"):
        run_vector_experiment(["P1", "P2"], [
            {"process_id": "P1", "action": "SEND", "message_id": "m1"},
            {"process_id": "P1", "action": "SEND", "message_id": "m1"},
        ])


def test_malformed_vectors_rejected():
    with pytest.raises(ValueError, match="same non-zero length"):
        compare_vectors([1], [1, 2])
    with pytest.raises(ValueError, match="non-negative integers"):
        compare_vectors([1, -1], [1, 0])
