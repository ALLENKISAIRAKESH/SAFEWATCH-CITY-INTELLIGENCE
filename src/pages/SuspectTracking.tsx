import React, { useState, useEffect } from 'react';
import {
  Crosshair, UserX, Car, MapPin, Clock, Search, ShieldAlert, Sparkles,
  ArrowRight, ShieldCheck, Video, Play, Pause, RotateCcw, AlertOctagon,
  FileText, Send, Lock, CheckCircle2, ChevronRight, Eye
} from 'lucide-react';

import { audioAnnouncer } from '@/utils/audioAnnouncer';
import { useLiveData } from '@/contexts/LiveDataContext';

interface TrajectoryNode {
  timecode: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  zone: string;
  xPct: number;
  yPct: number;
  confidence: number;
  status: 'entry' | 'transit' | 'last_seen';
  thumbnailUrl: string;
  speedKmh: number;
}

interface TargetEntity {
  id: string;
  type: 'person' | 'vehicle';
  name: string;
  description: string;
  threatLevel: 'critical' | 'high' | 'medium';
  primaryAttributes: string[];
  firstSeen: string;
  lastSeen: string;
  trajectory: TrajectoryNode[];
}

const MOCK_TARGETS: TargetEntity[] = [
  {
    id: 'TRK-402',
    type: 'person',
    name: 'Suspect #TRK-402 (Intruder)',
    description: 'Male, ~180cm, Red hooded jacket, dark cargo pants, face partially obscured by cap.',
    threatLevel: 'critical',
    primaryAttributes: ['Red Upper Body', 'Dark Lower Body', 'Running Motion', 'No Hardhat'],
    firstSeen: '22:14:02 (North Gate)',
    lastSeen: '22:15:18 (Server Vault Perimeter)',
    trajectory: [
      {
        timecode: '00:02',
        timestamp: '22:14:02',
        cameraId: 'CAM-04',
        cameraName: 'North Gate Loading Bay',
        zone: 'Perimeter Access',
        xPct: 15,
        yPct: 75,
        confidence: 98.2,
        status: 'entry',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=300&auto=format&fit=crop&q=60',
        speedKmh: 6.2,
      },
      {
        timecode: '00:28',
        timestamp: '22:14:28',
        cameraId: 'CAM-02',
        cameraName: 'Logistics Warehouse Walkway',
        zone: 'Logistics Bay',
        xPct: 48,
        yPct: 45,
        confidence: 94.6,
        status: 'transit',
        thumbnailUrl: 'https://images.unsplash.com/photo-1578874691223-a49626e8008e?w=300&auto=format&fit=crop&q=60',
        speedKmh: 5.4,
      },
      {
        timecode: '01:18',
        timestamp: '22:15:18',
        cameraId: 'CAM-03',
        cameraName: 'Server Vault Restricted Corridor',
        zone: 'Class-1 Security Zone',
        xPct: 82,
        yPct: 25,
        confidence: 91.8,
        status: 'last_seen',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&auto=format&fit=crop&q=60',
        speedKmh: 4.1,
      },
    ],
  },
  {
    id: 'VEH-09',
    type: 'vehicle',
    name: 'Vehicle #VEH-09 (BOLO Truck)',
    description: 'Silver Ford F-150 Pickup, License Plate BOLO [7XYZ99], unauthorized entry.',
    threatLevel: 'high',
    primaryAttributes: ['Silver Metallic', 'Pickup Truck', 'Plate: 7XYZ99', 'High Speed'],
    firstSeen: '22:10:45 (North Gate Entry)',
    lastSeen: '22:12:30 (Logistics Bay Dock 4)',
    trajectory: [
      {
        timecode: '00:00',
        timestamp: '22:10:45',
        cameraId: 'CAM-04',
        cameraName: 'North Gate Entrance Barrier',
        zone: 'Vehicle Gate',
        xPct: 10,
        yPct: 80,
        confidence: 99.4,
        status: 'entry',
        thumbnailUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop&q=60',
        speedKmh: 28.5,
      },
      {
        timecode: '01:45',
        timestamp: '22:12:30',
        cameraId: 'CAM-02',
        cameraName: 'Logistics Bay Loading Dock 4',
        zone: 'Cargo Staging',
        xPct: 60,
        yPct: 50,
        confidence: 96.1,
        status: 'last_seen',
        thumbnailUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=300&auto=format&fit=crop&q=60',
        speedKmh: 12.0,
      },
    ],
  },
];

const SuspectTracking: React.FC = () => {
  const { appendAudit, createManualIncident } = useLiveData();
  const [selectedTargetId, setSelectedTargetId] = useState<string>('TRK-402');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState(2);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const currentTarget = MOCK_TARGETS.find((t) => t.id === selectedTargetId) || MOCK_TARGETS[0];

  // Auto-replay trajectory loop
  useEffect(() => {
    let timer: any;
    if (isPlayingReplay) {
      timer = setInterval(() => {
        setActiveStepIndex((prev) => (prev + 1) % currentTarget.trajectory.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isPlayingReplay, currentTarget]);

  const triggerBOLOAlert = () => {
    audioAnnouncer.unlockAudio();
    audioAnnouncer.speakVoiceAlert(`BOLO Alert Broadcast: Suspect ${currentTarget.id} tracking active across Sector 02.`, true);
    createManualIncident(
      `BOLO ALERT: ${currentTarget.name}`,
      'high',
      currentTarget.trajectory[currentTarget.trajectory.length - 1]?.cameraName || 'Cross-Camera Re-ID',
      `Suspect re-identified across ${currentTarget.trajectory.length} camera sectors with ${currentTarget.trajectory[currentTarget.trajectory.length - 1]?.confidence}% confidence.`
    );
    setActionFeedback(`📢 BOLO Broadcast issued across all SOC consoles for ${currentTarget.id}!`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const dispatchDroneIntercept = () => {
    audioAnnouncer.speakVoiceAlert(`SkyGuard-01 drone scrambled for intercept coordinates at ${currentTarget.trajectory[currentTarget.trajectory.length - 1]?.zone}.`, true);
    appendAudit(`Dispatched Drone Intercept for ${currentTarget.id}`, 'SkyGuard-01');
    setActionFeedback(`🛸 Drone SkyGuard-01 dispatched to ${currentTarget.trajectory[currentTarget.trajectory.length - 1]?.zone}!`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const sealNearestTurnstile = () => {
    audioAnnouncer.playAlertTone('critical');
    appendAudit(`Sealed Electronic Barriers for Sector ${currentTarget.trajectory[currentTarget.trajectory.length - 1]?.zone}`, 'Access Control');
    setActionFeedback(`🔒 Electronic turnstiles & access doors sealed near ${currentTarget.trajectory[currentTarget.trajectory.length - 1]?.zone}!`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  return (
    <div className="space-y-6 font-mono text-xs relative">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className="fixed top-5 right-5 z-50 bg-sky-500/20 border border-sky-400 text-sky-200 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
          {actionFeedback}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-sky-400" />
              Multi-Camera Suspect Re-ID & Trajectory Graph
            </h2>
            <span className="bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              AI Deep Re-ID Vector Engine
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Cross-camera target correlation, visual cosine similarity matching, and spatial movement trajectory
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerBOLOAlert}
            className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Issue BOLO Broadcast
          </button>
          <button
            onClick={dispatchDroneIntercept}
            className="px-3 py-1.5 bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 text-sky-400 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Dispatch Drone Intercept
          </button>

          <button
            onClick={sealNearestTurnstile}
            className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            Seal Zone Exits
          </button>
        </div>
      </div>

      {/* Target Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_TARGETS.map((target) => (
          <div
            key={target.id}
            onClick={() => {
              setSelectedTargetId(target.id);
              setActiveStepIndex(target.trajectory.length - 1);
            }}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              selectedTargetId === target.id
                ? 'bg-[#0d1627] border-sky-400 shadow-xl shadow-sky-500/10 scale-[1.01]'
                : 'bg-[#080e1a] border-white/10 hover:border-white/20 hover:bg-[#0a1120]'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  {target.type === 'person' ? <UserX className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{target.name}</div>
                  <div className="text-[10px] text-slate-500">ID: {target.id} · First: {target.firstSeen}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/15 border border-red-500/30 text-red-400">
                {target.threatLevel}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">{target.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {target.primaryAttributes.map((attr, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[10px] text-slate-300">
                  {attr}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main Trajectory Canvas & Visual Re-ID Match Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: 2D Spatial Vector Trajectory Radar */}
        <div className="lg:col-span-2 bg-[#080e1a] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white text-sm uppercase">Spatial Movement Trajectory Graph</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isPlayingReplay ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-sky-500/20 border-sky-400 text-sky-300'
                }`}
              >
                {isPlayingReplay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isPlayingReplay ? 'Pause Replay' : 'Play Replay'}
              </button>
            </div>
          </div>

          {/* 2D Vector CAD Overlay Canvas */}
          <div className="relative w-full h-80 bg-[#040811] border border-white/10 rounded-xl overflow-hidden">
            {/* Blueprint Grid Lines */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            {/* SVG Connecting Vector Polylines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="trajGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Trajectory Polyline */}
              {currentTarget.trajectory.length > 1 && (
                <polyline
                  points={currentTarget.trajectory.map((n) => `${n.xPct * 7.5},${n.yPct * 3.0}`).join(' ')}
                  fill="none"
                  stroke="url(#trajGrad)"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  className="animate-pulse"
                />
              )}
            </svg>

            {/* Trajectory Waypoint Markers */}
            {currentTarget.trajectory.map((node, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStepIndex(idx)}
                className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 z-10"
                style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-2xl ${
                    activeStepIndex === idx
                      ? 'bg-red-600 border-white text-white scale-110 animate-bounce'
                      : idx === 0
                      ? 'bg-sky-500 border-sky-300 text-black font-bold'
                      : 'bg-amber-500 border-amber-300 text-black font-bold'
                  }`}
                >
                  <span className="text-[11px] font-bold">0{idx + 1}</span>
                </div>
                <div className="mt-1 bg-black/85 border border-white/20 px-2 py-0.5 rounded text-[9px] text-slate-200 whitespace-nowrap text-center">
                  {node.cameraId} ({node.timecode})
                </div>
              </div>
            ))}

            {/* Telemetry HUD */}
            <div className="absolute bottom-3 left-3 bg-black/85 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-slate-300 space-y-1 backdrop-blur-md pointer-events-none">
              <div>Active Sighting: <span className="text-white font-bold">{currentTarget.trajectory[activeStepIndex]?.cameraName}</span></div>
              <div>Estimated Speed: <span className="text-emerald-400 font-bold">{currentTarget.trajectory[activeStepIndex]?.speedKmh} km/h</span></div>
              <div>Re-ID Confidence: <span className="text-sky-400 font-bold">{currentTarget.trajectory[activeStepIndex]?.confidence}%</span></div>
            </div>
          </div>

          {/* Timeline Step Selector Slider */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-400 text-xs">Trajectory Step Timeline:</span>
            <div className="flex gap-2">
              {currentTarget.trajectory.map((node, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`px-3 py-1 rounded-lg border text-xs font-mono transition-colors ${
                    activeStepIndex === idx
                      ? 'bg-sky-500 border-sky-400 text-white font-bold'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Step {idx + 1}: {node.cameraId} ({node.timecode})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Visual Re-ID Photo Match Gallery */}
        <div className="bg-[#080e1a] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white text-sm uppercase">Visual Re-ID AI Matches</span>
            <span className="text-[10px] text-emerald-400 font-mono">Cosine Sim: High</span>
          </div>

          <div className="space-y-3">
            {currentTarget.trajectory.map((node, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  activeStepIndex === idx
                    ? 'bg-sky-500/20 border-sky-400 shadow-md'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-black overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={node.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-white text-xs">{node.cameraId}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{node.confidence}% Match</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{node.cameraName}</div>
                    <div className="text-[10px] text-sky-300 font-mono mt-1">Timestamp: {node.timestamp}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspectTracking;
