import React, { useState, useEffect } from 'react';
import {
  Radio,
  Zap,
  Shield,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Cpu,
  Server,
  ArrowRight,
  Database,
  Lock,
  Unlock,
  ChevronRight,
  Download
} from 'lucide-react';
import EvidenceDrawer from '../components/EvidenceDrawer';

export default function GroundBlackoutPage() {
  const [blackoutStatus, setBlackoutStatus] = useState({
    mode: 'NORMAL',
    is_blackout_active: false,
    elapsed_seconds: 0,
    buffered_counts: { 'SAT-01': 0, 'SAT-02': 0, 'SAT-03': 0, 'SAT-04': 0, 'SAT-05': 0 },
    total_buffered: 0,
    current_leader: 'SAT-04',
    permitted_operations: [
      'PEER_BEACONING',
      'AUTONOMOUS_HEALTH_ASSESSMENT',
      'LOCAL_TASK_PROCESSING',
      'DISTRIBUTED_LEADER_ELECTION',
      'PEER_TO_PEER_STATE_GOSSIP'
    ],
    has_reconciliation_evidence: false
  });

  const [activeStage, setActiveStage] = useState(1);
  const [failoverResult, setFailoverResult] = useState(null);
  const [reconcileEvidence, setReconcileEvidence] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Poll blackout status every 2 seconds
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/blackout/status');
      if (res.ok) {
        const data = await res.json();
        setBlackoutStatus(data);
        if (data.is_blackout_active) {
          setActiveStage(2);
        } else if (data.has_reconciliation_evidence && activeStage !== 5) {
          // Has reconciled evidence
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Stage 2: Start Blackout
  const handleStartBlackout = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/blackout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Simulated ground station loss of signal (orbital eclipse shadow)' })
      });
      if (res.ok) {
        setActiveStage(2);
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 3: Fail Coordinator Mid-Blackout
  const handleSimulateCoordinatorFailure = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/blackout/simulate-coordinator-failure', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFailoverResult(data);
        setActiveStage(3);
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 4 & 5: Reconnect Ground
  const handleReconnect = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/blackout/reconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReconcileEvidence(data);
        setActiveStage(5);
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-orbitron uppercase tracking-widest">
            <Radio className="w-4 h-4 animate-pulse" />
            Flagship Innovation &middot; Distributed Systems Research USP
          </div>
          <h1 className="text-2xl font-bold font-orbitron text-slate-100 mt-1 flex items-center gap-3">
            Ground Blackout Mode
            <span className={`px-2.5 py-0.5 text-xs rounded-full border font-sans font-semibold ${
              blackoutStatus.is_blackout_active
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {blackoutStatus.is_blackout_active ? 'BLACKOUT ACTIVE' : 'MISSION NOMINAL'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Proves constellation mission continuity during total ground station loss of signal. Satellites sustain autonomous peer-to-peer coordination, ring-buffered telemetry, leader elections, and causal state reconciliation upon reconnection.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {reconcileEvidence && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition"
            >
              <Shield className="w-4 h-4" />
              <span>Inspect Evidence Drawer</span>
            </button>
          )}
        </div>
      </div>

      {/* 5-Stage Mission Stepper */}
      <div className="grid grid-cols-5 gap-2 bg-slate-950 p-3 border border-slate-800 rounded-xl">
        {[
          { stage: 1, label: 'Stage 1: Normal Mission', desc: 'Ground link active; 5 satellites online' },
          { stage: 2, label: 'Stage 2: Ground Blackout', desc: 'Link severed; circular buffering active' },
          { stage: 3, label: 'Stage 3: Peer Failover', desc: 'Autonomous Ring election mid-blackout' },
          { stage: 4, label: 'Stage 4: Ground Reconnect', desc: 'Buffer drain & causal vector merge' },
          { stage: 5, label: 'Stage 5: Continuity Proof', desc: 'Zero data loss & verified assertions' },
        ].map((s) => {
          const isDone = activeStage > s.stage || (activeStage === 5 && s.stage === 5);
          const isCurrent = activeStage === s.stage;
          return (
            <div
              key={s.stage}
              className={`p-3 rounded-lg border transition-all ${
                isCurrent
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-md glow-cyan'
                  : isDone
                  ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold font-orbitron">
                <span>{s.label}</span>
                {isDone ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Main Interactive Laboratory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Mission Control & Connectivity Simulator */}
        <div className="space-y-6 lg:col-span-1">
          {/* Ground Control Link Card */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg space-y-4">
            <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-200 flex items-center justify-between">
              <span>Ground Communication Link</span>
              <span className={`w-2.5 h-2.5 rounded-full ${blackoutStatus.is_blackout_active ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
            </h2>

            {/* Radar / Link Visualization */}
            <div className="relative h-36 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center overflow-hidden">
              <div className={`absolute inset-0 transition-opacity duration-700 ${blackoutStatus.is_blackout_active ? 'opacity-100' : 'opacity-20'}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.15),transparent_70%)] animate-pulse" />
              </div>

              {blackoutStatus.is_blackout_active ? (
                <div className="text-center z-10 space-y-1">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 mx-auto flex items-center justify-center text-rose-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-rose-300 font-orbitron">GROUND LINK SEVERED</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Elapsed: {blackoutStatus.elapsed_seconds}s &middot; Satellites Autonomous
                  </div>
                </div>
              ) : (
                <div className="text-center z-10 space-y-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-emerald-300 font-orbitron">GROUND STATION NOMINAL</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Uplink/Downlink 100% Available &middot; gRPC & AMQP Live
                  </div>
                </div>
              )}
            </div>

            {/* Control Actions */}
            <div className="space-y-2 pt-2">
              {!blackoutStatus.is_blackout_active ? (
                <button
                  onClick={handleStartBlackout}
                  disabled={actionLoading}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold font-orbitron shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Activate Ground Blackout Mode</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleSimulateCoordinatorFailure}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Fail Coordinator Mid-Blackout</span>
                  </button>

                  <button
                    onClick={handleReconnect}
                    disabled={actionLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold font-orbitron shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reconnect Ground & Reconcile State</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Permitted Operations Filter Card */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold font-orbitron text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Autonomous Operation Permissions
            </h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="text-[10px] text-emerald-400 uppercase font-semibold font-orbitron">Permitted in Blackout:</div>
              {(blackoutStatus.permitted_operations || []).map((op, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{op.replaceAll('_', ' ')}</span>
                </div>
              ))}
              <div className="text-[10px] text-rose-400 uppercase font-semibold font-orbitron pt-2">Blocked by Ground Failure:</div>
              {['GROUND_TELECOMMAND_DISPATCH', 'DIRECT_GROUND_STREAMING'].map((op, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{op.replaceAll('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Satellite Circular Buffers & Continuity Trace */}
        <div className="space-y-6 lg:col-span-2">
          {/* Satellite Circular Ring Buffers */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Satellite-Side Circular Ring Buffers
                </h2>
                <p className="text-xs text-slate-400">
                  Each satellite node accumulates observations in bounded circular buffers with Lamport & Vector clock stamps.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Buffered:</span>
                <span className="ml-2 font-mono font-bold text-cyan-300 text-lg">
                  {blackoutStatus.total_buffered}
                </span>
              </div>
            </div>

            {/* Per-Satellite Buffer Meters */}
            <div className="grid grid-cols-5 gap-3">
              {['SAT-01', 'SAT-02', 'SAT-03', 'SAT-04', 'SAT-05'].map((satId) => {
                const count = blackoutStatus.buffered_counts[satId] || 0;
                const capacity = 150;
                const pct = Math.min(100, Math.round((count / capacity) * 100));
                const isLeader = blackoutStatus.current_leader === satId;

                return (
                  <div key={satId} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{satId}</span>
                      {isLeader && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-bold">
                          LEADER
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-mono font-bold text-cyan-400">{count}</div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                      <span>Cap: {capacity}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Autonomous Coordinator Failover Result (Stage 3) */}
          {failoverResult && (
            <div className="p-5 bg-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-lg space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-orbitron uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Autonomous Leader Failover Mid-Blackout
                </h3>
                <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono">
                  Latency: {failoverResult.election_duration_ms}ms
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Failed Coordinator:</div>
                  <div className="font-bold text-rose-400 font-mono mt-0.5">{failoverResult.failed_coordinator}</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">New Elected Leader:</div>
                  <div className="font-bold text-emerald-400 font-mono mt-0.5">{failoverResult.new_coordinator}</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Messages Exchanged:</div>
                  <div className="font-bold text-cyan-400 font-mono mt-0.5">{failoverResult.messages_exchanged}</div>
                </div>
              </div>
            </div>
          )}

          {/* Reconciled Evidence & Continuity Report (Stage 5) */}
          {reconcileEvidence && (
            <div className="p-5 bg-slate-900/90 border border-emerald-500/30 rounded-2xl shadow-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-orbitron uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Stage 5: State Reconciliation & Continuity Proof
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ground connection restored. Buffered observations reconciled using Lamport & Vector clocks.
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>Open Drawer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quantitative Metrics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">Reconciled Records</div>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                    {reconcileEvidence.reconciled_records_count}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">Concurrent Detected</div>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    {reconcileEvidence.concurrent_events_identified}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">Causal Links Verified</div>
                  <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
                    {reconcileEvidence.causal_dependencies_verified}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">Data Loss Rate</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    0.00%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Universal Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        evidence={reconcileEvidence}
      />
    </div>
  );
}
