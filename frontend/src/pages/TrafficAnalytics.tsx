import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, RefreshCw, Activity, TrendingUp, AlertTriangle,
  MapPin, ArrowRight, Clock, Gauge, Car
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface DensityData {
  camera_id: string;
  vehicle_count: number;
  density_level: string;
  timestamp: string;
  window_seconds: number;
}

interface CongestionData {
  camera_id: string;
  camera_name: string;
  congestion_score: number;
  congestion_level: string;
  current_vehicle_count: number;
  historical_avg: number;
  deviation_pct: number;
  is_bottleneck: boolean;
}

interface ODFlow {
  origin_camera: string;
  destination_camera: string;
  vehicle_count: number;
  avg_travel_time_sec: number;
}

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    moderate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    congested: 'text-red-400 bg-red-500/10 border-red-500/20',
    free: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    light: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    heavy: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    gridlock: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${map[level] || map.low}`}>
      {level.toUpperCase()}
    </span>
  );
}

function CongestionBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? 'bg-red-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TrafficAnalytics() {
  const [density, setDensity] = useState<DensityData[]>([]);
  const [congestion, setCongestion] = useState<CongestionData[]>([]);
  const [odFlows, setOdFlows] = useState<ODFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'density' | 'congestion' | 'od'>('density');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [denRes, conRes, odRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/analytics/density`),
        fetch(`${BACKEND_URL}/api/analytics/congestion`),
        fetch(`${BACKEND_URL}/api/analytics/od`),
      ]);
      setDensity(await denRes.json());
      setCongestion(await conRes.json());
      setOdFlows(await odRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bottlenecks = congestion.filter(c => c.is_bottleneck);
  const totalVehicles = density.reduce((s, d) => s + d.vehicle_count, 0);

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold">Traffic Analytics</h1>
          <button
            onClick={fetchData}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.10] bg-white/[0.04] text-slate-400 hover:text-white text-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <p className="text-sm text-slate-500">Vehicle density, congestion analysis, and origin-destination flows</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
          <div className="text-[9px] font-mono text-slate-600 mb-1">TOTAL VEHICLES</div>
          <div className="text-xl font-bold text-amber-400">{totalVehicles}</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
          <div className="text-[9px] font-mono text-slate-600 mb-1">CAMERAS MONITORED</div>
          <div className="text-xl font-bold text-sky-400">{density.length}</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
          <div className="text-[9px] font-mono text-slate-600 mb-1">BOTTLENECKS</div>
          <div className={`text-xl font-bold ${bottlenecks.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {bottlenecks.length}
          </div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
          <div className="text-[9px] font-mono text-slate-600 mb-1">OD FLOWS</div>
          <div className="text-xl font-bold text-violet-400">{odFlows.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white/[0.03] rounded-lg p-1 w-fit">
        {[
          { key: 'density', label: 'Density', icon: Activity },
          { key: 'congestion', label: 'Congestion', icon: Gauge },
          { key: 'od', label: 'OD Flows', icon: ArrowRight },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
              tab === key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Density tab */}
      {tab === 'density' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {density.length === 0 && !loading ? (
            <div className="col-span-full text-center py-12 text-slate-500 text-sm">
              No density data available. Start camera streams to begin tracking.
            </div>
          ) : density.map((d, i) => (
            <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-xs text-slate-300 truncate">{d.camera_id}</span>
                </div>
                <LevelBadge level={d.density_level} />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{d.vehicle_count}</div>
              <div className="text-[10px] font-mono text-slate-600">
                vehicles in last {d.window_seconds}s
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Congestion tab */}
      {tab === 'congestion' && (
        <div className="space-y-3">
          {congestion.length === 0 && !loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No congestion data available.
            </div>
          ) : congestion.map((c, i) => (
            <div key={i} className={`bg-white/[0.04] border rounded-xl p-4 ${
              c.is_bottleneck ? 'border-red-500/30' : 'border-white/[0.08]'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{c.camera_name}</span>
                  {c.is_bottleneck && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/20 animate-pulse">
                      BOTTLENECK
                    </span>
                  )}
                </div>
                <LevelBadge level={c.congestion_level} />
              </div>
              <CongestionBar score={c.congestion_score} />
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
                <div>
                  <div className="text-slate-600 text-[9px]">SCORE</div>
                  <div className="text-white">{(c.congestion_score * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px]">CURRENT</div>
                  <div className="text-white">{c.current_vehicle_count} vehicles</div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px]">VS BASELINE</div>
                  <div className={c.deviation_pct > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {c.deviation_pct > 0 ? '+' : ''}{c.deviation_pct.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OD flows tab */}
      {tab === 'od' && (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          {odFlows.length === 0 && !loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No origin-destination flow data available. Flows are computed from cross-camera plate observations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['ORIGIN', '', 'DESTINATION', 'VEHICLES', 'AVG TRAVEL TIME'].map(h => (
                      <th key={h} className="text-left text-[9px] font-mono text-slate-600 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {odFlows.map((f, i) => (
                    <tr key={i} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                      <td className="py-3 px-4 text-xs font-mono text-slate-300">{f.origin_camera}</td>
                      <td className="py-3 px-4"><ArrowRight className="w-3.5 h-3.5 text-slate-600" /></td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-300">{f.destination_camera}</td>
                      <td className="py-3 px-4 text-xs font-mono font-bold text-amber-400">{f.vehicle_count}</td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {f.avg_travel_time_sec < 60
                          ? `${f.avg_travel_time_sec.toFixed(0)}s`
                          : `${(f.avg_travel_time_sec / 60).toFixed(1)}m`
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
