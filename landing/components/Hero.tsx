"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ShaderBackground } from "./ShaderBackground";
import { useEffect, useState } from "react";

export function Hero() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const isLight = document.documentElement.classList.contains("light");
      setIsDark(!isLight);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20 text-center">
      <ShaderBackground />
      {/* Theme-aware overlay */}
      {isDark ? (
        <div className="absolute inset-0 -z-10 bg-black/40" />
      ) : (
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/50 via-purple-50/30 to-pink-50/50" />
      )}

      <div className="container relative z-10 flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-sm text-primary backdrop-blur-sm"
        >
          <span>v1.0 is now available</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl"
        >
          Fast Integrated <br />
          <span className="text-gradient">Research Environment</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-lg text-muted-foreground sm:text-xl"
        >
          A local-first, AI-powered workspace that unifies scientific data
          ingestion, analysis, and visualization into a single conversation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Link
            href="https://gitlab.com/DilicalFlame/FIRE"
            className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
          >
            Download for Free
          </Link>
          <Link
            href="#features"
            className="rounded-full border border-border bg-muted px-8 py-3 text-sm font-medium transition-colors hover:bg-muted/80"
          >
            View Features
          </Link>
        </motion.div>

        {/* Visual Element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 w-full max-w-5xl overflow-hidden rounded-xl border border-border card-bg shadow-2xl"
        >
          <div className="relative aspect-video w-full">
            <Image
              src={
                isDark
                  ? "/images/homescreen-dark.png"
                  : "/images/homescreen-light.png"
              }
              alt="FIRE Application Interface"
              fill
              className="object-cover"
              key={isDark ? "dark" : "light"}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
