"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

interface WebcamCaptureProps {
  onFrame?: (blob: Blob) => void;
  captureIntervalMs?: number;
  isCapturing: boolean;
  onStreamReady?: () => void;
}

export default function WebcamCapture({
  onFrame,
  captureIntervalMs = 2000,
  isCapturing,
  onStreamReady,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        onStreamReady?.();
      }
    } catch (err) {
      console.error("Webcam access error:", err);
      setError("Camera access denied. Please allow webcam access.");
    }
  }, [onStreamReady]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob && onFrame) onFrame(blob);
      },
      "image/jpeg",
      0.8
    );
  }, [onFrame]);

  useEffect(() => {
    if (isCapturing && cameraActive) {
      intervalRef.current = setInterval(captureFrame, captureIntervalMs);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCapturing, cameraActive, captureFrame, captureIntervalMs]);

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-20 bg-black/50 backdrop-blur-sm">
            {error ? (
              <p className="text-sm text-red-400/70 font-light">{error}</p>
            ) : (
              <>
                <p className="mb-4 text-sm font-light tracking-widest uppercase">
                  Camera Required
                </p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2 rounded-full font-medium tracking-wide bg-white text-black hover:scale-105 transition-transform"
                >
                  Enable Camera
                </button>
              </>
            )}
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover brightness-105 contrast-110"
        />

        {isCapturing && (
          <>
            <div className="scan-line" />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-6 left-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs tracking-widest uppercase text-white/90">
                Recording
              </span>
            </motion.div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
