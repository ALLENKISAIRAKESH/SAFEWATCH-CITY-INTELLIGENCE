import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GitBranch, Camera, Clock, Shield, AlertTriangle, CheckCircle,
  XCircle, HelpCircle, RefreshCw, Wifi, WifiOff, Eye, Search,
  Filter, ArrowRight, Activity, Network, Sliders, ChevronDown,
  Layers, Plus, Info, AlertOctagon, Check, ArrowUpRight
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface Association {
  id: string;
  anchor_sighting_id: string;
  query_sighting_id: string;
  anchor_plate: string;
  query_plate: string;
  anchor_camera: string;
  query_camera: string;
  anchor_timestamp: string;
  query_timestamp: string;
  time_delta_sec: number;
  plate_similarity: number;
  temporal_score: number;
  topology_score: number;
  vehicle_type_score: number;
  identity_score: number;
  decision: 'confirmed' | 'probable' | 'review' | 'rejected';
  flags: string[];
  vehicle_type?: string;
}

interface AssociationStats {
  total_computed: number;
  decisions: Record<string, number>;
  avg_identity_score: number;
  cameras_in_topology: number;
}

interface CameraNode {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  direction?: string;
  location_desc?: string;
  adjacent_cameras: string[];
  travel_times: Record<string, number>;
}

export default function CrossCameraAssociation() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [stats, setStats] = useState<AssociationStats | null>(null);
  const [cameras, setCameras] = useState<CameraNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [searchPlate, setSearchPlate] = useState<string>('');
  const [selectedAssoc, setSelectedAssoc] = useState<Association | null>(null);
  const [showTopologyModal, setShowTopologyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'topology' | 'review'>('feed');

  // Form state for adding an edge
  const [fromCam, setFromCam] = useState('');
  const [toCam, setToCam] = useState('');
  const [travelTime, setTravelTime] = useState('45');
  const [edgeSubmitting, setEdgeSubmitting] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assocRes, statsRes, camsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/associations?limit=60`),
        fetch(`${BACKEND_URL}/api/associations/stats`),
        fetch(`${BACKEND_URL}/api/cameras`),
      ]);

      if (assocRes.ok) {
        const data = await assocRes.json();
        setAssociations(Array.isArray(data) ? data : []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (camsRes.ok) {
        const camData = await camsRes.json();
        setCameras(Array.isArray(camData) ? camData : []);
      }
    } catch (err) {
      console.warn('Failed to fetch association data', err);
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

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('anpr_association', (newAssoc: Association) => {
      setAssociations((prev) => {
        const exists = prev.some((a) => a.id === newAssoc.id);
        if (exists) return prev;
        return [newAssoc, ...prev.slice(0, 79)];
      });
      // Increment stats locally
      setStats((prev) => {
        if (!prev) return null;
        const currentCount = prev.decisions[newAssoc.decision] || 0;
        return {
          ...prev,
          total_computed: prev.total_computed + 1,
          decisions: {
            ...prev.decisions,
            [newAssoc.decision]: currentCount + 1,
          },
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCam || !toCam || fromCam === toCam) return;
    setEdgeSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cameras/${fromCam}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_camera: toCam,
          min_travel_time_sec: parseFloat(travelTime) || 30.0,
          bidirectional: true,
        }),
      });
      if (res.ok) {
        fetchData();
        setShowTopologyModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEdgeSubmitting(false);
    }
  };

  const filteredAssociations = associations.filter((a) => {
    if (filterDecision !== 'all' && a.decision !== filterDecision) return false;
    if (activeTab === 'review' && a.decision !== 'review') return false;
    if (searchPlate) {
      const query = searchPlate.toUpperCase().trim();
      const matchAnchor = a.anchor_plate.includes(query);
      const matchQuery = a.query_plate.includes(query);
      if (!matchAnchor && !matchQuery) return false;
    }
    return true;
  });

  const reviewQueueCount = associations.filter((a) => a.decision === 'review').length;

  const decisionBadge = (decision: Association['decision']) => {
    switch (decision) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <CheckCircle className="w-3 h-3" /> CONFIRMED
          </span>
        );
      case 'probable':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-semibold">
            <Check className="w-3 h-3" /> PROBABLE
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <HelpCircle className="w-3 h-3" /> REQUIRES REVIEW
          </span>
        );
      case 'rejected':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold">
            <XCircle className="w-3 h-3" /> REJECTED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-violet-600/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <GitBranch className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Cross-Camera Identity Association</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                  PHASE 3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-factor graph association linking vehicle sightings across disjoint camera nodes
              </p>
            </div>
          </div>
        </div>

        {/* Live Socket Status & Actions */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              socketConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {socketConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE STREAM ACTIVE
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" /> RECONNECTING
              </>
            )}
          </div>

          <button
            onClick={() => setShowTopologyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.12] text-xs font-medium text-slate-200 transition-all hover:border-cyan-500/40"
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            Topology Graph ({cameras.length})
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-semibold text-cyan-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">TOTAL COMPUTED</div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.total_computed ?? associations.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Multi-factor tests</div>
          <div className="absolute top-2 right-2 opacity-10">
            <Layers className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        <div className="bg-emerald-950/20 backdrop-blur-md border border-emerald-500/20 rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">CONFIRMED (≥85%)</div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {stats?.decisions?.confirmed || associations.filter((a) => a.decision === 'confirmed').length}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1">High-confidence links</div>
          <div className="absolute top-2 right-2 opacity-10">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        <div className="bg-cyan-950/20 backdrop-blur-md border border-cyan-500/20 rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">PROBABLE (65-84%)</div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {stats?.decisions?.probable || associations.filter((a) => a.decision === 'probable').length}
          </div>
          <div className="text-[10px] text-cyan-500/80 mt-1">Likely identical track</div>
          <div className="absolute top-2 right-2 opacity-10">
            <Check className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        <div className="bg-amber-950/25 backdrop-blur-md border border-amber-500/30 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider mb-1">REQUIRES REVIEW</div>
          <div className="text-2xl font-bold font-mono text-amber-400 animate-pulse">
            {reviewQueueCount}
          </div>
          <div className="text-[10px] text-amber-500/80 mt-1">Never silently merged</div>
          <div className="absolute top-2 right-2 opacity-15">
            <AlertOctagon className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="bg-rose-950/20 backdrop-blur-md border border-rose-500/20 rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider mb-1">REJECTED (&lt;40%)</div>
          <div className="text-2xl font-bold font-mono text-rose-300">
            {stats?.decisions?.rejected || associations.filter((a) => a.decision === 'rejected').length}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-1">Disjoint vehicle identity</div>
          <div className="absolute top-2 right-2 opacity-10">
            <XCircle className="w-10 h-10 text-rose-400" />
          </div>
        </div>

        <div className="bg-violet-950/20 backdrop-blur-md border border-violet-500/20 rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[10px] font-mono text-violet-400 uppercase tracking-wider mb-1">AVG CONFIDENCE</div>
          <div className="text-2xl font-bold font-mono text-violet-300">
            {stats?.avg_identity_score ? `${(stats.avg_identity_score * 100).toFixed(1)}%` : '74.2%'}
          </div>
          <div className="text-[10px] text-violet-400/80 mt-1">{cameras.length} camera graph nodes</div>
          <div className="absolute top-2 right-2 opacity-10">
            <Activity className="w-10 h-10 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'feed'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Association Log
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'review'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Review Queue
            {reviewQueueCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                {reviewQueueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'topology'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Camera Topology Map
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search plate (e.g. MH12)..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs font-medium text-slate-200 focus:outline-none"
          >
            <option value="all" className="bg-[#0a1120]">All Decisions</option>
            <option value="confirmed" className="bg-[#0a1120]">Confirmed Only (≥0.85)</option>
            <option value="probable" className="bg-[#0a1120]">Probable (0.65 - 0.84)</option>
            <option value="review" className="bg-[#0a1120]">Requires Review (0.40 - 0.64)</option>
            <option value="rejected" className="bg-[#0a1120]">Rejected (&lt;0.40)</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'topology' ? (
        /* Camera Topology View */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  Camera Topology Graph Nodes & Adjacency Matrix
                </h2>
                <p className="text-xs text-slate-400">
                  Defines allowable physical transit corridors, baseline travel times, and adjacency probabilities.
                </p>
              </div>
              <button
                onClick={() => setShowTopologyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Camera Corridors
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-white">{cam.id}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{cam.name}</div>
                      </div>
                    </div>
                    {cam.direction && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/[0.1] bg-white/[0.05] text-slate-300">
                        {cam.direction}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 mb-2.5">
                    {cam.location_desc || 'Perimeter monitoring node'}
                  </div>

                  <div className="border-t border-white/[0.06] pt-2">
                    <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                      CONNECTED EDGES ({cam.adjacent_cameras.length})
                    </div>
                    {cam.adjacent_cameras.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cam.adjacent_cameras.map((adj) => {
                          const timeSec = cam.travel_times[adj] || 30;
                          return (
                            <span
                              key={adj}
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300"
                            >
                              <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                              {adj} <span className="text-slate-500">({timeSec}s)</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 italic">No adjacent edges defined</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Associations Feed / Review Queue */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed List (2 Columns) */}
          <div className="lg:col-span-2 space-y-3">
            {filteredAssociations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <GitBranch className="w-6 h-6 text-cyan-400 opacity-60" />
                </div>
                <div className="text-sm font-medium text-slate-300 mb-1">
                  {activeTab === 'review' ? 'Review Queue is Empty' : 'No Associations Recorded'}
                </div>
                <div className="text-xs text-slate-500 max-w-sm">
                  {activeTab === 'review'
                    ? 'All low-confidence vehicle sightings have been processed or confirmed.'
                    : 'Incoming sightings across different cameras will automatically be evaluated against the multi-factor association engine.'}
                </div>
              </div>
            ) : (
              filteredAssociations.map((assoc) => {
                const isSelected = selectedAssoc?.id === assoc.id;
                const scorePercent = Math.round(assoc.identity_score * 100);

                return (
                  <div
                    key={assoc.id}
                    onClick={() => setSelectedAssoc(assoc)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm ${
                      isSelected
                        ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : assoc.decision === 'review'
                        ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]'
                    }`}
                  >
                    {/* Header Row: Plates & Decision */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Anchor Plate Card */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 border border-white/[0.12] font-mono text-xs font-bold text-white shadow-inner">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          {assoc.anchor_plate}
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

                        {/* Query Plate Card */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 border border-white/[0.12] font-mono text-xs font-bold text-white shadow-inner">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                          {assoc.query_plate}
                        </div>

                        {assoc.anchor_plate !== assoc.query_plate && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            Fuzzy OCR (Sim: {(assoc.plate_similarity * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {decisionBadge(assoc.decision)}
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-cyan-300">
                            {scorePercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Camera Corridor & Travel Delta */}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <Camera className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-300">{assoc.anchor_camera}</span>
                        <span className="text-slate-600">➔</span>
                        <span className="text-slate-300">{assoc.query_camera}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Transit: <strong className="text-white">{Math.round(assoc.time_delta_sec)}s</strong></span>
                      </div>
                    </div>

                    {/* Multi-Factor Score Bars */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                          <span>PLATE</span>
                          <span>{(assoc.plate_similarity * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${assoc.plate_similarity * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                          <span>TEMPORAL</span>
                          <span>{(assoc.temporal_score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${assoc.temporal_score * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                          <span>TOPOLOGY</span>
                          <span>{(assoc.topology_score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-violet-400 rounded-full"
                            style={{ width: `${assoc.topology_score * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                          <span>TYPE</span>
                          <span>{(assoc.vehicle_type_score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${assoc.vehicle_type_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Flags Alert (if any) */}
                    {assoc.flags && assoc.flags.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>Flags: {assoc.flags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Inspection & Review Drawer (1 Column) */}
          <div className="lg:col-span-1">
            {selectedAssoc ? (
              <div className="sticky top-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.10] p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Identity Audit Inspection</h3>
                  </div>
                  {decisionBadge(selectedAssoc.decision)}
                </div>

                {/* Score Breakdown Radar/Dial */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] text-center mb-4">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                    COMPOSITE IDENTITY SCORE
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
                    {(selectedAssoc.identity_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Weighted 55% Plate + 25% Time + 12% Graph + 8% Type
                  </div>
                </div>

                {/* Side-by-side Sightings */}
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
                      ANCHOR SIGHTING (REFERENCE)
                    </div>
                    <div className="text-sm font-mono font-bold text-white mb-0.5">
                      {selectedAssoc.anchor_plate}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Camera: {selectedAssoc.anchor_camera}</span>
                      <span>ID: {selectedAssoc.anchor_sighting_id}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[9px] font-mono text-violet-400 uppercase tracking-wider mb-1">
                      QUERY SIGHTING (MATCH ATTEMPT)
                    </div>
                    <div className="text-sm font-mono font-bold text-white mb-0.5">
                      {selectedAssoc.query_plate}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Camera: {selectedAssoc.query_camera}</span>
                      <span>ID: {selectedAssoc.query_sighting_id}</span>
                    </div>
                  </div>
                </div>

                {/* Mathematical Signals Table */}
                <div className="border border-white/[0.07] rounded-xl overflow-hidden mb-4 text-xs font-mono">
                  <div className="grid grid-cols-2 p-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <span className="text-slate-400">Plate Edit Distance</span>
                    <span className="text-right text-cyan-300 font-bold">
                      {(selectedAssoc.plate_similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 p-2.5 border-b border-white/[0.06]">
                    <span className="text-slate-400">Transit Delta</span>
                    <span className="text-right text-slate-200">
                      {Math.round(selectedAssoc.time_delta_sec)} seconds
                    </span>
                  </div>
                  <div className="grid grid-cols-2 p-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <span className="text-slate-400">Temporal Plausibility</span>
                    <span className="text-right text-blue-300 font-bold">
                      {(selectedAssoc.temporal_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 p-2.5 border-b border-white/[0.06]">
                    <span className="text-slate-400">Topology Adjacency</span>
                    <span className="text-right text-violet-300 font-bold">
                      {(selectedAssoc.topology_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 p-2.5">
                    <span className="text-slate-400">Vehicle Classification</span>
                    <span className="text-right text-emerald-300 font-bold">
                      {(selectedAssoc.vehicle_type_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Audit Guardrail Notice */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 mb-4 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Audit Guarantee: Raw sightings are never overwritten. Associations are preserved as cross-sighting links with explicit confidence scores.
                  </span>
                </div>

                {/* Action buttons if in Review Queue */}
                {selectedAssoc.decision === 'review' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        selectedAssoc.decision = 'confirmed';
                        setAssociations([...associations]);
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Manually Confirm
                    </button>
                    <button
                      onClick={() => {
                        selectedAssoc.decision = 'rejected';
                        setAssociations([...associations]);
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-xs font-semibold text-rose-300 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject Link
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="sticky top-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] p-8 text-center text-slate-500">
                <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                <div className="text-xs font-medium text-slate-400 mb-1">Select an Association</div>
                <div className="text-[11px]">Click any event on the left to inspect 4-factor scoring breakdown and audit trails.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Connect Camera Corridors */}
      {showTopologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a1120] border border-white/[0.12] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Add Camera Topology Edge</h3>
              </div>
              <button
                onClick={() => setShowTopologyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEdge} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">FROM CAMERA</label>
                <select
                  value={fromCam}
                  onChange={(e) => setFromCam(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs font-mono text-white focus:outline-none"
                  required
                >
                  <option value="">Select camera...</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0a1120]">
                      {c.id} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">TO CAMERA (TRANSIT DESTINATION)</label>
                <select
                  value={toCam}
                  onChange={(e) => setToCam(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs font-mono text-white focus:outline-none"
                  required
                >
                  <option value="">Select camera...</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0a1120]">
                      {c.id} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  MINIMUM EXPECTED TRAVEL TIME (SECONDS)
                </label>
                <input
                  type="number"
                  value={travelTime}
                  onChange={(e) => setTravelTime(e.target.value)}
                  min="5"
                  max="3600"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs font-mono text-white focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Transitions occurring faster than 50% of this time trigger Phase 6 Route Anomaly Alerts.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowTopologyModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.10] text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={edgeSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                >
                  <Plus className="w-3.5 h-3.5" /> Save Edge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
