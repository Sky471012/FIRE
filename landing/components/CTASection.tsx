"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Ready to Transform Your <span className="text-gradient">Research Workflow</span>?
          </h2>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Join researchers worldwide who are accelerating their scientific discovery with FIRE's AI-powered environment.
          </p>
          
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="https://gitlab.com/DilicalFlame/FIRE"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
            >
              Download FIRE
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="https://gitlab.com/DilicalFlame/FIRE"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-muted px-8 py-4 text-base font-medium transition-colors hover:bg-muted/80"
            >
              View Documentation
            </Link>
          </div>
          
          <p className="mt-8 text-sm text-muted-foreground">
            Free and open source. MIT License.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
