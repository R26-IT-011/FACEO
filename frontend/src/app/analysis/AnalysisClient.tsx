"use client";

import { useEffect, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { loadModels, detectFaceAndEmotions } from "@/utils/faceApi";
import * as faceapi from "@vladmandic/face-api";
import { useRouter } from "next/navigation";

export default function AnalysisPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const hasCapturedFrame = useRef(false);

    // Accumulate real data over time
    const accumulatedData = useRef({
        emotionHistory: [] as string[],
        emotionScores: [] as number[],
        demographics: { age: [] as number[], gender: [] as string[], probability: [] as number[] }
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [progress, setProgress] = useState(0);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    // Live Data State
    const [userName, setUserName] = useState("");
    const capturedUserFrame = useRef<string | null>(null);
    const [emotionData, setEmotionData] = useState<{ emotion: string; score: number }[]>([]);
    const [demographics, setDemographics] = useState({ age: 0, gender: "", probability: 0 });
    const [authenticity, setAuthenticity] = useState({ state: "EVALUATING...", confidence: 0 });
    const [skinAnalysis, setSkinAnalysis] = useState({ tone: "Pending", condition: "Pending", score: 0 });

    useEffect(() => {
        const initModels = async () => {
            const loaded = await loadModels();
            setModelsLoaded(loaded);
        };
        initModels();
    }, []);

    const captureAndAnalyzeBackend = async (video: HTMLVideoElement) => {
        if (hasCapturedFrame.current) return;
        hasCapturedFrame.current = true;

        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = video.videoWidth || 1280;
        tmpCanvas.height = video.videoHeight || 720;
        const ctx = tmpCanvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, tmpCanvas.width, tmpCanvas.height);

        tmpCanvas.toBlob(async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append("file", blob, "frame.jpg");

            try {
                const apiBase = process.env.NEXT_PUBLIC_MAIN_API_URL || "http://localhost:8000";
                const res = await fetch(`${apiBase}/api/analyze-frame`, {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (data.status === "success") {
                    setAuthenticity({
                        state: data.deepfake_analysis.authenticity,
                        confidence: Math.round(data.deepfake_analysis.confidence * 100)
                    });
                    setSkinAnalysis({
                        tone: data.skin_analysis.skin_tone,
                        condition: data.skin_analysis.condition,
                        score: Math.round(data.skin_analysis.texture_score * 100)
                    });
                }
            } catch (e) {
                console.error("Backend error", e);
                setAuthenticity({ state: "BACKEND OFFLINE", confidence: 0 });
            }
        }, "image/jpeg", 0.9);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: "user" },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Please allow webcam access to use the analysis platform.");
        }
    };

    const handleVideoPlay = () => {
        if (!modelsLoaded) return;

        const detect = async () => {
            if (videoRef.current && canvasRef.current && isAnalyzing) {
                // Trigger Python backend capture once
                if (!hasCapturedFrame.current) {
                    captureAndAnalyzeBackend(videoRef.current);
                    
                    // Capture base64 frame for results page
                    try {
                        const frameCanvas = document.createElement("canvas");
                        frameCanvas.width = videoRef.current.videoWidth || 1280;
                        frameCanvas.height = videoRef.current.videoHeight || 720;
                        const frameCtx = frameCanvas.getContext("2d");
                        if (frameCtx) {
                            frameCtx.drawImage(videoRef.current, 0, 0, frameCanvas.width, frameCanvas.height);
                            capturedUserFrame.current = frameCanvas.toDataURL("image/jpeg", 0.8);
                        }
                    } catch(e) { console.error("Could not capture subject frame", e); }
                }

                const detections = await detectFaceAndEmotions(videoRef.current);

                if (detections && detections.length > 0) {
                    const det = detections[0];

                    const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
                    const resizedResult = faceapi.resizeResults(det, dims);
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        faceapi.draw.drawDetections(canvasRef.current, resizedResult);
                    }

                    const expressions = Object.entries(det.expressions)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([emotion, score]) => ({ emotion, score: Math.round((score as number) * 100) }));

                    setEmotionData(expressions.slice(0, 4));
                    if (expressions.length > 0) {
                        accumulatedData.current.emotionHistory.push(expressions[0].emotion);
                        accumulatedData.current.emotionScores.push(expressions[0].score);
                    }

                    const ageVal = Math.round(det.age);
                    const genderProb = Math.round(det.genderProbability * 100);
                    setDemographics({
                        age: ageVal,
                        gender: det.gender,
                        probability: genderProb
                    });

                    accumulatedData.current.demographics.age.push(det.age);
                    accumulatedData.current.demographics.gender.push(det.gender);
                    accumulatedData.current.demographics.probability.push(genderProb);
                }
            }
            requestRef.current = requestAnimationFrame(detect);
        };

        if (isAnalyzing) detect();
    };

    useEffect(() => {
        if (isAnalyzing) {
            handleVideoPlay();
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isAnalyzing, modelsLoaded]);

    const startAnalysis = () => {
        setIsAnalyzing(true);
        hasCapturedFrame.current = false;
        setAuthenticity({ state: "EVALUATING...", confidence: 0 });

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    finishAnalysis();
                    return 100;
                }
                return prev + (100 / 180);
            });
        }, 1000);
    };

    const finishAnalysis = () => {
        setIsAnalyzing(false);

        const emotions = accumulatedData.current.emotionHistory;

        if (emotions.length === 0) {
            const sessionResults = {
                error: "No human face was captured or detected during the analysis session. Please ensure you are facing the camera in a well-lit environment."
            };
            sessionStorage.setItem("faceo_results", JSON.stringify(sessionResults));
            router.push("/results");
            return;
        }

        // Calculate Dominant Emotion and average score over the session
        const emotionCounts = emotions.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {} as Record<string, number>);
        const dominantEmotion = Object.keys(emotionCounts).length > 0 ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b) : "Neutral";

        const avgEmotionConf = accumulatedData.current.emotionScores.length > 0 ? Math.round(accumulatedData.current.emotionScores.reduce((a, b) => a + b, 0) / accumulatedData.current.emotionScores.length) : 0;

        // Demographic averages
        const ages = accumulatedData.current.demographics.age;
        const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

        const genders = accumulatedData.current.demographics.gender;
        const genderCounts = genders.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {} as Record<string, number>);
        const dominantGender = Object.keys(genderCounts).length > 0 ? Object.keys(genderCounts).reduce((a, b) => genderCounts[a] > genderCounts[b] ? a : b) : "Unknown";

        const genderProbs = accumulatedData.current.demographics.probability;
        const avgGenderConf = genderProbs.length > 0 ? Math.round(genderProbs.reduce((a, b) => a + b, 0) / genderProbs.length) : 0;

        // Simplified rising trend mock to show progress to final average
        const trend = [30, 45, 55, 60, 75, Math.max(0, avgEmotionConf - 5), avgEmotionConf];

        const sessionResults = {
            subjectName: userName.trim() || undefined,
            subjectFrame: capturedUserFrame.current,
            emotion: { dominant: dominantEmotion, confidence: avgEmotionConf, trend },
            demographics: { age: avgAge, gender: dominantGender, genderConfidence: avgGenderConf },
            skin: { tone: skinAnalysis.tone, condition: skinAnalysis.condition, score: skinAnalysis.score },
            authenticity: { status: authenticity.state, confidence: authenticity.confidence }
        };

        // Instantly save, then instantly route without hard-reloading the javascript context
        sessionStorage.setItem("faceo_results", JSON.stringify(sessionResults));
        router.push("/results");
    };

    return (
        <main className="min-h-screen bg-black flex flex-col relative overflow-hidden">
            <Navigation />

            <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-28 pb-10 flex flex-col lg:flex-row gap-6 relative z-10">

                {/* Main Video Section */}
                <div className="flex-1 flex flex-col">
                    <div className="relative w-full aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        {!cameraActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-20 bg-black/50 backdrop-blur-sm">
                                <p className="mb-4 text-sm font-light tracking-widest uppercase">
                                    {modelsLoaded ? "AI Models Ready" : "Loading Neural Networks..."}
                                </p>
                                <button
                                    onClick={startCamera}
                                    disabled={!modelsLoaded}
                                    className={`px-6 py-2 rounded-full font-medium tracking-wide transition-transform ${modelsLoaded ? 'bg-white text-black hover:scale-105' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                                >
                                    Enable Camera
                                </button>
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover grayscale brightness-110 contrast-125 mix-blend-screen"
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-50"
                        />

                        {isAnalyzing && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute top-6 left-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3"
                            >
                                <div className={`w-2 h-2 rounded-full ${authenticity.state === 'REAL' ? 'bg-green-400' : authenticity.state === 'AI GENERATED' ? 'bg-red-500' : 'bg-yellow-400'} animate-pulse`} />
                                <span className="text-xs tracking-widest uppercase text-white/90">
                                    {authenticity.state === "BACKEND OFFLINE" ? "API OFFLINE" : `Authenticity: ${authenticity.state}`}
                                </span>
                                {authenticity.confidence > 0 && (
                                    <span className="text-[10px] text-white/40 ml-2">{authenticity.confidence}% CONFIDENCE</span>
                                )}
                            </motion.div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
                        <input
                            type="text"
                            placeholder="Subject Name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            disabled={isAnalyzing}
                            maxLength={40}
                            className={`bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors w-full md:w-64 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        <button
                            onClick={startAnalysis}
                            disabled={!cameraActive || isAnalyzing}
                            className={`px-8 py-3 rounded-full text-sm font-medium tracking-wide transition-all ${!cameraActive || isAnalyzing
                                ? "bg-white/10 text-white/30 cursor-not-allowed"
                                : "bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                }`}
                        >
                            {isAnalyzing ? "Analyzing..." : "Start Analysis (3 Min)"}
                        </button>
                        <div className="w-full md:w-auto flex-1 flex items-center gap-4">
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white relative"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${progress}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/50 blur-sm" />
                                </motion.div>
                            </div>
                            <span className="text-xs text-white/40 tracking-widest w-12 text-right font-mono">
                                {Math.min(100, Math.round(progress))}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Results */}
                <div className="w-full lg:w-80 flex flex-col gap-4">

                    <div className="glass-panel p-6">
                        <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4 flex justify-between">
                            <span>Emotion Tracking</span>
                            <span className="text-white/20">M1</span>
                        </h3>
                        <div className="space-y-4">
                            {emotionData.length > 0 ? emotionData.map((item, i) => (
                                <div key={item.emotion}>
                                    <div className="flex justify-between text-xs mb-1.5 uppercase font-mono tracking-wider">
                                        <span className={i === 0 ? "text-white" : "text-white/50"}>{item.emotion}</span>
                                        <span className={i === 0 ? "text-white" : "text-white/30"}>{item.score}%</span>
                                    </div>
                                    <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${item.score}%`, opacity: i === 0 ? 1 : 0.2 }} />
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-white/30 italic font-light">Awaiting feed...</p>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-5 flex justify-between">
                            <span>Demographics</span>
                            <span className="text-white/20">M2</span>
                        </h3>
                        {demographics.age > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Age Range</p>
                                    <p className="text-3xl font-light text-white/90">{demographics.age - 2}-{demographics.age + 2}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Gender</p>
                                    <p className="text-xl font-light capitalize text-white/90 mt-1.5">
                                        {demographics.gender} <span className="text-xs text-white/30 ml-1 font-mono">{demographics.probability}%</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-white/30 italic font-light">Awaiting visual data...</p>
                        )}
                    </div>

                    <div className="glass-panel p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
                        <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-5 flex justify-between relative z-10">
                            <span>Skin Analysis</span>
                            <span className="text-white/20">M4</span>
                        </h3>
                        <div className="space-y-5 relative z-10">
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Color Matrix</p>
                                <div className="flex items-center gap-3 px-3 py-2 bg-black/40 rounded-lg border border-white/5">
                                    <div className={`w-3 h-3 rounded-full shadow-inner ${skinAnalysis.tone === 'Light' ? 'bg-[#f4d0b0]' : skinAnalysis.tone === 'Dark' ? 'bg-[#6b4423]' : 'bg-[#c68e5d]'}`} />
                                    <p className="text-xs text-white/70 font-mono uppercase">{skinAnalysis.tone || "Pending"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Texture / Condition</p>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-white/70">{skinAnalysis.condition || "Pending"}</span>
                                    <span className="text-xs text-white/30 font-mono">{skinAnalysis.score}%</span>
                                </div>
                                <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/50" style={{ width: `${skinAnalysis.score}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
