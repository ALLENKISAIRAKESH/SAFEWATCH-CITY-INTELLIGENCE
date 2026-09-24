
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-core";

type RiskLevel = "low" | "medium" | "high" | "critical";

const riskFromPeople = (n: number): RiskLevel => {
  if (n >= 10) return "critical";
  if (n >= 5) return "high";
  if (n >= 3) return "medium";
  return "low";
};

const getObjectRiskLabel = (cls: string): string | null => {
  const weaponLike = new Set<string>(["baseball bat", "sports ball", "skateboard"]);
  const fireLike = new Set<string>(["bottle", "cup", "microwave", "oven"]);
  if (cls === "backpack" || cls === "handbag" || cls === "suitcase") return "Unattended Bag Risk";
  if (weaponLike.has(cls)) return "Weapon-like Object Risk";
  if (fireLike.has(cls)) return "Possible Fire Hazard";
  return null;
};

const CameraFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<string>("Loading model...");
  const [loadingModel, setLoadingModel] = useState<boolean>(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      const v = videoRef.current;
      if (v) {
        if (v.srcObject !== stream) v.srcObject = stream;
        try {
          await v.play();
        } catch (playErr) {
          console.warn("video.play() error (non-fatal):", playErr);
        }
      }
    } catch (err) {
      console.error("Camera permission / access error:", err);
      setStatus("Camera access denied.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    const v = videoRef.current;
    if (v && v.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setStatus("Stopped");
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadModel = async () => {
      if (modelRef.current || loadingModel) return;
      setLoadingModel(true);
      try {
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        modelRef.current = model;
        if (mounted) setStatus("Model loaded. Starting camera...");
      } catch (e) {
        console.error("Model load failed:", e);
        if (mounted) setStatus("Model load failed");
      } finally {
        if (mounted) setLoadingModel(false);
      }
    };
    loadModel();
    return () => {
      mounted = false;
    };
  }, [loadingModel]);

  const syncCanvasSize = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || v.clientWidth || 640;
    c.height = v.videoHeight || v.clientHeight || 480;
  };

  const drawOverlay = (preds: cocoSsd.DetectedObject[]) => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);
    try {
      ctx.drawImage(v, 0, 0, c.width, c.height);
    } catch (e) {
      // ignore if video not ready
    }

    const counts: Record<string, number> = {};
    preds.forEach((p) => {
      counts[p.class] = (counts[p.class] || 0) + 1;
    });

    preds.forEach((p) => {
      const [x, y, w, h] = p.bbox;
      const label = p.class;
      const score = Math.floor((p.score || 0) * 100);
      const riskLabel = getObjectRiskLabel(label);

      ctx.strokeStyle = riskLabel ? "rgba(255,60,60,0.95)" : "rgba(0,220,200,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const displayText = `${label} ${score}%${riskLabel ? " → " + riskLabel : ""}`;
      ctx.font = "14px ui-monospace, SFMono-Regular, Menlo, monospace";
      const textWidth = ctx.measureText(displayText).width;
      const pad = 6;
      const rectX = Math.max(0, x);
      const rectY = Math.max(0, y - 22);

      ctx.fillStyle = riskLabel ? "rgba(255,60,60,0.9)" : "rgba(0,0,0,0.6)";
      ctx.fillRect(rectX - 1, rectY - 1, textWidth + pad * 2, 20);

      ctx.fillStyle = "white";
      ctx.fillText(displayText, rectX + pad, rectY + 14);
    });

    const personCount = counts["person"] || 0;
    if (personCount >= 3) {
      const risk = riskFromPeople(personCount);
      const label = `CROWD RISK: ${personCount} persons → ${risk.toUpperCase()}`;
      ctx.font = "18px ui-monospace, SFMono-Regular, Menlo, monospace";
      const textWidth = ctx.measureText(label).width;
      const x = Math.max(10, (c.width - textWidth) / 2);
      const y = 30;
      ctx.fillStyle = "rgba(255,40,40,0.95)";
      ctx.fillRect(x - 8, y - 22, textWidth + 16, 28);
      ctx.fillStyle = "white";
      ctx.fillText(label, x, y);
    }
  };

  const detectLoop = useCallback(async () => {
    const v = videoRef.current;
    const model = modelRef.current;
    if (!v || !model) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    if (v.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    syncCanvasSize();

    try {
      const preds = await model.detect(v);
      drawOverlay(preds);
    } catch (e) {
      console.error("Detection loop error:", e);
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, []);

  useEffect(() => {
    if (modelRef.current) {
      setStatus("Model ready. Starting camera...");
      startCamera().then(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(detectLoop);
      });
    }
  }, [startCamera, detectLoop]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => syncCanvasSize();
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="p-3 sm:p-4 bg-card/60 backdrop-blur border border-border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none">
              <path d="M..." />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold">Live Camera</div>
            <div className="text-xs text-muted-foreground font-mono">Frontend-only detection</div>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-auto block"
          autoPlay
          playsInline
          muted
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-sm">
        <div className="text-xs text-muted-foreground">{status}</div>
      </div>
    </div>
  );
};

export default CameraFeed;
