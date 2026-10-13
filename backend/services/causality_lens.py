"""
CAUSALITY LENS SERVICE (USP #2 - CHAPTER 3 SYNCHRONIZATION)

Provides deep causal inspection of distributed events across satellite constellation:
1. Three Perspectives: Physical Time, Lamport Logical Time, and Vector Clocks.
2. Pairwise Causal Analysis:
   - Evaluates whether e_1 happened-before e_2 (e_1 -> e_2),
     e_2 happened-before e_1 (e_2 -> e_1),
     or whether they are causally concurrent (e_1 || e_2).
3. The Core Educational Distinction:
   - Lamport: a -> b implies L(a) < L(b). But L(a) < L(b) DOES NOT imply a -> b!
   - Vector: a -> b iff V(a) < V(b).
   - If neither V(a) < V(b) nor V(b) < V(a), then a || b (Concurrent).
"""

import time
import logging
from typing import Dict, Any, List, Optional

from backend.services.distributed_clocks import global_clock_manager, VectorClock

logger = logging.getLogger("CausalityLens")

ALL_SATELLITES = ["SAT-01", "SAT-02", "SAT-03", "SAT-04", "SAT-05"]

class CausalityLensService:
    def __init__(self, max_events: int = 100):
        self.max_events = max_events
        self.events_log: List[Dict[str, Any]] = []
        self._seed_initial_scenario()

    def _seed_initial_scenario(self):
        """
        Seeds an illustrative baseline distributed execution trace showcasing:
        1. Local events
        2. Message send & receive (causal chain)
        3. Concurrent independent operations across nodes
        """
        base_time = time.time() - 30.0

        # Event 1: SAT-01 orbital observation (local)
        ev1 = {
            "event_id": "EVT-CAUSAL-001",
            "node_id": "SAT-01",
            "event_type": "TELEMETRY_OBSERVED",
            "description": "SAT-01 recorded thermal flux reading",
            "physical_timestamp": base_time + 1.0,
            "lamport_timestamp": 1,
            "vector_clock": {"SAT-01": 1, "SAT-02": 0, "SAT-03": 0, "SAT-04": 0, "SAT-05": 0}
        }
        # Event 2: SAT-02 battery cycle (independent / concurrent with EVT-1)
        ev2 = {
            "event_id": "EVT-CAUSAL-002",
            "node_id": "SAT-02",
            "event_type": "BATTERY_DRAIN_SAMPLE",
            "description": "SAT-02 sampled solar panel discharge",
            "physical_timestamp": base_time + 1.8,
            "lamport_timestamp": 1,
            "vector_clock": {"SAT-01": 0, "SAT-02": 1, "SAT-03": 0, "SAT-04": 0, "SAT-05": 0}
        }
        # Event 3: SAT-01 sends beacon to SAT-03
        ev3 = {
            "event_id": "EVT-CAUSAL-003",
            "node_id": "SAT-01",
            "event_type": "BEACON_SENT",
            "description": "SAT-01 dispatched ISL beacon to SAT-03",
            "physical_timestamp": base_time + 3.2,
            "lamport_timestamp": 2,
            "vector_clock": {"SAT-01": 2, "SAT-02": 0, "SAT-03": 0, "SAT-04": 0, "SAT-05": 0}
        }
        # Event 4: SAT-03 receives beacon from SAT-01 (Causal dependency on EVT-3)
        ev4 = {
            "event_id": "EVT-CAUSAL-004",
            "node_id": "SAT-03",
            "event_type": "BEACON_RECEIVED",
            "description": "SAT-03 processed beacon and merged vector clock from SAT-01",
            "physical_timestamp": base_time + 3.7,
            "lamport_timestamp": 3,
            "vector_clock": {"SAT-01": 2, "SAT-02": 0, "SAT-03": 1, "SAT-04": 0, "SAT-05": 0}
        }
        # Event 5: SAT-04 task allocation (independent concurrent event)
        ev5 = {
            "event_id": "EVT-CAUSAL-005",
            "node_id": "SAT-04",
            "event_type": "TASK_INITIATED",
            "description": "SAT-04 coordinator assigned autonomous star-tracker calibration",
            "physical_timestamp": base_time + 4.5,
            "lamport_timestamp": 1,
            "vector_clock": {"SAT-01": 0, "SAT-02": 0, "SAT-03": 0, "SAT-04": 1, "SAT-05": 0}
        }
        # Event 6: SAT-03 forwards telemetry summary to SAT-05
        ev6 = {
            "event_id": "EVT-CAUSAL-006",
            "node_id": "SAT-05",
            "event_type": "RELAY_TELEMETRY_COMMITTED",
            "description": "SAT-05 acknowledged orbital relay commit from SAT-03",
            "physical_timestamp": base_time + 6.0,
            "lamport_timestamp": 4,
            "vector_clock": {"SAT-01": 2, "SAT-02": 0, "SAT-03": 1, "SAT-04": 0, "SAT-05": 1}
        }

        self.events_log = [ev1, ev2, ev3, ev4, ev5, ev6]

    def record_event(self, node_id: str, event_type: str, description: str, vector_clock: Optional[Dict[str, int]] = None, lamport_timestamp: Optional[int] = None) -> Dict[str, Any]:
        clk = global_clock_manager.record_node_event(node_id, event_type)
        
        evt = {
            "event_id": f"EVT-CAUSAL-{int(time.time() * 1000) % 1000000:06d}",
            "node_id": node_id,
            "event_type": event_type,
            "description": description,
            "physical_timestamp": clk["physical_timestamp"],
            "lamport_timestamp": lamport_timestamp or clk["lamport_timestamp"],
            "vector_clock": vector_clock or clk["vector_clock"]
        }
        self.events_log.append(evt)
        if len(self.events_log) > self.max_events:
            self.events_log.pop(0)
        return evt

    def list_events(self) -> List[Dict[str, Any]]:
        return self.events_log

    def compare_events(self, event_id_a: str, event_id_b: str) -> Dict[str, Any]:
        """
        Interactive Pairwise Inspector:
        Evaluates the causal relationship between any two distributed events.
        """
        evt_a = next((e for e in self.events_log if e["event_id"] == event_id_a), None)
        evt_b = next((e for e in self.events_log if e["event_id"] == event_id_b), None)

        if not evt_a or not evt_b:
            return {"error": "One or both event IDs not found in causality log"}

        v_a = evt_a["vector_clock"]
        v_b = evt_b["vector_clock"]
        l_a = evt_a["lamport_timestamp"]
        l_b = evt_b["lamport_timestamp"]
        p_a = evt_a["physical_timestamp"]
        p_b = evt_b["physical_timestamp"]

        # Vector comparison
        cmp_result = VectorClock.compare(v_a, v_b)

        if cmp_result == "DOMINATED":
            # v_a < v_b => a happened-before b
            relationship = "HAPPENED_BEFORE"
            symbolic = f"{event_id_a} \u2192 {event_id_b} (Event A causally precedes Event B)"
            explanation = (
                f"Vector clock V({evt_a['node_id']}) is strictly less than V({evt_b['node_id']}). "
                f"Information from {event_id_a} causally propagated to {event_id_b}."
            )
            is_concurrent = False
        elif cmp_result == "DOMINATES":
            # v_a > v_b => b happened-before a
            relationship = "HAPPENED_AFTER"
            symbolic = f"{event_id_b} \u2192 {event_id_a} (Event B causally precedes Event A)"
            explanation = (
                f"Vector clock V({evt_b['node_id']}) is strictly less than V({evt_a['node_id']}). "
                f"Information from {event_id_b} causally propagated to {event_id_a}."
            )
            is_concurrent = False
        elif cmp_result == "EQUAL":
            relationship = "IDENTICAL_VECTOR"
            symbolic = f"{event_id_a} \u2261 {event_id_b}"
            explanation = "Both events share identical vector clock values."
            is_concurrent = False
        else:
            # CONCURRENT
            relationship = "CONCURRENT"
            symbolic = f"{event_id_a} \u2225 {event_id_b} (Events are Concurrent)"
            explanation = (
                f"Neither vector clock dominates the other. Neither satellite had observed the other's action "
                f"when executing this operation. They occurred in causally independent light-cones."
            )
            is_concurrent = True

        # Educational insight check: Did Lamport clock imply concurrency?
        lamport_blind_spot = False
        if is_concurrent and l_a != l_b:
            lamport_blind_spot = True
            lamport_note = (
                f"Lamport Logical Order: L(A)={l_a} vs L(B)={l_b} suggests an arbitrary scalar ordering, "
                f"yet Vector Clocks correctly identify that these events are actually CONCURRENT ({event_id_a} \u2225 {event_id_b})!"
            )
        else:
            lamport_note = f"Lamport timestamps: L(A)={l_a}, L(B)={l_b}. Vector clocks confirm causality."

        return {
            "event_a": evt_a,
            "event_b": evt_b,
            "relationship": relationship,
            "symbolic_formula": symbolic,
            "is_concurrent": is_concurrent,
            "explanation": explanation,
            "lamport_blind_spot": lamport_blind_spot,
            "lamport_analysis": lamport_note,
            "physical_delta_seconds": round(abs(p_b - p_a), 3),
            "physical_order": "A preceded B physically" if p_a < p_b else "B preceded A physically",
            "proof_verdict": {
                "vector_a": v_a,
                "vector_b": v_b,
                "lamport_a": l_a,
                "lamport_b": l_b,
                "syllabus_axiom": "a \u2192 b \u27FA V(a) < V(b) and a \u2225 b \u27FA \u00AC(V(a) < V(b)) \u2227 \u00AC(V(b) < V(a))"
            }
        }

global_causality_lens = CausalityLensService()
