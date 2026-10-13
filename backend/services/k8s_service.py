"""
REAL KUBERNETES CLUSTER OBSERVABILITY SERVICE

Queries real cluster data (actual Pods, Deployments, Services, Replicas, Restarts)
via the Kubernetes API / kubectl, providing genuine observability without hardcoded mockups.
"""

import os
import json
import logging
import subprocess
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("K8sService")

K8S_SERVICE_HOST = os.getenv("KUBERNETES_SERVICE_HOST")
K8S_SERVICE_PORT = os.getenv("KUBERNETES_SERVICE_PORT", "443")
K8S_TOKEN_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/token"
K8S_CA_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
TARGET_NAMESPACE = os.getenv("K8S_NAMESPACE", "orbital-mission")

class KubernetesObservabilityService:
    def __init__(self):
        self.in_cluster = os.path.exists(K8S_TOKEN_PATH)

    def _query_kubectl(self, resource_type: str, namespace: str = TARGET_NAMESPACE) -> Optional[List[Dict[str, Any]]]:
        try:
            cmd = ["kubectl", "get", resource_type, "-n", namespace, "-o", "json"]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if proc.returncode == 0 and proc.stdout:
                data = json.loads(proc.stdout)
                return data.get("items", [])
        except Exception as e:
            logger.debug(f"kubectl query for {resource_type} failed: {e}")
        return None

    async def _query_in_cluster_api(self, path: str) -> Optional[Dict[str, Any]]:
        if not self.in_cluster:
            return None
        try:
            with open(K8S_TOKEN_PATH, "r") as tf:
                token = tf.read().strip()
            headers = {"Authorization": f"Bearer {token}"}
            url = f"https://{K8S_SERVICE_HOST}:{K8S_SERVICE_PORT}{path}"
            async with httpx.AsyncClient(verify=K8S_CA_PATH, timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.debug(f"In-cluster API query failed: {e}")
        return None

    async def get_cluster_observability(self) -> Dict[str, Any]:
        """
        Retrieves real-time Kubernetes cluster status, workloads, and pods.
        """
        pods_raw = None
        deployments_raw = None
        services_raw = None

        # 1. Try in-cluster API first
        if self.in_cluster:
            p_data = await self._query_in_cluster_api(f"/api/v1/namespaces/{TARGET_NAMESPACE}/pods")
            d_data = await self._query_in_cluster_api(f"/apis/apps/v1/namespaces/{TARGET_NAMESPACE}/deployments")
            s_data = await self._query_in_cluster_api(f"/api/v1/namespaces/{TARGET_NAMESPACE}/services")
            if p_data: pods_raw = p_data.get("items", [])
            if d_data: deployments_raw = d_data.get("items", [])
            if s_data: services_raw = s_data.get("items", [])

        # 2. If not in cluster or in-cluster query failed, query local kubectl
        if pods_raw is None:
            pods_raw = self._query_kubectl("pods")
        if deployments_raw is None:
            deployments_raw = self._query_kubectl("deployments")
        if services_raw is None:
            services_raw = self._query_kubectl("services")

        is_connected = pods_raw is not None or deployments_raw is not None

        # Parse real pods
        parsed_pods = []
        if pods_raw:
            for pod in pods_raw:
                meta = pod.get("metadata", {})
                status = pod.get("status", {})
                c_statuses = status.get("containerStatuses", [{}])
                restarts = sum(cs.get("restartCount", 0) for cs in c_statuses)
                is_ready = all(cs.get("ready", False) for cs in c_statuses) if c_statuses else False

                parsed_pods.append({
                    "name": meta.get("name"),
                    "phase": status.get("phase", "Unknown"),
                    "ready": is_ready,
                    "restarts": restarts,
                    "node": pod.get("spec", {}).get("nodeName", "control-plane"),
                    "ip": status.get("podIP", "Pending"),
                    "created_at": meta.get("creationTimestamp")
                })

        # Parse real workloads
        parsed_workloads = []
        if deployments_raw:
            for dep in deployments_raw:
                meta = dep.get("metadata", {})
                spec = dep.get("spec", {})
                status = dep.get("status", {})
                parsed_workloads.append({
                    "name": meta.get("name"),
                    "type": "Deployment",
                    "desired_replicas": spec.get("replicas", 1),
                    "ready_replicas": status.get("readyReplicas", 0),
                    "available_replicas": status.get("availableReplicas", 0),
                    "status": "Running" if status.get("readyReplicas", 0) == spec.get("replicas", 1) else "Progressing"
                })

        # Parse real services
        parsed_services = []
        if services_raw:
            for svc in services_raw:
                meta = svc.get("metadata", {})
                spec = svc.get("spec", {})
                parsed_services.append({
                    "name": meta.get("name"),
                    "type": spec.get("type", "ClusterIP"),
                    "cluster_ip": spec.get("clusterIP"),
                    "ports": [f"{p.get('port')}:{p.get('targetPort')}/{p.get('protocol')}" for p in spec.get("ports", [])]
                })

        return {
            "is_k8s_available": is_connected,
            "cluster": "Docker Desktop Kubernetes (kind)",
            "namespace": TARGET_NAMESPACE,
            "deployment_mode": "Kubernetes Orchestrated" if is_connected and len(parsed_pods) > 0 else "Docker Compose / Standalone",
            "source": "In-Cluster ServiceAccount API" if self.in_cluster else "Local Host kubectl CLI",
            "total_pods_count": len(parsed_pods),
            "pods": parsed_pods,
            "workloads": parsed_workloads,
            "services": parsed_services,
            "timestamp": round(os.times()[4], 2)
        }

global_k8s_service = KubernetesObservabilityService()
