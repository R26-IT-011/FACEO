"use client";

import ResultLayout from "@/shared/components/ResultLayout";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { analyzeImage } from "@/shared/services/ApiClient";
import AnalysisLoader from "@/shared/components/AnalysisLoader";
import { AnimatePresence } from "framer-motion";

interface DeepfakeResult {
  authenticity: string;
  realProbability: number;
  deepfakeProbability: number;
  confidence: number;
  riskLevel: string;
  selectedModel?: string;
  selectedModelId?: string;
  frameSummary?: number[];
  sessionType: string;
  duration?: number;
  uploadedImage?: string;
  originalImage?: string;
  reason?: string;
}

export default function DeepfakeResultsPage() {
  const [results, setResults] = useState<DeepfakeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [reAnalyzeModelName, setReAnalyzeModelName] = useState("");

  const handleReAnalyze = async (modelId: string) => {
    if (!results || !results.originalImage) return;
    const modelName = modelId === "swin_base" ? "SwinBase Model" : modelId === "cnn" ? "CNN Model" : "ViT Model";
    setReAnalyzeModelName(modelName);
    setReAnalyzing(true);
    try {
      const res = await fetch(results.originalImage);
      const blob = await res.blob();
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });
      
      const newResult = await analyzeImage("deepfake", file, modelId);
      if (newResult.status === "success") {
        const updated = {
          ...newResult.data,
          selectedModelId: modelId,
          selectedModel: modelName,
          uploadedImage: newResult.data.resultImage || results.originalImage,
          originalImage: results.originalImage
        };
        sessionStorage.setItem("faceo_deepfake_results", JSON.stringify(updated));
        setResults(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReAnalyzing(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("faceo_deepfake_results");
    if (stored) {
      try { setResults(JSON.parse(stored)); } catch { /* empty */ }
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
      <ResultLayout title="Deepfake Results" backHref="/deepfake" backLabel="Run Analysis">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-red-500/80 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">No Human Detected</h2>
          <p className="text-white/50 font-light mb-8 text-sm leading-relaxed">{(results as any).error}</p>
          <Link href="/deepfake" className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform">
            Try Again
          </Link>
        </motion.div>
      </ResultLayout>
    );
  }

  if (!results) {
    return (
      <ResultLayout title="Deepfake Results" backHref="/deepfake" backLabel="Run Analysis">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-10 max-w-lg mx-auto text-center flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-white/30 mb-6" />
          <h2 className="text-2xl font-light tracking-tight mb-4">No Session Data</h2>
          <p className="text-white/50 font-light mb-8 text-sm">Please complete a deepfake analysis first.</p>
          <Link href="/deepfake" className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform">
            Start Analysis
          </Link>
        </motion.div>
      </ResultLayout>
    );
  }

  const isReal = results.authenticity === "REAL";

  return (
    <ResultLayout title="Deepfake Results" sessionId="FCO-DFK-2026" backHref="/deepfake" backLabel="New Analysis">
      <AnimatePresence>{reAnalyzing && <AnalysisLoader message={`Re-analyzing with ${reAnalyzeModelName}`} />}</AnimatePresence>
      {/* Authenticity Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-6 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none ${isReal ? "bg-green-500/10" : "bg-red-500/10"}`} />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 flex items-center gap-2 font-bold">
            <ShieldCheck className="w-4 h-4" /> Media Authenticity
          </h3>
          {results.selectedModel && (
            <select 
              value={results.selectedModelId || "swin_base"}
              onChange={(e) => handleReAnalyze(e.target.value)}
              className="text-[10px] font-mono tracking-widest uppercase bg-white/10 border border-white/15 px-3 py-1 rounded-full text-white/90 font-medium appearance-none outline-none cursor-pointer hover:bg-white/20 transition-colors"
            >
               <option value="swin_base" className="bg-slate-900">SwinBase Model</option>
               <option value="cnn" className="bg-slate-900">CNN Model</option>
               <option value="vit" className="bg-slate-900">ViT Model</option>
            </select>
          )}
        </div>
        <div className="flex items-end gap-6 border-b border-white/5 pb-8 mb-6 relative z-10">
          <h2 className={`text-6xl font-light tracking-tight ${isReal ? "text-green-400" : "text-red-400"}`}>
            {results.authenticity}
          </h2>
          <div className="pb-2">
            <p className="text-white/40 text-sm font-mono tracking-widest mb-1">CONFIDENCE</p>
            <p className="text-2xl font-light">{results.confidence}%</p>
          </div>
        </div>
        <p className="text-white/50 text-sm leading-relaxed max-w-lg font-light relative z-10">
          {results.reason ? results.reason : isReal
            ? `The ${results.selectedModel || "neural network"} analyzed the facial structures and determined the subject is authentic. No synthetic GAN artifacts or deepfake distortions were detected.`
            : `The ${results.selectedModel || "neural network"} detected synthetic artifacts consistent with AI-generated or deepfake imagery. Further manual verification is recommended.`}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Real Probability */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">Real Probability</h3>
          <span className="text-4xl font-light text-green-400">{results.realProbability}%</span>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-green-400/60" style={{ width: `${results.realProbability}%` }} />
          </div>
        </motion.div>

        {/* Deepfake Probability */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">Deepfake Probability</h3>
          <span className="text-4xl font-light text-red-400">{results.deepfakeProbability}%</span>
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-red-400/60" style={{ width: `${results.deepfakeProbability}%` }} />
          </div>
        </motion.div>

        {/* Risk Level */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-bold">Risk Assessment</h3>
          <span className={`text-4xl font-light ${
            results.riskLevel === "Low" ? "text-green-400" : results.riskLevel === "Medium" ? "text-amber-400" : "text-red-400"
          }`}>
            {results.riskLevel}
          </span>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mt-3">Threat Level</p>
        </motion.div>
      </div>

      {/* Frame Summary */}
      {results.frameSummary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-8 mb-6">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8 font-bold border-b border-white/5 pb-4">Frame-by-Frame Authenticity</h3>
          <div className="h-32 flex items-end gap-2 border-b border-white/10 pb-2">
            {results.frameSummary.map((val, i) => (
              <div key={i} className={`flex-1 rounded-t-sm hover:opacity-80 transition-opacity ${val > 70 ? "bg-green-400/40" : val > 40 ? "bg-amber-400/40" : "bg-red-400/40"}`} style={{ height: `${val}%` }}>
                <div className="text-[9px] font-mono text-center text-white/50 -mt-4">{val}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase tracking-widest font-mono">
            <span>Frame 1</span>
            <span>Frame {results.frameSummary.length}</span>
          </div>
        </motion.div>
      )}

      {/* Uploaded Image */}
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
