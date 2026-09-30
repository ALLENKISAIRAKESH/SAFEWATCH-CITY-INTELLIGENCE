import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, ScanLine, Search, Route, BarChart3, Shield, AlertTriangle,
  Activity, ChevronRight, Wifi, WifiOff, CheckCircle, Clock,
  Gauge, Eye, MapPin, GitBranch, Network, Sparkles, Layers,
  Compass, ArrowUpRight
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface Capabilities {
  anpr: boolean;
  tracking: boolean;
  association: boolean;
  watchlist: boolean;
  trajectory: boolean;
  traffic: boolean;
  anomaly: boolean;
  evaluation: boolean;
  database: string;
  ai_model: boolean;
  timestamp?: string;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full inline-block ${
        active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-600'
      }`}
    />
  );
}

export default function VehicleIntelligence() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/capabilities`)
      .then((r) => r.json())
      .then((data) => {
        setCaps(data);
        setConnected(true);
      })
      .catch(() => setConnected(false));
  }, []);

  const modules = [
    {
      phase: 'Phase 1',
      title: 'Live ANPR Stream',
      desc: 'Real-time multi-frame consensus OCR pipeline with morphological filtering and confidence gating',
      icon: ScanLine,
      path: '/vehicle-intelligence/live-anpr',
      color: 'sky',
      enabled: caps?.anpr ?? false,
      badge: 'LIVE',
    },
    {
      phase: 'Phase 1 & 4',
      title: 'Vehicle Search & Trajectory',
      desc: 'Query historical plate sightings and reconstruct chronological spatial-temporal journey timelines',
      icon: Search,
      path: '/vehicle-intelligence/search',
      color: 'violet',
      enabled: caps?.anpr ?? false,
      badge: 'SEARCH',
    },
    {
      phase: 'Phase 3',
      title: 'Cross-Camera Association',
      desc: 'Multi-factor graph association linking sightings across camera nodes via plate, temporal, and topology scores',
      icon: GitBranch,
      path: '/vehicle-intelligence/associations',
      color: 'cyan',
      enabled: caps?.association ?? true,
      badge: 'GRAPH',
    },
    {
      phase: 'Phase 6',
      title: 'Watchlist Manager',
      desc: 'Real-time detection and automated incident creation for Stolen, Wanted, VIP, and Blacklist targets',
      icon: Shield,
      path: '/vehicle-intelligence/watchlists',
      color: 'rose',
      enabled: caps?.watchlist ?? false,
      badge: 'ALERTS',
    },
    {
      phase: 'Phase 5',
      title: 'Traffic Analytics',
      desc: 'Density heatmaps, congestion bottlenecks, and origin-destination flow matrices across cameras',
      icon: BarChart3,
      path: '/vehicle-intelligence/traffic',
      color: 'amber',
      enabled: caps?.traffic ?? false,
      badge: 'FLOW',
    },
    {
      phase: 'Phase 6',
      title: 'Route Anomaly Detection',
      desc: 'Flags impossible transitions, transit velocity violations, and cloned/spoofed plates',
      icon: AlertTriangle,
      path: '/vehicle-intelligence/anomalies',
      color: 'orange',
      enabled: caps?.anomaly ?? false,
      badge: 'ANOMALY',
    },
    {
      phase: 'Phase 7',
      title: 'ANPR Evaluation & Benchmarks',
      desc: 'Pipeline accuracy validation: Precision, Recall, Character Error Rate (CER), and inference FPS',
      icon: Gauge,
      path: '/vehicle-intelligence/evaluation',
      color: 'emerald',
      enabled: caps?.evaluation ?? false,
      badge: 'METRICS',
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    sky: {
      bg: 'bg-sky-500/15',
      border: 'border-sky-500/30',
      text: 'text-sky-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    },
    violet: {
      bg: 'bg-violet-500/15',
      border: 'border-violet-500/30',
      text: 'text-violet-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    },
    cyan: {
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    },
    rose: {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    },
    amber: {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
    orange: {
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    },
    emerald: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
  };

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600/30 via-cyan-600/30 to-sky-600/30 border border-violet-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              <Car className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">SafeWatch City Intelligence</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300">
                  SIH-26127 AI PLATFORM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                City-scale automated number plate recognition (ANPR), cross-camera vehicle trajectory reconstruction, hotlists, and traffic flow intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Live Backend Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {connected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>INTELLIGENCE SERVER ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>SERVER OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Capabilities Status Matrix */}
      {caps && (
        <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              PIPELINE SUBSYSTEM CAPABILITIES
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Storage: <strong className="text-white font-semibold">{caps.database}</strong> • Model:{' '}
              <strong className={caps.ai_model ? 'text-emerald-400' : 'text-red-400'}>
                {caps.ai_model ? 'YOLOv8 Active' : 'Fallback Engine'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: 'ANPR P1', active: caps.anpr },
              { label: 'Tracking P2', active: caps.tracking },
              { label: 'Assoc P3', active: caps.association },
              { label: 'Trajectory P4', active: caps.trajectory },
              { label: 'Traffic P5', active: caps.traffic },
              { label: 'Watchlist P6', active: caps.watchlist },
              { label: 'Anomaly P6', active: caps.anomaly },
              { label: 'Evaluation P7', active: caps.evaluation },
            ].map(({ label, active }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5"
              >
                <StatusDot active={active} />
                <span className="text-[10px] font-mono text-slate-300 font-medium truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Module Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const styling = colorMap[mod.color] || colorMap.sky;

          return (
            <Link
              key={mod.path}
              to={mod.path}
              className={`group rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between backdrop-blur-sm ${
                styling.glow
              } ${
                mod.enabled
                  ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.18]'
                  : 'bg-white/[0.01] border-white/[0.04] opacity-50 pointer-events-none'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center ${styling.bg} ${styling.border} ${styling.text}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/[0.1] bg-white/[0.05] text-slate-300 font-semibold">
                      {mod.phase}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-cyan-300 transition-colors">
                  {mod.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{mod.desc}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <StatusDot active={mod.enabled} />
                  <span className="text-[10px] font-mono text-slate-400">
                    {mod.enabled ? 'ACTIVE MODULE' : 'DISABLED'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 group-hover:underline">
                  Launch →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
