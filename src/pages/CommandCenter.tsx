import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import {
  AlertTriangle, CheckCircle, Activity, Cpu, Clock, TrendingUp, TrendingDown,
  Video, ChevronRight, Eye, Users, Shield, Zap, Radio, Map
} from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';
import FacilityBlueprintMap from '@/components/FacilityBlueprintMap';
import {
  MOCK_SOURCES, KPI_DATA, formatRelativeTime,
  SEVERITY_COLORS, STATUS_COLORS, Severity, IncidentStatus
} from '@/data/mockData';

// Shared COCO-SSD singleton for efficient model reuse
let sharedModelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
const getSharedModel = () => {
  if (!sharedModelPromise) {
    sharedModelPromise = cocoSsd.load();
  }
  return sharedModelPromise;
};

// ─── KPI Card ─────────────────────────────────────────────────────────
const KPICard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  accent: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}> = ({ label, value, sub, icon: Icon, iconColor, accent, trend, trendLabel }) => (
  <div className={`bg-[#0a1120] border border-white/[0.07] rounded-xl p-4 relative overflow-hidden hover:border-white/15 transition-colors`}>
    <div className={`absolute inset-0 opacity-[0.03] rounded-xl`} style={{ background: accent }} />
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg`} style={{ background: `${accent}18` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-mono ${trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-500'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          {trendLabel}
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-white font-mono">{value}</div>
    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    {sub && <div className="text-[10px] text-slate-600 font-mono mt-1">{sub}</div>}
  </div>
);

// ─── Real-Time Live Mini Camera Panel with Real AI Detection ───────────
const CAMERA_NAMES = [
  'Camera 01 — Main Entrance (Live Webcam)',
  'Camera 02 — Logistics Dock (Uploaded Video)',
  'Camera 03 — Server Vault (Perimeter Drone)',
  'Camera 04 — North Gate (Security Stream)',
];

const SAMPLE_SECURITY_FEEDS = [
  '',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
];

const MiniCameraPanel: React.FC<{
  index: number;
  livePeople?: number;
  uploadedUrl?: string | null;
}> = ({ index, livePeople, uploadedUrl }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [detectedPeople, setDetectedPeople] = useState<number>(0);
  const { emitClientDetection } = useLiveData();

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (index === 0) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
            setStreamActive(true);
          }
        })
        .catch(() => {
          setStreamActive(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [index]);

  // Real-time AI Person Detection Loop
  useEffect(() => {
    let isMounted = true;
    let animId: number;

    const runDetection = async () => {
      try {
        const model = await getSharedModel();
        if (!isMounted) return;

        const detectFrame = async () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && canvas && video.readyState >= 2 && !video.paused) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            if (vw > 0 && vh > 0) {
              if (canvas.width !== vw || canvas.height !== vh) {
                canvas.width = vw;
                canvas.height = vh;
              }

              const ctx = canvas.getContext('2d');
              if (ctx) {
                const preds = await model.detect(video);
                ctx.clearRect(0, 0, vw, vh);

                const people = preds.filter((p) => p.class === 'person');
                setDetectedPeople(people.length);

                if (index === 0) {
                  emitClientDetection(
                    people.length,
                    people.length > 3 ? 'critical' : people.length > 1 ? 'high' : people.length > 0 ? 'medium' : 'low',
                    'Camera 01 — Main Entrance'
                  );
                }

                for (const p of preds) {
                  const [x, y, bw, bh] = p.bbox;
                  const isPerson = p.class === 'person';

                  ctx.strokeStyle = isPerson ? '#22c55e' : '#38bdf8';
                  ctx.lineWidth = 3;
                  ctx.strokeRect(x, y, bw, bh);

                  const label = `${p.class.toUpperCase()} ${Math.round(p.score * 100)}%`;
                  ctx.font = 'bold 13px monospace';
                  ctx.fillStyle = isPerson ? 'rgba(34, 197, 94, 0.85)' : 'rgba(14, 165, 233, 0.85)';
                  const textWidth = ctx.measureText(label).width + 8;
                  const labelY = y > 22 ? y - 22 : y;
                  ctx.fillRect(x, labelY, textWidth, 20);

                  ctx.fillStyle = '#000000';
                  ctx.fillText(label, x + 4, labelY + 14);
                }
              }
            }
          }
          if (isMounted) {
            animId = requestAnimationFrame(detectFrame);
          }
        };

        detectFrame();
      } catch (err) {
        console.warn('AI detection initialization error:', err);
      }
    };

    runDetection();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, [index, emitClientDetection]);

  const [videoError, setVideoError] = useState(false);
  const videoSource = index === 1 && uploadedUrl ? uploadedUrl : SAMPLE_SECURITY_FEEDS[index];
  const count = index === 0 ? detectedPeople : index === 1 && uploadedUrl ? 3 : [0, 2, 1, 1][index];

  return (
    <div className="relative rounded-lg overflow-hidden aspect-video flex-1 min-w-0 border border-white/10 bg-[#060c18]">
      {index === 0 ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
      ) : videoSource && !videoError ? (
        <video
          ref={videoRef}
          src={videoSource}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: ['#0d1b2a', '#0a192f', '#0f2b38', '#111d35'][index] }}
        >
          {/* CCTV Grid scanline overlay */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.15) 0%, transparent 70%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.4) 3px, rgba(0,0,0,0.4) 6px)',
            }}
          />
          {/* Crosshair & Radar telemetry */}
          <div className="absolute inset-4 border border-sky-500/20 rounded pointer-events-none flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-sky-500/30 animate-ping opacity-25 absolute" />
            <div className="w-16 h-16 rounded-full border border-dashed border-sky-500/20 absolute" />
          </div>

          <div className="text-center z-10">
            <Video className="w-5 h-5 text-sky-400 mx-auto mb-1 opacity-75 animate-pulse" />
            <span className="text-[10px] font-mono text-sky-300 font-semibold block">AI TELEMETRY FEED</span>
            <span className="text-[8px] font-mono text-slate-500">RADAR 30 FPS · LATENCY 28ms</span>
          </div>
        </div>
      )}

      {/* Real Dynamic AI Detection Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/75 px-2 py-1 flex items-center justify-between backdrop-blur-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[9px] font-mono text-white truncate">{CAMERA_NAMES[index]}</span>
        </div>
        <span className="text-[9px] font-mono text-emerald-400 font-bold shrink-0 ml-1">
          {index === 1 && uploadedUrl ? 'Active Upload' : `${count} live det`}
        </span>
      </div>

      {/* Timestamp */}
      <div className="absolute top-1.5 right-1.5 text-[9px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
        {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>

      {/* Live Badge */}
      <div className="absolute top-1.5 left-1.5 bg-red-500/80 text-white rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wider animate-pulse flex items-center gap-1 pointer-events-none">
        <span className="w-1 h-1 bg-white rounded-full" /> {index === 1 && uploadedUrl ? 'UPLOAD' : 'LIVE'}
      </div>
    </div>
  );
};



// ─── Severity Badge ───────────────────────────────────────────────────
const SeverityBadge: React.FC<{ s: Severity }> = ({ s }) => (
  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${SEVERITY_COLORS[s]}`}>{s}</span>
);
const StatusBadge: React.FC<{ s: IncidentStatus }> = ({ s }) => (
  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[s]}`}>{s}</span>
);

// ─── Command Center ───────────────────────────────────────────────────
const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, liveMetrics, isConnected, uploadedVideoUrl } = useLiveData();
  const [mainView, setMainView] = useState<'grid' | 'blueprint'>('grid');


  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'escalated');

  const recentIncidents = incidents.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Command Center</h2>
            {isConnected ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Sync Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Local Real-time
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Real-time safety intelligence and incident response</p>
        </div>

        {/* Active Operators Indicator */}
        <div className="flex items-center gap-2">
          {liveMetrics.activeOperators && liveMetrics.activeOperators.length > 0 ? (
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-lg text-xs font-mono text-sky-400">
              <Users className="w-3.5 h-3.5" />
              <span>{liveMetrics.activeOperators.length} Active Operator{liveMetrics.activeOperators.length > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              All Systems Operational
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard
          label="Active Incidents"
          value={openIncidents.length}
          icon={AlertTriangle}
          iconColor="#ef4444"
          accent="#ef4444"
          trend="up"
          trendLabel={`${openIncidents.length} active`}
        />
        <KPICard
          label="Active Sources"
          value={`${liveMetrics.activeSourcesCount}/27`}
          sub="89% Online"
          icon={Video}
          iconColor="#38bdf8"
          accent="#38bdf8"
        />
        <KPICard
          label="AI Detection Rate"
          value={`${KPI_DATA.aiDetectionRate}%`}
          sub={liveMetrics.peopleCount > 0 ? `${liveMetrics.peopleCount} in frame` : 'Healthy'}
          icon={Zap}
          iconColor="#22c55e"
          accent="#22c55e"
        />
        <KPICard
          label="Avg Response Time"
          value={`${KPI_DATA.avgResponseTime}s`}
          icon={Clock}
          iconColor="#a855f7"
          accent="#a855f7"
          trend="down"
          trendLabel={KPI_DATA.responseTimeDelta}
        />
        <KPICard
          label="Current Risk Level"
          value={liveMetrics.riskLevel.toUpperCase()}
          sub={`System ${liveMetrics.riskLevel === 'critical' ? 'High Alert' : 'Operational'}`}
          icon={Activity}
          iconColor={liveMetrics.riskLevel === 'critical' ? '#ef4444' : '#f59e0b'}
          accent={liveMetrics.riskLevel === 'critical' ? '#ef4444' : '#f59e0b'}
        />
      </div>

      {/* Main grid: Camera Grid + Critical Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Live Monitoring Card with View Switcher */}
        <div className="xl:col-span-2 bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-white">Live Monitoring Overview</span>
              </div>
              <div className="flex bg-[#070d18] border border-white/10 rounded-lg p-0.5 text-xs font-mono">
                <button
                  onClick={() => setMainView('grid')}
                  className={`px-2 py-0.5 rounded transition-colors ${mainView === 'grid' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Cameras
                </button>
                <button
                  onClick={() => setMainView('blueprint')}
                  className={`px-2 py-0.5 rounded transition-colors ${mainView === 'blueprint' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Blueprint Radar
                </button>
              </div>
            </div>
            <button
              onClick={() => navigate('/monitoring')}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              Open Full SOC View <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3">
            {mainView === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <MiniCameraPanel
                    key={i}
                    index={i}
                    livePeople={i === 0 ? liveMetrics.peopleCount : undefined}
                    uploadedUrl={uploadedVideoUrl}
                  />
                ))}
              </div>
            ) : (

              <FacilityBlueprintMap />
            )}
          </div>
        </div>


        {/* Critical Alerts */}
        <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-white">Active Alerts</span>
            </div>
            <span className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
              {openIncidents.length} open
            </span>
          </div>
          <div className="divide-y divide-white/[0.05] overflow-y-auto max-h-[320px]">
            {openIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No active critical alerts
              </div>
            ) : (
              openIncidents.slice(0, 5).map((inc) => (
                <div key={inc.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => navigate(`/incidents/${inc.id}`)}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <SeverityBadge s={inc.severity} />
                    <span className="text-[10px] font-mono text-slate-500">{formatRelativeTime(inc.detectedAt)}</span>
                  </div>
                  <p className="text-sm text-white font-medium leading-tight mb-1">{inc.title}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <Video className="w-3 h-3" />
                    <span>{inc.source.split('—')[0].trim()}</span>
                  </div>
                  <button className="mt-2 text-[10px] text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1">
                    View Incident <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <span className="text-sm font-semibold text-white">Recent Incidents</span>
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            View All ({incidents.length}) <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Incident', 'Severity', 'Source', 'Rule', 'Detected', 'Status', 'Assigned'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentIncidents.map((inc) => (
                <tr
                  key={inc.id}
                  className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-slate-400">{inc.id}</div>
                    <div className="text-white font-medium truncate max-w-[180px]">{inc.title}</div>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge s={inc.severity} /></td>
                  <td className="px-4 py-3 text-slate-300 truncate max-w-[120px]">{inc.source.split('—')[0].trim()}</td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-[130px]">{inc.rule}</td>
                  <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">{formatRelativeTime(inc.detectedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge s={inc.status} /></td>
                  <td className="px-4 py-3 text-slate-400">{inc.assignedTo ?? <span className="text-slate-600 italic">Unassigned</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;

