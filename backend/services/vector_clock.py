"""Deterministic vector-clock experiments for learning causal ordering.

This module simulates logical events in one ordered experiment. It does not
send network traffic or claim to observe real process execution.
"""
from __future__ import annotations

from typing import Any


def compare_vectors(vector_a: list[int], vector_b: list[int]) -> dict[str, Any]:
    """Compare two vector timestamps using the component-wise partial order."""
    if not isinstance(vector_a, list) or not isinstance(vector_b, list):
        raise ValueError("Both vector timestamps must be lists.")
    if not vector_a or len(vector_a) != len(vector_b):
        raise ValueError("Vector timestamps must have the same non-zero length.")
    for vector in (vector_a, vector_b):
        if any(type(value) is not int or value < 0 for value in vector):
            raise ValueError("Vector components must be non-negative integers.")

    a_le_b = all(a <= b for a, b in zip(vector_a, vector_b))
    b_le_a = all(b <= a for a, b in zip(vector_a, vector_b))
    if a_le_b and vector_a != vector_b:
        relation = "A_HAPPENED_BEFORE_B"
        explanation = "Every component of A is <= B, and at least one component is smaller."
    elif b_le_a and vector_a != vector_b:
        relation = "B_HAPPENED_BEFORE_A"
        explanation = "Every component of B is <= A, and at least one component is smaller."
    elif vector_a == vector_b:
        relation = "EQUAL"
        explanation = "The vectors are equal; a vector timestamp alone does not establish a strict order."
    else:
        relation = "CONCURRENT"
        explanation = "Neither vector is component-wise <= the other, so the events are concurrent."
    return {"relation": relation, "vector_a": vector_a, "vector_b": vector_b, "a_le_b": a_le_b, "b_le_a": b_le_a, "explanation": explanation}


def run_vector_experiment(process_ids: list[str], events: list[dict[str, Any]]) -> dict[str, Any]:
    """Run LOCAL, SEND and RECEIVE events and return a full algorithm trace."""
    if not isinstance(process_ids, list) or len(process_ids) < 2:
        raise ValueError("Provide at least two process IDs.")
    normalized = [str(process_id).strip() for process_id in process_ids]
    if any(not process_id for process_id in normalized) or len(set(normalized)) != len(normalized):
        raise ValueError("Process IDs must be unique and non-empty.")
    if not isinstance(events, list) or not events:
        raise ValueError("Provide at least one event.")

    process_index = {process_id: index for index, process_id in enumerate(normalized)}
    clocks = {process_id: [0] * len(normalized) for process_id in normalized}
    sent_messages: dict[str, dict[str, Any]] = {}
    received_messages: set[str] = set()
    trace: list[dict[str, Any]] = []

    for step, event in enumerate(events, start=1):
        if not isinstance(event, dict):
            raise ValueError(f"Event {step} must be an object.")
        process_id = str(event.get("process_id", "")).strip()
        action = str(event.get("action", "LOCAL")).upper()
        message_id = str(event.get("message_id", "")).strip() or None
        if process_id not in process_index:
            raise ValueError(f"Event {step} references unknown process '{process_id}'.")
        before = clocks[process_id].copy()
        received_timestamp = None

        if action == "LOCAL":
            clocks[process_id][process_index[process_id]] += 1
            rule = f"Increment component for {process_id}."
        elif action == "SEND":
            if not message_id:
                raise ValueError(f"Send event {step} requires message_id.")
            if message_id in sent_messages:
                raise ValueError(f"Message ID '{message_id}' has already been sent.")
            clocks[process_id][process_index[process_id]] += 1
            sent_timestamp = clocks[process_id].copy()
            sent_messages[message_id] = {"sender": process_id, "timestamp": sent_timestamp}
            rule = f"Increment {process_id}, then attach a copy of its vector to the message."
        elif action == "RECEIVE":
            if not message_id or message_id not in sent_messages:
                raise ValueError(f"Receive event {step} references a message not previously sent.")
            if message_id in received_messages:
                raise ValueError(f"Message '{message_id}' has already been received.")
            message = sent_messages[message_id]
            if message["sender"] == process_id:
                raise ValueError("A process cannot receive its own message in this experiment.")
            received_timestamp = message["timestamp"].copy()
            merged = [max(local, incoming) for local, incoming in zip(clocks[process_id], received_timestamp)]
            clocks[process_id] = merged
            clocks[process_id][process_index[process_id]] += 1
            received_messages.add(message_id)
            rule = "Merge component-wise maximum of local and message vectors, then increment the receiver's component."
        else:
            raise ValueError(f"Unsupported action at event {step}: {action}")

        trace.append({
            "step": step,
            "process_id": process_id,
            "action": action,
            "message_id": message_id,
            "clock_before": before,
            "message_timestamp": received_timestamp if action == "RECEIVE" else (sent_messages[message_id]["timestamp"].copy() if action == "SEND" else None),
            "clock_after": clocks[process_id].copy(),
            "rule": rule,
        })

    return {
        "algorithm": "Vector Clocks",
        "status": "COMPLETED",
        "process_ids": normalized,
        "initial_clocks": {process_id: [0] * len(normalized) for process_id in normalized},
        "final_clocks": {process_id: vector.copy() for process_id, vector in clocks.items()},
        "trace": trace,
        "messages": {message_id: {"sender": message["sender"], "timestamp": message["timestamp"], "received": message_id in received_messages} for message_id, message in sent_messages.items()},
        "semantics": "DETERMINISTIC_SIMULATION",
    }
