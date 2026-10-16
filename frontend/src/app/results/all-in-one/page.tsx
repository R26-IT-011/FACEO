"use client";

import ResultLayout from "@/shared/components/ResultLayout";
import ConfidenceMeter from "@/shared/components/ConfidenceMeter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ShieldCheck, Layers } from "lucide-react";

const EMOTIONS = ["angry", "happy", "sad", "neutral", "fear"];

interface AllInOneResult {
  authenticity: {
    status: string;
    confidence: number;
    riskLevel: string;
    realProbability: number;
    deepfakeProbability: number;
    frameSummary: number[];
  };
  demographics: {
    age: number;
    gender: string;
    genderConfidence: number;
    ageTrend: number[];
  };
  emotion: {
    dominant: string;
    confidence: number;
    emotions: Record<string, number>;
    trend: number[];
  };
  faceMarks: {
    detections: {
      label: string;
      confidence: number;
      bbox: { x: number; y: number; w: number; h: number };
    }[];
    totalDetections: number;
    avgConfidence: number;
    annotatedImage?: string;
  };
  sessionType: string;
  duration: number;
  totalFrames: number;
  phase1Frames: number;
  phase2Frames: number;
}

export default function AllInOneResultsPage() {
  const [results, setResults] = useState<AllInOneResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("faceo_allinone_results");
    if (stored) {
      try {
        setResults(JSON.parse(stored));
      } catch {
        /* empty */
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-6 h-6 rounded-full border-t-2 border-white animate-spin opacity-50" />
      </main>
    );
  }

  if (results && (results as any).error) {
    return (
      <ResultLayout
        title="All-in-One Results"
        backHref="/all-in-one"
        backLabel="Run Analysis"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center"
        >
          <AlertCircle className="w-12 h-12 text-red-500/80 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">
            No Human Detected
          </h2>
          <p className="text-white/50 font-light mb-8 text-sm leading-relaxed">
            {(results as any).error}
          </p>
          <Link
            href="/all-in-one"
            className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform"
          >
            Try Again
          </Link>
        </motion.div>
      </ResultLayout>
    );
  }

  if (!results) {
    return (
      <ResultLayout
        title="All-in-One Results"
        backHref="/all-in-one"
        backLabel="Run Analysis"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center"
        >
          <AlertCircle className="w-12 h-12 text-white/30 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">
            No Session Data
          </h2>
          <p className="text-white/50 font-light mb-8 text-sm">
            Please complete an All-in-One analysis session first.
          </p>
          <Link
            href="/all-in-one"
            className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform"
          >
            Start All-in-One Analysis
          </Link>
        </motion.div>
      </ResultLayout>
    );
  }

  const isReal = results.authenticity.status === "REAL";
  const sortedEmotions = Object.entries(results.emotion.emotions).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <ResultLayout
      title="All-in-One Results"
      sessionId="FCO-AIO-2026"
      backHref="/all-in-one"
      backLabel="New Analysis"
    >
      {/* Section Header: Phased Analysis Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Layers className="w-5 h-5 text-white/30" />
        <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-mono">
          {results.sessionType === "upload"
            ? "Unified Image Analysis — 1 Photo Evaluated"
            : `Comprehensive Phased Analysis — ${results.totalFrames} Frames Processed`}
        </span>
      </motion.div>

      {/* ──────────── SECTION 1: Authenticity Hero ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 mb-6 relative overflow-hidden"
      >
        <div
          className={`absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none ${
            isReal ? "bg-green-500/10" : "bg-red-500/10"
          }`}
        />
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4" /> Media Authenticity Evaluation
        </h3>
        <div className="flex items-end gap-6 border-b border-white/5 pb-8 mb-6 relative z-10">
          <h2
            className={`text-6xl font-light tracking-tight ${
              isReal ? "text-green-400" : "text-red-400"
            }`}
          >
            {results.authenticity.status}
          </h2>
          <div className="pb-2">
            <p className="text-white/40 text-sm font-mono tracking-widest mb-1">
              CONFIDENCE
            </p>
            <p className="text-2xl font-light">
              {results.authenticity.confidence}%
            </p>
          </div>
        </div>
        <p className="text-white/50 text-sm leading-relaxed max-w-lg font-light relative z-10">
          {isReal
            ? "The neural network evaluated the facial structures and confirmed the subject is authentic. No synthetic GAN artifacts or deepfake distortions were detected."
            : "The analysis detected synthetic artifacts consistent with AI-generated or deepfake imagery. Further manual verification is recommended."}
        </p>
      </motion.div>

      {/* Authenticity Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">
            Real Probability
          </h3>
          <span className="text-4xl font-light text-green-400">
            {results.authenticity.realProbability}%
          </span>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-green-400/60"
              style={{ width: `${results.authenticity.realProbability}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">
            Deepfake Probability
          </h3>
          <span className="text-4xl font-light text-red-400">
            {results.authenticity.deepfakeProbability}%
          </span>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-red-400/60"
              style={{ width: `${results.authenticity.deepfakeProbability}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">
            Risk Assessment
          </h3>
          <span
            className={`text-4xl font-light ${
              results.authenticity.riskLevel === "Low"
                ? "text-green-400"
                : results.authenticity.riskLevel === "Medium"
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {results.authenticity.riskLevel}
          </span>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mt-3">
            Threat Level
          </p>
        </motion.div>
      </div>

      {/* Authenticity Frame Chart */}
      {results.authenticity.frameSummary &&
        results.authenticity.frameSummary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-panel p-8 mb-6"
          >
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
              Phase 1 — Frame-by-Frame Authenticity
            </h3>
            <div className="h-32 flex items-end gap-2 border-b border-white/10 pb-2">
              {results.authenticity.frameSummary.map((val, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm hover:opacity-80 transition-opacity ${
                    val > 70
                      ? "bg-green-400/40"
                      : val > 40
                      ? "bg-amber-400/40"
                      : "bg-red-400/40"
                  }`}
                  style={{ height: `${val}%` }}
                >
                  <div className="text-[9px] font-mono text-center text-white/50 -mt-4">
                    {val}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase tracking-widest font-mono">
              <span>0s</span>
              <span>10s</span>
            </div>
          </motion.div>
        )}

      {/* ──────────── SECTION 2: Demographics ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-4"
      >
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/30 font-mono">
          Phase 2 — Detailed Analysis
        </h3>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Age Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">
            Estimated Age
          </h3>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-6xl font-light">
              {results.demographics.age}
            </span>
            <span className="text-white/30 text-xs pb-2 uppercase tracking-widest">
              Years
            </span>
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest">
            Range: {results.demographics.age - 2} —{" "}
            {results.demographics.age + 2}
          </p>
        </motion.div>

        {/* Gender Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">
            Gender Identification
          </h3>
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl font-light capitalize">
              {results.demographics.gender}
            </span>
            <span className="text-white/70 font-mono bg-white/5 px-3 py-1.5 rounded text-sm">
              {results.demographics.genderConfidence}%
            </span>
          </div>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60"
              style={{
                width: `${results.demographics.genderConfidence}%`,
              }}
            />
          </div>
        </motion.div>

        {/* Session Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">
            Session Info
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                Mode
              </p>
              <p className="text-lg font-light capitalize">
                {results.sessionType}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                Duration
              </p>
              <p className="text-lg font-light">{results.duration}s</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                Phases
              </p>
              <p className="text-sm font-light text-white/70">
                P1: {results.phase1Frames}f → P2: {results.phase2Frames}f
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Age Trend */}
      {results.demographics.ageTrend &&
        results.demographics.ageTrend.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel p-8 mb-6"
          >
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
              Age Estimation Trend (Phase 2)
            </h3>
            <div className="h-32 flex items-end gap-3 border-b border-white/10 pb-2">
              {results.demographics.ageTrend.map((val, i) => {
                const maxAge = Math.max(...results.demographics.ageTrend);
                const minAge = Math.min(...results.demographics.ageTrend);
                const range = maxAge - minAge || 1;
                const height = ((val - minAge) / range) * 80 + 20;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-mono text-white/40">
                      {val}
                    </span>
                    <div
                      className="w-full bg-white/20 rounded-t-sm hover:bg-white/40 transition-colors"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      {/* ──────────── SECTION 3: Emotions ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Emotion Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-panel p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
            Behavioral &amp; Expression Mapping
          </h3>

          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-white/40 text-[10px] uppercase font-mono tracking-widest mb-1">
                Dominant Expression
              </p>
              <span className="text-4xl font-light capitalize">
                {results.emotion.dominant}
              </span>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[10px] uppercase font-mono tracking-widest mb-1">
                Peak Confidence
              </p>
              <span className="text-2xl font-light">
                {results.emotion.confidence}%
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {sortedEmotions.map(([emotion, score], i) => (
              <div key={emotion}>
                <div className="flex justify-between text-xs mb-1.5 uppercase font-mono tracking-wider">
                  <span className={i === 0 ? "text-white" : "text-white/50"}>
                    {emotion}
                  </span>
                  <span className={i === 0 ? "text-white" : "text-white/30"}>
                    {score}%
                  </span>
                </div>
                <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-500"
                    style={{
                      width: `${score}%`,
                      opacity: i === 0 ? 1 : 0.25,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Emotion Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-panel p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
            Expression Confidence Trend
          </h3>
          <div className="h-40 flex items-end gap-2 border-b border-white/10 pb-2 relative">
            <div className="absolute inset-0 border-b border-white/5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {results.emotion.trend.map((val, i) => (
              <div
                key={i}
                className="flex-1 bg-white/20 rounded-t-sm hover:bg-white/40 transition-colors relative group"
                style={{ height: `${val}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {val}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase tracking-widest font-mono">
            <span>10s</span>
            <span>40s</span>
          </div>
        </motion.div>
      </div>

      {/* ──────────── SECTION 4: Face Marks ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="glass-panel p-8 mb-6"
      >
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
          Skin Characteristics &amp; Face Marks
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Total Detections
            </p>
            <span className="text-4xl font-light">
              {results.faceMarks.totalDetections}
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Avg Confidence
            </p>
            <span className="text-4xl font-light">
              {results.faceMarks.avgConfidence}%
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Categories Found
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.from(new Set(results.faceMarks.detections.map((d) => d.label))).map((cat) => (
                <span
                  key={cat}
                  className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/50 uppercase tracking-widest"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {results.faceMarks.annotatedImage && (
          <div className="mb-8 p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col items-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              YOLO Visual Bounding Box Analysis
            </span>
            <img
              src={results.faceMarks.annotatedImage}
              alt="YOLO Detected Facial Marks"
              className="max-h-80 w-auto rounded-lg border border-white/10 object-contain shadow-2xl"
            />
          </div>
        )}

        {results.faceMarks.detections.length > 0 ? (
          <div className="space-y-6">
            {results.faceMarks.detections.map((det, i) => (
              <div
                key={`mark-item-${det.label}-${i}`}
                className="border border-white/5 bg-white/[0.02] rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-light text-white/80 uppercase tracking-widest">
                    {det.label}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    @ ({det.bbox.x}, {det.bbox.y}) — {det.bbox.w}×{det.bbox.h}
                  </span>
                </div>
                <ConfidenceMeter value={det.confidence} label="Confidence" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 italic">
            No marks were detected in this session.
          </p>
        )}
      </motion.div>

      {/* ──────────── SECTION 5: Frame Analysis Summary ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-panel p-8 mb-6"
      >
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold border-b border-white/5 pb-4">
          Frame Analysis Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Total Frames
            </p>
            <span className="text-3xl font-light">{results.totalFrames}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Phase 1 Frames
            </p>
            <span className="text-3xl font-light">{results.phase1Frames}</span>
            <p className="text-[10px] text-white/20 mt-1">Authenticity</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Phase 2 Frames
            </p>
            <span className="text-3xl font-light">{results.phase2Frames}</span>
            <p className="text-[10px] text-white/20 mt-1">Full Analysis</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
              Session Duration
            </p>
            <span className="text-3xl font-light">
              {results.sessionType === "upload" ? "Instant" : `${results.duration}s`}
            </span>
            <p className="text-[10px] text-white/20 mt-1">
              {results.sessionType === "upload" ? "Static Image Upload" : "2-Phase Sequential"}
            </p>
          </div>
        </div>
      </motion.div>
    </ResultLayout>
  );
}
