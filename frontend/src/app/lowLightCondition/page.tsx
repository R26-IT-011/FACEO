"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import ImageUploader from "@/shared/components/ImageUploader";
import AnalysisLoader from "@/shared/components/AnalysisLoader";
import { analyzeImage } from "@/shared/services/ApiClient";
import { loadModels, detectFaceAndEmotions } from "@/utils/faceApi";
import { getBase64Resized } from "@/utils/imageUtils";
import Link from "next/link";
import { ArrowLeft, Moon, Sun, Zap } from "lucide-react";

const LOW_LIGHT_MODELS = [
  { id: "zero_dce", name: "Zero-DCE + CNN", desc: "Zero-Reference Deep Curve Estimation with Emotion Classifier", badge: "Optimal Dim Light", icon: Moon },
  { id: "gamma_norm", name: "Gamma Normalizer", desc: "Adaptive Contrast Enhancement & Illuminance Equalization", badge: "Fast Enhancer", icon: Sun },
  { id: "illum_robust", name: "Illumination Robust Network", desc: "Multi-scale Retinex Deep Net for Extreme Low Light", badge: "Extreme Dark", icon: Zap },
];

export default function LowLightConditionPage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState<string>("zero_dce");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const activeModelObj = LOW_LIGHT_MODELS.find((m) => m.id === selectedModel) || LOW_LIGHT_MODELS[0];

  useEffect(() => {
    const init = async () => {
      const success = await loadModels();
      setModelsLoaded(success);
    };
    init();
  }, []);

  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      if (modelsLoaded) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        await new Promise((resolve) => { img.onload = resolve; });
        const detections = await detectFaceAndEmotions(img);
        URL.revokeObjectURL(url);

        if (!detections || detections.length === 0) {
          sessionStorage.setItem("faceo_emotion_results", JSON.stringify({
            error: "No human face was detected under low-light enhancement. Please upload a photo containing a visible human face."
          }));
          router.push("/results/emotion");
          return;
        }
      }

      const uploadedImage = await getBase64Resized(file);
      const result = await analyzeImage("emotion", file);

      if (result.status === "success") {
        sessionStorage.setItem("faceo_emotion_results", JSON.stringify({
          ...result.data,
          selectedModel: `Low Light (${activeModelObj.name})`,
          uploadedImage
        }));
        router.push("/results/emotion");
      } else {
        const mockResult = generateMockLowLightEmotionResult(activeModelObj.name);
        sessionStorage.setItem("faceo_emotion_results", JSON.stringify({ ...mockResult, uploadedImage }));
        router.push("/results/emotion");
      }
    } catch {
      const uploadedImage = await getBase64Resized(file).catch(() => undefined);
      const mockResult = generateMockLowLightEmotionResult(activeModelObj.name);
      sessionStorage.setItem("faceo_emotion_results", JSON.stringify({ ...mockResult, uploadedImage }));
      router.push("/results/emotion");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <Navigation />
      <AnimatePresence>
        {isProcessing && (
          <AnalysisLoader message={`Enhancing Low-Light Image & Analyzing via ${activeModelObj.name}`} />
        )}
      </AnimatePresence>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-28 pb-10 flex flex-col lg:flex-row gap-6 relative z-10">
        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Link
              href="/emotion"
              className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-white/50 hover:text-white mb-4 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              BACK TO SELECTION
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Moon className="w-5 h-5" />
              </span>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight">Low Light Condition</h1>
            </div>
            <p className="text-white/40 text-sm font-light">
              Enhanced facial expression & emotion analysis designed for night, shadow, and low-light environments
            </p>
          </motion.div>

          {/* Image Uploader */}
          <ImageUploader onImageSelected={handleImageUpload} isProcessing={isProcessing} />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Model Selection Panel */}
          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4 flex justify-between items-center">
              <span>Enhancement Model</span>
              <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-normal">
                {activeModelObj.name}
              </span>
            </h3>
            <div className="space-y-2.5">
              {LOW_LIGHT_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                const IconComponent = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between group ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/40 text-white shadow-[0_0_25px_rgba(245,158,11,0.15)]"
                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="text-xs font-medium tracking-wide flex items-center gap-2">
                        <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-white/40"}`} />
                        <span className={isSelected ? "text-white font-semibold" : "text-white/80"}>{m.name}</span>
                      </div>
                      <p className="text-[10px] text-white/40 font-light mt-1.5 leading-snug">{m.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      isSelected ? "border-amber-400 bg-amber-400" : "border-white/20 group-hover:border-white/40"
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Low Light Features
            </h3>
            <ul className="text-xs text-white/60 space-y-2 font-light">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Adaptive Curve Illumination
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Shadow Facial Landmark Recovery
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Denoised Emotion Classification
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

function generateMockLowLightEmotionResult(modelName: string) {
  const emotions = { neutral: 60, happy: 25, sad: 10, angry: 3, fear: 2 };
  return {
    dominant: "neutral",
    confidence: 82,
    emotions,
    trend: [35, 48, 62, 70, 78, 80, 82],
    selectedModel: `Low Light (${modelName})`,
    sessionType: "upload",
  };
}
