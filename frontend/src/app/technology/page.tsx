"use client";

import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";

export default function TechnologyPage() {
    const technologies = [
        {
            title: "Cross-Cultural Emotion Detection",
            module: "Module 1",
            description: "Multi-model facial emotion recognition architecture featuring SSD MobileNetV3 (default real-time detector), CNN Deep Feature Extractor, and YOLO expression classifiers evaluated across global datasets.",
            datasets: ["FER2013", "AffectNet", "RAF-DB"],
            stack: "TensorFlow.js / DeepFace / FastAPI",
        },
        {
            title: "Demographic Estimation",
            module: "Module 2",
            description: "Multi-architecture demographic estimation offering FairFace (cross-ethnic South Asian balance), DeepFace Ensemble (VGG-Face representation), UTKFace ResNet-50, and real-time SSR-Net.",
            datasets: ["FairFace", "UTKFace", "IMDB-WIKI", "Adience"],
            stack: "FastAPI / DeepFace / TensorFlow.js",
        },
        {
            title: "Facial Marks & Bruises Detection",
            module: "Module 3",
            description: "State-of-the-art YOLOv8 and YOLOv11 deep vision models providing real-time bounding-box detection and localization of scars, bruises, and moles with fine-grained confidence scoring.",
            datasets: ["DDI (Diverse Dermatology Images)", "ACNE04", "Roboflow Skin Datasets"],
            stack: "FastAPI / PyTorch / OpenCV",
        },
        {
            title: "Deepfake Authenticity & Verification",
            module: "Module 4",
            description: "Multi-spectral authenticity verification system employing SwinBase Vision Transformers, CNN artifact classifiers, Error Level Analysis (ELA), and FFT frequency-domain spectral analysis.",
            datasets: ["FaceForensics++", "DeepFake Detection Challenge (DFDC)"],
            stack: "FastAPI / PyTorch / OpenCV Forensics",
        },
    ];

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 relative">
            <Navigation />

            <div className="max-w-6xl mx-auto z-10 relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-16 text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">Technology & Research</h1>
                    <p className="text-white/50 max-w-2xl mx-auto font-light">
                        A modular, hybrid edge-and-cloud architecture designed for accuracy, speed, and real-time face intelligence.
                        Client-side models ensure instant interactivity, while dedicated FastAPI microservices handle deep neural inference and multi-spectral classification.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {technologies.map((tech, i) => (
                        <motion.div
                            key={tech.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 * i, duration: 0.8 }}
                            className="glass-card p-8 group hover:bg-white/5 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs uppercase tracking-widest text-white/40">{tech.module}</span>
                                <span className="text-xs border border-white/20 px-3 py-1 rounded-full text-white/70">{tech.stack}</span>
                            </div>
                            <h2 className="text-2xl font-light mb-3 group-hover:text-white transition-colors text-white/90">
                                {tech.title}
                            </h2>
                            <p className="text-white/50 text-sm mb-6 leading-relaxed">
                                {tech.description}
                            </p>
                            <div>
                                <h4 className="text-xs uppercase tracking-widest text-white/30 mb-2">Reference Datasets</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tech.datasets.map(ds => (
                                        <span key={ds} className="text-xs bg-white/5 px-2 py-1 rounded text-white/60">
                                            {ds}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </main>
    );
}
