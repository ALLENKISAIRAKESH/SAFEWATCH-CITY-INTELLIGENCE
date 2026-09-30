import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Search, Camera, Clock, Shield, AlertTriangle, CheckCircle,
  XCircle, HelpCircle, RefreshCw, Wifi, WifiOff, Eye, Copy, Filter
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

interface AnprStatus {
  enabled: boolean;
  model_version: string;
  sighting_count: number;
  plate_count: number;
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function confidenceColor(conf: number): string {
  if (conf >= 0.85) return 'text-emerald-400';
  if (conf >= 0.65) return 'text-amber-400';
  return 'text-red-400';
}

function confidenceBg(conf: number): string {
  if (conf >= 0.85) return 'bg-emerald-500/15 border-emerald-500/30';
  if (conf >= 0.65) return 'bg-amber-500/15 border-amber-500/30';
  return 'bg-red-500/15 border-red-500/30';
}

function ValidationBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    valid:    { icon: CheckCircle, label: 'Valid',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    probable: { icon: HelpCircle,  label: 'Probable', cls: 'text-amber-400  bg-amber-500/10  border-amber-500/20'  },
    invalid:  { icon: XCircle,     label: 'Invalid',  cls: 'text-red-400    bg-red-500/10    border-red-500/20'    },
    unknown:  { icon: HelpCircle,  label: 'Unknown',  cls: 'text-slate-400  bg-slate-500/10  border-slate-500/20'  },
  };
  const { icon: Icon, label, cls } = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

function SimBadge() {
  return (
    <span className="inline-flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded border text-orange-400 bg-orange-500/10 border-orange-500/20 animate-pulse">
      SIMULATION
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      LIVE
    </span>
  );
}

// ─── Sighting Card ────────────────────────────────────────────────────────

function SightingCard({ s, flash }: { s: Sighting; flash: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(s.normalized_plate);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-500 p-4
        ${flash
          ? 'bg-sky-500/10 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12]'
        }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-lg font-bold text-white tracking-wider">
            {s.normalized_plate || '—'}
          </span>
          {s.simulated ? <SimBadge /> : <LiveBadge />}
          <ValidationBadge status={s.validation_status} />
        </div>
        <button
          onClick={copy}
          title="Copy plate"
          className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Confidence bars */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`rounded-lg border px-2.5 py-1.5 ${confidenceBg(s.plate_confidence)}`}>
          <div className="text-[9px] text-slate-500 font-mono mb-0.5">CONSENSUS CONF</div>
          <div className={`text-sm font-bold font-mono ${confidenceColor(s.plate_confidence)}`}>
            {(s.plate_confidence * 100).toFixed(1)}%
          </div>
        </div>
        <div className={`rounded-lg border px-2.5 py-1.5 ${confidenceBg(s.ocr_confidence)}`}>
          <div className="text-[9px] text-slate-500 font-mono mb-0.5">OCR CONF</div>
          <div className={`text-sm font-bold font-mono ${confidenceColor(s.ocr_confidence)}`}>
            {(s.ocr_confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Camera className="w-3 h-3 flex-shrink-0" />
          <span className="truncate font-mono">{s.camera_id?.split('/').pop()?.substring(0, 20) || s.camera_id}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono">{new Date(s.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Eye className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono">{s.observation_count} frames</span>
          {s.disagreement_count > 0 && (
            <span className="text-amber-500/70">({s.disagreement_count} disagree)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Shield className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono truncate">{s.ocr_engine}</span>
        </div>
      </div>

      {/* Raw OCR (if different from normalized) */}
      {s.raw_ocr && s.raw_ocr !== s.normalized_plate && (
        <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
          <div className="text-[9px] text-slate-600 font-mono mb-0.5">RAW OCR</div>
          <div className="font-mono text-xs text-slate-500 break-all">{s.raw_ocr}</div>
        </div>
      )}

      {/* Consensus reason */}
      <div className="mt-2 pt-2 border-t border-white/[0.05]">
        <div className="text-[9px] text-slate-600 font-mono leading-relaxed">{s.consensus_reason}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function LiveANPR() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<AnprStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState('');
  const [validOnly, setValidOnly] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const MAX_SIGHTINGS = 100;

  // Fetch initial status and recent sightings
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/anpr/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});

    fetch(`${BACKEND_URL}/api/sightings?limit=50`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSightings(data);
      })
      .catch(() => {});
  }, []);

  // Socket.IO real-time sightings
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('anpr_sighting', (s: Sighting) => {
      setSightings(prev => {
        const next = [s, ...prev].slice(0, MAX_SIGHTINGS);
        return next;
      });
      // Flash animation for new sighting
      setFlashIds(prev => {
        const next = new Set(prev);
        next.add(s.id);
        return next;
      });
      setTimeout(() => {
        setFlashIds(prev => {
          const next = new Set(prev);
          next.delete(s.id);
          return next;
        });
      }, 2000);

      // Refresh status counter
      setStatus(prev => prev ? {
        ...prev,
        sighting_count: prev.sighting_count + 1,
      } : prev);
    });

    return () => { socket.disconnect(); };
  }, []);

  const filtered = sightings.filter(s => {
    const matchesText = !filter || s.normalized_plate.includes(filter.toUpperCase());
    const matchesValid = !validOnly || s.validation_status === 'valid';
    return matchesText && matchesValid;
  });

  function refreshSightings() {
    fetch(`${BACKEND_URL}/api/sightings?limit=50`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSightings(data); })
      .catch(() => {});
  }

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Live ANPR</h1>
          {connected
            ? <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400"><Wifi className="w-3 h-3" /> Connected</span>
            : <span className="flex items-center gap-1 text-[10px] font-mono text-red-400"><WifiOff className="w-3 h-3" /> Disconnected</span>
          }
        </div>
        <p className="text-sm text-slate-500">
          Real-time automatic number plate recognition — multi-frame consensus · evidence-backed
        </p>
      </div>

      {/* Status bar */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'ANPR ENGINE', value: status.enabled ? 'Active' : 'Offline', cls: status.enabled ? 'text-emerald-400' : 'text-red-400' },
            { label: 'TOTAL SIGHTINGS', value: status.sighting_count.toString(), cls: 'text-sky-400' },
            { label: 'UNIQUE PLATES', value: status.plate_count.toString(), cls: 'text-violet-400' },
            { label: 'OCR MODEL', value: status.model_version.split('+')[1] || 'N/A', cls: 'text-amber-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
              <div className="text-[9px] font-mono text-slate-600 mb-1">{label}</div>
              <div className={`text-sm font-bold font-mono truncate ${cls}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by plate (e.g. MH12)"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg pl-9 pr-4 py-2 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50"
          />
        </div>
        <button
          onClick={() => setValidOnly(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
            validOnly
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-white/[0.04] border-white/[0.10] text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Valid only
        </button>
        <button
          onClick={refreshSightings}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.10] bg-white/[0.04] text-slate-400 hover:text-white text-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Sightings grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-slate-600" />
          </div>
          <div className="text-slate-500 text-sm mb-1">No sightings yet</div>
          <div className="text-slate-700 text-xs font-mono">
            {!status?.enabled
              ? 'ANPR engine is offline. Check backend logs and model availability.'
              : 'Waiting for vehicle detections. Start a video stream to begin.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <SightingCard key={s.id} s={s} flash={flashIds.has(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
