"use client";

import ResultLayout from "@/shared/components/ResultLayout";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Cpu, Info } from "lucide-react";

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
}

export default function AgeGenderResultsPage() {
  const [results, setResults] = useState<AgeGenderResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("faceo_age_gender_results");
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
      <ResultLayout title="Age & Gender Results" backHref="/age-gender" backLabel="Run Analysis">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center"
        >
          <AlertCircle className="w-12 h-12 text-red-500/80 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">No Human Detected</h2>
          <p className="text-white/50 font-light mb-8 text-sm leading-relaxed">
            {(results as any).error}
          </p>
          <Link
            href="/age-gender"
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
      <ResultLayout title="Age & Gender Results" backHref="/age-gender" backLabel="Run Analysis">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center"
        >
          <AlertCircle className="w-12 h-12 text-white/30 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">No Session Data</h2>
          <p className="text-white/50 font-light mb-8 text-sm">
            Please complete an age & gender analysis first.
          </p>
          <Link
            href="/age-gender"
            className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform"
          >
            Start Analysis
          </Link>
        </motion.div>
      </ResultLayout>
    );
  }

  const trend =
    results.ageTrend || [
      results.age + 2,
      results.age + 1,
      results.age,
      results.age - 1,
      results.age,
      results.age,
      results.age,
    ];

  return (
    <ResultLayout
      title="Age & Gender Results"
      sessionId="FCO-AGE-2026"
      backHref="/age-gender"
      backLabel="New Analysis"
    >
      {/* Model Information Banner */}
      {results.selectedModel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-6 flex items-center justify-between border border-white/10"
        >
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-white/70" />
            <span className="text-xs text-white/50">Predicted using:</span>
            <span className="text-xs font-medium text-white tracking-wide">
              {results.selectedModel}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-white/10 text-white/80 px-2.5 py-1 rounded-full border border-white/15">
            Calibrated Neural Inference
          </span>
        </motion.div>
      )}

      {/* Occlusion / Accuracy Notice — shown when confidence is low */}
      {results.genderConfidence < 82 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5"
        >
          <Info className="w-4 h-4 text-amber-400/80 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/70 font-light leading-relaxed">
            <span className="font-medium text-amber-300/90">Prediction accuracy may be affected.</span>{" "}
            Facial accessories such as sunglasses, masks, hats, or heavy makeup can partially
            obscure key facial features used for demographic estimation. For the most accurate
            results, please use a clear, unobstructed face photo with good lighting.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Age Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">Estimated Age</h3>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-6xl font-light">{results.age}</span>
            <span className="text-white/30 text-xs pb-2 uppercase tracking-widest">Years</span>
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest">
            Estimated Bracket: {results.age - 2} — {results.age + 2} yrs
          </p>
        </motion.div>

        {/* Gender Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">Gender Identification</h3>
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl font-light capitalize">{results.gender}</span>
            <span className="text-white/70 font-mono bg-white/5 px-3 py-1.5 rounded text-sm">
              {results.genderConfidence}%
            </span>
          </div>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/60" style={{ width: `${results.genderConfidence}%` }} />
          </div>
        </motion.div>

        {/* Session & Model Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6 font-bold">Session & Model Info</h3>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Mode</p>
              <p className="text-sm font-light capitalize text-white/90">{results.sessionType}</p>
            </div>
            {results.selectedModel && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Selected Model</p>
                <p className="text-sm font-medium text-white/90">{results.selectedModel}</p>
              </div>
            )}
            {results.duration && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Duration</p>
                <p className="text-sm font-light text-white/90">{Math.round(results.duration / 60)} min</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Age Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-8 mb-6"
      >
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
          Age Estimation Trend Across Samples
        </h3>
        <div className="h-32 flex items-end gap-3 border-b border-white/10 pb-2">
          {trend.map((val, i) => {
            const maxAge = Math.max(...trend);
            const minAge = Math.min(...trend);
            const range = maxAge - minAge || 1;
            const height = ((val - minAge) / range) * 80 + 20;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-white/40">{val}</span>
                <div
                  className="w-full bg-white/20 rounded-t-sm hover:bg-white/40 transition-colors"
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Uploaded Image */}
      {results.uploadedImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-8"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">
            Analyzed Sample
          </h3>
          <div className="flex justify-center">
            <img
              src={results.uploadedImage}
              alt="Analyzed Sample"
              className="max-w-full rounded-lg shadow-2xl border border-white/10"
              style={{ maxHeight: "400px" }}
            />
          </div>
        </motion.div>
      )}
    </ResultLayout>
  );
}
