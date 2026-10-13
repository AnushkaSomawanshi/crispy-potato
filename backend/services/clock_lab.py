"""Deterministic educational clock experiments; all physical offsets are simulated."""
from typing import Any, Dict, List
import time


def run_physical_experiment(clocks: List[Dict[str, Any]], algorithm: str = "BERKELEY", coordinator_id: str | None = None) -> Dict[str, Any]:
    if not isinstance(clocks, list) or len(clocks) < 2:
        raise ValueError("At least two participating clocks are required.")
    before = {}
    for item in clocks:
        node = str(item.get("node_id", "")).strip()
        if not node or node in before:
            raise ValueError("Clock node IDs must be unique and non-empty.")
        offset = float(item.get("offset_ms", 0))
        if abs(offset) > 86400000:
            raise ValueError("Clock offset is outside the allowed range.")
        before[node] = offset
    if algorithm not in {"BERKELEY", "BASELINE"}:
        raise ValueError("algorithm must be BERKELEY or BASELINE")
    coordinator_id = coordinator_id or next(iter(before))
    if coordinator_id not in before:
        raise ValueError("Coordinator must be a participating node.")
    pre_skew = max(before.values()) - min(before.values())
    average = sum(before.values()) / len(before)
    if algorithm == "BERKELEY":
        adjustments = {node: round(average - offset, 3) for node, offset in before.items()}
        after = {node: round(before[node] + adjustments[node], 3) for node in before}
        status = "COMPLETED"
        steps = [
            {"step": 1, "title": "Collect clock readings", "detail": "Coordinator samples each participant's simulated clock offsets.", "readings": before},
            {"step": 2, "title": "Calculate average", "detail": "Average the participating offsets; this is a shared internal time, not guaranteed UTC.", "average_offset_ms": round(average, 3), "calculation": "sum(offsets) / participant_count"},
            {"step": 3, "title": "Send adjustment proposals", "detail": "Adjustment = average offset - current offset.", "adjustments": [{"node_id": n, "before_offset_ms": before[n], "adjustment_ms": adjustments[n], "after_offset_ms": after[n]} for n in before]}
        ]
    else:
        adjustments = {node: 0.0 for node in before}
        after = dict(before)
        status = "BASELINE_ONLY"
        steps = [{"step": 1, "title": "Collect clock readings", "detail": "Read simulated offsets without changing them.", "readings": before}, {"step": 2, "title": "No corrections applied", "detail": "Baseline keeps the original clock offsets.", "average_offset_ms": round(average, 3)}]
    post_skew = max(after.values()) - min(after.values())
    steps.append({"step": len(steps) + 1, "title": "Verify residual skew", "detail": "Maximum skew = largest offset - smallest offset.", "pre_sync_skew_ms": round(pre_skew, 3), "post_sync_skew_ms": round(post_skew, 3)})
    return {"experiment_id": f"CLK-{int(time.time()*1000)}", "algorithm": algorithm, "status": status, "coordinator_id": coordinator_id, "participants": list(before), "before_offsets_ms": before, "adjustments_ms": adjustments, "after_offsets_ms": after, "average_offset_ms": round(average, 3), "pre_sync_skew_ms": round(pre_skew, 3), "post_sync_skew_ms": round(post_skew, 3), "steps": steps, "clock_model": "SIMULATED_OFFSETS", "timestamp": time.time()}


def run_lamport_experiment(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(events, list) or not events:
        raise ValueError("Provide at least one event.")
    clocks: Dict[str, int] = {}
    sent: Dict[str, int] = {}
    trace = []
    for index, event in enumerate(events, 1):
        node = str(event.get("node_id", "")).strip()
        action = str(event.get("action", "LOCAL")).upper()
        if not node:
            raise ValueError(f"Event {index} requires node_id.")
        before = clocks.get(node, 0)
        message_id = event.get("message_id")
        received = None
        if action in {"LOCAL", "SEND"}:
            clocks[node] = before + 1
            if action == "SEND":
                if not message_id:
                    raise ValueError(f"Send event {index} requires message_id.")
                sent[str(message_id)] = clocks[node]
        elif action == "RECEIVE":
            if not message_id or str(message_id) not in sent:
                raise ValueError(f"Receive event {index} references a message not previously sent.")
            received = sent[str(message_id)]
            clocks[node] = max(before, received) + 1
        else:
            raise ValueError(f"Unsupported action at event {index}: {action}")
        trace.append({"step": index, "node_id": node, "action": action, "message_id": message_id, "clock_before": before, "received_timestamp": received, "clock_after": clocks[node], "rule": f"max({before}, {received}) + 1" if action == "RECEIVE" else "increment local logical clock by 1"})
    return {"experiment_id": f"LAMPORT-{int(time.time()*1000)}", "algorithm": "Lamport Logical Clock", "status": "COMPLETED", "final_clocks": clocks, "trace": trace, "timestamp": time.time()}
