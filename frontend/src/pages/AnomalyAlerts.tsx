import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, RefreshCw, CheckCircle, Clock, MapPin,
  Car, Shield, Activity, XCircle, Eye, ArrowRight, Zap,
  AlertOctagon, Check, Filter, Search, ExternalLink, HelpCircle,
  TrendingDown, TrendingUp, Compass
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface AnomalyEvent {
  id: string;
  plate: string;
  anomaly_type: 'impossible_transition' | 'speed_violation' | 'route_deviation' | string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  camera_from: string;
  camera_to: string;
  timestamp: string;
  travel_time_sec: number;
  expected_min_sec: number;
  confidence: number;
  resolved: boolean;
}

interface AnomalyStats {
  total_events: number;
  unresolved: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  tracked_plates: number;
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string; glow: string }
> = {
  critical: {
    label: 'CRITICAL',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
  },
  high: {
    label: 'HIGH',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
  },
  medium: {
    label: 'MEDIUM',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  },
  low: {
    label: 'LOW',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    glow: '',
  },
};

export default function AnomalyAlerts() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('unresolved');
  const [searchPlate, setSearchPlate] = useState('');
  const [socketActive, setSocketActive] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, stRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/anomalies?limit=100`),
        fetch(`${BACKEND_URL}/api/anomalies/stats`),
      ]);
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvents(Array.isArray(evData) ? evData : []);
      }
      if (stRes.ok) {
        setStats(await stRes.json());
      }
    } catch (err) {
      console.warn('Failed to load anomaly data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const socket = io(BACKEND_URL, {
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketActive(true));
    socket.on('disconnect', () => setSocketActive(false));

    socket.on('anpr_anomaly', (newAnomaly: AnomalyEvent) => {
      setEvents((prev) => [newAnomaly, ...prev.filter((e) => e.id !== newAnomaly.id).slice(0, 99)]);
      setStats((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          total_events: prev.total_events + 1,
          unresolved: prev.unresolved + 1,
          by_severity: {
            ...prev.by_severity,
            [newAnomaly.severity]: (prev.by_severity[newAnomaly.severity] || 0) + 1,
          },
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  async function resolveEvent(id: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/anomalies/${id}`, { method: 'PATCH' });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, resolved: true } : e))
        );
        setStats((prev) => (prev ? { ...prev, unresolved: Math.max(0, prev.unresolved - 1) } : null));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredEvents = events.filter((e) => {
    if (filterStatus === 'unresolved' && e.resolved) return false;
    if (filterStatus === 'resolved' && !e.resolved) return false;
    if (filterType !== 'all' && e.anomaly_type !== filterType) return false;
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    if (searchPlate && !e.plate.includes(searchPlate.toUpperCase().trim())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600/30 to-rose-600/30 border border-amber-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Route & Transition Anomaly Detection</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                  PHASE 6
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Physics-based route plausibility, cloned plate detection, and impossible transit velocities
              </p>
            </div>
          </div>
        </div>

        {/* Live Status & Controls */}
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
            {socketActive ? 'LIVE DETECTOR RUNNING' : 'DETECTOR OFFLINE'}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] text-slate-300 hover:text-white text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">TOTAL ANOMALIES</div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.total_events ?? events.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Recorded violations</div>
          <div className="absolute top-2 right-2 opacity-10">
            <Activity className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        <div className="bg-amber-950/20 backdrop-blur-md border border-amber-500/30 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-1">UNRESOLVED QUEUE</div>
          <div className={`text-2xl font-bold font-mono ${stats?.unresolved ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
            {stats?.unresolved ?? events.filter((e) => !e.resolved).length}
          </div>
          <div className="text-[10px] text-amber-500/80 mt-1">Pending investigation</div>
          <div className="absolute top-2 right-2 opacity-15">
            <AlertOctagon className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="bg-rose-950/20 backdrop-blur-md border border-rose-500/30 rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider mb-1">CRITICAL SEVERITY</div>
          <div className="text-2xl font-bold font-mono text-rose-300">
            {stats?.by_severity?.critical ?? events.filter((e) => e.severity === 'critical').length}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-1">Auto-incidents triggered</div>
          <div className="absolute top-2 right-2 opacity-10">
            <Zap className="w-10 h-10 text-rose-400" />
          </div>
        </div>

        <div className="bg-sky-950/20 backdrop-blur-md border border-sky-500/20 rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-sky-400 uppercase tracking-wider mb-1">TRACKED PLATES</div>
          <div className="text-2xl font-bold font-mono text-sky-300">
            {stats?.tracked_plates ?? 14}
          </div>
          <div className="text-[10px] text-sky-500/80 mt-1">Active transit memory</div>
          <div className="absolute top-2 right-2 opacity-10">
            <Car className="w-10 h-10 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search anomaly by plate number..."
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs font-medium">
          <button
            onClick={() => setFilterStatus('unresolved')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterStatus === 'unresolved'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterStatus === 'resolved'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterStatus === 'all'
                ? 'bg-white/[0.10] text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all" className="bg-[#0a1120]">All Anomaly Types</option>
          <option value="impossible_transition" className="bg-[#0a1120]">Impossible Transition</option>
          <option value="speed_violation" className="bg-[#0a1120]">Speed Violation</option>
          <option value="route_deviation" className="bg-[#0a1120]">Route Deviation</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all" className="bg-[#0a1120]">All Severities</option>
          <option value="critical" className="bg-[#0a1120]">Critical</option>
          <option value="high" className="bg-[#0a1120]">High</option>
          <option value="medium" className="bg-[#0a1120]">Medium</option>
          <option value="low" className="bg-[#0a1120]">Low</option>
        </select>
      </div>

      {/* Events Feed */}
      {filteredEvents.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white mb-1">No Anomalies Detected</div>
          <div className="text-xs text-slate-400 max-w-sm">
            All detected vehicle transits comply with road topology, speed limits, and single-instance physical constraints.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const sev = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.medium;
            const speedRatio = (event.expected_min_sec / Math.max(1, event.travel_time_sec)).toFixed(1);

            return (
              <div
                key={event.id}
                className={`p-4 rounded-xl border transition-all backdrop-blur-sm relative overflow-hidden ${
                  event.resolved
                    ? 'bg-white/[0.02] border-white/[0.05] opacity-60'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-amber-500/40 shadow-lg'
                }`}
              >
                {/* Top Row: Plate, Badges, Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Plate Display */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/60 border border-white/[0.15] font-mono text-xs font-bold text-white shadow-inner">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      {event.plate}
                    </div>

                    {/* Severity Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sev.bg} ${sev.border} ${sev.text} ${sev.glow}`}
                    >
                      {sev.label}
                    </span>

                    {/* Type Badge */}
                    <span className="text-[10px] font-mono text-slate-300 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                      {event.anomaly_type.replace(/_/g, ' ').toUpperCase()}
                    </span>

                    {event.resolved && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <Check className="w-3 h-3" /> RESOLVED
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Link to SafeWatch Incidents if Critical/High */}
                    {(event.severity === 'critical' || event.severity === 'high') && (
                      <button
                        onClick={() => navigate('/incidents')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-all"
                        title="View Incident Record"
                      >
                        <ExternalLink className="w-3 h-3" /> Incident Created
                      </button>
                    )}

                    {!event.resolved && (
                      <button
                        onClick={() => resolveEvent(event.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                  {event.description}
                </p>

                {/* Transition Corridor Visualizer */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] mb-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.1] text-white">
                        {event.camera_from}
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <span className="w-8 h-px bg-white/[0.2] block"></span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        <span className="w-8 h-px bg-white/[0.2] block"></span>
                      </div>
                      <div className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.1] text-white">
                        {event.camera_to}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px]">
                      <div>
                        <span className="text-slate-500 mr-1">Actual:</span>
                        <strong className="text-rose-400 font-bold">{event.travel_time_sec.toFixed(0)}s</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 mr-1">Expected Min:</span>
                        <strong className="text-slate-300">{event.expected_min_sec.toFixed(0)}s</strong>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                        {speedRatio}x Faster than Physical Speed Limit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span>ID: {event.id}</span>
                  <div className="flex items-center gap-4">
                    <span>Confidence: {(event.confidence * 100).toFixed(0)}%</span>
                    <span>Detected: {new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
