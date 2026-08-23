import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, ShieldAlert, Users, Radio, Maximize2, AlertTriangle, Eye,
  Layers, Compass, Zap, CheckCircle2, ChevronRight, Play, Pause, X, UserCheck, Navigation, Shield, Siren, Battery,
  Plane, Crosshair, RotateCcw, Flame, Sparkles, Sliders
} from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';

interface CameraPin {
  id: string;
  name: string;
  sector: string;
  x: number; // percentage 0 - 100
  y: number;
  fovAngle: number; // base rotation angle in degrees
  fovSpread: number; // spread in degrees
  status: 'active' | 'warning' | 'offline';
  peopleCount: number;
  type: string;
}

export interface GuardUnit {
  id: string;
  callsign: string;
  officer: string;
  role: string;
  status: 'patrol' | 'responding' | 'intercepting' | 'secured' | 'airborne';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  etaSeconds?: number;
  battery: number;
  bodycamUrl: string;
}

export interface DroneWaypoint {
  id: string;
  x: number; // percentage 0-100
  y: number;
  alt: number; // meters
}

const DEFAULT_CAMERAS: CameraPin[] = [
  { id: 'CAM-01', name: 'Camera 01 — Main Entrance', sector: 'Sector 01: Access Gate', x: 22, y: 78, fovAngle: -45, fovSpread: 65, status: 'active', peopleCount: 2, type: '4K Optical' },
  { id: 'CAM-02', name: 'Camera 02 — Logistics Dock', sector: 'Sector 02: Loading Bay', x: 75, y: 75, fovAngle: -120, fovSpread: 70, status: 'active', peopleCount: 1, type: 'PTZ 30x' },
  { id: 'CAM-03', name: 'Camera 03 — Server Core Vault', sector: 'Sector 04: Data Center', x: 50, y: 45, fovAngle: 90, fovSpread: 80, status: 'warning', peopleCount: 0, type: 'Thermal AI' },
  { id: 'CAM-04', name: 'Camera 04 — Substation High-Risk', sector: 'Sector 03: Power Grid', x: 80, y: 25, fovAngle: 180, fovSpread: 60, status: 'active', peopleCount: 0, type: 'Explosion-Proof' },
  { id: 'CAM-05', name: 'Camera 05 — Assembly Line A', sector: 'Sector 05: Primary Floor', x: 28, y: 35, fovAngle: 30, fovSpread: 75, status: 'active', peopleCount: 4, type: 'AI Wide-Angle' },
  { id: 'CAM-06', name: 'Camera 06 — North Perimeter', sector: 'Sector 07: Outer Fence', x: 50, y: 12, fovAngle: 90, fovSpread: 90, status: 'active', peopleCount: 0, type: 'Long-Range Radar' },
];

const SECTORS = [
  { id: 'sec-1', name: 'Main Entrance & Lobby', x: 10, y: 65, w: 25, h: 25, color: '#38bdf8', type: 'Access Zone', breach: false },
  { id: 'sec-2', name: 'Logistics & Cargo Bay', x: 65, y: 60, w: 28, h: 30, color: '#38bdf8', type: 'High Activity', breach: false },
  { id: 'sec-3', name: 'High-Voltage Power Substation', x: 68, y: 10, w: 25, h: 28, color: '#f59e0b', type: 'High Risk Hazard', breach: false },
  { id: 'sec-4', name: 'Server Vault & AI Core', x: 40, y: 35, w: 22, h: 22, color: '#ef4444', type: 'RESTRICTED DEFENSE', breach: true },
  { id: 'sec-5', name: 'Primary Assembly Floor', x: 15, y: 15, w: 25, h: 35, color: '#38bdf8', type: 'Operations', breach: false },
];

const INITIAL_GUARDS: GuardUnit[] = [
  {
    id: 'G-01',
    callsign: 'Alpha-1 (Lead)',
    officer: 'Marcus Vance',
    role: 'Tactical Lead',
    status: 'patrol',
    x: 18,
    y: 72,
    battery: 95,
    bodycamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'G-02',
    callsign: 'Bravo-2 (K9)',
    officer: 'Sarah Chen + K9 Rex',
    role: 'K9 Rapid Response',
    status: 'patrol',
    x: 70,
    y: 72,
    battery: 88,
    bodycamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'G-03',
    callsign: 'SkyGuard-01',
    officer: 'Autonomous Aerial Drone',
    role: 'Aerial Waypoint Interceptor',
    status: 'patrol',
    x: 48,
    y: 18,
    battery: 84,
    bodycamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  },
];

const DEFAULT_WAYPOINTS: DroneWaypoint[] = [
  { id: 'WP-01', x: 15, y: 15, alt: 45 },
  { id: 'WP-02', x: 85, y: 15, alt: 50 },
  { id: 'WP-03', x: 85, y: 85, alt: 45 },
  { id: 'WP-04', x: 15, y: 85, alt: 40 },
];

interface FacilityBlueprintMapProps {
  onSelectCamera?: (camId: string) => void;
}

export const FacilityBlueprintMap: React.FC<FacilityBlueprintMapProps> = ({ onSelectCamera }) => {
  const { incidents } = useLiveData();
  const [activeFloor, setActiveFloor] = useState<'Level 01' | 'Level 02' | 'Perimeter'>('Level 01');
  const [selectedCam, setSelectedCam] = useState<CameraPin | null>(DEFAULT_CAMERAS[0]);
  const [selectedGuard, setSelectedGuard] = useState<GuardUnit | null>(null);
  const [guards, setGuards] = useState<GuardUnit[]>(INITIAL_GUARDS);
  const [showFov, setShowFov] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showGuards, setShowGuards] = useState(true);
  const [radarSweep, setRadarSweep] = useState(0);
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);

  // Drone Waypoint Mission Planner State
  const [dronePlannerOpen, setDronePlannerOpen] = useState(false);
  const [waypoints, setWaypoints] = useState<DroneWaypoint[]>(DEFAULT_WAYPOINTS);
  const [isDroneFlying, setIsDroneFlying] = useState(false);
  const [currentWpIndex, setCurrentWpIndex] = useState(0);
  const [droneAlt, setDroneAlt] = useState(45);
  const [droneSpeed, setDroneSpeed] = useState(24.5);
  const [flirThermal, setFlirThermal] = useState(false);

  // Sweep rotation animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarSweep((prev) => (prev + 2) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Autonomous Drone Flight Simulation Loop
  useEffect(() => {
    let flightInterval: any;
    if (isDroneFlying && waypoints.length > 0) {
      flightInterval = setInterval(() => {
        setGuards((prevGuards) => {
          return prevGuards.map((g) => {
            if (g.id === 'G-03') { // SkyGuard Drone
              const targetWp = waypoints[currentWpIndex % waypoints.length];
              const dx = targetWp.x - g.x;
              const dy = targetWp.y - g.y;
              const dist = Math.hypot(dx, dy);

              if (dist < 3) {
                // Reached waypoint, advance to next
                setCurrentWpIndex((idx) => (idx + 1) % waypoints.length);
                setDroneAlt(targetWp.alt);
                return { ...g, x: targetWp.x, y: targetWp.y, status: 'airborne' };
              } else {
                const flySpeed = 1.4;
                return {
                  ...g,
                  x: g.x + (dx / dist) * flySpeed,
                  y: g.y + (dy / dist) * flySpeed,
                  status: 'airborne',
                };
              }
            }
            return g;
          });
        });
      }, 300);
    }
    return () => clearInterval(flightInterval);
  }, [isDroneFlying, waypoints, currentWpIndex]);

  // Guard movement / ETA ticker loop
  useEffect(() => {
    const timer = setInterval(() => {
      setGuards((prevGuards) =>
        prevGuards.map((g) => {
          if (g.status === 'responding' && g.targetX !== undefined && g.targetY !== undefined) {
            const dx = g.targetX - g.x;
            const dy = g.targetY - g.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 3) {
              return {
                ...g,
                x: g.targetX,
                y: g.targetY,
                status: 'secured',
                etaSeconds: 0,
              };
            } else {
              const speed = 1.2;
              const newX = g.x + (dx / dist) * speed;
              const newY = g.y + (dy / dist) * speed;
              const remainingEta = Math.max(1, (g.etaSeconds || 15) - 1);
              return {
                ...g,
                x: newX,
                y: newY,
                etaSeconds: remainingEta,
              };
            }
          }
          return g;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dronePlannerOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const newWp: DroneWaypoint = {
      id: `WP-0${waypoints.length + 1}`,
      x: Math.round(clickX),
      y: Math.round(clickY),
      alt: 45,
    };
    setWaypoints([...waypoints, newWp]);
    setDispatchToast(`Waypoint ${newWp.id} placed at (${Math.round(clickX)}%, ${Math.round(clickY)}%)`);
    setTimeout(() => setDispatchToast(null), 2500);
  };

  const handleToggleDroneFlight = () => {
    setIsDroneFlying(!isDroneFlying);
    if (!isDroneFlying) {
      setDispatchToast('🚀 SkyGuard-01 Launched on Autonomous Aerial Waypoint Patrol!');
      try {
        import('@/utils/audioAnnouncer').then(({ audioAnnouncer }) => {
          audioAnnouncer.speakVoiceAlert('SkyGuard-01 Drone airborne. Initiating autonomous perimeter waypoint mission.');
        });
      } catch (_) {}
    } else {
      setDispatchToast('🛑 SkyGuard-01 Flight Paused.');
    }
    setTimeout(() => setDispatchToast(null), 3500);
  };

  const handleReturnToHome = () => {
    setIsDroneFlying(false);
    setGuards((prev) =>
      prev.map((g) => (g.id === 'G-03' ? { ...g, x: 48, y: 18, status: 'patrol' } : g))
    );
    setDispatchToast('🏠 SkyGuard-01 Returned to Home Charging Dock.');
    setTimeout(() => setDispatchToast(null), 3000);
  };

  const handleDispatchGuard = (guardId: string, targetX: number = 48, targetY: number = 42, locationName: string = 'Sector 04: Server Vault') => {
    setGuards((prev) =>
      prev.map((g) => {
        if (g.id === guardId) {
          return {
            ...g,
            status: 'responding',
            targetX,
            targetY,
            etaSeconds: 16,
          };
        }
        return g;
      })
    );

    const guardName = guards.find((g) => g.id === guardId)?.callsign || guardId;
    setDispatchToast(`🚨 DISPATCH ORDER SENT: ${guardName} responding to ${locationName}!`);
    
    // Announce via AI Voice Synthesizer
    try {
      import('@/utils/audioAnnouncer').then(({ audioAnnouncer }) => {
        audioAnnouncer.speakVoiceAlert(`Warning: Tactical Unit ${guardName} dispatched to intercept breach in ${locationName}`, true);
      });
    } catch (_) {}

    setTimeout(() => setDispatchToast(null), 4000);
  };

  return (

    <div className="bg-[#070d18] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Toast Notification */}
      {dispatchToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 border border-red-400 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-mono backdrop-blur-md animate-bounce flex items-center gap-2">
          <Siren className="w-4 h-4 text-white animate-spin" />
          {dispatchToast}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="p-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tactical Facility Blueprint Radar</h3>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                6 Cameras · 3 Tactical Units · SkyGuard Drone
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">Live Spatial FOV Radar, Perimeter Sonar & Autonomous Drone Waypoint Mission Control</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Drone Waypoint Planner Toggle */}
          <button
            onClick={() => setDronePlannerOpen(!dronePlannerOpen)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              dronePlannerOpen
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 border-sky-400'
                : 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            Drone Waypoints ({waypoints.length})
          </button>

          {/* Floor selector */}
          <div className="flex bg-[#0a1120] border border-white/10 rounded-lg p-0.5 text-xs font-mono">
            {(['Level 01', 'Level 02', 'Perimeter'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActiveFloor(lvl)}
                className={`px-3 py-1 rounded-md transition-colors ${activeFloor === lvl ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Toggle FOV */}
          <button
            onClick={() => setShowFov(!showFov)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${showFov ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-white/[0.04] border-white/10 text-slate-400'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            FOV Cones
          </button>

          {/* Toggle Zones */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${showZones ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' : 'bg-white/[0.04] border-white/10 text-slate-400'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            Zones
          </button>

          {/* Toggle Guard Units */}
          <button
            onClick={() => setShowGuards(!showGuards)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${showGuards ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-white/[0.04] border-white/10 text-slate-400'}`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Guard Units ({guards.length})
          </button>
        </div>
      </div>

      {/* Main Interactive Blueprint Canvas Area */}
      <div
        onClick={handleCanvasClick}
        className={`relative w-full aspect-[16/9] min-h-[460px] bg-[#050b14] overflow-hidden select-none ${
          dronePlannerOpen ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Drone Waypoint Placement Hint Banner */}
        {dronePlannerOpen && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-sky-500/20 border border-sky-400 text-sky-200 px-4 py-1.5 rounded-full text-xs font-mono backdrop-blur-md flex items-center gap-2 animate-fade-in shadow-xl pointer-events-none">
            <Crosshair className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Click on Blueprint canvas to place Aerial Patrol Waypoints</span>
          </div>
        )}

        {/* CAD Grid Lines */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Global Blueprint Radar Sweep Line */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `conic-gradient(from ${radarSweep}deg at 50% 50%, rgba(56, 189, 248, 0.25) 0deg, transparent 45deg, transparent 360deg)`,
          }}
        />

        {/* SVG Architectural Sectors & Pathfinding Routes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Facility Outer Boundary Wall */}
          <rect x="5%" y="5%" width="90%" height="90%" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="3" strokeDasharray="6 3" />

          {/* Sector Rooms */}
          {showZones &&
            SECTORS.map((sec) => (
              <g key={sec.id}>
                <rect
                  x={`${sec.x}%`}
                  y={`${sec.y}%`}
                  width={`${sec.w}%`}
                  height={`${sec.h}%`}
                  fill={sec.breach ? 'rgba(239, 68, 68, 0.14)' : 'rgba(56, 189, 248, 0.04)'}
                  stroke={sec.breach ? '#ef4444' : sec.color}
                  strokeWidth={sec.breach ? '2.5' : '1.5'}
                  strokeDasharray={sec.breach ? '4 2' : 'none'}
                  className={sec.breach ? 'animate-pulse' : ''}
                />
                <text
                  x={`${sec.x + 2}%`}
                  y={`${sec.y + 6}%`}
                  fill={sec.breach ? '#ef4444' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {sec.name.toUpperCase()}
                </text>
                <text
                  x={`${sec.x + 2}%`}
                  y={`${sec.y + 11}%`}
                  fill={sec.breach ? '#fca5a5' : '#64748b'}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {sec.type}
                </text>
              </g>
            ))}

          {/* Drone Aerial Flight Waypoint Path Lines */}
          {waypoints.length > 1 && (
            <g>
              <polyline
                points={waypoints.map((wp) => `${wp.x}%,${wp.y}%`).join(' ') + (waypoints.length > 2 ? ` ${waypoints[0].x}%,${waypoints[0].y}%` : '')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="opacity-80"
              />
            </g>
          )}

          {/* Tactical Pathfinding Lasers for Responding Guards */}
          {showGuards &&
            guards
              .filter((g) => g.status === 'responding' && g.targetX !== undefined && g.targetY !== undefined)
              .map((g) => (
                <g key={`path-${g.id}`}>
                  <line
                    x1={`${g.x}%`}
                    y1={`${g.y}%`}
                    x2={`${g.targetX}%`}
                    y2={`${g.targetY}%`}
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                  <circle cx={`${g.targetX}%`} cy={`${g.targetY}%`} r="8" fill="none" stroke="#22c55e" strokeWidth="2" className="animate-ping" />
                </g>
              ))}

          {/* Main Corridors */}
          <line x1="35%" y1="5%" x2="35%" y2="95%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="5%" y1="55%" x2="95%" y2="55%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* Render Drone Waypoint Markers */}
        {waypoints.map((wp, idx) => (
          <div
            key={wp.id}
            style={{ top: `${wp.y}%`, left: `${wp.x}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-25 group pointer-events-none"
          >
            <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-lg shadow-sky-500/40">
              {idx + 1}
            </div>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-sky-500/30 px-1.5 py-0.5 rounded text-[8px] font-mono text-sky-300">
              {wp.id} ({wp.alt}m)
            </div>
          </div>
        ))}


        {/* Camera Field-of-View Sweeping Radar Cones */}
        {showFov && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {DEFAULT_CAMERAS.map((cam) => {
              const radius = 110;
              const angleRad = (cam.fovAngle * Math.PI) / 180;
              const spreadRad = (cam.fovSpread * Math.PI) / 360;
              const a1 = angleRad - spreadRad;
              const a2 = angleRad + spreadRad;

              const isSelected = selectedCam?.id === cam.id;

              return (
                <g key={cam.id}>
                  <path
                    d={`M ${cam.x * 10} ${cam.y * 5} 
                        L ${cam.x * 10 + Math.cos(a1) * radius} ${cam.y * 5 + Math.sin(a1) * radius} 
                        A ${radius} ${radius} 0 0 1 ${cam.x * 10 + Math.cos(a2) * radius} ${cam.y * 5 + Math.sin(a2) * radius} 
                        Z`}
                    fill={isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.08)'}
                    stroke={isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}
                    strokeWidth={isSelected ? '1.5' : '0.8'}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Interactive Camera Pins */}
        {DEFAULT_CAMERAS.map((cam) => {
          const isSelected = selectedCam?.id === cam.id;
          return (
            <button
              key={cam.id}
              onClick={() => {
                setSelectedCam(cam);
                setSelectedGuard(null);
                onSelectCamera?.(cam.id);
              }}
              style={{ top: `${cam.y}%`, left: `${cam.x}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-transform hover:scale-125 focus:outline-none`}
            >
              <span
                className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                  cam.status === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
                }`}
              />
              <div
                className={`w-7 h-7 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${
                  isSelected
                    ? 'bg-sky-500 border-white text-white shadow-sky-500/50 scale-110'
                    : cam.status === 'warning'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                    : 'bg-[#0d1b2a] border-sky-400/60 text-sky-400 hover:border-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
              </div>
              <div
                className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-white/15 px-2 py-0.5 rounded text-[9px] font-mono text-white pointer-events-none transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {cam.id}: {cam.name.split('—')[1]?.trim() || cam.name}
              </div>
            </button>
          );
        })}

        {/* Interactive Tactical Guard Units */}
        {showGuards &&
          guards.map((guard) => {
            const isSelected = selectedGuard?.id === guard.id;
            return (
              <button
                key={guard.id}
                onClick={() => {
                  setSelectedGuard(guard);
                  setSelectedCam(null);
                }}
                style={{ top: `${guard.y}%`, left: `${guard.x}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group transition-transform hover:scale-125 focus:outline-none"
              >
                {/* Radar pulse for guard */}
                <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${guard.status === 'responding' ? 'bg-red-500' : 'bg-emerald-400'}`} />

                {/* Guard Icon Container */}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-xl backdrop-blur-md transition-all ${
                    isSelected
                      ? 'bg-emerald-500 border-white text-black scale-110 shadow-emerald-500/50'
                      : guard.status === 'responding'
                      ? 'bg-red-600 border-white text-white animate-pulse'
                      : guard.status === 'secured'
                      ? 'bg-blue-600 border-emerald-400 text-white'
                      : 'bg-[#062419] border-emerald-400 text-emerald-400'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                </div>

                {/* Guard Badge & ETA */}
                <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/95 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[9px] font-mono text-emerald-300 pointer-events-none">
                  {guard.callsign} {guard.status === 'responding' && `(ETA: ${guard.etaSeconds}s)`}
                </div>
              </button>
            );
          })}

        {/* Floating Drone Waypoint Mission Planner & Flight Telemetry HUD */}
        {dronePlannerOpen && (
          <div className="absolute top-4 right-4 z-40 w-84 bg-[#0a1424]/95 border border-sky-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in text-xs font-mono">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <Plane className="w-4 h-4" />
                <span>SkyGuard-01 Aerial Mission HUD</span>
              </div>
              <button onClick={() => setDronePlannerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Flight Telemetry Matrix */}
            <div className="grid grid-cols-2 gap-2 mb-3 bg-black/40 p-2.5 rounded-xl border border-white/10 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px]">ALTITUDE (AGL)</span>
                <span className="text-white font-bold text-sm">{droneAlt}m</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">GROUND SPEED</span>
                <span className="text-sky-400 font-bold text-sm">{isDroneFlying ? `${droneSpeed} km/h` : '0.0 km/h'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">BATTERY</span>
                <span className="text-emerald-400 font-bold text-sm">84% (48m Rem)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">FLIGHT STATUS</span>
                <span className={`font-bold text-[10px] ${isDroneFlying ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
                  {isDroneFlying ? `TRANSIT WP-0${(currentWpIndex % waypoints.length) + 1}` : 'READY / DOCKED'}
                </span>
              </div>
            </div>

            {/* Waypoint Mission Controls */}
            <div className="space-y-2">
              <button
                onClick={handleToggleDroneFlight}
                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isDroneFlying
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30'
                }`}
              >
                {isDroneFlying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isDroneFlying ? 'Pause Aerial Mission' : '🚀 Launch Autonomous Flight'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleReturnToHome}
                  className="py-1.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px]"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> Return to Home
                </button>
                <button
                  onClick={() => setFlirThermal(!flirThermal)}
                  className={`py-1.5 border rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px] ${
                    flirThermal ? 'bg-orange-500/20 border-orange-400 text-orange-300 font-bold' : 'bg-white/[0.05] border-white/10 text-slate-300'
                  }`}
                >
                  <Flame className="w-3 h-3 text-orange-400" /> {flirThermal ? 'FLIR: ON' : 'FLIR Thermal'}
                </button>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                <span>Waypoints: <strong>{waypoints.length} Target Points</strong></span>
                <button
                  onClick={() => setWaypoints(DEFAULT_WAYPOINTS)}
                  className="text-sky-400 hover:underline"
                >
                  Reset Loop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Sector Breach Alert Badge with 1-Click Dispatch */}
        <div className="absolute top-4 left-4 z-30 bg-red-500/20 border border-red-500/40 text-red-300 p-3 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col gap-2 animate-fade-in max-w-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
            <div className="text-[11px] font-mono leading-tight">
              <span className="font-bold text-red-200">SECTOR 04 INTRUSION:</span> Server Vault Breach
            </div>
          </div>
          <button
            onClick={() => handleDispatchGuard('G-01', 48, 42, 'Sector 04: Server Vault')}
            className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-mono font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-1.5"
          >
            <Siren className="w-3.5 h-3.5" /> Dispatch Nearest Intercept Unit
          </button>
        </div>


        {/* Floating Guard Unit Inspector Card & Bodycam */}
        {selectedGuard && (
          <div className="absolute bottom-4 left-4 z-30 w-80 bg-[#0c1626]/95 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white font-mono">{selectedGuard.callsign}</span>
              </div>
              <button onClick={() => setSelectedGuard(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tactical Bodycam Stream */}
            <div className="relative aspect-video rounded-xl bg-black border border-white/10 overflow-hidden mb-2.5 flex items-center justify-center">
              <video
                src={selectedGuard.bodycamUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-red-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> BODYCAM LIVE
              </div>
              <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-slate-300 text-[9px] font-mono px-1.5 py-0.5 rounded">
                CH-04 ENCRYPTED
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-300 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Officer:</span>
                <span className="text-white font-bold">{selectedGuard.officer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="text-sky-400">{selectedGuard.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedGuard.status === 'responding' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {selectedGuard.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Comms Battery:</span>
                <span className="text-emerald-400 flex items-center gap-1"><Battery className="w-3 h-3" /> {selectedGuard.battery}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDispatchGuard(selectedGuard.id, 48, 42, 'Sector 04: Server Vault')}
                className="py-1.5 bg-red-500 hover:bg-red-400 text-white text-[10px] font-bold font-mono rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Navigation className="w-3 h-3" /> Dispatch
              </button>
              <button
                onClick={() => {
                  setGuards((prev) =>
                    prev.map((g) => (g.id === selectedGuard.id ? { ...g, status: 'patrol', etaSeconds: undefined } : g))
                  );
                }}
                className="py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-[10px] font-mono rounded-lg transition-colors"
              >
                Return to Patrol
              </button>
            </div>
          </div>
        )}

        {/* Floating Selected Camera Feed Inspector Card */}
        {selectedCam && !selectedGuard && (
          <div className="absolute bottom-4 right-4 z-30 w-72 bg-[#0c1626]/95 border border-sky-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white font-mono">{selectedCam.id} Stream</span>
              </div>
              <button onClick={() => setSelectedCam(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mini Simulated Live Feed */}
            <div className="relative aspect-video rounded-xl bg-black/60 border border-white/10 overflow-hidden mb-2.5 flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(56, 189, 248, 0.4) 2px, rgba(56, 189, 248, 0.4) 4px)',
                }}
              />
              <div className="text-center z-10">
                <Radio className="w-5 h-5 text-sky-400 mx-auto mb-1 animate-pulse" />
                <div className="text-[10px] font-mono text-slate-300">{selectedCam.name}</div>
              </div>
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded">
                30.0 FPS · 1080p
              </div>
            </div>

            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Sector:</span>
                <span className="text-white">{selectedCam.sector}</span>
              </div>
              <div className="flex justify-between">
                <span>Hardware:</span>
                <span className="text-sky-400">{selectedCam.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Detections:</span>
                <span className="text-emerald-400 font-bold">{selectedCam.peopleCount} Persons</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-4 py-2.5 bg-black/50 border-t border-white/10 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span>Facility: SafeWatch HQ Campus</span>
          <span>Tactical Guards: 3 Deployed</span>
          <span>Average Intercept SLA: 24s</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <span>Click any Guard Unit or Camera Pin on the radar to inspect & command</span>
        </div>
      </div>
    </div>
  );
};

export default FacilityBlueprintMap;

