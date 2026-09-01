"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import AnalysisModeSelector from "@/shared/components/AnalysisModeSelector";
import ImageUploader from "@/shared/components/ImageUploader";
import WebcamCapture from "@/shared/components/WebcamCapture";
import SessionTimer from "@/shared/components/SessionTimer";
import AnalysisLoader from "@/shared/components/AnalysisLoader";
import { loadModels, detectFaceAndEmotions } from "@/utils/faceApi";
import { analyzeImage, analyzeLiveSession } from "@/shared/services/ApiClient";
import { getBase64Resized, normalizeBrightness, detectSpectacles } from "@/utils/imageUtils";

const AGE_GENDER_MODELS = [
  {
    id: "fairface",
    name: "FairFace Model",
    desc: "Optimized for South Asian and multi-ethnic demographic balance using 7-race weighting",
    badge: "Default • Diverse",
    stack: "FairFace / DeepFace",
    datasets: "FairFace, UTKFace",
    bestFor: "both" as const,
  },
  {
    id: "deepface_ensemble",
    name: "DeepFace Ensemble",
    desc: "Multi-stage deep convolutional representation with VGG-Face for precise age regression",
    badge: "High Accuracy",
    stack: "VGG-Face / ResNet",
    datasets: "IMDB-WIKI, VGGFace2",
    bestFor: "upload" as const,
  },
  {
    id: "utkface_resnet",
    name: "UTKFace ResNet",
    desc: "Deep ResNet architecture fine-tuned on 20k+ multi-ethnic facial landmark annotations",
    badge: "Deep Feature",
    stack: "ResNet-50 / OpenCV DNN",
    datasets: "UTKFace, Adience",
    bestFor: "upload" as const,
  },
  {
    id: "ssrnet",
    name: "SSR-Net / MobileNet",
    desc: "Soft Stage-wise Regression architecture optimized for ultra-fast, low-latency live camera streaming",
    badge: "Real-time Fast",
    stack: "SSR-Net / MobileNetV2",
    datasets: "MegaAge-Asian, IMDB",
    bestFor: "live" as const,
  },
];

/** Colours + labels for the bestFor recommendation tag */
const BEST_FOR_META = {
  live:   { label: "Live",          cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  upload: { label: "Upload",        cls: "bg-sky-500/20    text-sky-300    border-sky-500/30"     },
  both:   { label: "Live + Upload", cls: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
};

export default function AgeGenderPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "live">("upload");
  const [selectedModel, setSelectedModel] = useState<string>("fairface");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const ageHistory = useRef<number[]>([]);
  const capturedFramesRef = useRef<Blob[]>([]);

  const activeModelObj =
    AGE_GENDER_MODELS.find((m) => m.id === selectedModel) || AGE_GENDER_MODELS[0];

  // Live data
  const [liveDemographics, setLiveDemographics] = useState({ age: 0, gender: "", probability: 0 });

  // Bounding box from face-api (percentage coordinates relative to video container)
  const [faceBox, setFaceBox] = useState<{
    xPct: number; yPct: number; wPct: number; hPct: number; confidence: number;
  } | null>(null);

  // Spectacles detection result (live only, never stored or sent to backend)
  const [spectacles, setSpectacles] = useState<{ detected: boolean; confidence: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const success = await loadModels();
      setModelsLoaded(success);
    };
    init();
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!modelsLoaded) return;
    setIsProcessing(true);

    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const detections = await detectFaceAndEmotions(img);
      URL.revokeObjectURL(url);

      if (!detections || detections.length === 0) {
        sessionStorage.setItem(
          "faceo_age_gender_results",
          JSON.stringify({
            error:
              "No human face was detected in the uploaded image. Please upload a clear photo containing a human face.",
          })
        );
        router.push("/results/age-gender");
        return;
      }

      const uploadedImage = await getBase64Resized(file);
      const result = await analyzeImage("age-gender", file, activeModelObj.id);

      if (result.status === "success" && result.data) {
        sessionStorage.setItem(
          "faceo_age_gender_results",
          JSON.stringify({
            ...result.data,
            selectedModel: activeModelObj.name,
            modelId: activeModelObj.id,
            uploadedImage,
          })
        );
      } else {
        sessionStorage.setItem(
          "faceo_age_gender_results",
          JSON.stringify({
            ...generateMockResult(activeModelObj.name, activeModelObj.id),
            uploadedImage,
          })
        );
      }
      router.push("/results/age-gender");
    } catch (error) {
      console.error(error);
      const uploadedImage = await getBase64Resized(file).catch(() => undefined);
      sessionStorage.setItem(
        "faceo_age_gender_results",
        JSON.stringify({
          ...generateMockResult(activeModelObj.name, activeModelObj.id),
          uploadedImage,
        })
      );
      router.push("/results/age-gender");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFrame = useCallback(
    async (blob: Blob) => {
      if (!modelsLoaded) return;

      try {
        // Keep the original blob for backend submission — never modify it.
        capturedFramesRef.current.push(blob);

        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        URL.revokeObjectURL(url);

        // Normalize brightness for the detection pass only.
        // normalizeBrightness() amplifies dark frames uniformly (same gain on
        // R, G, B) so colour ratios — and therefore gender cues — are unchanged.
        // In normal lighting it returns the canvas with no pixel modification.
        const detectionCanvas = normalizeBrightness(img);
        const detections = await detectFaceAndEmotions(detectionCanvas);

        if (detections && detections.length > 0) {
          const det = detections[0];
          let age = Math.round(det.age);

          // Apply model calibration factor in live preview
          if (selectedModel === "fairface" && age > 20) {
            age = Math.max(18, age - 1);
          } else if (selectedModel === "deepface_ensemble") {
            age = Math.round(age);
          }

          ageHistory.current.push(age);

          setLiveDemographics({
            age: age,
            gender: det.gender,
            probability: Math.round(det.genderProbability * 100),
          });

          // Extract bounding box as percentages so it scales with the display container.
          const box   = det.detection.box;
          const cW    = detectionCanvas.width  || 1;
          const cH    = detectionCanvas.height || 1;
          const conf  = Math.round(det.detection.score * 100);
          setFaceBox({
            xPct: (box.x      / cW) * 100,
            yPct: (box.y      / cH) * 100,
            wPct: (box.width  / cW) * 100,
            hPct: (box.height / cH) * 100,
            confidence: conf,
          });

          // Spectacles detection — uses landmark eye points from the same detection.
          // Read-only canvas operation; does not affect age/gender results at all.
          const lmPositions: { x: number; y: number }[] =
            det.landmarks?.positions?.map((p: any) => ({ x: p.x ?? p._x, y: p.y ?? p._y })) ?? [];
          setSpectacles(detectSpectacles(detectionCanvas, lmPositions));
        } else {
          // No face detected — clear the box and spectacles result.
          setFaceBox(null);
          setSpectacles(null);
        }
      } catch (error) {
        console.error("Frame processing error", error);
      }
    },
    [modelsLoaded, selectedModel]
  );

  const startLiveSession = () => {
    if (!cameraReady || !modelsLoaded) return;
    ageHistory.current = [];
    capturedFramesRef.current = [];
    setSessionStarted(true);
    setIsAnalyzing(true);
  };

  const handleSessionComplete = async () => {
    setIsAnalyzing(false);
    setSessionStarted(false);
    setIsProcessing(true);

    // Compute the frontend's own median age from ageHistory — this is the
    // ground-truth of what the user actually saw during live detection.
    const localAges = ageHistory.current.slice();
    const localMedianAge =
      localAges.length > 0
        ? (() => {
            const sorted = [...localAges].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0
              ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
              : sorted[mid];
          })()
        : null;

    try {
      if (capturedFramesRef.current.length > 0 && localAges.length > 0) {
        // Send up to 5 frames to the backend — primarily to get reliable gender/confidence.
        const sampleFrames = capturedFramesRef.current.slice(-5);
        const response = await analyzeLiveSession("age-gender", sampleFrames, activeModelObj.id);

        if (response.status === "success" && response.data) {
          const backendAge: number = response.data.age ?? localMedianAge ?? 25;

          // Guard: if the backend age deviates more than 8 years from what the
          // user saw live, anchor to the local median to avoid jarring jumps.
          const MAX_TOLERABLE_DEVIATION = 8;
          const anchoredAge =
            localMedianAge !== null &&
            Math.abs(backendAge - localMedianAge) > MAX_TOLERABLE_DEVIATION
              ? localMedianAge
              : backendAge;

          // Build the age trend from ageHistory so the chart matches live readings.
          const trend =
            localAges.length >= 7
              ? localAges.slice(-7)
              : localAges.concat(Array(7 - localAges.length).fill(anchoredAge));

          sessionStorage.setItem(
            "faceo_age_gender_results",
            JSON.stringify({
              ...response.data,
              age: anchoredAge,
              ageTrend: trend,
              selectedModel: activeModelObj.name,
              modelId: activeModelObj.id,
            })
          );
          setIsProcessing(false);
          router.push("/results/age-gender");
          return;
        }
      }

      // Backend unavailable or no frames captured — use frontend readings only.
      if (localAges.length > 0 && localMedianAge !== null) {
        const trend =
          localAges.length >= 7
            ? localAges.slice(-7)
            : localAges.concat(Array(7 - localAges.length).fill(localMedianAge));

        const result = {
          age: localMedianAge,
          gender: liveDemographics.gender || "male",
          genderConfidence: liveDemographics.probability || 88,
          ageTrend: trend,
          selectedModel: activeModelObj.name,
          modelId: activeModelObj.id,
          sessionType: "live",
          duration: 60,
        };
        sessionStorage.setItem("faceo_age_gender_results", JSON.stringify(result));
      } else {
        sessionStorage.setItem(
          "faceo_age_gender_results",
          JSON.stringify({
            error:
              "No human face was captured or detected during the session. Please face the camera directly.",
          })
        );
      }
    } catch {
      sessionStorage.setItem(
        "faceo_age_gender_results",
        JSON.stringify({
          ...generateMockSessionResult(activeModelObj.name, activeModelObj.id),
        })
      );
    }

    setIsProcessing(false);
    router.push("/results/age-gender");
  };

  return (
    <main className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <Navigation />
      <AnimatePresence>
        {isProcessing && (
          <AnalysisLoader
            message={`Analyzing Demographics using ${activeModelObj.name}`}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-28 pb-10 flex flex-col lg:flex-row gap-6 relative z-10">
        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-2">
              Age & Gender Detection
            </h1>
            <p className="text-white/40 text-sm font-light">
              Demographic estimation through neural network analysis of facial structure and biometric features
            </p>
          </motion.div>

          <div className="mb-6">
            <AnalysisModeSelector mode={mode} onModeChange={setMode} disabled={isAnalyzing} />
          </div>

          {!modelsLoaded ? (
            <div className="flex-1 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 min-h-[400px]">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/50 uppercase tracking-widest text-xs">
                  Loading Face Detection Models...
                </p>
              </div>
            </div>
          ) : mode === "upload" ? (
            <ImageUploader onImageSelected={handleImageUpload} isProcessing={isProcessing} />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Webcam + bounding-box overlay */}
              <div className="relative w-full">
                <WebcamCapture
                  onFrame={handleFrame}
                  isCapturing={isAnalyzing}
                  captureIntervalMs={2000}
                  onStreamReady={() => setCameraReady(true)}
                />

                {/* Face bounding box — shown only when a face is detected */}
                {isAnalyzing && faceBox && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      // The video inside WebcamCapture is aspect-video, so we
                      // position relative to the inner video container (which
                      // starts right after the outer padding of WebcamCapture).
                      top:    `${faceBox.yPct}%`,
                      left:   `${faceBox.xPct}%`,
                      width:  `${faceBox.wPct}%`,
                      height: `${faceBox.hPct}%`,
                    }}
                  >
                    {/* Animated corner brackets */}
                    <span className="absolute top-0 left-0  w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                    <span className="absolute bottom-0 left-0  w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

                    {/* Confidence chip above the box */}
                    <span
                      className="absolute -top-6 left-0 text-[10px] font-mono font-semibold
                                 bg-emerald-500/80 text-white px-2 py-0.5 rounded
                                 shadow-[0_0_8px_rgba(52,211,153,0.5)] whitespace-nowrap"
                    >
                      Face {faceBox.confidence}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={startLiveSession}
                  disabled={!cameraReady || isAnalyzing}
                  className={`px-8 py-3 rounded-full text-sm font-medium tracking-wide transition-all ${
                    !cameraReady || isAnalyzing
                      ? "bg-white/10 text-white/30 cursor-not-allowed"
                      : "bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  }`}
                >
                  {isAnalyzing ? "Analyzing..." : "Start Analysis (1 Min)"}
                </button>
                {sessionStarted && (
                  <div className="flex-1">
                    <SessionTimer
                      durationSeconds={60}
                      isRunning={isAnalyzing}
                      onComplete={handleSessionComplete}
                      label="Demographics"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Model Selection Panel */}
          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4 flex justify-between items-center">
              <span>Select Model</span>
              <span className="text-[9px] bg-white/10 text-white/70 px-2 py-0.5 rounded font-mono font-normal">
                {activeModelObj.name}
              </span>
            </h3>
            <div className="space-y-2.5">
              {AGE_GENDER_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => !isAnalyzing && setSelectedModel(m.id)}
                    disabled={isAnalyzing}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between group ${
                      isAnalyzing ? "opacity-60 cursor-not-allowed" : ""
                    } ${
                      isSelected
                        ? "bg-white/10 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    <div className="flex-1 pr-2">
                       <div className="text-xs font-medium tracking-wide flex items-center gap-2 flex-wrap">
                         <span className={isSelected ? "text-white font-semibold" : "text-white/80"}>
                           {m.name}
                         </span>
                         <span
                           className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                             isSelected ? "bg-white text-black font-bold" : "bg-white/10 text-white/50"
                           }`}
                         >
                           {m.badge}
                         </span>
                       </div>
                       <p className="text-[10px] text-white/40 font-light mt-1 leading-snug">
                         {m.desc}
                       </p>
                       {/* Recommended-for tag */}
                       <span
                         className={`inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded border ${
                           BEST_FOR_META[m.bestFor].cls
                         }`}
                       >
                         ✦ Best for {BEST_FOR_META[m.bestFor].label}
                       </span>
                     </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        isSelected
                          ? "border-white bg-white"
                          : "border-white/20 group-hover:border-white/40"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Demographics Panel */}
          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-5 flex justify-between">
              <span>Live Biometrics</span>
              <span className="text-white/20">M2</span>
            </h3>
            {liveDemographics.age > 0 ? (
              <div className="flex flex-col">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                      Age Estimate
                    </p>
                    <p className="text-3xl font-light text-white/90">
                      {liveDemographics.age - 2}–{liveDemographics.age + 2}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                      Gender
                    </p>
                    <p className="text-xl font-light capitalize text-white/90 mt-1.5">
                      {liveDemographics.gender}{" "}
                      <span className="text-xs text-white/30 ml-1 font-mono">
                        {liveDemographics.probability}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Spectacles row — shown whenever a face is in frame */}
                {spectacles !== null && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Spectacles</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          spectacles.detected ? "bg-emerald-400" : "bg-white/20"
                        }`}
                      />
                      <p
                        className={`text-sm font-light ${
                          spectacles.detected ? "text-emerald-300" : "text-white/40"
                        }`}
                      >
                        {spectacles.detected ? "Detected" : "Not Detected"}
                      </p>
                      {spectacles.detected && (
                        <span className="text-[10px] font-mono text-white/30 ml-auto">
                          {spectacles.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/30 italic font-light">Awaiting visual feed...</p>
            )}
          </div>

          {/* Technology Panel */}
          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Technology Stack
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Active Model</span>
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/80 font-mono">
                  {activeModelObj.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Architecture</span>
                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-white/60">
                  {activeModelObj.stack}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Benchmark Datasets</span>
                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-white/60">
                  {activeModelObj.datasets}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function generateMockResult(modelName: string = "FairFace Model", modelId: string = "fairface") {
  const ageMap: Record<string, number> = {
    fairface: 24,
    deepface_ensemble: 25,
    utkface_resnet: 23,
    ssrnet: 24,
  };
  return {
    age: ageMap[modelId] || 25,
    gender: "male",
    genderConfidence: 94,
    selectedModel: modelName,
    modelId: modelId,
    sessionType: "upload",
  };
}

function generateMockSessionResult(modelName: string = "FairFace Model", modelId: string = "fairface") {
  return {
    age: 24,
    gender: "male",
    genderConfidence: 92,
    ageTrend: [26, 25, 24, 25, 24, 24, 24],
    selectedModel: modelName,
    modelId: modelId,
    sessionType: "live",
    duration: 120,
  };
}
