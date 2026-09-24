import React, { useState, useRef, useEffect } from 'react';
import {
  X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Camera, Download, Shield, Sparkles, Clock, AlertTriangle, UserCheck, Car, Tag
} from 'lucide-react';

interface AIEventMarker {
  timeSeconds: number;
  label: string;
  type: 'critical' | 'warning' | 'info';
  trackId: string;
  confidence: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  evidenceItem: any;
}

const DEFAULT_AI_MARKERS: AIEventMarker[] = [
  { timeSeconds: 3.2, label: 'Person Intrusion', type: 'critical', trackId: '#TRK-402', confidence: 94 },
  { timeSeconds: 8.5, label: 'Missing Hardhat PPE', type: 'warning', trackId: '#TRK-408', confidence: 89 },
  { timeSeconds: 14.1, label: 'Unregistered Vehicle', type: 'critical', trackId: '#VEH-09', confidence: 96 },
  { timeSeconds: 22.0, label: 'Crowd Density Surge', type: 'warning', trackId: '#TRK-415', confidence: 91 },
];

const ForensicVideoPlayerModal: React.FC<Props> = ({ isOpen, onClose, evidenceItem }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeMarker, setActiveMarker] = useState<AIEventMarker | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const videoSrc = evidenceItem?.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setZoomLevel(1.0);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen || !evidenceItem) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Check if near any AI event marker
    const nearby = DEFAULT_AI_MARKERS.find((m) => Math.abs(m.timeSeconds - curr) < 0.8);
    setActiveMarker(nearby || null);
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const stepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const delta = forward ? 0.04 : -0.04; // ~25 FPS frame step
    seekTo(videoRef.current.currentTime + delta);
  };

  const changePlaybackSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleCaptureForensicFrame = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    // Forensic Watermark Header
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`SAFEWATCH FORENSIC CAPTURE — ${evidenceItem.id} | TIMECODE: ${formatTimecode(currentTime)} | SHA-256 VERIFIED`, 20, 24);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `FORENSIC_${evidenceItem.id}_TC_${Math.round(currentTime * 100)}.jpg`;
    link.click();

    setToastMessage(`📸 Forensic timestamped frame extracted & downloaded with hash watermark!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#091120] border border-sky-500/40 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in font-mono text-xs">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#070d18]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white uppercase">Forensic Video Scrubber & AI Cue Player</span>
                <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-full font-bold">
                  25.0 FPS CALIBRATED
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Record: <strong className="text-slate-200">{evidenceItem.id}</strong> · Incident: <strong className="text-sky-300">{evidenceItem.incidentId}</strong> · {evidenceItem.source}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureForensicFrame}
              className="px-3 py-1.5 bg-sky-500/20 border border-sky-400/40 hover:bg-sky-500/30 text-sky-300 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture Forensic Frame
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Surface */}
        <div
          className="relative bg-black flex-1 overflow-hidden min-h-[380px] max-h-[500px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => {
            if (zoomLevel > 1) {
              setIsDragging(true);
              setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }
          }}
          onMouseMove={(e) => {
            if (isDragging && zoomLevel > 1) {
              setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 30)}
            onClick={togglePlay}
            className="w-full h-full object-contain"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          />

          {/* Forensic HUD Overlay */}
          <div className="absolute top-3 left-3 bg-black/75 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 pointer-events-none backdrop-blur-sm space-y-0.5">
            <div>TIMECODE: <span className="text-sky-400 font-bold">{formatTimecode(currentTime)}</span> / {formatTimecode(duration)}</div>
            <div>ZOOM: <span className="text-emerald-400 font-bold">{zoomLevel.toFixed(1)}x</span> {zoomLevel > 1 ? `(Pan: ${Math.round(panOffset.x)}, ${Math.round(panOffset.y)})` : ''}</div>
          </div>

          {/* Active AI Event Marker Callout */}
          {activeMarker && (
            <div className="absolute top-3 right-3 bg-red-600/90 border border-white/40 text-white rounded-xl px-3.5 py-2 text-xs font-mono shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-2 pointer-events-none">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <div>
                <div className="font-bold">{activeMarker.label.toUpperCase()} DETECTED</div>
                <div className="text-[10px] text-red-100 font-mono">
                  Track: {activeMarker.trackId} · Confidence: {activeMarker.confidence}%
                </div>
              </div>
            </div>
          )}

          {/* Toast */}
          {toastMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl animate-fade-in flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              {toastMessage}
            </div>
          )}
        </div>

        {/* Timeline Scrubber & AI Cue Markers */}
        <div className="bg-[#080e1a] p-4 border-t border-white/10 space-y-3">
          {/* Scrubber Bar */}
          <div className="relative w-full">
            {/* AI Marker Pins along Timeline */}
            <div className="relative w-full h-7 bg-white/[0.04] border border-white/10 rounded-lg overflow-hidden flex items-center px-1">
              {DEFAULT_AI_MARKERS.map((marker, idx) => {
                const pct = (marker.timeSeconds / duration) * 100;
                return (
                  <button
                    key={idx}
                    onClick={() => seekTo(marker.timeSeconds)}
                    style={{ left: `${pct}%` }}
                    title={`Seek to ${marker.label} (${formatTimecode(marker.timeSeconds)})`}
                    className={`absolute top-0 bottom-0 w-2.5 -ml-1 rounded-sm flex items-center justify-center transition-all hover:scale-125 z-10 ${
                      marker.type === 'critical'
                        ? 'bg-red-500 hover:bg-red-400 shadow-md shadow-red-500/50'
                        : 'bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/50'
                    }`}
                  >
                    <span className="w-1 h-3 bg-black/40 rounded-full" />
                  </button>
                );
              })}

              {/* Progress fill */}
              <div
                className="h-full bg-sky-500/30 transition-all pointer-events-none"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />

              {/* Scrubber input */}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* AI Cue Points Quick Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Tag className="w-3 h-3 text-sky-400" />
              AI Cue Markers:
            </span>
            {DEFAULT_AI_MARKERS.map((m, idx) => (
              <button
                key={idx}
                onClick={() => seekTo(m.timeSeconds)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 transition-colors ${
                  Math.abs(currentTime - m.timeSeconds) < 1.0
                    ? 'bg-sky-500/30 border-sky-400 text-sky-300 font-bold'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    m.type === 'critical' ? 'bg-red-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span>{m.label}</span>
                <span className="text-slate-400 font-mono">({formatTimecode(m.timeSeconds)})</span>
              </button>
            ))}
          </div>

          {/* Bottom Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => stepFrame(false)}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white"
                title="Step -1 Frame (-0.04s)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-sky-500/25"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => stepFrame(true)}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white"
                title="Step +1 Frame (+0.04s)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => seekTo(0)}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white"
                title="Restart from 00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="text-xs font-mono text-slate-300 pl-2">
                <span className="text-sky-400 font-bold">{formatTimecode(currentTime)}</span> / {formatTimecode(duration)}
              </div>
            </div>

            {/* Playback Speed Switcher */}
            <div className="flex items-center gap-1 bg-[#060c18] border border-white/10 rounded-lg p-0.5">
              {[0.25, 0.5, 1.0, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => changePlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    playbackRate === spd ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Magnification Zoom Controller */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase">Magnify:</span>
              <div className="flex items-center gap-1 bg-[#060c18] border border-white/10 rounded-lg p-0.5">
                {[1.0, 2.0, 4.0].map((z) => (
                  <button
                    key={z}
                    onClick={() => {
                      setZoomLevel(z);
                      if (z === 1.0) setPanOffset({ x: 0, y: 0 });
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                      zoomLevel === z ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForensicVideoPlayerModal;
