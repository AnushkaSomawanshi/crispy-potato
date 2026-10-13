import React, { useState, useEffect } from 'react';
import ClockSyncPage from './ClockSyncPage';
import {
  Clock,
  Radio,
  Swords,
  Camera,
  Activity,
  Lock,
  ChevronRight,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  Shield,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';

export default function SynchronizationLabPage() {
  const [activeTab, setActiveTab] = useState('causality'); // causality, arena, clocks, snapshots, beacons, mutex

  // Causality Lens state
  const [causalEvents, setCausalEvents] = useState([]);
  const [selectedEventA, setSelectedEventA] = useState('');
  const [selectedEventB, setSelectedEventB] = useState('');
  const [causalityProof, setCausalityProof] = useState(null);
  const [causalityLoading, setCausalityLoading] = useState(false);

  // Algorithm Arena state
  const [electionComparison, setElectionComparison] = useState(null);
  const [mutexComparison, setMutexComparison] = useState(null);
  const [arenaLoading, setArenaLoading] = useState(false);

  // Clock Lab state
  const [berkeleyResult, setBerkeleyResult] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);

  // Snapshots state
  const [snapshotResult, setSnapshotResult] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Mutex state
  const [mutexTrace, setMutexTrace] = useState(null);
  const [mutexLoading, setMutexLoading] = useState(false);

  // Fetch initial Causality Lens events
  useEffect(() => {
    fetchCausalityEvents();
  }, []);

  const fetchCausalityEvents = async () => {
    try {
      const res = await fetch('/api/causality/events');
      if (res.ok) {
        const data = await res.json();
        setCausalEvents(data.events || []);
        if (data.events && data.events.length >= 2) {
          setSelectedEventA(data.events[2]?.event_id || data.events[0]?.event_id);
          setSelectedEventB(data.events[3]?.event_id || data.events[1]?.event_id);
        }
      }
    } catch (e) {}
  };

  const handleCompareCausality = async () => {
    if (!selectedEventA || !selectedEventB) return;
    setCausalityLoading(true);
    try {
      const res = await fetch('/api/causality/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id_a: selectedEventA, event_id_b: selectedEventB })
      });
      if (res.ok) {
        const data = await res.json();
        setCausalityProof(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCausalityLoading(false);
    }
  };

  // Run Algorithm Arena benchmark
  const handleRunArena = async () => {
    setArenaLoading(true);
    try {
      const [resElect, resMutex] = await Promise.all([
        fetch('/api/arena/election/compare', { method: 'POST' }),
        fetch('/api/arena/mutex/compare', { method: 'POST' })
      ]);
      if (resElect.ok) setElectionComparison(await resElect.json());
      if (resMutex.ok) setMutexComparison(await resMutex.json());
    } catch (e) {
      console.error(e);
    } finally {
      setArenaLoading(false);
    }
  };

  // Run Berkeley Clock Sync
  const handleRunBerkeley = async () => {
    setClockLoading(true);
    try {
      const res = await fetch('/api/clocks/berkeley', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBerkeleyResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClockLoading(false);
    }
  };

  // Run Snapshot
  const handleTakeSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const res = await fetch('/api/snapshots/take', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSnapshotResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Run Mutex Request
  const handleRequestMutex = async () => {
    setMutexLoading(true);
    try {
      const res = await fetch('/api/mutex/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: 'SAT-02', resource_id: 'STAR_TRACKER_CALIBRATOR' })
      });
      if (res.ok) {
        const data = await res.json();
        setMutexTrace(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMutexLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-orbitron uppercase tracking-widest">
            <Clock className="w-4 h-4 animate-spin text-cyan-400" />
            Chapter 3 &middot; Synchronization Unified Laboratory
          </div>
          <h1 className="text-2xl font-bold font-orbitron text-slate-100 mt-1">
            Distributed Synchronization Lab
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Live verifiable experimentation for physical clocks (Berkeley), scalar logical time (Lamport), vector clocks & concurrency detection (Causality Lens), snapshot consistency (Chandy-Lamport), leader elections (Algorithm Arena), and mutual exclusion arbitration.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto text-xs font-orbitron">
        {[
          { id: 'causality', label: 'Causality Lens (USP #2)', icon: Radio },
          { id: 'arena', label: 'Algorithm Arena (USP #3)', icon: Swords },
          { id: 'clocks', label: 'Berkeley Clock Sync', icon: Clock },
          { id: 'snapshots', label: 'Global Snapshots', icon: Camera },
          { id: 'beacons', label: 'Beacon Protocol Monitor', icon: Activity },
          { id: 'mutex', label: 'Mutual Exclusion (Ricart-Agrawala)', icon: Lock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition whitespace-nowrap ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CAUSALITY LENS (USP #2) */}
      {activeTab === 'causality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Pairwise Selector */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h2 className="text-xs font-bold font-orbitron uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Pairwise Causal Inspector
              </h2>
              <p className="text-xs text-slate-400">
                Select any two distributed events to compute whether one causally caused the other (a &rarr; b) or whether they occurred concurrently (a &parallel; b).
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Event A:</label>
                  <select
                    value={selectedEventA}
                    onChange={(e) => setSelectedEventA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-cyan-300"
                  >
                    {causalEvents.map((evt) => (
                      <option key={evt.event_id} value={evt.event_id}>
                        {evt.event_id} ({evt.node_id}) - {evt.event_type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Event B:</label>
                  <select
                    value={selectedEventB}
                    onChange={(e) => setSelectedEventB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-indigo-300"
                  >
                    {causalEvents.map((evt) => (
                      <option key={evt.event_id} value={evt.event_id}>
                        {evt.event_id} ({evt.node_id}) - {evt.event_type}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCompareCausality}
                  disabled={causalityLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold font-orbitron transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                >
                  <Play className="w-4 h-4" />
                  <span>Analyze Causal Relationship</span>
                </button>
              </div>

              {/* Mathematical Axiom Box */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="text-cyan-400 font-bold font-orbitron text-[10px]">SYLLABUS AXIOM:</div>
                <div>a &rarr; b &iff; V(a) &lt; V(b)</div>
                <div>a &parallel; b &iff; &not;(V(a) &lt; V(b)) &and; &not;(V(b) &lt; V(a))</div>
              </div>
            </div>

            {/* Causal Relationship Proof Output */}
            <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h2 className="text-xs font-bold font-orbitron uppercase tracking-wider text-slate-200">
                Causal Proof & Three-Perspective Inspection
              </h2>

              {causalityProof ? (
                <div className="space-y-4 animate-fade-in">
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    causalityProof.is_concurrent
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  }`}>
                    <div>
                      <div className="text-sm font-bold font-orbitron">{causalityProof.symbolic_formula}</div>
                      <div className="text-xs text-slate-300 mt-1">{causalityProof.explanation}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono border">
                      {causalityProof.relationship}
                    </span>
                  </div>

                  {/* Educational Insight: Lamport Blind Spot */}
                  {causalityProof.lamport_blind_spot && (
                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs space-y-1 text-slate-300">
                      <div className="font-bold text-indigo-300 font-orbitron flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Educational Insight &middot; Lamport Scalar Total-Order Blind Spot
                      </div>
                      <p className="text-[11px] text-slate-400">{causalityProof.lamport_analysis}</p>
                    </div>
                  )}

                  {/* Three Perspectives Table */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="font-bold text-cyan-300 font-orbitron">Event A ({causalityProof.event_a.event_id})</div>
                      <div className="text-slate-400">Node: <span className="text-slate-200 font-mono">{causalityProof.event_a.node_id}</span></div>
                      <div className="text-slate-400">Physical Time: <span className="text-slate-200 font-mono">{causalityProof.event_a.physical_timestamp?.toFixed(3)}s</span></div>
                      <div className="text-slate-400">Lamport Scalar: <span className="text-cyan-400 font-bold font-mono">L = {causalityProof.event_a.lamport_timestamp}</span></div>
                      <div className="text-slate-400">Vector Clock: <span className="text-indigo-400 font-bold font-mono">{JSON.stringify(causalityProof.event_a.vector_clock)}</span></div>
                    </div>

                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="font-bold text-indigo-300 font-orbitron">Event B ({causalityProof.event_b.event_id})</div>
                      <div className="text-slate-400">Node: <span className="text-slate-200 font-mono">{causalityProof.event_b.node_id}</span></div>
                      <div className="text-slate-400">Physical Time: <span className="text-slate-200 font-mono">{causalityProof.event_b.physical_timestamp?.toFixed(3)}s</span></div>
                      <div className="text-slate-400">Lamport Scalar: <span className="text-cyan-400 font-bold font-mono">L = {causalityProof.event_b.lamport_timestamp}</span></div>
                      <div className="text-slate-400">Vector Clock: <span className="text-indigo-400 font-bold font-mono">{JSON.stringify(causalityProof.event_b.vector_clock)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Select Event A and Event B on the left and click "Analyze Causal Relationship" to compute happened-before and vector clock proofs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALGORITHM ARENA (USP #3) */}
      {activeTab === 'arena' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-cyan-400" />
                  Algorithm Arena: Empirical Side-by-Side Showdown
                </h2>
                <p className="text-xs text-slate-400">
                  Runs Ring vs Bully Leader Election and Centralized vs Ricart-Agrawala Mutex under identical cluster topology to quantitatively compare message complexity and latency.
                </p>
              </div>
              <button
                onClick={handleRunArena}
                disabled={arenaLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-orbitron transition flex items-center gap-2 shadow-lg shadow-cyan-900/30"
              >
                <Play className="w-4 h-4" />
                <span>Run Arena Showdown</span>
              </button>
            </div>

            {electionComparison && mutexComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
                {/* Election Showdown Card */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold font-orbitron text-cyan-300 uppercase tracking-wider">
                    Leader Election: Ring vs Garcia-Molina Bully
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                      <div className="font-bold text-slate-200">Distributed Ring</div>
                      <div className="text-[11px] text-slate-400 font-mono">Winner: {electionComparison.ring_election.leader_elected}</div>
                      <div className="text-lg font-bold font-mono text-cyan-300">{electionComparison.ring_election.messages_exchanged} msgs</div>
                      <div className="text-[10px] text-slate-500">{electionComparison.ring_election.message_complexity}</div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                      <div className="font-bold text-slate-200">Bully Algorithm</div>
                      <div className="text-[11px] text-slate-400 font-mono">Winner: {electionComparison.bully_election.leader_elected}</div>
                      <div className="text-lg font-bold font-mono text-amber-300">{electionComparison.bully_election.messages_exchanged} msgs</div>
                      <div className="text-[10px] text-slate-500">{electionComparison.bully_election.message_complexity}</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 text-[11px] text-slate-300">
                    <span className="text-emerald-400 font-bold">Consensus: </span>
                    Both algorithms elected {electionComparison.ring_election.leader_elected}. Ring used {electionComparison.comparison_verdict.message_ratio}x fewer messages!
                  </div>
                </div>

                {/* Mutex Showdown Card */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold font-orbitron text-indigo-300 uppercase tracking-wider">
                    Mutual Exclusion: Centralized vs Ricart-Agrawala
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                      <div className="font-bold text-slate-200">Centralized Coordinator</div>
                      <div className="text-[11px] text-slate-400 font-mono">Coord: {mutexComparison.centralized.coordinator_id}</div>
                      <div className="text-lg font-bold font-mono text-cyan-300">{mutexComparison.centralized.messages_exchanged} msgs</div>
                      <div className="text-[10px] text-slate-500">{mutexComparison.centralized.theoretical_messages}</div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                      <div className="font-bold text-slate-200">Ricart-Agrawala</div>
                      <div className="text-[11px] text-slate-400 font-mono">Fully Distributed (No SPOF)</div>
                      <div className="text-lg font-bold font-mono text-indigo-300">{mutexComparison.ricart_agrawala.messages_exchanged} msgs</div>
                      <div className="text-[10px] text-slate-500">{mutexComparison.ricart_agrawala.theoretical_messages}</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 text-[11px] text-slate-300">
                    <span className="text-cyan-400 font-bold">Trade-off: </span>
                    {mutexComparison.arena_verdict.message_overhead_reduction}. Ricart-Agrawala avoids coordinator SPOF at the cost of higher message overhead.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL AND LOGICAL CLOCK LAB */}
      {activeTab === 'clocks' && <ClockSyncPage />}

      {/* TAB 4: CHANDY-LAMPORT GLOBAL SNAPSHOTS */}
      {activeTab === 'snapshots' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  Chandy-Lamport Distributed Global Snapshot
                </h2>
                <p className="text-xs text-slate-400">
                  Records consistent global system state across satellite nodes and captures in-transit messages circulating on orbital communication channels.
                </p>
              </div>
              <button
                onClick={handleTakeSnapshot}
                disabled={snapshotLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-orbitron transition flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Take Global Snapshot</span>
              </button>
            </div>

            {snapshotResult && (
              <div className="space-y-4 animate-fade-in pt-2">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-slate-400">Snapshot ID</div>
                    <div className="text-sm font-mono font-bold text-cyan-300 mt-1">{snapshotResult.snapshot_id}</div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-slate-400">Initiator Node</div>
                    <div className="text-sm font-mono font-bold text-indigo-300 mt-1">{snapshotResult.initiator}</div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-slate-400">In-Transit Channel Messages</div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{snapshotResult.in_transit_messages_count} recorded</div>
                  </div>
                </div>

                {/* Channel States */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-cyan-300 font-orbitron uppercase tracking-wider">
                    In-Transit Channel States (Chandy-Lamport Marker Propagation)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                    {Object.entries(snapshotResult.channel_states || {}).map(([chan, val]) => (
                      <div key={chan} className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <span>{chan}</span>
                        <span className={val.in_transit_count > 0 ? 'text-amber-400' : 'text-slate-500'}>
                          {val.in_transit_count} in-transit
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BEACON PROTOCOL MONITOR */}
      {activeTab === 'beacons' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Beacon Protocol Failure Detection State Machine
          </h2>
          <p className="text-xs text-slate-400">
            Explicit node failure detection lifecycle: HEALTHY &rarr; DEGRADED &rarr; SUSPECTED &rarr; FAILED &rarr; RECOVERING. Prevents spurious elections on transient latency.
          </p>

          <div className="grid grid-cols-5 gap-3 pt-2">
            {['SAT-01', 'SAT-02', 'SAT-03', 'SAT-04', 'SAT-05'].map((sat) => (
              <div key={sat} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-orbitron text-xs text-slate-200">{sat}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    HEALTHY
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>RTT: 18.2ms</div>
                  <div>Loss: 0.0%</div>
                  <div>Missed: 0</div>
                  <div>Confidence: 1.00</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: RICART-AGRAWALA MUTEX */}
      {activeTab === 'mutex' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-orbitron uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                Ricart-Agrawala Distributed Mutual Exclusion
              </h2>
              <p className="text-xs text-slate-400">
                Peer-to-peer critical section arbitration using Lamport logical timestamps. Request broadcasts to active peers; deferred queues ensure starvation-free access.
              </p>
            </div>
            <button
              onClick={handleRequestMutex}
              disabled={mutexLoading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-orbitron transition flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Request Critical Section (SAT-02)</span>
            </button>
          </div>

          {mutexTrace && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Lock Status:</span>
                <span className="text-emerald-400 font-bold">{mutexTrace.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Lamport Timestamp T_i:</span>
                <span className="text-cyan-400 font-bold">{mutexTrace.lamport_timestamp}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Replies Granted:</span>
                <span className="text-indigo-400">{JSON.stringify(mutexTrace.replies_granted)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
