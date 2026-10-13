"""
DISTRIBUTED CLOCKS SERVICE

Provides implementations for:
1. Physical Clock Synchronization (Christian's / Berkeley-style clock sync, drift, offset, residual error).
2. Lamport Logical Clock (L_next = max(L_local, L_recv) + 1).
3. Vector Clock System (Vector indexed by satellite nodes [SAT-01..SAT-05], vector comparisons, causality, concurrency detection A || B).
"""

import time
import math
import random
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger("DistributedClocks")

ALL_SATELLITE_IDS = ["SAT-01", "SAT-02", "SAT-03", "SAT-04", "SAT-05"]

class PhysicalClock:
    def __init__(self, node_id: str, initial_drift_ms: float = 0.0):
        self.node_id = node_id
        self.drift_ms = initial_drift_ms
        self.offset_ms = 0.0
        self.last_sync_time = time.time()
        self.sync_history: List[Dict[str, Any]] = []

    def get_time(self) -> float:
        # Physical local time with simulated drift
        elapsed = time.time() - self.last_sync_time
        simulated_drift_seconds = (self.drift_ms / 1000.0) * (elapsed / 3600.0)
        return time.time() + (self.offset_ms / 1000.0) + simulated_drift_seconds

    def synchronize(self, reference_time: float, round_trip_delay_ms: float) -> Dict[str, Any]:
        """
        Christian's Algorithm:
        Estimated reference time when response arrives = T_ref + (RTT / 2)
        Offset = Estimated reference time - Local clock
        """
        now_local = time.time()
        estimated_ref = reference_time + ((round_trip_delay_ms / 1000.0) / 2.0)
        calculated_offset_ms = round((estimated_ref - now_local) * 1000.0, 3)
        residual_error_ms = round(abs(round_trip_delay_ms / 2.0), 3)

        self.offset_ms = calculated_offset_ms
        self.last_sync_time = now_local

        record = {
            "node_id": self.node_id,
            "reference_time": reference_time,
            "rtt_ms": round_trip_delay_ms,
            "calculated_offset_ms": calculated_offset_ms,
            "residual_error_ms": residual_error_ms,
            "adjusted_time": self.get_time(),
            "timestamp": now_local
        }
        self.sync_history.append(record)
        return record

class LamportClock:
    def __init__(self, initial_value: int = 0):
        self.value = initial_value

    def increment(self) -> int:
        self.value += 1
        return self.value

    def update(self, received_timestamp: int) -> int:
        self.value = max(self.value, received_timestamp) + 1
        return self.value

class VectorClock:
    def __init__(self, nodes: List[str] = None):
        self.nodes = sorted(nodes or ALL_SATELLITE_IDS)
        self.clock: Dict[str, int] = {node: 0 for node in self.nodes}

    def increment(self, node_id: str) -> Dict[str, int]:
        if node_id in self.clock:
            self.clock[node_id] += 1
        else:
            self.clock[node_id] = 1
        return dict(self.clock)

    def merge(self, received_vector: Dict[str, int]) -> Dict[str, int]:
        for node, val in received_vector.items():
            self.clock[node] = max(self.clock.get(node, 0), val)
        return dict(self.clock)

    def to_dict(self) -> Dict[str, int]:
        return dict(self.clock)

    @staticmethod
    def compare(v1: Dict[str, int], v2: Dict[str, int]) -> str:
        """
        Compare two vector clocks:
        Returns:
          "DOMINATES" if v1 > v2 (v1 causally strictly after v2)
          "DOMINATED" if v1 < v2 (v1 causally strictly before v2)
          "EQUAL" if v1 == v2
          "CONCURRENT" if v1 || v2
        """
        all_nodes = set(v1.keys()).union(set(v2.keys()))
        v1_greater = False
        v2_greater = False

        for node in all_nodes:
            val1 = v1.get(node, 0)
            val2 = v2.get(node, 0)
            if val1 > val2:
                v1_greater = True
            elif val2 > val1:
                v2_greater = True

        if v1_greater and not v2_greater:
            return "DOMINATES"
        elif v2_greater and not v1_greater:
            return "DOMINATED"
        elif not v1_greater and not v2_greater:
            return "EQUAL"
        else:
            return "CONCURRENT"

class ClockSyncManager:
    def __init__(self):
        self.physical_clocks: Dict[str, PhysicalClock] = {
            sat_id: PhysicalClock(sat_id, initial_drift_ms=random.uniform(-500.0, 500.0))
            for sat_id in ALL_SATELLITE_IDS
        }
        self.lamport_clocks: Dict[str, LamportClock] = {
            sat_id: LamportClock() for sat_id in ALL_SATELLITE_IDS
        }
        self.vector_clocks: Dict[str, VectorClock] = {
            sat_id: VectorClock() for sat_id in ALL_SATELLITE_IDS
        }

    def run_synchronization_round(self) -> Dict[str, Any]:
        ref_time = time.time()
        results = []
        for sat_id, pclock in self.physical_clocks.items():
            rtt_ms = round(random.uniform(12.0, 45.0), 2)
            rec = pclock.synchronize(ref_time, rtt_ms)
            results.append(rec)

        offsets = [r["calculated_offset_ms"] for r in results]
        avg_offset = round(sum(offsets) / len(offsets), 3) if offsets else 0.0
        max_offset = round(max(offsets), 3) if offsets else 0.0
        min_offset = round(min(offsets), 3) if offsets else 0.0

        return {
            "status": "SYNCHRONIZED",
            "algorithm": "Christian's External Reference Algorithm",
            "reference_time": ref_time,
            "node_count": len(results),
            "avg_offset_ms": avg_offset,
            "max_offset_ms": max_offset,
            "min_offset_ms": min_offset,
            "node_details": results,
            "timestamp": time.time()
        }

    def run_berkeley_synchronization(self, coordinator_id: str = "SAT-04", outlier_threshold_ms: float = 600.0) -> Dict[str, Any]:
        """
        Berkeley Algorithm (Internal Distributed Clock Synchronization):
        1. An elected coordinator polls all active nodes for their local physical times.
        2. Coordinator estimates one-way transmission delays and samples each node's clock offset relative to itself.
        3. Fault-tolerant averaging: Coordinator identifies and discards outliers exceeding outlier_threshold_ms.
        4. Coordinator computes average cluster time offset.
        5. Coordinator calculates adjustment proposals Delta_i = Avg_offset - Offset_i for every node.
        6. Each node adjusts its clock offset by Delta_i.
        7. Pre-sync vs Post-sync skew is measured to prove convergence.
        """
        if coordinator_id not in self.physical_clocks:
            coordinator_id = "SAT-04"

        coord_time = self.physical_clocks[coordinator_id].get_time()
        samples = []

        # 1 & 2: Sample all nodes relative to coordinator
        for sat_id, pclock in self.physical_clocks.items():
            rtt_ms = round(random.uniform(15.0, 40.0), 2)
            estimated_one_way_ms = rtt_ms / 2.0
            node_time = pclock.get_time() + (estimated_one_way_ms / 1000.0)
            offset_relative_to_coord_ms = round((node_time - coord_time) * 1000.0, 3)
            
            samples.append({
                "node_id": sat_id,
                "sampled_time": node_time,
                "rtt_ms": rtt_ms,
                "offset_to_coord_ms": offset_relative_to_coord_ms,
                "pre_sync_offset_ms": pclock.offset_ms
            })

        pre_offsets = [s["offset_to_coord_ms"] for s in samples]
        pre_skew_ms = round(max(pre_offsets) - min(pre_offsets), 3)

        # 3: Outlier filtering
        median_offset = sorted(pre_offsets)[len(pre_offsets) // 2]
        valid_samples = [
            s for s in samples if abs(s["offset_to_coord_ms"] - median_offset) <= outlier_threshold_ms
        ]
        outliers = [s["node_id"] for s in samples if s not in valid_samples]

        # 4: Average offset calculation
        valid_offsets = [s["offset_to_coord_ms"] for s in valid_samples]
        avg_cluster_offset_ms = round(sum(valid_offsets) / len(valid_offsets), 3) if valid_offsets else 0.0

        # 5 & 6: Compute correction proposals and apply adjustment
        proposals = []
        for s in samples:
            sat_id = s["node_id"]
            if sat_id in outliers:
                adj_ms = 0.0
                status = "REJECTED_OUTLIER"
            else:
                # Delta_i = Avg_offset - Offset_i
                adj_ms = round(avg_cluster_offset_ms - s["offset_to_coord_ms"], 3)
                # Apply correction proposal
                self.physical_clocks[sat_id].offset_ms += adj_ms
                status = "ADJUSTED"

            proposals.append({
                "node_id": sat_id,
                "sampled_offset_ms": s["offset_to_coord_ms"],
                "correction_proposal_ms": adj_ms,
                "post_sync_offset_ms": round(self.physical_clocks[sat_id].offset_ms, 3),
                "status": status
            })

        # 7: Measure post-sync residual skew
        post_times = [self.physical_clocks[s].get_time() for s in ALL_SATELLITE_IDS if s not in outliers]
        post_skew_ms = round((max(post_times) - min(post_times)) * 1000.0, 3) if len(post_times) > 1 else 0.0

        return {
            "algorithm": "Berkeley Distributed Clock Synchronization",
            "coordinator_id": coordinator_id,
            "status": "CONVERGED",
            "pre_sync_skew_ms": pre_skew_ms,
            "post_sync_residual_skew_ms": post_skew_ms,
            "skew_reduction_pct": round(max(0.0, (1.0 - (post_skew_ms / max(1.0, pre_skew_ms))) * 100.0), 1),
            "cluster_average_offset_ms": avg_cluster_offset_ms,
            "outlier_nodes_filtered": outliers,
            "correction_proposals": proposals,
            "timestamp": time.time()
        }


    def record_node_event(self, node_id: str, event_type: str) -> Dict[str, Any]:
        if node_id not in self.lamport_clocks:
            self.lamport_clocks[node_id] = LamportClock()
            self.vector_clocks[node_id] = VectorClock()

        l_val = self.lamport_clocks[node_id].increment()
        v_val = self.vector_clocks[node_id].increment(node_id)
        p_time = self.physical_clocks[node_id].get_time() if node_id in self.physical_clocks else time.time()

        return {
            "node_id": node_id,
            "event_type": event_type,
            "lamport_timestamp": l_val,
            "vector_clock": v_val,
            "physical_timestamp": p_time
        }

    def record_message_receipt(self, receiver_id: str, sender_id: str, sender_lamport: int, sender_vector: Dict[str, int]) -> Dict[str, Any]:
        if receiver_id not in self.lamport_clocks:
            self.lamport_clocks[receiver_id] = LamportClock()
            self.vector_clocks[receiver_id] = VectorClock()

        l_val = self.lamport_clocks[receiver_id].update(sender_lamport)
        self.vector_clocks[receiver_id].increment(receiver_id)
        v_val = self.vector_clocks[receiver_id].merge(sender_vector)
        p_time = self.physical_clocks[receiver_id].get_time() if receiver_id in self.physical_clocks else time.time()

        return {
            "receiver_id": receiver_id,
            "sender_id": sender_id,
            "lamport_timestamp": l_val,
            "vector_clock": v_val,
            "physical_timestamp": p_time
        }

global_clock_manager = ClockSyncManager()
