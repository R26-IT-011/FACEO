"use client";

import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Moon } from "lucide-react";

export default function EmotionSelectionPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <Navigation />

      {/* Subtle background ambient blur spots */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-white/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-amber-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-28 pb-16 flex flex-col justify-center relative z-10">
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-10 md:mb-14"
        >
          <span className="text-[11px] font-mono tracking-[0.3em] uppercase bg-white/10 border border-white/15 px-4 py-1.5 rounded-full text-white/80 inline-block mb-4">
            FACEO ANALYTICS MODULES
          </span>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-4">
            Choose Emotion Analysis Mode
          </h1>
          <p className="text-white/50 text-base md:text-lg font-light leading-relaxed">
            Select the environmental condition module best suited for your facial recognition workflow.
          </p>
        </motion.div>

        {/* Selection Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 max-w-6xl mx-auto w-full">
          {/* Card 1: Emotion Recognition Part */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link
              href="/emotionRecognition"
              className="group relative block w-full aspect-[4/3] md:aspect-[16/10] rounded-3xl overflow-hidden bg-black border border-white/20 hover:border-white/50 transition-all duration-500 shadow-2xl hover:shadow-[0_0_45px_rgba(255,255,255,0.15)]"
            >
              {/* Darkened Low-Opacity Image */}
              <Image
                src="/emotion.png"
                alt="Emotion Recognition Part"
                fill
                priority
                className="object-cover object-center opacity-55 brightness-75 contrast-110 group-hover:scale-105 group-hover:opacity-70 group-hover:brightness-90 transition-all duration-700 ease-out"
              />

              {/* Dark Gradient Overlay for Maximum Text Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none" />

              {/* Card Text Content Overlay */}
              <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-mono font-semibold tracking-widest uppercase bg-black/80 backdrop-blur-md border border-white/30 px-3.5 py-1.5 rounded-full text-white shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Standard Illumination
                  </span>
                </div>

                <div className="bg-black/40 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-white/10 group-hover:border-white/20 transition-colors">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-md">
                    Emotion Recognition Part
                  </h2>
                  <p className="text-white/85 text-xs md:text-sm font-normal leading-relaxed max-w-md mb-5 drop-shadow">
                    Multi-model detection engine (SSD MobileNetV3, CNN, YOLO) for accurate facial expression classification.
                  </p>

                  <div className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold tracking-wide text-black bg-white group-hover:bg-cyan-300 px-5 py-2.5 rounded-full transition-all group-hover:gap-3 shadow-lg">
                    <span>Explore Emotion Recognition</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card 2: Low Light Condition Part */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/lowLightCondition"
              className="group relative block w-full aspect-[4/3] md:aspect-[16/10] rounded-3xl overflow-hidden bg-black border border-white/20 hover:border-amber-500/60 transition-all duration-500 shadow-2xl hover:shadow-[0_0_45px_rgba(245,158,11,0.22)]"
            >
              {/* Darkened Low-Opacity Image */}
              <Image
                src="/lowLight.png"
                alt="Low Light Condition Part"
                fill
                priority
                className="object-cover object-center opacity-55 brightness-75 contrast-110 group-hover:scale-105 group-hover:opacity-70 group-hover:brightness-90 transition-all duration-700 ease-out"
              />

              {/* Dark Gradient Overlay for Maximum Text Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none" />

              {/* Card Text Content Overlay */}
              <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-mono font-semibold tracking-widest uppercase bg-black/80 backdrop-blur-md border border-amber-500/40 px-3.5 py-1.5 rounded-full text-amber-300 shadow-md">
                    <Moon className="w-3.5 h-3.5 text-amber-400" />
                    Low Light Enhanced
                  </span>
                </div>

                <div className="bg-black/40 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-white/10 group-hover:border-amber-500/30 transition-colors">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-md">
                    Low Light Condition Part
                  </h2>
                  <p className="text-white/85 text-xs md:text-sm font-normal leading-relaxed max-w-md mb-5 drop-shadow">
                    Zero-DCE curve estimation & adaptive illuminance normalization engineered for dim and night settings.
                  </p>

                  <div className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold tracking-wide text-black bg-amber-400 group-hover:bg-amber-300 px-5 py-2.5 rounded-full transition-all group-hover:gap-3 shadow-lg">
                    <span>Explore Low Light Condition</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
