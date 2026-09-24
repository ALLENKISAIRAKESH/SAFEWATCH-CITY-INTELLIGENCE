import React, { useRef, useEffect, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const CameraFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<any>(null);

  useEffect(() => {
    // Load model
    cocoSsd.load().then(setModel);

    // Ask for webcam
    async function enableCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // muted + playsinline required for Chrome autoplay
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((err) => {
              console.error("Video play blocked:", err);
            });
          };
        }
      } catch (err) {
        console.error("Camera permission / access error:", err);
      }
    }

    enableCam();
  }, []);

  useEffect(() => {
    let animationId: number;

    async function detectFrame() {
      if (
        videoRef.current &&
        canvasRef.current &&
        model &&
        videoRef.current.readyState === 4
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const predictions = await model.detect(video);

        predictions.forEach((pred) => {
          const [x, y, w, h] = pred.bbox;
          ctx.strokeStyle = "lime";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "lime";
          ctx.fillText(pred.class, x, y > 10 ? y - 5 : y + 15);
        });
      }
      animationId = requestAnimationFrame(detectFrame);
    }

    if (model) detectFrame();
    return () => cancelAnimationFrame(animationId);
  }, [model]);

  return (
    <div className="flex flex-col items-center">
      <video ref={videoRef} autoPlay muted className="rounded-xl shadow-md" />
      <canvas ref={canvasRef} className="absolute rounded-xl shadow-md" />
    </div>
  );
};

export default CameraFeed;
