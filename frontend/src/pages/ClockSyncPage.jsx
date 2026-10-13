import React, { useState } from 'react';
import { Clock, GitBranch, Play, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

const initialClocks = [
  { node_id: 'SAT-01', offset_ms: -120 }, { node_id: 'SAT-02', offset_ms: 80 },
  { node_id: 'SAT-03', offset_ms: 200 }, { node_id: 'SAT-04', offset_ms: -40 },
  { node_id: 'SAT-05', offset_ms: 300 },
];
const sampleEvents = [
  { node_id: 'SAT-01', action: 'LOCAL', label: 'Create observation' },
  { node_id: 'SAT-01', action: 'SEND', message_id: 'M1', label: 'Send telemetry' },
  { node_id: 'SAT-02', action: 'LOCAL', label: 'Local sensor event' },
  { node_id: 'SAT-02', action: 'RECEIVE', message_id: 'M1', label: 'Receive telemetry' },
  { node_id: 'SAT-02', action: 'SEND', message_id: 'M2', label: 'Send acknowledgement' },
  { node_id: 'SAT-01', action: 'RECEIVE', message_id: 'M2', label: 'Receive acknowledgement' },
];
async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Experiment request failed');
  return data;
}
const panel = 'rounded-2xl border border-slate-800 bg-slate-900/80 p-5';
const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100';

export default function ClockSyncPage() {
  const [tab, setTab] = useState('physical');
  const [clocks, setClocks] = useState(initialClocks);
  const [coordinator, setCoordinator] = useState('SAT-04');
  const [algorithm, setAlgorithm] = useState('BERKELEY');
  const [physical, setPhysical] = useState(null);
  const [events, setEvents] = useState(sampleEvents);
  const [logical, setLogical] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const skew = Math.max(...clocks.map(c => Number(c.offset_ms))) - Math.min(...clocks.map(c => Number(c.offset_ms)));

  async function runPhysical() {
    setBusy(true); setError('');
    try { setPhysical(await post('/api/clocks/physical-experiment', { algorithm, coordinator_id: coordinator, clocks: clocks.map(c => ({ ...c, offset_ms: Number(c.offset_ms) })) })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function runLogical() {
    setBusy(true); setError('');
    try { setLogical(await post('/api/clocks/lamport-experiment', { events: events.map(({ node_id, action, message_id }) => ({ node_id, action, message_id })) })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function reset() { setClocks(initialClocks); setCoordinator('SAT-04'); setAlgorithm('BERKELEY'); setPhysical(null); setEvents(sampleEvents); setLogical(null); setError(''); }

  return <div className="space-y-6 pb-12 text-slate-100">
    <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 to-slate-900 p-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-300"><Clock className="h-4 w-4" /> Clock Experiments</div>
      <h1 className="mt-2 text-2xl font-bold">Satellite Clock Lab</h1>
      <p className="mt-2 text-sm text-slate-400">Physical synchronization aligns simulated clock readings. Logical clocks order distributed events; they do not synchronize wall-clock time.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setTab('physical')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'physical' ? 'bg-cyan-500 font-bold text-slate-950' : 'border border-slate-700'}`}><Clock className="mr-2 inline h-4 w-4" />Physical clock sync</button>
        <button onClick={() => setTab('logical')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'logical' ? 'bg-cyan-500 font-bold text-slate-950' : 'border border-slate-700'}`}><GitBranch className="mr-2 inline h-4 w-4" />Logical clock ordering</button>
        <button onClick={reset} className="ml-auto rounded-lg border border-slate-700 px-3 py-2 text-sm"><RotateCcw className="mr-2 inline h-4 w-4" />Reset</button>
      </div>
    </header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    {tab === 'physical' ? <div className="grid gap-5 xl:grid-cols-2">
      <section className={panel}>
        <h2 className="font-semibold text-cyan-200">1. Configure physical clock offsets</h2>
        <p className="mt-2 text-xs text-slate-400">These are simulated experiment values, not hardware clocks.</p>
        <div className="mt-4 space-y-2">{clocks.map((c, i) => <label key={c.node_id} className="grid grid-cols-2 items-center gap-3 rounded-lg bg-slate-950 p-3 text-sm"><span className="font-mono">{c.node_id} offset (ms)</span><input type="number" value={c.offset_ms} onChange={e => { setClocks(old => old.map((x, j) => j === i ? { ...x, offset_ms: e.target.value } : x)); setPhysical(null); }} className={inputClass} /></label>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Coordinator<select value={coordinator} onChange={e => setCoordinator(e.target.value)} className={`${inputClass} mt-1`}>{clocks.map(c => <option key={c.node_id}>{c.node_id}</option>)}</select></label><label className="text-xs text-slate-400">Mode<select value={algorithm} onChange={e => { setAlgorithm(e.target.value); setPhysical(null); }} className={`${inputClass} mt-1`}><option value="BERKELEY">Berkeley</option><option value="BASELINE">Baseline (no correction)</option></select></label></div>
        <p className="mt-3 text-sm text-amber-200">Input skew: {skew.toFixed(3)} ms</p>
        <button disabled={busy} onClick={runPhysical} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-60"><Play className="mr-2 inline h-4 w-4" />{busy ? 'Running…' : 'Run physical-clock experiment'}</button>
      </section>
      <section className={panel}>
        <h2 className="font-semibold text-cyan-200">2. Process and result</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-300">{['Collect readings from participants','Calculate the average offset','Calculate and apply each adjustment','Measure residual clock skew'].map((s,i) => <li key={s} className="flex gap-3 rounded-lg bg-slate-950 p-3"><span className="font-bold text-cyan-300">{i+1}.</span>{s}</li>)}</ol>
        {physical && <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"><div className="flex items-center gap-2 font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4" />{physical.algorithm} · {physical.status}</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>Average: {physical.average_offset_ms} ms</span><span>Before skew: {physical.pre_sync_skew_ms} ms</span><span>After skew: {physical.post_sync_skew_ms} ms</span><span>Coordinator: {physical.coordinator_id}</span></div></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="p-2">Node</th><th>Before</th><th>Adjustment</th><th>After</th></tr></thead><tbody>{physical.participants.map(n => <tr key={n} className="border-t border-slate-800"><td className="p-2 font-mono text-cyan-200">{n}</td><td>{physical.before_offsets_ms[n]}</td><td>{physical.adjustments_ms[n]}</td><td className="text-emerald-300">{physical.after_offsets_ms[n]}</td></tr>)}</tbody></table></div>
          <h3 className="font-semibold">Backend execution trace</h3>{physical.steps.map(s => <div key={s.step} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="text-sm font-semibold">Step {s.step}: {s.title}</div><p className="mt-1 text-xs text-slate-400">{s.detail}</p>{s.average_offset_ms !== undefined && <p className="mt-2 font-mono text-xs text-cyan-200">Average offset: {s.average_offset_ms} ms</p>}{s.adjustments && <div className="mt-2 space-y-1 text-xs font-mono">{s.adjustments.map(a => <div key={a.node_id}>{a.node_id}: {a.before_offset_ms} + ({a.adjustment_ms}) = {a.after_offset_ms} ms</div>)}</div>}{s.pre_sync_skew_ms !== undefined && <p className="mt-2 text-xs text-emerald-300">Skew {s.pre_sync_skew_ms} → {s.post_sync_skew_ms} ms</p>}</div>)}
        </div>}
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">Berkeley aligns participants to a shared internal average, not guaranteed UTC. This experiment changes simulated offsets only.</p>
      </section>
    </div> : <div className="grid gap-5 xl:grid-cols-2">
      <section className={panel}><h2 className="font-semibold text-cyan-200">Lamport logical clock experiment</h2><p className="mt-2 text-sm text-slate-400">Edit which node performs each event. Send and receive actions use message IDs to carry the sender's logical timestamp.</p>
        <div className="mt-4 space-y-2">{events.map((ev,i) => <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-3"><label className="text-xs text-slate-400">Event {i+1}<select value={ev.node_id} onChange={e => setEvents(old => old.map((x,j) => j===i ? {...x,node_id:e.target.value}:x))} className={`${inputClass} mt-1`}>{clocks.map(c => <option key={c.node_id}>{c.node_id}</option>)}</select></label><div className="text-xs text-slate-400">Action<div className="mt-2 text-sm text-slate-100">{ev.action}{ev.message_id ? ` · ${ev.message_id}` : ''}</div><div className="mt-1">{ev.label}</div></div></div>)}</div>
        <button disabled={busy} onClick={runLogical} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-60"><Play className="mr-2 inline h-4 w-4" />{busy ? 'Executing…' : 'Run Lamport event sequence'}</button>
        <button onClick={() => {setEvents(sampleEvents);setLogical(null);}} className="mt-2 w-full rounded-lg border border-slate-700 p-2 text-sm">Restore example sequence</button>
      </section>
      <section className={panel}><h2 className="font-semibold text-cyan-200">How logical time works</h2><p className="mt-3 text-sm text-slate-300">Local/send event: L = L + 1. Receive event: L = max(L, received timestamp) + 1.</p><p className="mt-2 text-sm text-slate-400">If event A happened before event B, then L(A) &lt; L(B). Lamport clocks do not by themselves prove concurrency.</p>
        {logical && <div className="mt-4 space-y-3"><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"><div className="font-bold text-emerald-200">{logical.algorithm} · {logical.status}</div><div className="mt-2 flex flex-wrap gap-2">{Object.entries(logical.final_clocks).map(([n,v]) => <span key={n} className="rounded bg-slate-950 px-2 py-1 font-mono text-sm">{n}: L={v}</span>)}</div></div><h3 className="font-semibold">Event trace</h3>{logical.trace.map(t => <div key={t.step} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="flex justify-between gap-2 text-sm"><span className="text-cyan-200">#{t.step} {t.node_id} · {t.action}</span><span className="font-mono text-emerald-300">{t.clock_before} → {t.clock_after}</span></div><p className="mt-1 text-xs text-slate-400">{t.rule}{t.received_timestamp !== null ? ` (received ${t.received_timestamp})` : ''}</p></div>)}</div>}
      </section>
    </div>}
    <p className="text-xs text-slate-500">Results are returned by backend experiment endpoints. Physical offsets are simulated and do not change the host or container operating-system clocks.</p>
  </div>;
}
