import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Zap,
  BarChart3,
  Globe,
  Boxes,
  Play,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Server,
  Layers,
  Shield,
  Activity,
  Cpu,
  RefreshCw
} from 'lucide-react';

export default function ParadigmsLabPage() {
  const [activeTab, setActiveTab] = useState('dfs'); // dfs, serverless, hadoop, casestudies, k8s

  // DFS state
  const [dfsStatus, setDfsStatus] = useState(null);
  const [dfsFiles, setDfsFiles] = useState([]);
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [uploadContent, setUploadContent] = useState('CRITICAL_TELEMETRY: Satellite attitude thruster sequence & star-tracker calibration frames.');
  const [uploadFilename, setUploadFilename] = useState('telemetry_payload_001.dat');
  const [dfsLoading, setDfsLoading] = useState(false);

  // Serverless state
  const [serverlessResult, setServerlessResult] = useState(null);
  const [serverlessLoading, setServerlessLoading] = useState(false);

  // Hadoop state
  const [hadoopResult, setHadoopResult] = useState(null);
  const [hadoopLoading, setHadoopLoading] = useState(false);

  // Kubernetes Observatory state
  const [k8sStatus, setK8sStatus] = useState(null);
  const [k8sLoading, setK8sLoading] = useState(false);

  // Fetch DFS status on load
  useEffect(() => {
    fetchDfsStatus();
    fetchK8sStatus();
  }, []);

  const fetchDfsStatus = async () => {
    try {
      const res = await fetch('/api/dfs/files');
      if (res.ok) {
        const data = await res.json();
        setDfsFiles(data.files || []);
        setDfsStatus(data.status || null);
      }
    } catch (e) {}
  };

  const fetchK8sStatus = async () => {
    try {
      const res = await fetch('/api/k8s/observatory');
      if (res.ok) {
        const data = await res.json();
        setK8sStatus(data);
      }
    } catch (e) {}
  };

  const handleUploadDfs = async () => {
    setDfsLoading(true);
    try {
      const res = await fetch('/api/dfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFilename,
          content: uploadContent,
          category: 'SCIENCE_PAYLOAD'
        })
      });
      if (res.ok) {
        fetchDfsStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDfsLoading(false);
    }
  };

  const handleRetrieveDfsFile = async (fileId) => {
    setDfsLoading(true);
    try {
      const res = await fetch(`/api/dfs/files/${fileId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFileContent(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDfsLoading(false);
    }
  };

  const handleSimulateNodeOutage = async (nodeId, isOffline) => {
    setDfsLoading(true);
    try {
      const res = await fetch('/api/dfs/simulate-outage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, is_offline: isOffline })
      });
      if (res.ok) {
        fetchDfsStatus();
        if (selectedFileContent) {
          handleRetrieveDfsFile(selectedFileContent.file_id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDfsLoading(false);
    }
  };

  const handleTriggerServerless = async () => {
    setServerlessLoading(true);
    try {
      const res = await fetch('/api/unit4/serverless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_name: 'ANOMALY_DETECTION_PIPELINE',
          event_payload: { origin: 'CONSTELLATION_TELEMETRY', anomaly_level: 'NOMINAL' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setServerlessResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setServerlessLoading(false);
    }
  };

  const handleRunHadoop = async () => {
    setHadoopLoading(true);
    try {
      const res = await fetch('/api/unit4/hadoop');
      if (res.ok) {
        const data = await res.json();
        setHadoopResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHadoopLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-orbitron uppercase tracking-widest">
            <Layers className="w-4 h-4 animate-pulse" />
            Chapter 4 &middot; Emerging Distributed Paradigms & Cloud
          </div>
          <h1 className="text-2xl font-bold font-orbitron text-slate-100 mt-1">
            Architecture & Paradigms Lab
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Operational implementations and sourced comparative studies covering Replicated Distributed File Systems (DFS), Serverless Architectures, Apache Hadoop Batch Processing, Industry Case Studies, and Docker Desktop Kubernetes Orchestration.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto text-xs font-orbitron">
        {[
          { id: 'dfs', label: 'Replicated DFS', icon: FolderTree },
          { id: 'k8s', label: 'Kubernetes Observatory', icon: Boxes },
          { id: 'serverless', label: 'Serverless Functions', icon: Zap },
          { id: 'hadoop', label: 'Apache Hadoop MapReduce', icon: BarChart3 },
          { id: 'casestudies', label: 'Industry Case Studies', icon: Globe }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition whitespace-nowrap ${
                isActive
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPLICATED DFS */}
      {activeTab === 'dfs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload & Node Outage Simulator */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h2 className="text-xs font-bold font-orbitron uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Store Replicated Mission Artifact
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Artifact Filename:</label>
                  <input
                    type="text"
                    value={uploadFilename}
                    onChange={(e) => setUploadFilename(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Content Payload:</label>
                  <textarea
                    rows={3}
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-slate-200"
                  />
                </div>
                <button
                  onClick={handleUploadDfs}
                  disabled={dfsLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-bold font-orbitron transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
                >
                  <Play className="w-4 h-4" />
                  <span>Partition, Hash & Replicate (R=3)</span>
                </button>
              </div>

              {/* Node Outage Fault Injection */}
              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-300 font-orbitron uppercase text-[10px]">
                  Simulate Storage Node Outages:
                </div>
                <p className="text-[11px] text-slate-400">
                  Toggle node outages to prove quorum reads (W + R &gt; N) retrieve files even when replicas fail.
                </p>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {['SAT-01', 'SAT-02', 'SAT-03', 'SAT-04', 'SAT-05'].map((node) => {
                    const isOffline = dfsStatus?.offline_nodes?.includes(node);
                    return (
                      <button
                        key={node}
                        onClick={() => handleSimulateNodeOutage(node, !isOffline)}
                        className={`p-1.5 rounded text-[10px] font-mono font-bold border transition ${
                          isOffline
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {node}
                        <div className="text-[9px] font-sans font-normal">
                          {isOffline ? 'OFFLINE' : 'ONLINE'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Catalog & Replicated Chunks Inspector */}
            <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h2 className="text-xs font-bold font-orbitron uppercase tracking-wider text-slate-200">
                Replicated File Catalog & SHA-256 Checksums
              </h2>

              <div className="space-y-3">
                {dfsFiles.map((file) => (
                  <div
                    key={file.file_id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-indigo-300">{file.filename}</span>
                        <span className="text-[10px] text-slate-400">({file.total_size_bytes} bytes)</span>
                      </div>
                      <button
                        onClick={() => handleRetrieveDfsFile(file.file_id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Retrieve & Verify</span>
                      </button>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 break-all">
                      SHA-256: <span className="text-emerald-400">{file.sha256_checksum}</span>
                    </div>

                    {/* Chunks */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono">
                      {(file.chunks || []).map((chunk) => (
                        <div key={chunk.chunk_id} className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                          <div className="text-cyan-400 font-bold">{chunk.chunk_id}</div>
                          <div className="text-slate-400">Replicas: {chunk.replicas?.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Retrieval Proof Output */}
              {selectedFileContent && (
                <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 animate-fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 font-orbitron flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Retrieval Integrity Verified (SHA-256 Checksum Match)
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                      {selectedFileContent.status}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded text-slate-200 font-mono text-[11px]">
                    "{selectedFileContent.content}"
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Surviving Replicas Read: {selectedFileContent.retrieval_trace?.map((t) => `${t.chunk_id} via ${t.node_id} (${t.status})`).join('; ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KUBERNETES OBSERVATORY */}
      {activeTab === 'k8s' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  Docker Desktop Kubernetes Deployment Observatory
                </h2>
                <p className="text-xs text-slate-400">
                  Orchestrated workloads, services, health probes, PersistentVolumeClaims, and self-healing pod recovery.
                </p>
              </div>
              <button
                onClick={fetchK8sStatus}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh K8s State</span>
              </button>
            </div>

            {k8sStatus && (
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* Cluster Meta */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-slate-400">Cluster Target</div>
                    <div className="text-sm font-mono font-bold text-cyan-300 mt-1">{k8sStatus.cluster}</div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-slate-400">Active Namespace</div>
                    <div className="text-sm font-mono font-bold text-indigo-300 mt-1">{k8sStatus.namespace}</div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-slate-400">Total Pods Active</div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{k8sStatus.total_pods_count ?? 0} Pods</div>
                  </div>
                </div>

                {/* Workloads Table */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 font-bold font-orbitron text-slate-300 uppercase tracking-wider flex justify-between">
                    <span>Kubernetes Workload Status (Actual Cluster Data)</span>
                    <span className="text-cyan-400 font-mono text-[11px]">{k8sStatus.deployment_mode}</span>
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {(k8sStatus.workloads || []).map((w, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-slate-300">
                        <div>
                          <div className="font-bold text-slate-200 font-mono">{w.name}</div>
                          <div className="text-[10px] text-slate-400">{w.type} &middot; Replicas: {w.ready_replicas} ready / {w.desired_replicas} desired</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-cyan-300">{w.ready_replicas} / {w.desired_replicas} Replicas</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.status === 'Running'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!k8sStatus.workloads || k8sStatus.workloads.length === 0) && (
                      <div className="p-4 text-center text-slate-500">
                        No Kubernetes workloads running in namespace '{k8sStatus.namespace}'. Deploy using: kubectl apply -f k8s/
                      </div>
                    )}
                  </div>
                </div>

                {/* Pods List */}
                {k8sStatus.pods && k8sStatus.pods.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 font-bold font-orbitron text-slate-300 uppercase tracking-wider">
                      Deployed Cluster Pods
                    </div>
                    <div className="divide-y divide-slate-800/80 font-mono text-[11px]">
                      {k8sStatus.pods.map((p, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-slate-300">
                          <div>
                            <span className="font-bold text-cyan-300">{p.name}</span>
                            <span className="text-slate-500 ml-2">Node: {p.node} &middot; IP: {p.ip}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Restarts: {p.restarts}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.ready ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {p.phase}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SERVERLESS */}
      {activeTab === 'serverless' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Event-Triggered Serverless Function
              </h2>
              <p className="text-xs text-slate-400">
                Offloads non-critical anomaly analysis & report generation into asynchronous serverless workers without blocking real-time flight software.
              </p>
            </div>
            <button
              onClick={handleTriggerServerless}
              disabled={serverlessLoading}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold font-orbitron transition flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Trigger Serverless Execution</span>
            </button>
          </div>

          {serverlessResult && (
            <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2 animate-fade-in text-xs font-mono">
              <div className="text-amber-300 font-bold">Execution ID: {serverlessResult.execution_id}</div>
              <div className="text-slate-400">Function: {serverlessResult.function_name}</div>
              <div className="text-slate-400">Duration: {serverlessResult.duration_ms}ms (Includes simulated cold-start)</div>
              <div className="text-slate-400">Memory: {serverlessResult.memory_used_mb}MB</div>
              <div className="text-emerald-400 font-bold">{serverlessResult.output_summary}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HADOOP MAPREDUCE */}
      {activeTab === 'hadoop' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Apache Hadoop Batch Analytics Pipeline
              </h2>
              <p className="text-xs text-slate-400">
                Executes distributed batch MapReduce across historical constellation telemetry archives to compute long-term battery decay & degradation trends.
              </p>
            </div>
            <button
              onClick={handleRunHadoop}
              disabled={hadoopLoading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-orbitron transition flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Run MapReduce Batch Job</span>
            </button>
          </div>

          {hadoopResult && (
            <div className="space-y-4 pt-1 animate-fade-in text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-slate-400">Map Tasks</div>
                  <div className="text-lg font-bold font-mono text-cyan-300 mt-1">{hadoopResult.map_tasks_count}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-slate-400">Reduce Tasks</div>
                  <div className="text-lg font-bold font-mono text-indigo-300 mt-1">{hadoopResult.reduce_tasks_count}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-slate-400">Records Processed</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">{hadoopResult.records_processed}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-slate-400">Job Duration</div>
                  <div className="text-lg font-bold font-mono text-cyan-400 mt-1">{hadoopResult.job_duration_ms}ms</div>
                </div>
              </div>

              {/* Node Health Trends */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono">
                <h3 className="font-bold text-slate-300 font-orbitron uppercase text-[10px] mb-2">
                  MapReduce Reduced Trends (Degradation & Failure Statistics)
                </h3>
                <div className="divide-y divide-slate-800/80 text-[11px]">
                  {Object.entries(hadoopResult.node_health_trends || {}).map(([node, stats]) => (
                    <div key={node} className="py-2 flex justify-between text-slate-300">
                      <span className="font-bold text-cyan-300">{node}</span>
                      <span className="text-slate-400">Avg Health: {stats.avg_health}%</span>
                      <span className="text-amber-400">Decay: {stats.battery_decay_rate}</span>
                      <span className="text-slate-400">Mean Temp: {stats.temp_mean}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INDUSTRY CASE STUDIES */}
      {activeTab === 'casestudies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="font-bold font-orbitron text-cyan-300 text-xs uppercase tracking-wider">
              Megaport Cloud Router (SDN)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Software-Defined Network fabric providing dynamic multi-cloud interconnection.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="text-cyan-400 font-bold">Project Mapping:</div>
              <div>Inter-Satellite Link (ISL) mesh routing and dynamic line-of-sight peering.</div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="font-bold font-orbitron text-orange-300 text-xs uppercase tracking-wider">
              Cloudflare Edge Anycast
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Geographically distributed Anycast edge routing & V8 isolate serverless workers.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="text-orange-400 font-bold">Project Mapping:</div>
              <div>Proximity-aware orbital edge task execution and low-latency payload processing.</div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="font-bold font-orbitron text-amber-300 text-xs uppercase tracking-wider">
              AWS Managed Cloud Paradigms
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise event-driven architecture decoupling compute, queueing, and storage.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="text-amber-400 font-bold">Project Mapping:</div>
              <div>FastAPI (Compute), RabbitMQ (SQS), PostgreSQL (RDS), and Replicated DFS (S3).</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
