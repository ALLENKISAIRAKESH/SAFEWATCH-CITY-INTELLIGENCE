import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Grid, Maximize2, Pause, Play, RefreshCw, Layers, ChevronRight,
  Radio, Clock, Users, Map, Video, Scan
} from 'lucide-react';
import CameraFeed from '@/components/CameraFeed';
import AlertPanel from '@/components/AlertPanel';
import StatusMonitor from '@/components/StatusMonitor';
import SourceSelector, { SourceType } from '@/components/SourceSelector';
import FacilityBlueprintMap from '@/components/FacilityBlueprintMap';
import AIOCRScannerModal from '@/components/AIOCRScannerModal';
import { useLiveData } from '@/contexts/LiveDataContext';
import { useAuth } from '@/contexts/AuthContext';


interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  location: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface SystemStatus {
  peopleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systemStatus: 'online' | 'offline' | 'maintenance';
  cameraStatus: 'active' | 'inactive';
  alertsCount: number;
}

const LiveMonitoring: React.FC = () => {
  const { user } = useAuth();
  const { emitClientDetection, recentDetections, uploadedVideoUrl, setUploadedVideoUrl } = useLiveData();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    peopleCount: 0,
    riskLevel: 'low',
    systemStatus: 'online',
    cameraStatus: 'active',
    alertsCount: 0,
  });

  const [sourceType, setSourceType] = useState<SourceType>('webcam');
  const [sourceUrl, setSourceUrl] = useState<string | undefined>();
  const [uploadFile, setUploadFile] = useState<File | undefined>();
  const [aiOverlay, setAiOverlay] = useState(true);
  const [paused, setPaused] = useState(false);
  const [streamPanelOpen, setStreamPanelOpen] = useState(true);
  const [monitoringMode, setMonitoringMode] = useState<'video' | 'blueprint'>('video');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const lastAlertRef = useRef<Record<string, number>>({});

  const uploadObjectUrl = useMemo(() => {
    if (!uploadFile) return uploadedVideoUrl || undefined;
    const url = URL.createObjectURL(uploadFile);
    return url;
  }, [uploadFile, uploadedVideoUrl]);

  const [gridLayout, setGridLayout] = useState<'1x1' | '2x2' | '3x3' | '1+5'>('2x2');
  const [heroCamIndex, setHeroCamIndex] = useState(0);
  const [isPatrolCycleActive, setIsPatrolCycleActive] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // Auto-Patrol Camera Tour Timer
  useEffect(() => {
    let patrolTimer: any;
    if (isPatrolCycleActive && gridLayout === '1+5') {
      patrolTimer = setInterval(() => {
        setHeroCamIndex((prev) => (prev + 1) % 6);
      }, 7000);
    }
    return () => clearInterval(patrolTimer);
  }, [isPatrolCycleActive, gridLayout]);

  const handleCaptureSnapshot = (dataUrl: string) => {
    const evdId = `EVD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newEvidence = {
      id: evdId,
      incidentId: 'LIVE-CAPTURE',
      source: sourceType === 'webcam' ? 'Operator Live Webcam' : `Source: ${sourceType}`,
      timestamp: new Date().toISOString(),
      type: 'Screenshot' as const,
      retentionStatus: 'Permanent' as const,
      thumbnailColor: '#1e3a5f',
      dataUrl,
    };
    try {
      const stored = localStorage.getItem('safewatch_user_snapshots') || '[]';
      const parsed = JSON.parse(stored);
      localStorage.setItem('safewatch_user_snapshots', JSON.stringify([newEvidence, ...parsed]));
    } catch (_) {}

    setSnapshotToast(`Snapshot captured and saved to Evidence Library as ${evdId}`);
    setTimeout(() => setSnapshotToast(null), 3500);
  };


  const handleDetectionUpdate = (
    peopleCount: number,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    hasMovement: boolean,
    zoneIntrusion?: boolean
  ) => {
    setSystemStatus((prev) => ({ ...prev, peopleCount, riskLevel }));

    emitClientDetection(
      peopleCount,
      riskLevel,
      sourceType === 'webcam' ? 'Operator Live Webcam' : `Source: ${sourceType}`
    );

    const now = Date.now();
    const emit = (key: string, a: Alert) => {
      if (now - (lastAlertRef.current[key] ?? 0) < 8000) return;
      lastAlertRef.current[key] = now;
      setAlerts((prev) => [a, ...prev].slice(0, 20));
    };

    if (zoneIntrusion) {
      emit('intrusion', {
        id: Math.random().toString(36).slice(2),
        type: 'critical',
        message: 'CRITICAL SECURITY BREACH: Restricted Polygon Zone Intrusion!',
        location: 'Restricted Defense Zone',
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (riskLevel === 'critical' && peopleCount > 3) {
      emit('critical', {
        id: Math.random().toString(36).slice(2),
        type: 'critical',
        message: `Critical crowd density — ${peopleCount} persons detected`,
        location: 'Operator Live Feed',
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (riskLevel === 'high' && peopleCount > 2) {
      emit('high', {
        id: Math.random().toString(36).slice(2),
        type: 'warning',
        message: `High activity — ${peopleCount} persons`,
        location: 'Operator Live Feed',
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (hasMovement && peopleCount > 0) {
      emit('movement', {
        id: Math.random().toString(36).slice(2),
        type: 'info',
        message: `Movement active — ${peopleCount} persons`,
        location: 'Operator Live Feed',
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  };

  const acknowledgeAlert = (id: string) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));

  const RISK_COLORS: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/15 border-red-500/30',
    high: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    medium: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  };

  return (
    <div className="space-y-4 relative">
      {/* Toast Notification */}
      {snapshotToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {snapshotToast}
        </div>
      )}

      {/* AI OCR & ALPR Scanner Modal */}
      <AIOCRScannerModal isOpen={showOcrModal} onClose={() => setShowOcrModal(false)} />

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Live Monitoring Mission Control</h2>
          <p className="text-sm text-slate-500">Real-time simultaneous multi-stream video matrix, webcam, uploaded media & spatial radar blueprint</p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI OCR ALPR Button */}
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 transition-colors shadow-lg shadow-sky-500/10"
          >
            <Scan className="w-3.5 h-3.5" />
            AI OCR / ALPR
          </button>

          {/* Mode Switcher: Video Grid vs Blueprint Map */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden bg-[#0a1120] text-xs font-mono">
            <button
              onClick={() => setMonitoringMode('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${monitoringMode === 'video' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Video className="w-3.5 h-3.5" /> Video Matrix
            </button>
            <button
              onClick={() => setMonitoringMode('blueprint')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${monitoringMode === 'blueprint' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Map className="w-3.5 h-3.5" /> Facility Blueprint Map
            </button>
          </div>

          {monitoringMode === 'video' && (
            <>
              {/* Multi-Grid Layout Switcher & Patrol Tour */}
              <div className="flex items-center gap-1.5 bg-[#0a1120] border border-white/10 rounded-lg p-1 text-xs font-mono">
                {(['1x1', '2x2', '3x3', '1+5'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGridLayout(mode)}
                    className={`px-2.5 py-1 rounded transition-colors ${gridLayout === mode ? 'bg-sky-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {mode === '1+5' ? '1+5 Hero' : mode}
                  </button>
                ))}

                {gridLayout === '1+5' && (
                  <button
                    onClick={() => setIsPatrolCycleActive(!isPatrolCycleActive)}
                    className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                      isPatrolCycleActive ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse' : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                    title="Auto-Cycle Patrol Tour across all cameras"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPatrolCycleActive ? 'animate-spin' : ''}`} />
                    <span>{isPatrolCycleActive ? 'Patrol ON' : 'Patrol Tour'}</span>
                  </button>
                )}
              </div>

              {/* AI Overlay */}
              <button
                onClick={() => setAiOverlay((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${aiOverlay ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-white/[0.05] border-white/10 text-slate-400'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                AI Overlay
              </button>
              {/* Pause/Play */}
              <button
                onClick={() => setPaused((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border bg-white/[0.05] border-white/10 text-slate-300 hover:border-white/20 transition-colors"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {paused ? 'Resume' : 'Pause'}
              </button>
            </>
          )}

          {/* Refresh */}
          <button className="p-1.5 rounded-lg border border-white/10 bg-white/[0.05] text-slate-400 hover:text-white hover:border-white/20 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>


      {/* Blueprint View Mode */}
      {monitoringMode === 'blueprint' ? (
        <div className="space-y-4 animate-fade-in">
          <FacilityBlueprintMap
            onSelectCamera={(camId) => {
              if (camId === 'CAM-01') setSourceType('webcam');
            }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusMonitor systemStatus={systemStatus} alertsCount={alerts.filter((a) => !a.acknowledged).length} />
            <AlertPanel alerts={alerts} onAcknowledgeAlert={acknowledgeAlert} />
          </div>
        </div>
      ) : (
        <>
          {/* Source Selector Bar */}
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-300 mb-1">Quick Source Control:</div>
              <SourceSelector
                current={sourceType}
                sourceUrl={sourceUrl}
                onChange={(type, urlOrFile) => {
                  setSourceType(type);
                  if (type === 'upload' && urlOrFile instanceof File) {
                    setUploadFile(urlOrFile);
                    const url = URL.createObjectURL(urlOrFile);
                    setUploadedVideoUrl(url);
                    setSourceUrl(undefined);
                  } else if ((type === 'drone' || type === 'mobile') && typeof urlOrFile === 'string') {
                    setSourceUrl(urlOrFile);
                    setUploadFile(undefined);
                  } else if (type === 'webcam') {
                    setSourceUrl(undefined);
                    setUploadFile(undefined);
                  }
                }}
              />
            </div>
            {uploadedVideoUrl && (
              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Uploaded Video Active on CAM 02 Matrix</span>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className={`grid gap-4 ${streamPanelOpen ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Camera Feed Area */}
            <div className={`space-y-4 ${streamPanelOpen ? 'xl:col-span-2' : ''}`}>
              {/* Camera Grid Card */}
              <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-white">
                      {gridLayout === '1+5' ? '1+5 Hero SOC Video Wall' : `Live Monitoring Matrix (${gridLayout})`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">TensorFlow COCO-SSD + YOLOv8 Active</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-lg border ${RISK_COLORS[systemStatus.riskLevel]}`}>
                    <Users className="w-3 h-3" />
                    <span>{systemStatus.peopleCount} persons</span>
                    <span className="capitalize">· {systemStatus.riskLevel}</span>
                  </div>
                </div>

                <div className="p-3">
                  {gridLayout === '1x1' ? (
                    <CameraFeed
                      sourceType={sourceType}
                      sourceUrl={sourceType === 'upload' ? uploadObjectUrl : sourceUrl}
                      isActive={!paused && systemStatus.cameraStatus === 'active'}
                      peopleCount={systemStatus.peopleCount}
                      riskLevel={systemStatus.riskLevel}
                      onDetectionUpdate={handleDetectionUpdate}
                      onCaptureSnapshot={handleCaptureSnapshot}
                    />
                  ) : gridLayout === '1+5' ? (
                    /* 1+5 Hero Layout: 1 Master Focus + 5 Auxiliary Feeds */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="lg:col-span-2 space-y-1.5">
                        <div className="flex items-center justify-between px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-[11px] font-mono text-sky-300">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            HERO MASTER: CAM 0{heroCamIndex + 1} · {['Live Webcam', 'Logistics Bay', 'Server Vault', 'North Gate', 'Switchyard', 'Hazmat Dock'][heroCamIndex]}
                          </span>
                          <span className="text-[10px] text-slate-400">Click right rail to promote feed</span>
                        </div>
                        {heroCamIndex === 0 ? (
                          <CameraFeed
                            sourceType="webcam"
                            isActive={!paused && systemStatus.cameraStatus === 'active'}
                            peopleCount={systemStatus.peopleCount}
                            riskLevel={systemStatus.riskLevel}
                            onDetectionUpdate={handleDetectionUpdate}
                            onCaptureSnapshot={handleCaptureSnapshot}
                          />
                        ) : heroCamIndex === 1 ? (
                          <CameraFeed
                            sourceType="upload"
                            sourceUrl={uploadObjectUrl || uploadedVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                            isActive={!paused && systemStatus.cameraStatus === 'active'}
                            peopleCount={systemStatus.peopleCount}
                            riskLevel={systemStatus.riskLevel}
                            onDetectionUpdate={() => {}}
                            onCaptureSnapshot={handleCaptureSnapshot}
                          />
                        ) : (
                          <CameraFeed
                            sourceType="drone"
                            sourceUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
                            isActive={!paused && systemStatus.cameraStatus === 'active'}
                            peopleCount={1}
                            riskLevel="low"
                            onDetectionUpdate={() => {}}
                            onCaptureSnapshot={handleCaptureSnapshot}
                          />
                        )}
                      </div>

                      {/* 5 Auxiliary Thumbnails */}
                      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                        {[
                          { id: 0, title: 'CAM 01: Live Webcam', type: 'webcam' as const, badge: 'Live AI' },
                          { id: 1, title: 'CAM 02: Logistics Bay', type: 'upload' as const, badge: 'HD Stream' },
                          { id: 2, title: 'CAM 03: Server Vault', type: 'drone' as const, badge: 'Drone FLIR' },
                          { id: 3, title: 'CAM 04: North Gate', type: 'mobile' as const, badge: 'ALPR' },
                          { id: 4, title: 'CAM 05: Switchyard', type: 'mobile' as const, badge: '4K PTZ' },
                          { id: 5, title: 'CAM 06: Hazmat Dock', type: 'mobile' as const, badge: 'Thermal' },
                        ].map((cam) => (
                          <div
                            key={cam.id}
                            onClick={() => setHeroCamIndex(cam.id)}
                            className={`cursor-pointer p-2 rounded-xl border transition-all text-xs font-mono ${
                              heroCamIndex === cam.id
                                ? 'bg-sky-500/20 border-sky-400 shadow-md scale-[1.01]'
                                : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white text-[11px] truncate">{cam.title}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 text-sky-300 font-bold">{cam.badge}</span>
                            </div>
                            <div className="w-full h-16 bg-[#040810] rounded-lg border border-white/5 flex items-center justify-center text-slate-500 text-[10px]">
                              {heroCamIndex === cam.id ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  BROADCASTING IN HERO
                                </span>
                              ) : (
                                <span>Click to switch to Hero</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 2x2 or 3x3 Grid Layout */
                    <div className={`grid gap-3 ${gridLayout === '2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                      {/* CAM 01: Live User Webcam */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded text-[11px] font-mono text-white border border-white/10">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <strong>CAM 01</strong> — Live Webcam (Primary)
                          </span>
                          <span className="text-emerald-400">{systemStatus.peopleCount} det</span>
                        </div>
                        <CameraFeed
                          sourceType="webcam"
                          isActive={!paused && systemStatus.cameraStatus === 'active'}
                          peopleCount={systemStatus.peopleCount}
                          riskLevel={systemStatus.riskLevel}
                          onDetectionUpdate={handleDetectionUpdate}
                          onCaptureSnapshot={handleCaptureSnapshot}
                        />
                      </div>

                      {/* CAM 02: Uploaded Video File (or sample) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded text-[11px] font-mono text-white border border-white/10">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <strong>CAM 02</strong> — {uploadedVideoUrl || uploadObjectUrl ? 'Uploaded Video (AI Active)' : 'Logistics Bay Stream'}
                          </span>
                          <span className="text-sky-400">COCO-SSD</span>
                        </div>
                        <CameraFeed
                          sourceType="upload"
                          sourceUrl={uploadObjectUrl || uploadedVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                          isActive={!paused && systemStatus.cameraStatus === 'active'}
                          peopleCount={systemStatus.peopleCount}
                          riskLevel={systemStatus.riskLevel}
                          onDetectionUpdate={() => {}}
                          onCaptureSnapshot={handleCaptureSnapshot}
                        />
                      </div>

                      {/* CAM 03: Perimeter Drone Stream */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded text-[11px] font-mono text-white border border-white/10">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <strong>CAM 03</strong> — Server Vault (Perimeter Drone)
                          </span>
                          <span className="text-slate-400">1080p · 30 FPS</span>
                        </div>
                        <CameraFeed
                          sourceType="drone"
                          sourceUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
                          isActive={!paused && systemStatus.cameraStatus === 'active'}
                          peopleCount={2}
                          riskLevel="low"
                          onDetectionUpdate={() => {}}
                          onCaptureSnapshot={handleCaptureSnapshot}
                        />
                      </div>

                      {/* CAM 04: North Gate Stream */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded text-[11px] font-mono text-white border border-white/10">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <strong>CAM 04</strong> — North Gate & Loading Bay
                          </span>
                          <span className="text-slate-400">1080p · 28 FPS</span>
                        </div>
                        <CameraFeed
                          sourceType="mobile"
                          sourceUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
                          isActive={!paused && systemStatus.cameraStatus === 'active'}
                          peopleCount={1}
                          riskLevel="medium"
                          onDetectionUpdate={() => {}}
                          onCaptureSnapshot={handleCaptureSnapshot}
                        />
                      </div>

                      {/* Extra CAM 05 & 06 for 3x3 layout */}
                      {gridLayout === '3x3' && (
                        <>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded text-[11px] font-mono text-white border border-white/10">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                <strong>CAM 05</strong> — High Voltage Switchyard
                              </span>
                              <span className="text-slate-400">4K PTZ</span>
                            </div>
                            <CameraFeed
                              sourceType="mobile"
                              sourceUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
                              isActive={!paused && systemStatus.cameraStatus === 'active'}
                              peopleCount={0}
                              riskLevel="low"
                              onDetectionUpdate={() => {}}
                              onCaptureSnapshot={handleCaptureSnapshot}
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded text-[11px] font-mono text-white border border-white/10">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                <strong>CAM 06</strong> — Chemical Storage & Hazmat Dock
                              </span>
                              <span className="text-slate-400">Thermal FLIR</span>
                            </div>
                            <CameraFeed
                              sourceType="drone"
                              sourceUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
                              isActive={!paused && systemStatus.cameraStatus === 'active'}
                              peopleCount={0}
                              riskLevel="low"
                              onDetectionUpdate={() => {}}
                              onCaptureSnapshot={handleCaptureSnapshot}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>




          {/* Status + Alerts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusMonitor systemStatus={systemStatus} alertsCount={alerts.filter((a) => !a.acknowledged).length} />
            <AlertPanel alerts={alerts} onAcknowledgeAlert={acknowledgeAlert} />
          </div>
        </div>

        {/* Detection Stream Panel */}
        {streamPanelOpen && (
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">Detection Stream</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Live detections from camera */}
              {systemStatus.peopleCount > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-400">PERSON</span>
                    <span className="font-mono text-slate-400">{systemStatus.peopleCount}x</span>
                  </div>
                  <div className="text-slate-500 font-mono">Live Feed · Real Detection</div>
                </div>
              )}
              {/* Real-time recent detections */}
              {recentDetections.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs hover:border-white/15 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-400">{item.label}</span>
                    <span className="font-mono text-slate-400">{Math.round(item.score * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono">
                    <span className="truncate max-w-[130px]">{item.source}</span>
                    <span>·</span>
                    <span>Track {item.trackId}</span>
                  </div>
                  <div className="text-slate-600 text-[10px] mt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    {item.operatorName && <span className="ml-2 text-sky-400 font-medium">by {item.operatorName}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
};

export default LiveMonitoring;


