"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export default function Navigation() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Emotion", path: "/emotion" },
        { name: "Age & Gender", path: "/age-gender" },
        { name: "Face Marks", path: "/face-marks" },
        { name: "Deepfake", path: "/deepfake" },
        { name: "All-in-One", path: "/all-in-one" },
        { name: "Vision & Mission", path: "/vision-mission" },
        { name: "Team", path: "/team" },
    ];

    const isActive = (path: string) => {
        if (path === "/") return pathname === "/";
        if (path === "/emotion") {
            return (
                pathname === "/emotion" ||
                pathname.startsWith("/emotionRecognition") ||
                pathname.startsWith("/lowLightCondition")
            );
        }
        return pathname.startsWith(path);
    };

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-40 bg-black/50 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/faceo-logo.png" alt="Faceo" width={32} height={36} className="object-contain" />
                        <span className="text-lg font-medium tracking-[0.15em] text-white uppercase">
                            Faceo
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden lg:flex gap-6 items-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.path}
                                className={`relative text-xs tracking-wide smooth-transition hover:text-white ${isActive(link.path) ? "text-white" : "text-white/50"
                                    }`}
                            >
                                {link.name}
                                {isActive(link.path) && (
                                    <motion.div
                                        layoutId="underline"
                                        className="absolute left-0 top-full mt-1 h-[1px] w-full bg-white"
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </nav>

            {/* Mobile menu overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-30 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6 lg:hidden"
                    >
                        {navLinks.map((link, i) => (
                            <motion.div
                                key={link.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link
                                    href={link.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={`text-xl font-light tracking-widest uppercase smooth-transition hover:text-white ${isActive(link.path) ? "text-white" : "text-white/40"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
