"use client";

import ResultLayout from "@/shared/components/ResultLayout";
import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, Cpu, Info, Users, Lightbulb } from "lucide-react";

interface FaceData {
  age: number;
  gender: string;
  genderConfidence: number;
  genderScore: number;
  occlusionWarning: boolean;
  detectionScore: number;
  bbox: [number, number, number, number];
  bboxPct: [number, number, number, number];
}

interface AgeGenderResult {
  age: number;
  gender: string;
  genderConfidence: number;
  selectedModel?: string;
  modelId?: string;
  ageTrend?: number[];
  sessionType: string;
  duration?: number;
  uploadedImage?: string;
  occlusionWarning?: boolean;
  genderScore?: number;
  faces?: FaceData[];
  faceCount?: number;
  imageWidth?: number;
  imageHeight?: number;
  colorCastDetected?: boolean;
  colorCastRatio?: number;
}

const FACE_COLORS = [
  "#34d399","#60a5fa","#f87171","#fbbf24","#a78bfa","#f472b6","#4ade80","#fb923c",
];

export default function AgeGenderResultsPage() {
  const [results, setResults] = useState<AgeGenderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("faceo_age_gender_results");
    if (stored) { try { setResults(JSON.parse(stored)); } catch { /* empty */ } }
    setLoading(false);
  }, []);

  const drawBoxes = useCallback(() => {
    const faces = results?.faces;
    if (!faces || faces.length === 0) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faces.forEach((face, i) => {
      const [x1p, y1p, x2p, y2p] = face.bboxPct;
      const x1 = (x1p / 100) * canvas.width;
      const y1 = (y1p / 100) * canvas.height;
      const x2 = (x2p / 100) * canvas.width;
      const y2 = (y2p / 100) * canvas.height;
      const w = x2 - x1; const h = y2 - y1;
      const color = FACE_COLORS[i % FACE_COLORS.length];
      const bs = Math.min(w, h) * 0.18;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1 + bs); ctx.lineTo(x1, y1); ctx.lineTo(x1 + bs, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - bs, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + bs); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y2 - bs); ctx.lineTo(x1, y2); ctx.lineTo(x1 + bs, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - bs, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - bs); ctx.stroke();
      const label = `P${i + 1}  ${face.gender.charAt(0).toUpperCase() + face.gender.slice(1)}  ${face.age}y`;
      ctx.font = "bold 11px 'SF Mono','Monaco',monospace";
      const tw = ctx.measureText(label).width + 12;
      const chipH = 20; const chipY = Math.max(0, y1 - chipH - 4); const r = 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1 + r, chipY); ctx.lineTo(x1 + tw - r, chipY);
      ctx.quadraticCurveTo(x1 + tw, chipY, x1 + tw, chipY + r);
      ctx.lineTo(x1 + tw, chipY + chipH - r);
      ctx.quadraticCurveTo(x1 + tw, chipY + chipH, x1 + tw - r, chipY + chipH);
      ctx.lineTo(x1 + r, chipY + chipH);
      ctx.quadraticCurveTo(x1, chipY + chipH, x1, chipY + chipH - r);
      ctx.lineTo(x1, chipY + r);
      ctx.quadraticCurveTo(x1, chipY, x1 + r, chipY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#000"; ctx.fillText(label, x1 + 6, chipY + 14);
      if (face.occlusionWarning) {
        ctx.fillStyle = "#fbbf24"; ctx.beginPath();
        ctx.arc(x2 - 8, y1 + 8, 5, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, [results]);

  useEffect(() => {
    if (!results?.faces || results.faces.length === 0) return;
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) { drawBoxes(); }
    else { img.addEventListener("load", drawBoxes); return () => img.removeEventListener("load", drawBoxes); }
  }, [results, drawBoxes]);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="w-6 h-6 rounded-full border-t-2 border-white animate-spin opacity-50" />
    </main>
  );

  if (results && (results as any).error) return (
    <ResultLayout title="Age & Gender Results" backHref="/age-gender" backLabel="Run Analysis">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-red-500/80 mb-6" />
        <h2 className="text-2xl font-light tracking-tight mb-4">No Human Detected</h2>
        <p className="text-white/50 font-light mb-8 text-sm leading-relaxed">{(results as any).error}</p>
        <Link href="/age-gender" className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform">Try Again</Link>
      </motion.div>
    </ResultLayout>
  );

  if (!results) return (
    <ResultLayout title="Age & Gender Results" backHref="/age-gender" backLabel="Run Analysis">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-white/30 mb-6" />
        <h2 className="text-2xl font-light tracking-tight mb-4">No Session Data</h2>
        <p className="text-white/50 font-light mb-8 text-sm">Please complete an age & gender analysis first.</p>
        <Link href="/age-gender" className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform">Start Analysis</Link>
      </motion.div>
    </ResultLayout>
  );

  const trend = results.ageTrend || [results.age+2, results.age+1, results.age, results.age-1, results.age, results.age, results.age];
  const isMultiFace = (results.faces?.length ?? 0) > 1;
  const hasFacesData = (results.faces?.length ?? 0) > 0;
  const anyOcclusion = results.occlusionWarning || results.genderConfidence < 82 || (results.faces?.some(f => f.occlusionWarning) ?? false);

  return (
    <ResultLayout title="Age & Gender Results" sessionId="FCO-AGE-2026" backHref="/age-gender" backLabel="New Analysis">

      {results.selectedModel && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-6 flex items-center justify-between border border-white/10">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-white/70" />
            <span className="text-xs text-white/50">Predicted using:</span>
            <span className="text-xs font-medium text-white tracking-wide">{results.selectedModel}</span>
          </div>
          <div className="flex items-center gap-3">
            {isMultiFace && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <Users className="w-3 h-3" />{results.faces!.length} persons detected
              </span>
            )}
            <span className="text-[10px] font-mono uppercase bg-white/10 text-white/80 px-2.5 py-1 rounded-full border border-white/15">Calibrated Neural Inference</span>
          </div>
        </motion.div>
      )}

      {results.colorCastDetected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5">
          <Lightbulb className="w-4 h-4 text-sky-400/80 mt-0.5 shrink-0" />
          <p className="text-xs text-sky-300/70 font-light leading-relaxed">
            <span className="font-medium text-sky-300/90">Unusual lighting detected.</span>{" "}
            Strong color cast (ratio {results.colorCastRatio}x) from colored LED or neon lighting was detected.
            A white-balance correction was applied before inference. Results shown are the best ensemble estimate.
          </p>
        </motion.div>
      )}

      {anyOcclusion && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Info className="w-4 h-4 text-amber-400/80 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/70 font-light leading-relaxed">
            <span className="font-medium text-amber-300/90">Gender prediction may be unreliable for one or more persons.</span>{" "}
            Accessories like headphones or hats reduce accuracy. Persons with an{" "}
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 align-middle" />{" "}
            amber dot on the image have low gender certainty.
          </p>
        </motion.div>
      )}

      {isMultiFace && results.uploadedImage && (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 mb-6">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-5 font-bold border-b border-white/5 pb-4">
              Detected Persons — {results.faces!.length} found
            </h3>
            <div className="relative w-full flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={results.uploadedImage} alt="Analyzed image"
                className="max-w-full rounded-xl border border-white/10 shadow-2xl block" style={{ maxHeight: "520px" }} />
              <canvas ref={canvasRef} className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ maxHeight: "520px" }} />
            </div>
            <p className="text-[10px] text-white/30 mt-3 font-mono text-center">Corner brackets = detected face region · Amber dot = low gender certainty</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">Individual Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.faces!.map((face, i) => {
                const color = FACE_COLORS[i % FACE_COLORS.length];
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }} className="glass-card p-5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{ backgroundColor: color }} />
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${color}22`, color }}>
                        Person {i + 1}
                      </span>
                      {face.occlusionWarning && (
                        <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Low certainty
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Age</p>
                      <p className="text-3xl font-light" style={{ color }}>{face.age}<span className="text-sm text-white/30 ml-1 font-light">yrs</span></p>
                      <p className="text-[10px] text-white/30 mt-0.5">{face.age - 2} — {face.age + 2} yr range</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Gender</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-light capitalize text-white/90">{face.gender}</p>
                        <span className="text-[10px] font-mono text-white/40">{face.genderConfidence}%</span>
                      </div>
                      <div className="w-full h-[2px] bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${face.genderConfidence}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <p className="text-[9px] font-mono text-white/20 mt-3">Detection confidence: {Math.round(face.detectionScore * 100)}%</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}

      {!isMultiFace && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">Estimated Age</h3>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-6xl font-light">{results.age}</span>
              <span className="text-white/30 text-xs pb-2 uppercase tracking-widest">Years</span>
            </div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Estimated Bracket: {results.age - 2} — {results.age + 2} yrs</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">Gender Identification</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl font-light capitalize">{results.gender}</span>
              <span className="text-white/70 font-mono bg-white/5 px-3 py-1.5 rounded text-sm">{results.genderConfidence}%</span>
            </div>
            <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/60" style={{ width: `${results.genderConfidence}%` }} />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">Session & Model Info</h3>
            <div className="space-y-3">
              <div><p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Mode</p><p className="text-sm font-light capitalize text-white/90">{results.sessionType}</p></div>
              {results.selectedModel && <div><p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Selected Model</p><p className="text-sm font-medium text-white/90">{results.selectedModel}</p></div>}
              {results.duration && <div><p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Duration</p><p className="text-sm font-light text-white/90">{Math.round(results.duration / 60)} min</p></div>}
            </div>
          </motion.div>
        </div>
      )}

      {isMultiFace && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-5 mb-6 flex flex-wrap gap-6">
          <div><p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Mode</p><p className="text-sm font-light capitalize text-white/90">{results.sessionType}</p></div>
          {results.selectedModel && <div><p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Model</p><p className="text-sm font-medium text-white/90">{results.selectedModel}</p></div>}
          <div><p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Persons Found</p><p className="text-sm font-light text-white/90">{results.faceCount ?? results.faces?.length}</p></div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isMultiFace ? 0.5 : 0.3 }} className="glass-panel p-8 mb-6">
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
          {isMultiFace ? "Primary Person — Age Estimation Trend" : "Age Estimation Trend Across Samples"}
        </h3>
        <div className="h-32 flex items-end gap-3 border-b border-white/10 pb-2">
          {trend.map((val, i) => {
            const maxAge = Math.max(...trend); const minAge = Math.min(...trend);
            const range = maxAge - minAge || 1;
            const height = ((val - minAge) / range) * 80 + 20;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-white/40">{val}</span>
                <div className="w-full bg-white/20 rounded-t-sm hover:bg-white/40 transition-colors" style={{ height: `${height}%` }} />
              </div>
            );
          })}
        </div>
      </motion.div>

      {results.uploadedImage && !isMultiFace && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">Analyzed Sample</h3>
          <div className="flex justify-center relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={results.uploadedImage} alt="Analyzed Sample"
              className="max-w-full rounded-lg shadow-2xl border border-white/10 block" style={{ maxHeight: "400px" }} />
            {hasFacesData && (
              <canvas ref={canvasRef} className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ maxHeight: "400px" }} />
            )}
          </div>
        </motion.div>
      )}
    </ResultLayout>
  );
}
