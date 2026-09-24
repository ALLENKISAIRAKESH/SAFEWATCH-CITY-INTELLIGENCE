import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useLiveData } from '@/contexts/LiveDataContext';
import {
  ANALYTICS_INCIDENTS_OVER_TIME,
  ANALYTICS_BY_SOURCE, KPI_DATA
} from '@/data/mockData';
import {
  TrendingDown, AlertTriangle, Clock, CheckCircle, Zap, Download, Calendar,
  ShieldCheck, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Activity, Flame, ShieldAlert, Eye
} from 'lucide-react';

import OSHAComplianceReportModal from '@/components/OSHAComplianceReportModal';

const KPICard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }> = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="p-1.5 rounded-lg" style={{ background: `${color}18` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
    </div>
    <div className="text-2xl font-bold text-white font-mono">{value}</div>
    {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

const TOOLTIP_STYLE = { backgroundColor: '#0d1526', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 };

// 24-Hour Heatmap & Threat Data Model
const HOURLY_THREAT_DATA = Array.from({ length: 24 }, (_, hour) => {
  const isNight = hour >= 22 || hour <= 5;
  const isPeak = hour >= 9 && hour <= 17;
  const threatScore = isNight && (hour === 2 || hour === 3) ? 85 : isPeak ? Math.floor(30 + Math.sin(hour) * 25) : Math.floor(10 + Math.random() * 15);
  const incidentsCount = threatScore > 70 ? 3 : threatScore > 40 ? 1 : 0;

  return {
    hour: `${hour.toString().padStart(2, '0')}:00`,
    hourNum: hour,
    threatScore,
    incidentsCount,
    sectors: {
      sec1: Math.min(100, isPeak ? 75 + Math.floor(Math.random() * 20) : 15),
      sec2: Math.min(100, isPeak ? 65 + Math.floor(Math.random() * 25) : 10),
      sec3: Math.min(100, hour === 14 ? 80 : 25),
      sec4: Math.min(100, isNight && hour === 2 ? 95 : 12),
      sec5: Math.min(100, isPeak ? 85 : 5),
      sec6: Math.min(100, isNight && hour === 3 ? 88 : 8),
    },
    peakEvent: isNight && hour === 2 ? 'Critical Server Vault Laser Tripwire Breach' : isNight && hour === 3 ? 'North Perimeter Fence Motion Trigger' : hour === 14 ? 'Substation PPE Safety Warning' : null,
  };
});

const SECTOR_NAMES: Record<string, string> = {
  sec1: 'Sector 01: Main Access Gate',
  sec2: 'Sector 02: Logistics Loading Bay',
  sec3: 'Sector 03: Power Grid Substation',
  sec4: 'Sector 04: Server Core Vault (Restricted)',
  sec5: 'Sector 05: Primary Assembly Floor',
  sec6: 'Sector 06: North Perimeter Radar',
};

const Analytics: React.FC = () => {
  const { incidents } = useLiveData();
  const [horizon, setHorizon] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [showOshaModal, setShowOshaModal] = useState(false);

  // 24-Hour Scrubber State
  const [scrubHour, setScrubHour] = useState<number>(14); // default 14:00 (2 PM)
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);


  useEffect(() => {
    let interval: any;
    if (isPlayingReplay) {
      interval = setInterval(() => {
        setScrubHour((prev) => (prev + 1) % 24);
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isPlayingReplay]);

  const currentHourData = HOURLY_THREAT_DATA[scrubHour];

  const total = incidents.length;
  const resolved = incidents.filter((i) => i.status === 'resolved').length;
  const resRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '100';

  const severityData = [
    { name: 'Critical', value: incidents.filter((i) => i.severity === 'critical').length || 1, color: '#ef4444' },
    { name: 'High', value: incidents.filter((i) => i.severity === 'high').length || 1, color: '#f59e0b' },
    { name: 'Medium', value: incidents.filter((i) => i.severity === 'medium').length || 1, color: '#3b82f6' },
    { name: 'Low', value: incidents.filter((i) => i.severity === 'low').length || 1, color: '#22c55e' },
  ];

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      horizon,
      totalIncidents: total,
      resolvedIncidents: resolved,
      resolutionRate: `${resRate}%`,
      severityBreakdown: severityData,
      hourlyThreatProfile: HOURLY_THREAT_DATA,
      incidents,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safewatch_threat_analytics_${horizon}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getHeatColor = (score: number) => {
    if (score >= 80) return 'bg-red-500/25 border-red-500/60 text-red-300';
    if (score >= 50) return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
    if (score >= 25) return 'bg-sky-500/15 border-sky-500/40 text-sky-300';
    return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  };

  const getHeatBarColor = (score: number) => {
    if (score >= 80) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#38bdf8';
    return '#22c55e';
  };

  return (
    <div className="space-y-6">
      {/* OSHA Form 300 Compliance Report Modal */}
      <OSHAComplianceReportModal isOpen={showOshaModal} onClose={() => setShowOshaModal(false)} />

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Safety Analytics & AI Threat Timeline</h2>
          <p className="text-sm text-slate-500">24-hour spatial activity heatmap, historical violation trends, and SLA reliability</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOshaModal(true)}
            className="px-3.5 py-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-500/25 transition-colors flex items-center gap-1.5 shadow-lg shadow-sky-500/10"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> OSHA 300 Audit
          </button>

          {/* Horizon Selector */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden bg-[#0a1120] text-xs font-mono">
            {(['24h', '7d', '30d', '90d'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 transition-colors uppercase ${horizon === h ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-500 hover:text-white'}`}
              >
                {h}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportReport}
            className="px-3.5 py-1.5 bg-white/[0.05] border border-white/10 text-slate-300 text-xs font-semibold rounded-lg hover:bg-white/[0.1] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
        </div>
      </div>


      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total Incidents" value={total} icon={AlertTriangle} color="#ef4444" />
        <KPICard label="Resolved" value={resolved} sub={`${resRate}% resolution rate`} icon={CheckCircle} color="#22c55e" />
        <KPICard label="Avg Response Time" value={`${KPI_DATA.avgResponseTime}s`} sub={KPI_DATA.responseTimeDelta} icon={Clock} color="#a855f7" />
        <KPICard label="Compliance Score" value="98.4%" sub="SOC-2 Certified" icon={ShieldCheck} color="#38bdf8" />
      </div>

      {/* 24-HOUR AI THREAT TIMELINE & SPATIAL HEATMAP SCRUBBER */}
      <div className="bg-[#070d18] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white uppercase tracking-wider">24-Hour AI Threat Timeline Scrubber</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Spatial Density Peak Analyzer
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">Scrub across 24-hour cycle to replay spatial crowd density and breach hotspots</p>
            </div>
          </div>

          {/* Time Scrubber Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScrubHour((prev) => (prev - 1 + 24) % 24)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300"
              title="Previous Hour"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlayingReplay(!isPlayingReplay)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                isPlayingReplay ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-sky-500 hover:bg-sky-400 text-white'
              }`}
            >
              {isPlayingReplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlayingReplay ? 'Pause Time-Lapse' : 'Play 24h Replay'}
            </button>
            <button
              onClick={() => setScrubHour((prev) => (prev + 1) % 24)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300"
              title="Next Hour"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setScrubHour(0);
                setIsPlayingReplay(false);
              }}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white"
              title="Reset to 00:00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Time Display & Peak Event Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0c1626] border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-base font-bold text-white font-mono">{currentHourData.hour} HRS</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentHourData.threatScore > 70 ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
              Threat Index: {currentHourData.threatScore}%
            </span>
          </div>

          {currentHourData.peakEvent ? (
            <div className="flex items-center gap-1.5 text-xs font-mono text-red-300 bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-lg animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Event: <strong>{currentHourData.peakEvent}</strong></span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-slate-400">Normal operations · No critical breaches flagged</div>
          )}
        </div>

        {/* 24-Hour Timeline Bar Chart Scrubber */}
        <div className="relative pt-2">
          <div className="h-20 flex items-end gap-1 px-1">
            {HOURLY_THREAT_DATA.map((item, idx) => {
              const isSelected = scrubHour === idx;
              const heightPct = Math.max(15, item.threatScore);

              return (
                <button
                  key={item.hour}
                  onClick={() => setScrubHour(idx)}
                  className="flex-1 flex flex-col items-center group focus:outline-none"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isSelected
                        ? 'ring-2 ring-white scale-105 z-10'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: getHeatBarColor(item.threatScore),
                    }}
                  />
                  <span className={`text-[8px] font-mono mt-1 ${isSelected ? 'text-white font-bold' : 'text-slate-600 group-hover:text-slate-400'}`}>
                    {idx % 3 === 0 ? item.hour.split(':')[0] : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spatial Sector Heatmap Grid at Selected Hour */}
        <div>
          <div className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Spatial Facility Sector Heatmap ({currentHourData.hour})</span>
            <span className="text-slate-500">6 Active Sectors</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(currentHourData.sectors).map(([key, score]) => (
              <div
                key={key}
                className={`p-3 rounded-xl border transition-all ${getHeatColor(score)}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs truncate max-w-[180px]">{SECTOR_NAMES[key]}</span>
                  <span className="text-xs font-mono font-bold">{score}%</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getHeatBarColor(score),
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1.5">
                  <span>Status: {score > 75 ? 'HIGH INTENSITY' : score > 40 ? 'ELEVATED' : 'NOMINAL'}</span>
                  <span>{score > 75 ? '🔴 Critical' : score > 40 ? '🟡 Monitored' : '🟢 Safe'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Trend Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Incidents Over Time */}
        <div className="xl:col-span-2 bg-[#0a1120] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">Incident Frequency Trend ({horizon.toUpperCase()})</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">-14.2% vs last period</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ANALYTICS_INCIDENTS_OVER_TIME} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#38bdf8' }} />
              <Line type="monotone" dataKey="incidents" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Incidents by Severity — Pie */}
        <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Severity Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {severityData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Source — Bar */}
        <div className="xl:col-span-2 bg-[#0a1120] border border-white/[0.07] rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Incidents by Camera Source</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ANALYTICS_BY_SOURCE} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="source" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#38bdf8' }} />
              <Bar dataKey="incidents" fill="#38bdf8" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Uptime */}
        <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Source Uptime & Reliability</div>
          <div className="space-y-3">
            {['Cam 01 — Entrance', 'Cam 02 — North Gate', 'Cam 03 — Restricted', 'Cam 04 — Parking', 'Cam 05 — Warehouse', 'Cam 06 — Perimeter'].map((cam, i) => {
              const uptime = [99.8, 98.4, 99.9, 97.2, 95.1, 99.5][i];
              return (
                <div key={cam}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate max-w-[170px]">{cam}</span>
                    <span className={`font-mono ${uptime > 95 ? 'text-emerald-400' : uptime > 85 ? 'text-amber-400' : 'text-red-400'}`}>{uptime}%</span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${uptime > 95 ? 'bg-emerald-400' : uptime > 85 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${uptime}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;





