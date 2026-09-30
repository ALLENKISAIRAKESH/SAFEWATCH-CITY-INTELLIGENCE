import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Shield, Plus, Trash2, Edit3, Search, AlertTriangle, CheckCircle,
  XCircle, Star, Eye, EyeOff, Filter, RefreshCw, Car, Save,
  Flame, Bell, Clock, Camera, Radio, ChevronRight, Hash, Sparkles,
  Lock, AlertOctagon, Check
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface WatchlistEntry {
  id: string;
  plate: string;
  type: 'stolen' | 'wanted' | 'vip' | 'blacklist' | 'custom';
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface WatchlistHit {
  plate: string;
  entry: WatchlistEntry;
  sighting_id: string;
  camera_id: string;
  timestamp: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string; glow: string }
> = {
  stolen: {
    label: 'STOLEN VEHICLE',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
  wanted: {
    label: 'WANTED / APPREHEND',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]',
  },
  vip: {
    label: 'VIP / PRIORITY PASS',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  },
  blacklist: {
    label: 'SECURITY BLACKLIST',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
  },
  custom: {
    label: 'MONITORED TARGET',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]',
  },
};

const PRIORITY_BADGES: Record<string, { label: string; cls: string }> = {
  critical: {
    label: 'CRITICAL',
    cls: 'text-rose-400 bg-rose-500/20 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]',
  },
  high: {
    label: 'HIGH',
    cls: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
  },
  medium: {
    label: 'MEDIUM',
    cls: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
  },
  low: {
    label: 'LOW',
    cls: 'text-slate-400 bg-white/[0.05] border-white/[0.10]',
  },
};

export default function Watchlists() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [recentHits, setRecentHits] = useState<WatchlistHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [error, setError] = useState('');
  const [socketActive, setSocketActive] = useState(false);

  // Add form state
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState<WatchlistEntry['type']>('stolen');
  const [newPriority, setNewPriority] = useState<WatchlistEntry['priority']>('critical');
  const [newReason, setNewReason] = useState('');

  const socketRef = useRef<Socket | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/watchlists`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();

    const socket = io(BACKEND_URL, {
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketActive(true));
    socket.on('disconnect', () => setSocketActive(false));

    socket.on('watchlist_hit', (hit: WatchlistHit) => {
      setRecentHits((prev) => [hit, ...prev.slice(0, 19)]);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchEntries]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlate.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: newPlate.trim().toUpperCase(),
          type: newType,
          priority: newPriority,
          reason: newReason.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setNewPlate('');
      setNewReason('');
      setShowAdd(false);
      fetchEntries();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Are you sure you want to remove this plate from watchlists?')) return;
    try {
      await fetch(`${BACKEND_URL}/api/watchlists/${id}`, { method: 'DELETE' });
      fetchEntries();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function toggleActive(entry: WatchlistEntry) {
    try {
      await fetch(`${BACKEND_URL}/api/watchlists/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !entry.active }),
      });
      fetchEntries();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const filtered = entries.filter((e) => {
    const matchText =
      !filter ||
      e.plate.includes(filter.toUpperCase()) ||
      e.reason.toLowerCase().includes(filter.toLowerCase());
    const matchType = !filterType || e.type === filterType;
    const matchPriority = !filterPriority || e.priority === filterPriority;
    return matchText && matchType && matchPriority;
  });

  const stolenCount = entries.filter((e) => e.type === 'stolen').length;
  const wantedCount = entries.filter((e) => e.type === 'wanted').length;
  const vipCount = entries.filter((e) => e.type === 'vip').length;
  const activeCount = entries.filter((e) => e.active).length;

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600/30 to-orange-600/30 border border-rose-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <Shield className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Intelligence Watchlist Manager</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300">
                  PHASE 6
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated ANPR match engine for Stolen, Wanted, VIP, and Security Blacklist targets
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              socketActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${socketActive ? 'bg-emerald-400 opacity-75' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${socketActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            {socketActive ? 'REAL-TIME MATCH ACTIVE' : 'SOCKET OFFLINE'}
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Enlist New Plate
          </button>

          <button
            onClick={fetchEntries}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] text-slate-300 hover:text-white text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Watchlist Hit Banner (if any live hits arrive) */}
      {recentHits.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-950/20 to-orange-950/40 border border-rose-500/40 p-4 shadow-[0_0_30px_rgba(244,63,94,0.15)] animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400 animate-bounce" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                ACTIVE WATCHLIST INTERCEPTION FEED ({recentHits.length})
              </h3>
            </div>
            <button
              onClick={() => setRecentHits([])}
              className="text-[10px] font-mono text-slate-400 hover:text-white"
            >
              Clear Feed
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentHits.slice(0, 3).map((hit, idx) => (
              <div
                key={idx}
                className="bg-black/40 border border-rose-500/30 rounded-xl p-3 flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm text-white px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40">
                      {hit.plate}
                    </span>
                    <span className="text-[10px] font-mono text-rose-300 font-semibold">
                      [{hit.entry.type.toUpperCase()}]
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate max-w-[200px]">
                    {hit.entry.reason || 'Flagged security target'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Camera: {hit.camera_id} • {new Date(hit.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">TOTAL ENLISTED</div>
          <div className="text-2xl font-bold font-mono text-white">{entries.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Managed plates</div>
        </div>

        <div className="bg-rose-950/20 backdrop-blur-md border border-rose-500/20 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider mb-1">STOLEN VEHICLES</div>
          <div className="text-2xl font-bold font-mono text-rose-300">{stolenCount}</div>
          <div className="text-[10px] text-rose-500/80 mt-1">Auto-incident on sight</div>
        </div>

        <div className="bg-orange-950/20 backdrop-blur-md border border-orange-500/20 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-orange-400 uppercase tracking-wider mb-1">WANTED TARGETS</div>
          <div className="text-2xl font-bold font-mono text-orange-300">{wantedCount}</div>
          <div className="text-[10px] text-orange-500/80 mt-1">Law enforcement priority</div>
        </div>

        <div className="bg-emerald-950/20 backdrop-blur-md border border-emerald-500/20 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">VIP & CLEARED</div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{vipCount}</div>
          <div className="text-[10px] text-emerald-500/80 mt-1">Authorized access</div>
        </div>

        <div className="bg-sky-950/20 backdrop-blur-md border border-sky-500/20 rounded-xl p-3.5">
          <div className="text-[10px] font-mono text-sky-400 uppercase tracking-wider mb-1">ACTIVE ENFORCEMENT</div>
          <div className="text-2xl font-bold font-mono text-sky-300">{activeCount}</div>
          <div className="text-[10px] text-sky-500/80 mt-1">Live matching enabled</div>
        </div>
      </div>

      {/* Add Form Panel */}
      {showAdd && (
        <form
          onSubmit={addEntry}
          className="mb-6 rounded-2xl bg-[#0a1120] border border-rose-500/30 p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-400" /> Enlist New Plate in Intelligence Watchlist
            </h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-slate-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">LICENSE PLATE NUMBER</label>
              <input
                type="text"
                placeholder="e.g. MH12AB1234"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">CATEGORY</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none"
              >
                <option value="stolen" className="bg-[#0a1120]">Stolen Vehicle</option>
                <option value="wanted" className="bg-[#0a1120]">Wanted / Apprehend</option>
                <option value="vip" className="bg-[#0a1120]">VIP / Priority Pass</option>
                <option value="blacklist" className="bg-[#0a1120]">Security Blacklist</option>
                <option value="custom" className="bg-[#0a1120]">Custom Monitored</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">ALERT PRIORITY</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none"
              >
                <option value="critical" className="bg-[#0a1120]">Critical (Immediate Dispatch)</option>
                <option value="high" className="bg-[#0a1120]">High (Operator Alert)</option>
                <option value="medium" className="bg-[#0a1120]">Medium (Logged Sighting)</option>
                <option value="low" className="bg-[#0a1120]">Low (Informational)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">REASON / INCIDENT REFERENCE</label>
              <input
                type="text"
                placeholder="FIR #, stolen case info, or escort detail"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded-lg border border-white/[0.10] text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            >
              <Save className="w-3.5 h-3.5" /> Enlist Target Plate
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search watchlist by plate or reason..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="" className="bg-[#0a1120]">All Categories</option>
          <option value="stolen" className="bg-[#0a1120]">Stolen</option>
          <option value="wanted" className="bg-[#0a1120]">Wanted</option>
          <option value="vip" className="bg-[#0a1120]">VIP</option>
          <option value="blacklist" className="bg-[#0a1120]">Blacklist</option>
          <option value="custom" className="bg-[#0a1120]">Custom</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="" className="bg-[#0a1120]">All Priorities</option>
          <option value="critical" className="bg-[#0a1120]">Critical</option>
          <option value="high" className="bg-[#0a1120]">High</option>
          <option value="medium" className="bg-[#0a1120]">Medium</option>
          <option value="low" className="bg-[#0a1120]">Low</option>
        </select>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Records Table / Cards */}
      {filtered.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-rose-400 opacity-60" />
          </div>
          <div className="text-sm font-medium text-slate-300 mb-1">No Watchlist Records Found</div>
          <div className="text-xs text-slate-500 max-w-sm mb-4">
            No entries match your search criteria. Add vehicle plates to activate automated incident alerts.
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-500"
          >
            <Plus className="w-3.5 h-3.5" /> Enlist First Plate
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <th className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">PLATE ID</th>
                  <th className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">CATEGORY</th>
                  <th className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">PRIORITY</th>
                  <th className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">REASON / NOTES</th>
                  <th className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">ENFORCEMENT</th>
                  <th className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">DATE ADDED</th>
                  <th className="text-right text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((entry) => {
                  const typeCfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.custom;
                  const prioCfg = PRIORITY_BADGES[entry.priority] || PRIORITY_BADGES.medium;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Monospace Plate Number */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/50 border border-white/[0.12] font-mono text-xs font-bold text-white shadow-inner">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          {entry.plate}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${typeCfg.bg} ${typeCfg.border} ${typeCfg.text} ${typeCfg.glow}`}
                        >
                          {typeCfg.label}
                        </span>
                      </td>

                      {/* Priority Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${prioCfg.cls}`}
                        >
                          {prioCfg.label}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3 max-w-xs text-slate-300 truncate">
                        {entry.reason || <span className="text-slate-600 italic">No notes provided</span>}
                      </td>

                      {/* Active Status */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(entry)}
                          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                            entry.active
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-white/[0.04] border border-white/[0.08] text-slate-500'
                          }`}
                        >
                          {entry.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> ACTIVE
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-500" /> MUTED
                            </>
                          )}
                        </button>
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
