import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, GitBranch, Play, RotateCcw, Plus, Trash2, Info, CheckCircle2, AlertCircle } from 'lucide-react';

const DEFAULT_PROCESSES = ['P1', 'P2', 'P3'];
const STARTER_EVENTS = [
  { process_id: 'P1', action: 'LOCAL' },
  { process_id: 'P2', action: 'LOCAL' },
  { process_id: 'P1', action: 'SEND', message_id: 'm1' },
  { process_id: 'P2', action: 'RECEIVE', message_id: 'm1' },
  { process_id: 'P2', action: 'SEND', message_id: 'm2' },
  { process_id: 'P3', action: 'RECEIVE', message_id: 'm2' },
];

function vectorText(vector) {
  return Array.isArray(vector) ? `[${vector.join(', ')}]` : '—';
}

function vectorRelationLabel(relation) {
  return ({
    A_HAPPENED_BEFORE_B: 'A happened before B',
    B_HAPPENED_BEFORE_A: 'B happened before A',
    CONCURRENT: 'Concurrent events',
    EQUAL: 'Equal vector timestamps',
  })[relation] || relation;
}

export default function VectorClockLabPage() {
  const [processes, setProcesses] = useState(DEFAULT_PROCESSES);
  const [events, setEvents] = useState(STARTER_EVENTS);
  const [nextMessageNumber, setNextMessageNumber] = useState(3);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedA, setSelectedA] = useState('1');
  const [selectedB, setSelectedB] = useState('2');
  const [comparison, setComparison] = useState(null);
  const [newProcessId, setNewProcessId] = useState('');

  const sentMessages = useMemo(() => {
    const sent = [];
    const received = new Set();
    events.forEach((event) => {
      if (event.action === 'RECEIVE' && event.message_id) received.add(event.message_id);
      if (event.action === 'SEND' && event.message_id) sent.push({ id: event.message_id, sender: event.process_id });
    });
    return sent.filter((message) => !received.has(message.id));
  }, [events]);

  const appendEvent = (action, processId) => {
    if (action === 'SEND') {
      const messageId = `m${nextMessageNumber}`;
      setNextMessageNumber((n) => n + 1);
      setEvents((current) => [...current, { process_id: processId, action, message_id: messageId }]);
    } else if (action === 'RECEIVE') {
      const message = sentMessages.find((item) => item.sender !== processId);
      if (!message) {
        setError('Add a SEND event from another process before adding a RECEIVE event.');
        return;
      }
      setEvents((current) => [...current, { process_id: processId, action, message_id: message.id }]);
    } else {
      setEvents((current) => [...current, { process_id: processId, action }]);
    }
    setResult(null);
    setComparison(null);
    setError('');
  };

  const loadStarter = () => {
    setProcesses(DEFAULT_PROCESSES);
    setEvents(STARTER_EVENTS.map((event) => ({ ...event })));
    setNextMessageNumber(3);
    setResult(null);
    setComparison(null);
    setError('');
  };

  const runExperiment = async () => {
    setLoading(true);
    setError('');
    setComparison(null);
    try {
      const response = await fetch('/api/clocks/vector-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_ids: processes, events }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'The vector-clock experiment failed.');
      setResult(payload);
      setSelectedA('1');
      setSelectedB(String(Math.min(2, payload.trace.length)));
    } catch (err) {
      setResult(null);
      setError(err.message || 'Could not reach the vector-clock API. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    if (!result) return;
    const eventA = result.trace[Number(selectedA) - 1];
    const eventB = result.trace[Number(selectedB) - 1];
    if (!eventA || !eventB) {
      setError('Choose two valid events from the completed trace.');
      return;
    }
    try {
      const response = await fetch('/api/clocks/vector-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector_a: eventA.clock_after, vector_b: eventB.clock_after }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Could not compare the selected vectors.');
      setComparison({ ...payload, eventA, eventB });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not reach the vector comparison API.');
    }
  };

  const addProcess = () => {
    const candidate = newProcessId.trim();
    if (!candidate || processes.includes(candidate)) {
      setError('Enter a non-empty process ID that is not already in the list.');
      return;
    }
    setProcesses((current) => [...current, candidate]);
    setNewProcessId('');
    setResult(null);
    setComparison(null);
    setError('');
  };

  const removeEvent = (index) => {
    setEvents((current) => current.filter((_, i) => i !== index));
    setResult(null);
    setComparison(null);
  };

  const colorClasses = ['border-sky-400 bg-sky-500/10 text-sky-200', 'border-teal-400 bg-teal-500/10 text-teal-200', 'border-violet-400 bg-violet-500/10 text-violet-200', 'border-amber-400 bg-amber-500/10 text-amber-200', 'border-rose-400 bg-rose-500/10 text-rose-200'];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/70 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-sky-300"><GitBranch size={28} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Distributed systems · synchronization</p>
            <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">Vector Clock Lab</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Build an event history across independent processes. Follow every vector update, propagate causal knowledge through messages, and compare two events to determine whether they are ordered or concurrent.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-slate-300">Algorithm-backed API</span>
          <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-slate-300">Reproducible simulation</span>
          <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-slate-300">Causality comparison</span>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sky-300"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/10 font-bold">1</span><h2 className="font-semibold text-white">Local event</h2></div>
          <p className="text-sm leading-6 text-slate-300">Increment only the vector component owned by the process that performs the event.</p>
          <code className="mt-3 block rounded-lg bg-slate-950 p-3 text-sm text-sky-200">[0, 0, 0] → [1, 0, 0]</code>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-teal-300"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-400/10 font-bold">2</span><h2 className="font-semibold text-white">Send a message</h2></div>
          <p className="text-sm leading-6 text-slate-300">Increment the sender's component and attach a copy of its vector to the message.</p>
          <code className="mt-3 block rounded-lg bg-slate-950 p-3 text-sm text-teal-200">message.timestamp = vector</code>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-violet-300"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/10 font-bold">3</span><h2 className="font-semibold text-white">Receive a message</h2></div>
          <p className="text-sm leading-6 text-slate-300">Merge each component using max(local, received), then increment the receiver's own component.</p>
          <code className="mt-3 block rounded-lg bg-slate-950 p-3 text-sm text-violet-200">V = max(Vlocal, Vmessage); V[i]++</code>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-white">1. Configure processes</h2><p className="mt-1 text-sm text-slate-400">Each process owns one component in every vector.</p></div>
          <button onClick={loadStarter} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><RotateCcw size={15} /> Load guided scenario</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {processes.map((processId, index) => <span key={processId} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${colorClasses[index % colorClasses.length]}`}>{processId}<span className="ml-2 text-xs opacity-70">component {index + 1}</span></span>)}
          <div className="flex gap-2">
            <input value={newProcessId} onChange={(event) => setNewProcessId(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addProcess()} placeholder="New process ID" className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400" />
            <button onClick={addProcess} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"><Plus size={15} /> Add</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">At least two unique processes are required. Changing the process list resets the result when you run the experiment again.</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div><h2 className="text-lg font-semibold text-white">2. Build the event sequence</h2><p className="mt-1 text-sm text-slate-400">The sequence is the experiment's execution order. Message events model causal communication between processes.</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {processes.map((processId, index) => <div key={processId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="mb-3 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${['bg-sky-400','bg-teal-400','bg-violet-400','bg-amber-400','bg-rose-400'][index % 5]}`} /><span className="font-semibold text-white">{processId}</span></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => appendEvent('LOCAL', processId)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium hover:bg-slate-700">+ Local</button>
              <button onClick={() => appendEvent('SEND', processId)} className="rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/25">↑ Send</button>
              <button onClick={() => appendEvent('RECEIVE', processId)} className="rounded-lg bg-teal-500/15 px-3 py-2 text-xs font-medium text-teal-200 hover:bg-teal-500/25">↓ Receive</button>
            </div>
          </div>)}
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
          <div className="flex min-w-max items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3"><h3 className="text-sm font-semibold text-white">Ordered event list <span className="ml-2 text-slate-500">({events.length})</span></h3><span className="text-xs text-slate-500">Top to bottom = input order</span></div>
          {events.length === 0 ? <p className="p-5 text-sm text-slate-400">Add a local, send or receive event to begin.</p> : <ol className="divide-y divide-slate-800/80">
            {events.map((event, index) => <li key={`${index}-${event.action}-${event.process_id}-${event.message_id || ''}`} className="flex items-center gap-3 px-4 py-3">
              <span className="w-7 text-xs text-slate-500">#{index + 1}</span>
              <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-white">{event.process_id}</span>
              <span className="min-w-16 text-xs font-semibold text-slate-300">{event.action}</span>
              {event.message_id && <span className="rounded-md bg-sky-500/10 px-2 py-1 font-mono text-xs text-sky-200">{event.message_id}</span>}
              <span className="flex-1" />
              <button onClick={() => removeEvent(index)} aria-label={`Remove event ${index + 1}`} className="rounded-md p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={14} /></button>
            </li>)}
          </ol>}
        </div>
        {sentMessages.length > 0 && <p className="mt-3 text-xs text-slate-400">Messages available to receive: {sentMessages.map((message) => `${message.id} from ${message.sender}`).join(', ')}. Receive controls choose the first available message from another process.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={runExperiment} disabled={loading || events.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"><Play size={16} /> {loading ? 'Running algorithm…' : 'Run vector-clock experiment'}</button>
          <span className="text-xs text-slate-500">Results are calculated by the backend, not guessed by the UI.</span>
        </div>
        {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      </section>

      {result && <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-white">3. Experiment results</h2><p className="mt-1 text-sm text-slate-400">The API returned a completed deterministic vector-clock trace.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"><CheckCircle2 size={14} /> {result.status}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.process_ids.map((processId, index) => <article key={processId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">{processId} · final vector</p><p className={`mt-2 font-mono text-xl font-bold ${['text-sky-300','text-teal-300','text-violet-300','text-amber-300','text-rose-300'][index % 5]}`}>{vectorText(result.final_clocks[processId])}</p></article>)}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="font-semibold text-white">Event trace and message flow</h3>
          <p className="mt-1 text-sm text-slate-400">Each row shows the process-local vector before the event and the vector after applying the algorithm rule.</p>
          <div className="mt-4 space-y-3">
            {result.trace.map((event) => <article key={event.step} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">Event {event.step}</span><span className="font-semibold text-white">{event.process_id}</span><span className="text-xs text-sky-200">{event.action}</span>{event.message_id && <span className="font-mono text-xs text-slate-400">{event.message_id}</span>}</div>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-lg bg-slate-900 p-3"><p className="text-[11px] uppercase tracking-wide text-slate-500">Before</p><p className="mt-1 font-mono text-sm text-slate-200">{vectorText(event.clock_before)}</p></div>
                <ArrowRight className="hidden text-slate-500 md:block" size={18} />
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3"><p className="text-[11px] uppercase tracking-wide text-sky-300">After</p><p className="mt-1 font-mono text-sm font-semibold text-sky-100">{vectorText(event.clock_after)}</p></div>
              </div>
              {event.message_timestamp && <p className="mt-2 text-xs text-teal-200">Message timestamp: {vectorText(event.message_timestamp)}</p>}
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-400"><Info size={14} className="mt-0.5 shrink-0" />{event.rule}</p>
            </article>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="font-semibold text-white">4. Compare two events</h3>
          <p className="mt-1 text-sm text-slate-400">Choose events and compare their returned vector timestamps using the component-wise partial order.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-slate-400">Event A<select value={selectedA} onChange={(event) => setSelectedA(event.target.value)} className="min-w-52 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">{result.trace.map((event) => <option key={event.step} value={event.step}>#{event.step} · {event.process_id} · {event.action} · {vectorText(event.clock_after)}</option>)}</select></label>
            <label className="grid gap-1 text-xs text-slate-400">Event B<select value={selectedB} onChange={(event) => setSelectedB(event.target.value)} className="min-w-52 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">{result.trace.map((event) => <option key={event.step} value={event.step}>#{event.step} · {event.process_id} · {event.action} · {vectorText(event.clock_after)}</option>)}</select></label>
            <button onClick={runComparison} className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400">Compare vectors</button>
          </div>
          {comparison && <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <p className="text-xs uppercase tracking-wider text-violet-200">Comparison result</p><h4 className="mt-1 text-lg font-bold text-white">{vectorRelationLabel(comparison.relation)}</h4><p className="mt-2 text-sm leading-6 text-slate-200">{comparison.explanation}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-lg bg-slate-950/70 p-3"><p className="text-xs text-slate-400">A · Event {comparison.eventA.step}</p><code className="mt-1 block text-violet-200">{vectorText(comparison.vector_a)}</code><p className="mt-2 text-xs text-slate-500">A ≤ B: {comparison.a_le_b ? 'true' : 'false'}</p></div><div className="rounded-lg bg-slate-950/70 p-3"><p className="text-xs text-slate-400">B · Event {comparison.eventB.step}</p><code className="mt-1 block text-violet-200">{vectorText(comparison.vector_b)}</code><p className="mt-2 text-xs text-slate-500">B ≤ A: {comparison.b_le_a ? 'true' : 'false'}</p></div></div>
          </div>}
        </div>
      </section>}

      <footer className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-slate-400"><div className="flex items-start gap-2"><Info size={16} className="mt-0.5 shrink-0 text-amber-300" /><p><strong className="text-amber-200">Scope and assumptions:</strong> This lab executes a deterministic event sequence in the backend. It models vector-clock rules; it does not launch independent OS processes or send real network packets. The sequence order is supplied by the experiment author, while causal ordering is inferred from vector timestamps.</p></div></footer>
    </div>
  );
}
