"use client";

import ResultLayout from "@/shared/components/ResultLayout";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Cpu, Sparkles, Scan } from "lucide-react";

interface SortedEmotionItem {
  name: string;
  rawProb: number;
  percentage: number;
}

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ModelResultData {
  modelName: string;
  dominant: string;
  confidence: number;
  emotions: Record<string, number>;
  sortedEmotions?: SortedEmotionItem[];
  detectionBox?: DetectionBox | null;
  trend: number[];
}

interface CombinedEmotionResults {
  uploadedImage?: string;
  selectedModel?: string;
  faceApiResult?: ModelResultData;
  customModelResult?: ModelResultData;
  dominant?: string;
  confidence?: number;
  emotions?: Record<string, number>;
  trend?: number[];
  duration?: number;
  error?: string;
}

export default function EmotionResultsPage() {
  const [results, setResults] = useState<CombinedEmotionResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("faceo_emotion_results");
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

  if (results && results.error) {
    return (
      <ResultLayout title="Emotion Results" backHref="/emotion" backLabel="Run Analysis">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center"
        >
          <AlertCircle className="w-12 h-12 text-red-500/80 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">No Human Face Detected</h2>
          <p className="text-white/50 font-light mb-8 text-sm leading-relaxed">{results.error}</p>
          <Link
            href="/emotion"
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
      <ResultLayout title="Emotion Results" backHref="/emotion" backLabel="Run Analysis">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center"
        >
          <AlertCircle className="w-12 h-12 text-white/30 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">No Session Data</h2>
          <p className="text-white/50 font-light mb-8 text-sm">Please complete an emotion analysis session first.</p>
          <Link
            href="/emotion"
            className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform"
          >
            Start Emotion Analysis
          </Link>
        </motion.div>
      </ResultLayout>
    );
  }

  const isDualComparison = Boolean(results.faceApiResult && results.customModelResult);

  // Dual Comparison Mode for Emotion Recognition Page
  if (isDualComparison) {
    const faceApiData = results.faceApiResult!;
    const rawCustom = results.customModelResult!;
    const customModelData: ModelResultData = {
      modelName: rawCustom.modelName || results.selectedModel || "Custom Model",
      dominant: rawCustom.dominant || "happy",
      confidence: rawCustom.confidence || 75,
      emotions: rawCustom.emotions || { happy: 75, neutral: 15, sad: 5, angry: 3, fear: 2 },
      trend: rawCustom.trend || [40, 55, 60, 65, 70, 68, 75],
    };

    return (
      <ResultLayout title="Emotion Recognition Comparison" sessionId="FCO-EMO-2026" backHref="/emotionRecognition" backLabel="New Analysis">
        
        {/* Uploaded Image Preview Banner */}
        {results.uploadedImage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 mb-8 flex flex-col md:flex-row items-center gap-6 border-white/15"
          >
            <div className="relative w-44 h-44 shrink-0 rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black">
              <img src={results.uploadedImage} alt="Uploaded sample" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <span className="text-[10px] font-mono tracking-widest uppercase bg-white/10 border border-white/15 px-3 py-1 rounded-full text-white/80 inline-block mb-3">
                Input Sample Image
              </span>
              <h2 className="text-xl md:text-2xl font-light text-white mb-2">Model Comparison Preview</h2>
              <p className="text-white/50 text-xs md:text-sm font-light max-w-xl mb-4">
                Side-by-side evaluation between <strong className="text-cyan-300 font-normal">Face-API.js (SsdMobilenetv1)</strong> on the left and your selected <strong className="text-purple-300 font-normal">{customModelData.modelName}</strong> on the right.
              </p>

              {/* Detector Metadata Tag */}
              {faceApiData.detectionBox && (
                <div className="inline-flex items-center gap-2 text-[10px] font-mono text-cyan-300/80 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-lg">
                  <Scan className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Face Box: {faceApiData.detectionBox.width}×{faceApiData.detectionBox.height} px at ({faceApiData.detectionBox.x}, {faceApiData.detectionBox.y})</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Dual Comparison Columns: Left (Face-API.js) vs Right (Custom Model) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* WAM PATHTHA (LEFT SIDE): Face-API.js Model */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-6"
          >
            <div className="glass-card p-6 md:p-8 relative overflow-hidden border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full text-cyan-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Face-API.js
                </span>
                <span className="text-[9px] font-mono text-cyan-300/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  SSD MobileNet V1
                </span>
              </div>

              <div className="flex items-end justify-between border-b border-white/10 pb-6 mb-6">
                <div>
                  <p className="text-white/40 text-[10px] font-mono tracking-widest uppercase mb-1">Dominant Emotion</p>
                  <h3 className="text-4xl md:text-5xl font-light tracking-tight text-white capitalize flex items-center gap-3">
                    {faceApiData.dominant}
                    <span className="text-sm font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-normal">
                      {(faceApiData.confidence / 100).toFixed(2)}
                    </span>
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[10px] font-mono tracking-widest uppercase mb-1">Confidence</p>
                  <p className="text-3xl font-light text-cyan-300">{faceApiData.confidence}%</p>
                </div>
              </div>

              {/* Emotion Breakdown */}
              <div className="mb-6">
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 font-bold flex justify-between items-center">
                  <span>Emotion Probabilities (Face-API.js)</span>
                  <span className="text-[9px] font-mono text-cyan-400/70 font-normal">minConfidence: 0.5</span>
                </h4>

                <div className="space-y-3.5">
                  {(faceApiData.sortedEmotions || Object.entries(faceApiData.emotions).map(([name, percentage]) => ({ name, percentage, rawProb: percentage / 100 })))
                    .map((item, i) => (
                      <div key={item.name}>
                        <div className="flex justify-between text-xs mb-1 font-mono tracking-wider">
                          <span className={i === 0 ? "text-cyan-300 font-semibold uppercase" : "text-white/50 uppercase"}>
                            {item.name} {item.rawProb !== undefined ? `(${item.rawProb.toFixed(2)})` : ""}
                          </span>
                          <span className={i === 0 ? "text-cyan-300 font-semibold" : "text-white/30"}>{item.percentage}%</span>
                        </div>
                        <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-500"
                            style={{ width: `${item.percentage}%`, opacity: i === 0 ? 1 : 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Trend */}
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-bold">Confidence Progression</h4>
                <div className="h-24 flex items-end gap-1.5 border-b border-white/10 pb-2">
                  {faceApiData.trend.map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-cyan-500/30 hover:bg-cyan-400/60 rounded-t transition-colors relative group"
                      style={{ height: `${val}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-cyan-500/40 text-cyan-300 text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {val}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* DAKUNU PATHTHA (RIGHT SIDE): Custom Model */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-6"
          >
            <div className="glass-card p-6 md:p-8 relative overflow-hidden border-purple-500/30 shadow-[0_0_35px_rgba(168,85,247,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full text-purple-300 font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  {customModelData.modelName}
                </span>
                <span className="text-[9px] font-mono text-purple-300/80 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                  Custom Model
                </span>
              </div>

              <div className="flex items-end justify-between border-b border-white/10 pb-6 mb-6">
                <div>
                  <p className="text-white/40 text-[10px] font-mono tracking-widest uppercase mb-1">Dominant Emotion</p>
                  <h3 className="text-4xl md:text-5xl font-light tracking-tight text-white capitalize flex items-center gap-3">
                    {customModelData.dominant}
                    <span className="text-sm font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-normal">
                      {(customModelData.confidence / 100).toFixed(2)}
                    </span>
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[10px] font-mono tracking-widest uppercase mb-1">Confidence</p>
                  <p className="text-3xl font-light text-purple-300">{customModelData.confidence}%</p>
                </div>
              </div>

              {/* Emotion Breakdown */}
              <div className="mb-6">
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 font-bold flex justify-between items-center">
                  <span>Emotion Probabilities ({customModelData.modelName})</span>
                  <span className="text-[9px] font-mono text-purple-400/70 font-normal">Target Model</span>
                </h4>

                <div className="space-y-3.5">
                  {Object.entries(customModelData.emotions)
                    .sort((a, b) => b[1] - a[1])
                    .map(([emotion, score], i) => (
                      <div key={emotion}>
                        <div className="flex justify-between text-xs mb-1 font-mono tracking-wider">
                          <span className={i === 0 ? "text-purple-300 font-semibold uppercase" : "text-white/50 uppercase"}>
                            {emotion} ({(score / 100).toFixed(2)})
                          </span>
                          <span className={i === 0 ? "text-purple-300 font-semibold" : "text-white/30"}>{score}%</span>
                        </div>
                        <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-400 transition-all duration-500"
                            style={{ width: `${score}%`, opacity: i === 0 ? 1 : 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Trend */}
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-bold">Confidence Progression</h4>
                <div className="h-24 flex items-end gap-1.5 border-b border-white/10 pb-2">
                  {customModelData.trend.map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-purple-500/30 hover:bg-purple-400/60 rounded-t transition-colors relative group"
                      style={{ height: `${val}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-purple-500/40 text-purple-300 text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {val}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </ResultLayout>
    );
  }

  // Standard Single Model Result Mode (e.g. for low light condition)
  const dominant = results.dominant || "happy";
  const confidence = results.confidence || 75;
  const emotions = results.emotions || { happy: 75, neutral: 15, sad: 5, angry: 3, fear: 2 };
  const trend = results.trend || [40, 55, 60, 65, 70, 68, 75];
  const sortedEmotions = Object.entries(emotions).sort((a, b) => b[1] - a[1]);

  return (
    <ResultLayout title="Emotion Analysis Results" sessionId="FCO-EMO-2026" backHref="/lowLightCondition" backLabel="New Analysis">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 font-bold">Dominant Emotion</h3>
          {results.selectedModel && (
            <span className="text-[10px] font-mono tracking-widest uppercase bg-white/10 border border-white/15 px-3 py-1 rounded-full text-white/90 font-medium">
              Model: {results.selectedModel}
            </span>
          )}
        </div>
        <div className="flex items-end gap-6 border-b border-white/5 pb-8 mb-6 relative z-10">
          <h2 className="text-6xl font-light tracking-tight text-white capitalize">{dominant}</h2>
          <div className="pb-2">
            <p className="text-white/40 text-sm font-mono tracking-widest mb-1">CONFIDENCE</p>
            <p className="text-2xl font-light">{confidence}%</p>
          </div>
        </div>
        <p className="text-white/50 text-sm leading-relaxed max-w-lg font-light relative z-10">
          The <strong className="text-white">{results.selectedModel || "neural network"}</strong> identified <strong className="text-white/80">{dominant}</strong> as the dominant emotion with {confidence}% peak confidence.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">Emotion Breakdown</h3>
          <div className="space-y-5">
            {sortedEmotions.map(([emotion, score], i) => (
              <div key={emotion}>
                <div className="flex justify-between text-xs mb-1.5 uppercase font-mono tracking-wider">
                  <span className={i === 0 ? "text-white" : "text-white/50"}>{emotion}</span>
                  <span className={i === 0 ? "text-white" : "text-white/30"}>{score}%</span>
                </div>
                <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${score}%`, opacity: i === 0 ? 1 : 0.25 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">Confidence Trend</h3>
          <div className="h-40 flex items-end gap-2 border-b border-white/10 pb-2 relative">
            <div className="absolute inset-0 border-b border-white/5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {trend.map((val, i) => (
              <div key={i} className="flex-1 bg-white/20 rounded-t-sm hover:bg-white/40 transition-colors relative group" style={{ height: `${val}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {val}%
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {results.uploadedImage && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">Analyzed Sample</h3>
          <div className="flex justify-center">
            <img src={results.uploadedImage} alt="Analyzed Sample" className="max-w-full rounded-lg shadow-2xl border border-white/10" style={{ maxHeight: "400px" }} />
          </div>
        </motion.div>
      )}
    </ResultLayout>
  );
}
