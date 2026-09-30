import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Camera, Clock, Shield, Filter, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, HelpCircle, RefreshCw,
  ArrowRight, Copy, Eye, Loader2, GitBranch, MapPin, Compass,
  Activity, AlertOctagon, Layers, ArrowUpRight, Zap, Car
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface Sighting {
  id: string;
  normalized_plate: string;
  raw_ocr: string;
  camera_id: string;
  timestamp: string;
  plate_confidence: number;
  ocr_confidence: number;
  validation_status: 'valid' | 'probable' | 'invalid' | 'unknown';
  track_id: string;
  observation_count: number;
  disagreement_count: number;
  frame_reference: string | null;
  model_version: string;
  ocr_engine: string;
  consensus_reason: string;
  simulated: boolean;
}

interface TrajectoryPoint {
  sighting_id: string;
  camera_id: string;
  timestamp: string;
  timestamp_epoch: number;
  plate: string;
  confidence: number;
  latitude?: number;
  longitude?: number;
  camera_name?: string;
}

interface Trajectory {
  id: string;
  plate: string;
  points: TrajectoryPoint[];
  total_cameras: number;
  first_seen: string;
  last_seen: string;
  duration_seconds: number;
  status: 'active' | 'complete' | 'stale';
}

interface Association {
  id: string;
  anchor_plate: string;
  query_plate: string;
  anchor_camera: string;
  query_camera: string;
  identity_score: number;
  decision: string;
  time_delta_sec: number;
}

interface WatchlistMatch {
  id: string;
  plate: string;
  type: string;
  priority: string;
  reason: string;
}

interface AnomalyMatch {
  id: string;
  plate: string;
  anomaly_type: string;
  severity: string;
  description: string;
}

const EXAMPLES = ['MH12AB1234', 'DL01CA4321', 'KA03HA9999', 'HR26DK8888', 'MH12'];

function ValidationBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    valid: { icon: CheckCircle, label: 'Valid', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    probable: { icon: HelpCircle, label: 'Probable', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    invalid: { icon: XCircle, label: 'Invalid', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    unknown: { icon: HelpCircle, label: 'Unknown', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  };
  const cfg = map[status] || map.unknown;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function confidenceColor(conf: number) {
  if (conf >= 0.85) return 'text-emerald-400';
  if (conf >= 0.65) return 'text-amber-400';
  return 'text-red-400';
}

export default function VehicleSearch() {
  const [query, setQuery] = useState('');
  const [filterCamera, setFilterCamera] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Results
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [watchlistHit, setWatchlistHit] = useState<WatchlistMatch | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyMatch[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'timeline' | 'sightings' | 'associations'>('timeline');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, [searchParams]);

  async function doSearch(plateQuery: string) {
    const q = plateQuery.trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setSightings([]);
    setTrajectory(null);
    setAssociations([]);
    setWatchlistHit(null);
    setAnomalies([]);

    try {
      // 1. Fetch sightings
      const params = new URLSearchParams({ plate: q });
      if (filterCamera) params.append('camera', filterCamera);

      const [sightRes, trajRes, assocRes, wlRes, anomRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/anpr/sightings?${params}`),
        fetch(`${BACKEND_URL}/api/vehicles/${q}/trajectory`),
        fetch(`${BACKEND_URL}/api/associations?plate=${q}`),
        fetch(`${BACKEND_URL}/api/watchlists`),
        fetch(`${BACKEND_URL}/api/anomalies?plate=${q}`),
      ]);

      if (sightRes.status === 'fulfilled' && sightRes.value.ok) {
        const data = await sightRes.value.json();
        setSightings(Array.isArray(data) ? data : []);
      }

      if (trajRes.status === 'fulfilled' && trajRes.value.ok) {
        const tData = await trajRes.value.json();
        if (tData && tData.points && tData.points.length > 0) {
          setTrajectory(tData);
        }
      }

      if (assocRes.status === 'fulfilled' && assocRes.value.ok) {
        const aData = await assocRes.value.json();
        setAssociations(Array.isArray(aData) ? aData : []);
      }

      if (wlRes.status === 'fulfilled' && wlRes.value.ok) {
        const wlList: WatchlistMatch[] = await wlRes.value.json();
        const hit = wlList.find((w) => w.plate === q);
        if (hit) setWatchlistHit(hit);
      }

      if (anomRes.status === 'fulfilled' && anomRes.value.ok) {
        const anomList: AnomalyMatch[] = await anomRes.value.json();
        setAnomalies(Array.isArray(anomList) ? anomList : []);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
  }

  const totalSightings = sightings.length;
  const uniqueCameras = new Set(sightings.map((s) => s.camera_id)).size;
  const avgConf =
    sightings.reduce((sum, s) => sum + s.plate_confidence, 0) / (sightings.length || 1);

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <Search className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Vehicle Journey & Plate Search</h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-300">
                PHASE 1 & 4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Query historical plate sightings, reconstruct spatial-temporal trajectories, and verify security watchlists
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={onSubmit} className="mb-6">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter exact or prefix license plate (e.g. MH12AB1234)..."
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all"
              autoFocus
            />
          </div>

          <input
            type="text"
            placeholder="Camera filter (optional)"
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.12] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 w-44 font-mono"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Execute Search
          </button>
        </div>

        {/* Quick Examples */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-slate-500 font-mono">QUICK TARGETS:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                doSearch(ex);
              }}
              className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-violet-500/40 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {/* Error notification */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Active Watchlist / Anomaly Security Banners */}
      {searched && (watchlistHit || anomalies.length > 0) && (
        <div className="space-y-3 mb-6">
          {watchlistHit && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-between shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">SECURITY ALERT: {watchlistHit.plate}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300">
                      {watchlistHit.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-rose-400">PRIORITY: {watchlistHit.priority.toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{watchlistHit.reason || 'Flagged security watch target.'}</div>
                </div>
              </div>
            </div>
          )}

          {anomalies.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">ROUTE ANOMALY FLAGGED</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      {anomalies[0].anomaly_type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{anomalies[0].description}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Overview Metrics */}
      {searched && !loading && !error && sightings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">TOTAL SIGHTINGS</div>
            <div className="text-2xl font-bold font-mono text-violet-400">{totalSightings}</div>
            <div className="text-[10px] text-slate-500 mt-1">Multi-frame consensus</div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">CAMERAS VISITED</div>
            <div className="text-2xl font-bold font-mono text-sky-400">{uniqueCameras}</div>
            <div className="text-[10px] text-slate-500 mt-1">Disjoint topological nodes</div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">AVG OCR CONFIDENCE</div>
            <div className={`text-2xl font-bold font-mono ${confidenceColor(avgConf)}`}>
              {(avgConf * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Weighted consensus mean</div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">JOURNEY SPAN</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {trajectory?.duration_seconds ? `${Math.round(trajectory.duration_seconds)}s` : 'Single Point'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Total transit duration</div>
          </div>
        </div>
      )}

      {/* Tabs Control */}
      {searched && !loading && sightings.length > 0 && (
        <div className="flex items-center gap-2 mb-5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chronological Journey (Phase 4)
          </button>
          <button
            onClick={() => setActiveTab('sightings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sightings'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sightings Log ({sightings.length})
          </button>
          <button
            onClick={() => setActiveTab('associations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'associations'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Identity Links ({associations.length})
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {searched && !loading && sightings.length > 0 && (
        <div>
          {/* TAB 1: Chronological Journey Timeline (Phase 4) */}
          {activeTab === 'timeline' && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-violet-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    RECONSTRUCTED SPATIAL-TEMPORAL TRAJECTORY
                  </h3>
                </div>
                {trajectory && (
                  <span className="text-xs font-mono text-slate-400">
                    Status: <strong className="text-emerald-400 uppercase font-semibold">{trajectory.status}</strong>
                  </span>
                )}
              </div>

              {trajectory && trajectory.points.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-violet-500 before:via-cyan-500 before:to-emerald-500">
                  {trajectory.points.map((pt, idx) => {
                    const prevPt = idx > 0 ? trajectory.points[idx - 1] : null;
                    const deltaSec = prevPt ? Math.round(pt.timestamp_epoch - prevPt.timestamp_epoch) : 0;

                    return (
                      <div key={pt.sighting_id} className="relative group">
                        {/* Waypoint Dot */}
                        <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-[#0a1120] border-2 border-violet-400 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        </div>

                        {/* Waypoint Card */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-violet-500/40 transition-all">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 font-bold">
                                WAYPOINT #{idx + 1}
                              </span>
                              <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                {pt.camera_id}
                                {pt.camera_name && <span className="text-slate-400 font-normal">({pt.camera_name})</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-slate-500">Confidence:</span>
                              <strong className={confidenceColor(pt.confidence)}>
                                {(pt.confidence * 100).toFixed(1)}%
                              </strong>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-400 mt-2 pt-2 border-t border-white/[0.05]">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{new Date(pt.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div>
                              <span>Sighting Ref: {pt.sighting_id}</span>
                            </div>
                            {prevPt && (
                              <div className="text-right text-cyan-300">
                                <span>Transit from previous: {deltaSec}s</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Trajectory points currently based on isolated camera sighting. Add cross-camera topology transitions to enrich trajectory.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Sightings Log (Phase 1) */}
          {activeTab === 'sightings' && (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                      {['PLATE', 'STATUS', 'CONFIDENCE', 'CAMERA ID', 'TIMESTAMP', 'CONSENSUS REASON'].map((h) => (
                        <th key={h} className="text-left text-[9px] font-mono text-slate-500 px-4 py-3 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {sightings.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.1]">
                            {s.normalized_plate}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ValidationBadge status={s.validation_status} />
                        </td>
                        <td className={`px-4 py-3 font-mono font-bold ${confidenceColor(s.plate_confidence)}`}>
                          {(s.plate_confidence * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">{s.camera_id}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {new Date(s.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-xs">{s.consensus_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Identity Links & Associations (Phase 3) */}
          {activeTab === 'associations' && (
            <div className="space-y-3">
              {associations.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  No cross-camera identity links recorded for this target plate yet.
                </div>
              ) : (
                associations.map((assoc) => (
                  <div
                    key={assoc.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded bg-black/50 border border-white/[0.1] text-white font-bold">
                          {assoc.anchor_plate}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="px-2.5 py-1 rounded bg-black/50 border border-white/[0.1] text-white font-bold">
                          {assoc.query_plate}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({assoc.anchor_camera} ➔ {assoc.query_camera})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        Score: {(assoc.identity_score * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 uppercase">
                        {assoc.decision}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && sightings.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-slate-500" />
          </div>
          <div className="text-slate-300 text-sm font-semibold mb-1">No Historical Sightings Found for "{query}"</div>
          <div className="text-slate-500 text-xs font-mono max-w-sm">
            Try a partial prefix (e.g. "MH12") or verify that the plate has passed an active ANPR camera node.
          </div>
        </div>
      )}
    </div>
  );
}
