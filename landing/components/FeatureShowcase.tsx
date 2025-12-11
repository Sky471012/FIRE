"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

interface FeatureShowcaseProps {
  title: string;
  description: string;
  imageSrc: string;
  index: number;
}

export function FeatureShowcase({
  title,
  description,
  imageSrc,
  index,
}: FeatureShowcaseProps) {
  const isEven = index % 2 === 0;
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["2deg", "-2deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-2deg", "2deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
      const mouseY = (e.clientY - rect.top) / rect.height - 0.5;
      x.set(mouseX);
      y.set(mouseY);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const boxDepth = 40; // Depth of the 3D box in pixels

  return (
    <div
      className={`flex flex-col gap-12 lg:flex-row lg:items-center ${isEven ? "" : "lg:flex-row-reverse"}`}
    >
      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="flex-1 space-y-4"
      >
        <h3 className="text-3xl font-bold tracking-tight lg:text-4xl">
          {title}
        </h3>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      </motion.div>

      {/* 3D Box Card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className="flex-1"
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            perspective: "1500px",
            rotateX,
            rotateY,
          }}
          className="relative group cursor-pointer"
        >
          {/* 3D Box Container */}
          <div
            className="relative w-full"
            style={{
              transformStyle: "preserve-3d",
              transform: isEven
                ? `rotateX(-12deg) rotateY(-25deg)`
                : `rotateX(-12deg) rotateY(25deg)`,
              transition: "transform 0.3s ease",
            }}
          >
            {/* Front Face (with image) */}
            <div
              className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-border bg-background shadow-2xl"
              style={{
                transformStyle: "preserve-3d",
                transform: `translateZ(${boxDepth / 2}px)`,
              }}
            >
              <Image
                src={imageSrc}
                alt={title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            {/* Top Face */}
            <div
              className="absolute inset-0 aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-b from-primary/20 to-primary/10"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(90deg) translateZ(${boxDepth / 2}px)`,
                transformOrigin: "top",
              }}
            />

            {/* Right Side Face */}
            <div
              className="absolute top-0 right-0 h-full bg-gradient-to-r from-primary/15 to-primary/5"
              style={{
                transformStyle: "preserve-3d",
                width: `${boxDepth}px`,
                transform: isEven
                  ? `rotateY(90deg) translateZ(calc(100% - ${boxDepth / 2}px))`
                  : `rotateY(-90deg) translateZ(${boxDepth / 2}px)`,
                transformOrigin: isEven ? "right" : "left",
              }}
            />

            {/* Left Side Face */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-l from-primary/15 to-primary/5"
              style={{
                transformStyle: "preserve-3d",
                width: `${boxDepth}px`,
                transform: isEven
                  ? `rotateY(-90deg) translateZ(${boxDepth / 2}px)`
                  : `rotateY(90deg) translateZ(calc(100% - ${boxDepth / 2}px))`,
                transformOrigin: isEven ? "left" : "right",
              }}
            />

            {/* Bottom Face */}
            <div
              className="absolute inset-0 aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-t from-muted to-muted/50"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(-90deg) translateZ(calc(100% - ${boxDepth / 2}px))`,
                transformOrigin: "bottom",
              }}
            />
          </div>

          {/* Glow Effect on Hover */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/0 via-purple-500/10 to-pink-500/0 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
        </motion.div>
      </motion.div>
    </div>
  );
}
