import React, { useEffect, useRef, useState, useCallback } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import Hls from "hls.js";
import { io, Socket } from "socket.io-client";
import { Camera, Edit3, Check, X, ShieldAlert, Volume2, VolumeX, Compass, Mic, Radio, Megaphone, Sparkles, Siren, Flame, Thermometer, Crosshair } from "lucide-react";
import type { SourceType } from "./SourceSelector";
import PTZVirtualJoystick, { PTZState } from "./PTZVirtualJoystick";
import { audioAnnouncer } from "@/utils/audioAnnouncer";

type Risk = "low" | "medium" | "high" | "critical";

interface Point {
  x: number;
  y: number;
}

interface Props {
  sourceType: SourceType;
  sourceUrl?: string | undefined;
  isActive: boolean;
  peopleCount: number;
  riskLevel: Risk;
  onDetectionUpdate: (peopleCount: number, riskLevel: Risk, hasMovement: boolean, zoneIntrusion?: boolean) => void;
  onCaptureSnapshot?: (dataUrl: string) => void;
  ptzTransform?: PTZState;
}


type BackendDetection = {
  bbox: [number, number, number, number];
  label: string;
  score: number;
};

const BACKEND_SOCKET_URL = "http://localhost:5000";
const BACKEND_STREAM_PROXY = "http://localhost:5000/stream?url=";

// Ray-casting point-in-polygon algorithm
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const CameraFeed: React.FC<Props> = ({
  sourceType,
  sourceUrl,
  isActive,
  onDetectionUpdate,
  onCaptureSnapshot,
  ptzTransform,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [usingMjpeg, setUsingMjpeg] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [backendDetections, setBackendDetections] = useState<{ detections: BackendDetection[]; fw: number; fh: number } | null>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);

  // Safety Zone polygon drawing state
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [zonePoints, setZonePoints] = useState<Point[]>([]);
  const [zoneActive, setZoneActive] = useState(false);
  const [zoneIntrusionDetected, setZoneIntrusionDetected] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  // 2-Way Virtual Intercom & Megaphone Station State
  const [showIntercom, setShowIntercom] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // Drone Thermal Radiometric Spot Temperature State
  const [isThermalActive, setIsThermalActive] = useState(false);
  const [thermalPalette, setThermalPalette] = useState<'ironbow' | 'rainbow' | 'whitehot' | 'blackhot'>('ironbow');
  const [hoverTemp, setHoverTemp] = useState<{ temp: number; x: number; y: number; isHotspot: boolean } | null>(null);

  // Local PTZ Joystick state
  const [showPtz, setShowPtz] = useState(false);
  const [localPtz, setLocalPtz] = useState<PTZState>({
    pan: 0,
    tilt: 0,
    zoom: 1.0,
    autoFocus: true,
    iris: 100,
  });

  const activePtz = ptzTransform || localPtz;




  // Load COCO-SSD model
  useEffect(() => {
    let alive = true;
    cocoSsd.load().then((m) => {
      if (alive) setModel(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Play alert tone on zone intrusion if unmuted
  const playAlertTone = useCallback(() => {
    if (audioMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (_) {}
  }, [audioMuted]);

  // Socket: receive backend detections
  useEffect(() => {
    const s = io(BACKEND_SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = s;
    s.on("detection", (payload: any) => {
      if (!payload || !payload.sourceUrl || !sourceUrl) return;
      if (payload.sourceUrl === sourceUrl) {
        setBackendDetections({
          detections: payload.detections ?? [],
          fw: payload.frameWidth ?? 0,
          fh: payload.frameHeight ?? 0,
        });
      }
    });
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [sourceUrl]);

  // Attach camera source
  useEffect(() => {
    const v = videoRef.current;
    const img = imgRef.current;
    let hls: Hls | null = null;

    const stopTracks = () => {
      if (v && v.srcObject instanceof MediaStream) {
        v.srcObject.getTracks().forEach((t) => t.stop());
        // @ts-ignore
        v.srcObject = null;
      }
    };

    const cleanup = () => {
      stopTracks();
      if (hls) {
        hls.destroy();
        hls = null;
        setHlsInstance(null);
      }
      if (img) img.src = "";
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.src = "";
      }
      setUsingMjpeg(false);
    };

    const setup = async () => {
      if (!v) return;
      cleanup();

      if (!isActive) return;

      if (sourceType === "webcam") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          });
          // @ts-ignore
          v.srcObject = stream;
          await v.play().catch(() => {});
          return;
        } catch (e) {
          console.error("Webcam error:", e);
          return;
        }
      }

      if (sourceType === "upload") {
        if (!sourceUrl) return;
        v.controls = true;
        v.src = sourceUrl;
        await v.play().catch(() => {});
        return;
      }

      if ((sourceType === "drone" || sourceType === "mobile") && sourceUrl) {
        const url = sourceUrl.trim();

        if (url.endsWith(".m3u8") && Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls.loadSource(url);
          hls.attachMedia(v);
          setHlsInstance(hls);
          await new Promise<void>((resolve, reject) => {
            hls!.on(Hls.Events.MANIFEST_PARSED, () => resolve());
            hls!.on(Hls.Events.ERROR, (_, data) => data.fatal && reject(data));
          });
          await v.play().catch(() => {});
          return;
        }

        if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
          v.src = url;
          await v.play().catch(() => {});
          return;
        }

        try {
          const proxy = BACKEND_STREAM_PROXY + encodeURIComponent(url);
          if (img) {
            img.src = proxy;
            setUsingMjpeg(true);
            return;
          } else {
            v.src = proxy;
            await v.play().catch(() => {});
            return;
          }
        } catch (err) {
          console.error("Stream proxy error:", err);
        }
      }
    };

    setup().catch((err) => console.error("setup error", err));
    return () => cleanup();
  }, [sourceType, sourceUrl, isActive]);

  // Real-time Detection Loop
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !model) return;

    const loop = async () => {
      try {
        let w = 0, h = 0;
        if (usingMjpeg && img && img.complete && img.naturalWidth > 0) {
          w = img.naturalWidth;
          h = img.naturalHeight;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
        } else if (video && video.readyState >= 2) {
          w = video.videoWidth;
          h = video.videoHeight;
          if (w && h) {
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
          }
        } else {
          raf = requestAnimationFrame(loop);
          return;
        }

        // Draw Defined Safety Zone Polygon
        if (zonePoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo((zonePoints[0].x / 100) * w, (zonePoints[0].y / 100) * h);
          for (let i = 1; i < zonePoints.length; i++) {
            ctx.lineTo((zonePoints[i].x / 100) * w, (zonePoints[i].y / 100) * h);
          }
          if (zoneActive && zonePoints.length >= 3) {
            ctx.closePath();
            ctx.fillStyle = zoneIntrusionDetected ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.15)";
            ctx.fill();
            ctx.strokeStyle = zoneIntrusionDetected ? "#ef4444" : "rgba(239, 68, 68, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Label Zone
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 13px monospace";
            ctx.fillText(
              zoneIntrusionDetected ? "⚠️ RESTRICTED ZONE INTRUSION!" : "🛡️ RESTRICTED ZONE",
              (zonePoints[0].x / 100) * w + 8,
              (zonePoints[0].y / 100) * h + 20
            );
          } else {
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Run COCO-SSD Detection
        const preds = await model.detect(canvas);
        let intrusion = false;

        for (const p of preds) {
          const [x, y, bw, bh] = p.bbox;
          const feetPoint: Point = {
            x: ((x + bw / 2) / w) * 100,
            y: ((y + bh) / h) * 100,
          };

          const isInsideZone = zoneActive && zonePoints.length >= 3 && isPointInPolygon(feetPoint, zonePoints);
          if (isInsideZone && p.class === "person") {
            intrusion = true;
          }

          // Bounding Box Styling
          ctx.strokeStyle = isInsideZone ? "#ef4444" : "#22c55e";
          ctx.lineWidth = isInsideZone ? 3 : 2;
          ctx.strokeRect(x, y, bw, bh);

          // Tag Label
          const label = `${p.class.toUpperCase()} ${Math.round(p.score * 100)}%${isInsideZone ? " [INTRUSION]" : ""}`;
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = isInsideZone ? "rgba(239, 68, 68, 0.85)" : "rgba(0, 0, 0, 0.7)";
          const wtext = ctx.measureText(label).width + 10;
          ctx.fillRect(x, y - 20, wtext, 20);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, x + 5, y - 5);
        }

        // Draw Backend YOLO Detections if remote stream
        if (backendDetections && backendDetections.detections.length > 0) {
          const { detections, fw, fh } = backendDetections;
          const scaleX = canvas.width / fw || 1;
          const scaleY = canvas.height / fh || 1;
          for (const d of detections) {
            const [bx, by, bw, bh] = d.bbox;
            const x = bx * scaleX;
            const y = by * scaleY;
            const wbox = bw * scaleX;
            const hbox = bh * scaleY;
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, wbox, hbox);
            const label = `YOLO: ${d.label} ${Math.round(d.score * 100)}%`;
            ctx.fillStyle = "rgba(14, 165, 233, 0.85)";
            const wtext = ctx.measureText(label).width + 8;
            ctx.fillRect(x, y - 18, wtext, 18);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, x + 4, y - 4);
          }
        }

        setZoneIntrusionDetected(intrusion);
        if (intrusion) playAlertTone();

        const people = preds.filter((p) => p.class === "person").length;
        let risk: Risk = "low";
        if (intrusion || people > 4) risk = "critical";
        else if (people > 2) risk = "high";
        else if (people > 0) risk = "medium";

        onDetectionUpdate(people, risk, people > 0, intrusion);
      } catch (_) {}
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [model, usingMjpeg, backendDetections, onDetectionUpdate, zonePoints, zoneActive, zoneIntrusionDetected, playAlertTone]);

  // Handle Canvas Clicking for Polygon Zone Drawing
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingZone) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setZonePoints((prev) => [...prev, { x: xPct, y: yPct }]);
  };

  // Instant Snapshot Capture
  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (onCaptureSnapshot) {
      onCaptureSnapshot(dataUrl);
    }
  };

  return (
    <div className="space-y-2">
      {/* Top Interactive Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#0a1120] border border-white/10 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2">
          {isDrawingZone ? (
            <div className="flex items-center gap-1.5 text-sky-400">
              <Edit3 className="w-3.5 h-3.5 animate-pulse" />
              <span>Click on video frame to add boundary points ({zonePoints.length} points)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Restricted Zone:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${zoneActive ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/5 text-slate-500"}`}>
                {zoneActive ? "ACTIVE DEFENSE" : "UNSET"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDrawingZone ? (
            <>
              <button
                onClick={() => {
                  if (zonePoints.length >= 3) {
                    setZoneActive(true);
                    setIsDrawingZone(false);
                  }
                }}
                disabled={zonePoints.length < 3}
                className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1 disabled:opacity-40"
              >
                <Check className="w-3 h-3" /> Save Zone
              </button>
              <button
                onClick={() => {
                  setZonePoints([]);
                  setZoneActive(false);
                  setIsDrawingZone(false);
                }}
                className="px-2 py-1 bg-white/5 text-slate-400 hover:text-white rounded flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsDrawingZone(true);
                  setZonePoints([]);
                  setZoneActive(false);
                }}
                className="px-2.5 py-1 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded hover:bg-sky-500/25 flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3 h-3" /> {zoneActive ? "Redraw Zone" : "Draw Safety Zone"}
              </button>

              <button
                onClick={() => setShowPtz(!showPtz)}
                className={`px-2.5 py-1 rounded border flex items-center gap-1 transition-colors ${
                  showPtz || activePtz.zoom > 1 || activePtz.pan !== 0 || activePtz.tilt !== 0
                    ? "bg-sky-500/25 border-sky-400 text-sky-300 font-bold"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                }`}
                title="Pan-Tilt-Zoom Virtual Controller"
              >
                <Compass className={`w-3 h-3 ${showPtz ? "text-sky-400 animate-spin" : ""}`} />
                <span>PTZ {activePtz.zoom > 1 ? `(${activePtz.zoom.toFixed(1)}x)` : ""}</span>
              </button>

              {/* 2-Way Virtual Audio Intercom & Megaphone */}
              <button
                onClick={() => {
                  audioAnnouncer.unlockAudio();
                  setShowIntercom(!showIntercom);
                }}
                className={`px-2.5 py-1 rounded border flex items-center gap-1 transition-colors ${
                  showIntercom || isPttActive
                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold shadow-sm"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                }`}
                title="2-Way Audio Walkway Intercom & Megaphone Broadcast"
              >
                <Mic className={`w-3 h-3 ${isPttActive ? "text-emerald-400 animate-ping" : "text-emerald-400"}`} />
                <span>Walkway Intercom</span>
              </button>

              {/* Drone Thermal Radiometric Profiler Button */}
              <button
                onClick={() => setIsThermalActive(!isThermalActive)}
                className={`px-2.5 py-1 rounded border flex items-center gap-1 transition-colors ${
                  isThermalActive
                    ? "bg-amber-500/25 border-amber-400 text-amber-300 font-bold shadow-md shadow-amber-500/20"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                }`}
                title="FLIR Radiometric Spot Temperature & Thermal Vision"
              >
                <Flame className={`w-3 h-3 ${isThermalActive ? "text-amber-400 animate-pulse" : "text-amber-400"}`} />
                <span>Thermal {isThermalActive ? `(${thermalPalette})` : ""}</span>
              </button>

              {/* Thermal Palette Selector dropdown if active */}
              {isThermalActive && (
                <select
                  value={thermalPalette}
                  onChange={(e: any) => setThermalPalette(e.target.value)}
                  className="bg-[#050b16] border border-amber-500/40 text-amber-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none"
                >
                  <option value="ironbow">Ironbow</option>
                  <option value="rainbow">Rainbow</option>
                  <option value="whitehot">White Hot</option>
                  <option value="blackhot">Black Hot</option>
                </select>
              )}

              <button
                onClick={handleCaptureSnapshot}
                className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded flex items-center gap-1 transition-colors"
              >
                <Camera className="w-3 h-3" /> Capture Evidence
              </button>

              <button
                onClick={() => setAudioMuted(!audioMuted)}
                title={audioMuted ? "Unmute Alarm Siren" : "Mute Siren"}
                className={`p-1 rounded border transition-colors ${audioMuted ? "bg-white/5 border-white/10 text-slate-500" : "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"}`}
              >
                {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Video & Canvas Container with PTZ Optical Transform */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black"
        style={{ minHeight: 480 }}
        onMouseMove={(e) => {
          if (!isThermalActive) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          // Calculate simulated radiometric spot temperature based on center proximity & noise
          const centerDist = Math.hypot(x - rect.width / 2, y - rect.height / 2);
          const rawTemp = 24.5 + Math.max(0, (200 - centerDist) * 0.28) + (Math.sin(x * 0.05) * 4);
          const temp = Math.round(rawTemp * 10) / 10;
          setHoverTemp({
            temp,
            x,
            y,
            isHotspot: temp > 75.0,
          });
        }}
        onMouseLeave={() => setHoverTemp(null)}
      >
        {/* Inner Video Surface with Smooth PTZ Zoom/Pan & Thermal Filter */}
        <div
          className="w-full h-full relative"
          style={{
            transform: `scale(${activePtz.zoom}) translate(${activePtz.pan * 0.12}px, ${activePtz.tilt * 0.12}px)`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
            filter: isThermalActive
              ? thermalPalette === 'ironbow'
                ? 'contrast(160%) saturate(220%) hue-rotate(290deg)'
                : thermalPalette === 'rainbow'
                ? 'contrast(180%) saturate(300%) hue-rotate(180deg)'
                : thermalPalette === 'whitehot'
                ? 'grayscale(100%) contrast(150%) brightness(120%)'
                : 'grayscale(100%) invert(100%) contrast(140%)'
              : 'none',
          }}
        >
          <video
            ref={videoRef}
            className="rounded-xl shadow-md w-full h-auto block"
            autoPlay
            muted
            playsInline
            style={{ display: usingMjpeg ? "none" : "block" }}
          />
          <img
            ref={imgRef}
            alt=""
            className="rounded-xl shadow-md w-full h-auto"
            style={{ display: usingMjpeg ? "block" : "none" }}
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`absolute left-0 top-0 w-full h-full rounded-xl ${isDrawingZone ? "cursor-crosshair" : "pointer-events-none"}`}
          />
        </div>

        {/* Radiometric Thermal HUD Overlay */}
        {isThermalActive && (
          <div className="absolute bottom-3 left-3 bg-black/80 border border-amber-500/40 rounded-xl p-2.5 text-xs font-mono text-amber-300 backdrop-blur-md z-20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span>FLIR RADIOMETRIC SENSOR · {thermalPalette.toUpperCase()}</span>
            </div>
            <div className="text-[10px] text-slate-300">
              Spot Range: <strong>18.0°C – 98.5°C</strong> · Emissivity: <strong>ε = 0.95</strong>
            </div>
          </div>
        )}

        {/* Live Radiometric Cursor Crosshair Probe */}
        {isThermalActive && hoverTemp && (
          <div
            className="absolute pointer-events-none z-30 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: hoverTemp.x, top: hoverTemp.y }}
          >
            <Crosshair className={`w-5 h-5 ${hoverTemp.isHotspot ? "text-red-500 animate-ping" : "text-amber-300"}`} />
            <div
              className={`mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-xl border ${
                hoverTemp.isHotspot
                  ? "bg-red-600 border-white text-white animate-bounce"
                  : "bg-black/80 border-amber-400/60 text-amber-300"
              }`}
            >
              {hoverTemp.isHotspot ? `🔥 HOTSPOT: ${hoverTemp.temp}°C` : `${hoverTemp.temp}°C`}
            </div>
          </div>
        )}

        {/* Live Intrusion Warning Banner */}
        {zoneIntrusionDetected && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-1.5 rounded-full font-bold text-xs tracking-wider flex items-center gap-2 animate-bounce shadow-2xl z-20">
            <ShieldAlert className="w-4 h-4" />
            SECURITY BREACH: RESTRICTED ZONE INTRUSION DETECTED!
          </div>
        )}


        {/* Floating 2-Way Virtual Intercom & Megaphone Station */}
        {showIntercom && (
          <div className="absolute top-3 left-3 z-30 w-80 bg-[#081220]/95 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in text-xs font-mono">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Megaphone className="w-4 h-4" />
                <span>2-Way Walkway PA Intercom</span>
              </div>
              <button onClick={() => setShowIntercom(false)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Broadcast Status Toast */}
            {broadcastStatus && (
              <div className="mb-2.5 p-2 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-lg text-[10px] animate-pulse flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-spin" />
                <span>{broadcastStatus}</span>
              </div>
            )}

            {/* Push To Talk Main Button */}
            <div className="space-y-3">
              <button
                onMouseDown={() => {
                  setIsPttActive(true);
                  setBroadcastStatus("🔴 LIVE BROADCAST: Transmitting operator voice...");
                  audioAnnouncer.speakVoiceAlert("Attention on camera sector: SOC Operator transmitting live broadcast.", true);
                }}
                onMouseUp={() => {
                  setIsPttActive(false);
                  setTimeout(() => setBroadcastStatus(null), 2500);
                }}
                className={`w-full py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all select-none ${
                  isPttActive
                    ? "bg-red-600 border-white text-white shadow-xl shadow-red-500/40 scale-95 animate-pulse"
                    : "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300"
                }`}
              >
                <Mic className={`w-4 h-4 ${isPttActive ? "animate-bounce" : ""}`} />
                {isPttActive ? "RELEASE TO STOP BROADCAST" : "HOLD TO BROADCAST VOICE (PTT)"}
              </button>

              {/* Quick Megaphone Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Quick Megaphone Warnings</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { label: "Restricted Perimeter Warning", text: "Attention: You have entered a restricted security perimeter. Evacuate immediately." },
                    { label: "Mandatory PPE Hardhat Notice", text: "Safety Alert: Mandatory Hardhat and High-Visibility PPE required in this zone." },
                    { label: "Vehicle Halt Command", text: "Vehicle Operator: Halt vehicle immediately and present security credentials." },
                    { label: "Facility Lockdown Broadcast", text: "Security Notice: Facility lockdown in effect. Return to designated assembly points." },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setBroadcastStatus(`📢 Megaphone: "${preset.label}"`);
                        audioAnnouncer.speakVoiceAlert(preset.text, true);
                        setTimeout(() => setBroadcastStatus(null), 4000);
                      }}
                      className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left text-[10px] text-slate-300 flex items-center justify-between transition-colors"
                    >
                      <span className="truncate">{preset.label}</span>
                      <Sparkles className="w-3 h-3 text-sky-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating PTZ Controller Modal */}
        {showPtz && (
          <div className="absolute top-3 right-3 z-30 animate-fade-in shadow-2xl">
            <PTZVirtualJoystick
              cameraName="Optical PTZ Sensor"
              ptzState={activePtz}
              onChange={(st) => setLocalPtz(st)}
              onClose={() => setShowPtz(false)}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default CameraFeed;


