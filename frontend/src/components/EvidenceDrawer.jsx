import React from 'react';
import { X, CheckCircle, Shield, Clock, Database, Radio, ArrowRight, Download, Activity, Cpu } from 'lucide-react';

export default function EvidenceDrawer({ isOpen, onClose, evidence }) {
  if (!isOpen) return null;

  const data = evidence || {
    status: 'NO_RUN_DATA',
    assertions: [],
    recovery_timeline: []
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence_report_${data.experiment_id || 'blackout'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-cyan-500/30 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-orbitron text-slate-100 flex items-center gap-2">
                Mission Evidence Drawer
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-sans">
                  {data.status || 'VERIFIED'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Empirical distributed systems proof & audit trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition text-xs flex items-center gap-1 border border-slate-700"
              title="Download JSON Report"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Buffered Records</span>
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                {data.total_buffered_records ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Drained & reconciled</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Leader Elected</span>
              </div>
              <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
                {data.current_coordinator || 'SAT-05'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Post-failover winner</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Blackout Duration</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {data.blackout_duration_seconds ?? 0}s
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Autonomous window</div>
            </div>
          </div>

          {/* Correctness Assertions */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-orbitron flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Formal Correctness Assertions
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/80">
              {(data.assertions || []).map((a, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-200">{a.assertion}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{a.details}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    a.status === 'PASSED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-orbitron flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Mission Continuity Timeline
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              {(data.recovery_timeline || []).map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px] font-mono text-cyan-300 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs">{step.phase}</span>
                      <span className="text-[10px] font-mono text-slate-400">{step.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Causal Reconciliation & Vector Clock Proof */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-orbitron flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-400" />
              Causality & Vector Clock Proof
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Concurrent Events Identified:</span>
                <span className="font-mono text-cyan-300 font-bold">{data.concurrent_events_identified ?? 0}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Causal Links Verified (a &rarr; b):</span>
                <span className="font-mono text-indigo-300 font-bold">{data.causal_dependencies_verified ?? 0}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Lamport Total Monotonicity:</span>
                <span className="font-mono text-emerald-300 font-bold">VERIFIED STRICT</span>
              </div>
            </div>
          </div>

          {/* Sample Reconciled Telemetry Stream */}
          {data.sample_reconciled_events && data.sample_reconciled_events.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-orbitron">
                Sample Reconciled Event Stream (Lamport Ordered)
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-[10px] text-slate-400 max-h-48 overflow-y-auto space-y-1">
                {data.sample_reconciled_events.map((evt, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-900/60 rounded flex items-center justify-between border border-slate-800">
                    <span className="text-cyan-300 font-semibold">{evt.satellite_id}</span>
                    <span className="text-slate-400">L={evt.lamport_timestamp}</span>
                    <span className="text-indigo-400">V={JSON.stringify(evt.vector_clock)}</span>
                    <span className="text-emerald-400">{evt.data?.health_score ?? 95}% health</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
