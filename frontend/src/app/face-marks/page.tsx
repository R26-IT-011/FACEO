"use client";

import React, { useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { motion, AnimatePresence } from "framer-motion";
import { compareSuspects } from "@/shared/services/ApiClient";
import { 
  Upload, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Maximize2, 
  ShieldAlert, 
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";

interface MarkDetail {
  class: string;
  confidence: number | string;
  conf?: number | string;
  x?: number;
  y?: number;
  source_model?: string;
}

interface SuspectResult {
  filename: string;
  match_percent: number;
  marks_found: MarkDetail[];
  suspect_visual: string;
}

interface CompareResponse {
  selected_model: string;
  evidence_marks: MarkDetail[];
  evidence_image: string;
  results: SuspectResult[];
}

const YOLOMODELS = [
  { id: "yolov8", name: "YOLOv8", desc: "High-precision deep vision detector", badge: "v8 Default" },
  { id: "yolov11", name: "YOLOv11", desc: "Ultra-fast Next-Gen model architecture", badge: "v11 Latest" },
  { id: "both", name: "Ensemble (Both)", desc: "Dual-model validation & combined accuracy", badge: "Ensemble" },
];

const DETECTION_TYPES = ["Scar", "Bruise", "Mole"];

export default function FaceMarksPage() {
  const [evidence, setEvidence] = useState<File | null>(null);
  const [suspects, setSuspects] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("both");
  const [results, setResults] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("Detailed Forensic View");

  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const suspectsInputRef = useRef<HTMLInputElement>(null);

  const activeModelObj = YOLOMODELS.find((m) => m.id === selectedModel) || YOLOMODELS[2];

  const handleEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEvidence(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleSuspectsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSuspects((prev) => [...prev, ...newFiles]);
      setErrorMessage(null);
    }
  };

  const removeSuspect = (index: number) => {
    setSuspects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompare = async () => {
    if (!evidence) {
      setErrorMessage("Please upload a Case Evidence image first.");
      return;
    }
    if (suspects.length === 0) {
      setErrorMessage("Please upload at least one Suspect image to compare.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await compareSuspects(evidence, suspects, selectedModel);
      const data = (res.data || res) as unknown as CompareResponse;
      if (res.status === "success" && (data.results || data.evidence_image)) {
        setResults(data);
      } else if (res.error) {
        setErrorMessage(res.error);
      } else {
        setErrorMessage("Analysis failed. Please check backend connection.");
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Backend Connection Error. Please ensure service is running on Port 8003.");
    } finally {
      setLoading(false);
    }
  };

  const formatConfidence = (item: MarkDetail): string => {
    const val = item.conf !== undefined ? item.conf : item.confidence;
    const num = parseFloat(String(val));
    if (isNaN(num)) return "0%";
    if (num <= 1 && num > 0) {
      return `${(num * 100).toFixed(0)}%`;
    }
    return `${num.toFixed(0)}%`;
  };

  const openImageModal = (imgSrc: string, title: string) => {
    setSelectedImg(imgSrc);
    setModalTitle(title);
  };

  const resetAll = () => {
    setEvidence(null);
    setSuspects([]);
    setResults(null);
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden font-sans">
      <Navigation />

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-28 pb-14 flex flex-col gap-8 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Forensic Facial Intelligence
              </span>
              <span className="text-white/30 text-xs font-mono">FCO-MRK-2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white">
              Criminal Face Mark <span className="font-semibold text-white/90">Identification</span>
            </h1>
            <p className="text-white/40 text-sm font-light mt-1 max-w-2xl">
              Automated Forensic Evidence Matching — Detect scars, bruises, and moles across evidence and suspect databases using YOLOv8 & YOLOv11.
            </p>
          </div>

          {(evidence || suspects.length > 0 || results) && (
            <button
              onClick={resetAll}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all flex items-center gap-2 self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Workspace
            </button>
          )}
        </motion.div>

        {/* Main Grid: Upload Cards & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Dual Upload Card */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-panel p-6 md:p-8 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Case Evidence Upload Box */}
                <div className="flex flex-col">
                  <label className="text-xs uppercase font-semibold tracking-wider text-white/70 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      1. Case Evidence Image
                    </span>
                    {evidence && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </label>

                  <input
                    ref={evidenceInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleEvidenceSelect}
                  />

                  <div
                    onClick={() => evidenceInputRef.current?.click()}
                    className={`relative min-h-[240px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 overflow-hidden group ${
                      evidence
                        ? "border-emerald-500/50 bg-emerald-950/10 hover:border-emerald-400"
                        : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]"
                    }`}
                  >
                    {evidence ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <img
                          src={URL.createObjectURL(evidence)}
                          alt="Case Evidence"
                          className="max-h-[190px] w-auto object-contain rounded-lg shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <span className="text-xs text-white bg-black/80 px-3 py-1.5 rounded-full border border-white/20">
                            Click to Change
                          </span>
                        </div>
                        <span className="text-[11px] text-white/60 font-mono mt-2 truncate max-w-[200px]">
                          {evidence.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5 text-white/60" />
                        </div>
                        <p className="text-sm font-medium text-white/80">Click or Drag Evidence Image</p>
                        <p className="text-xs text-white/40 font-light mt-1">Crime scene photo, CCTV crop, or mark evidence</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Suspect List Upload Box */}
                <div className="flex flex-col">
                  <label className="text-xs uppercase font-semibold tracking-wider text-white/70 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      2. Suspect List ({suspects.length})
                    </span>
                    {suspects.length > 0 && (
                      <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {suspects.length} File{suspects.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </label>

                  <input
                    ref={suspectsInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleSuspectsSelect}
                  />

                  <div
                    onClick={() => suspectsInputRef.current?.click()}
                    className={`relative min-h-[240px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 overflow-hidden group ${
                      suspects.length > 0
                        ? "border-blue-500/50 bg-blue-950/10 hover:border-blue-400"
                        : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]"
                    }`}
                  >
                    {suspects.length > 0 ? (
                      <div className="w-full flex flex-col items-center">
                        <div className="grid grid-cols-3 gap-2 w-full max-h-[170px] overflow-hidden p-1">
                          {suspects.slice(0, 6).map((file, idx) => (
                            <div key={idx} className="relative group/thumb aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/40">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Suspect ${idx}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSuspect(idx);
                                }}
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {suspects.length > 6 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              +{suspects.length - 6} more
                            </span>
                          )}
                          <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">
                            Click to add more
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Users className="w-5 h-5 text-white/60" />
                        </div>
                        <p className="text-sm font-medium text-white/80">Click or Drag Suspect Photos</p>
                        <p className="text-xs text-white/40 font-light mt-1">Select one or multiple mugshots to compare</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mt-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleCompare}
                  disabled={loading}
                  className={`w-full md:w-auto min-w-[280px] px-8 py-4 rounded-full font-medium text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl ${
                    loading
                      ? "bg-white/20 text-white/50 cursor-not-allowed"
                      : "bg-white text-black hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Analysing Marks & Comparing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-black" />
                      <span>Compare Evidence & Suspects</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Sidebar Options */}
          <div className="flex flex-col gap-6">
            {/* Model Selector Card */}
            <div className="glass-panel p-6">
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4 flex justify-between items-center">
                <span>YOLO Model Selection</span>
                <span className="text-[9px] bg-white/10 text-white/70 px-2 py-0.5 rounded font-mono font-normal">
                  {activeModelObj.name}
                </span>
              </h3>

              <div className="space-y-2.5">
                {YOLOMODELS.map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between group ${
                        isSelected
                          ? "bg-white/10 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                          : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/20 hover:text-white/80"
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="text-xs font-medium tracking-wide flex items-center gap-2">
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
                        <p className="text-[10px] text-white/40 font-light mt-1 leading-snug">{m.desc}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isSelected ? "border-white bg-white" : "border-white/20 group-hover:border-white/40"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Classes Card */}
            <div className="glass-panel p-6">
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-white/60" />
                <span>Detection Target Classes</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {DETECTION_TYPES.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white/70 uppercase tracking-widest font-mono"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-white/30 font-light mt-4 leading-relaxed">
                Spatial coordinates and confidence scores of scars, bruises, and moles are matched using Euclidean distance weighting.
              </p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 mt-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-light tracking-tight text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Forensic Matching Analysis Results
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Model: {results.selected_model || activeModelObj.name} · Evaluated {results.results?.length || 0} suspects against evidence
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Source Evidence Analysis */}
              <div className="glass-panel p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Source Evidence Analysis
                  </span>
                  <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/60">
                    {results.evidence_marks?.length || 0} Marks Found
                  </span>
                </div>

                <div
                  className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 cursor-pointer group flex items-center justify-center"
                  onClick={() => openImageModal(results.evidence_image, "Source Evidence Analysis")}
                >
                  <img
                    src={results.evidence_image}
                    alt="Evidence Analysis"
                    className="w-full max-h-[340px] object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-black/80 border border-white/20 text-xs text-white flex items-center gap-1.5">
                      <Maximize2 className="w-3 h-3" /> Zoom Detailed View
                    </span>
                  </div>
                </div>

                {/* Evidence Marks Detail List */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                    Detected Evidence Features:
                  </span>
                  {results.evidence_marks && results.evidence_marks.length > 0 ? (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {results.evidence_marks.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs font-mono"
                        >
                          <span className="text-white/90 font-medium">{m.class}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {formatConfidence(m)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic p-2">No distinctive marks detected on source evidence.</p>
                  )}
                </div>
              </div>

              {/* Right 2 Columns: Ranked Suspect Matches */}
              <div className="lg:col-span-2 glass-panel p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Suspect Match Rankings
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">Sorted by Match Score</span>
                </div>

                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                  {results.results && results.results.length > 0 ? (
                    results.results.map((res, i) => {
                      const isTopMatch = i === 0 && res.match_percent > 0;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => openImageModal(res.suspect_visual, `Suspect: ${res.filename}`)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row items-center gap-4 group ${
                            isTopMatch
                              ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                              : "bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05]"
                          }`}
                        >
                          {/* Suspect Thumbnail */}
                          <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black">
                            <img
                              src={res.suspect_visual}
                              alt={res.filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/70">
                              #{i + 1}
                            </span>
                          </div>

                          {/* Info & Progress */}
                          <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate max-w-[200px]">
                                  {res.filename}
                                </span>
                                {isTopMatch && (
                                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Highest Match
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-mono font-semibold text-white">
                                {res.match_percent}%
                              </span>
                            </div>

                            {/* Similarity Score Track */}
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${res.match_percent}%`,
                                  background: res.match_percent > 70 
                                    ? "linear-gradient(90deg, #10b981, #34d399)" 
                                    : res.match_percent > 40
                                    ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
                                    : "linear-gradient(90deg, #6b7280, #9ca3af)",
                                }}
                              />
                            </div>

                            {/* Detected Marks Tags */}
                            <div className="flex flex-wrap gap-1.5">
                              {res.marks_found && res.marks_found.length > 0 ? (
                                res.marks_found.map((m, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70"
                                  >
                                    {m.class}: {formatConfidence(m)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-white/30 italic">No marks located</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-white/40 italic p-4 text-center">No suspect rankings returned.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Detailed Forensic Zoom Modal */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImg(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-4xl w-full p-6 flex flex-col gap-4 border border-white/20 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-semibold tracking-wide text-white">{modalTitle}</span>
                <button
                  onClick={() => setSelectedImg(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center bg-black/40 rounded-xl p-2 max-h-[75vh] overflow-hidden">
                <img
                  src={selectedImg}
                  alt="Forensic View"
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
