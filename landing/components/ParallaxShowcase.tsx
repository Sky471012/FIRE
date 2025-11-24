"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function ParallaxShowcase() {
  const container = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const image1Ref = useRef<HTMLDivElement>(null);
  const image2Ref = useRef<HTMLDivElement>(null);
  const image3Ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      tl.to(textRef.current, { y: -100 }, 0);
      tl.to(image1Ref.current, { y: -150 }, 0);
      tl.to(image2Ref.current, { y: -50 }, 0);
      tl.to(image3Ref.current, { y: -200 }, 0);
    },
    { scope: container }
  );

  return (
    <section ref={container} className="relative min-h-screen overflow-hidden py-32">
      <div className="container relative z-10">
        <div ref={textRef} className="mb-24 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
            From Data to <span className="text-gradient">Insight</span>
          </h2>
          <p className="mt-6 text-xl text-muted-foreground">
            Experience the flow of scientific discovery with FIRE's integrated environment.
          </p>
        </div>

        <div className="relative h-[800px] w-full">
          {/* Image 1: Architecture (Left) */}
          <div
            ref={image1Ref}
            className="absolute left-0 top-20 w-2/3 max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-2xl backdrop-blur-sm md:left-10"
          >
            <div className="relative aspect-video w-full">
               <Image
                src="/images/architecture.png"
                alt="System Architecture"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Image 2: User Flow (Right) */}
          <div
            ref={image2Ref}
            className="absolute right-0 top-60 w-2/3 max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-2xl backdrop-blur-sm md:right-10"
          >
            <div className="relative aspect-video w-full">
               <Image
                src="/images/user-flow.png"
                alt="User Flow"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Image 3: Globe (Center Bottom) */}
          <div
            ref={image3Ref}
            className="absolute bottom-0 left-1/2 w-2/3 max-w-3xl -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-2xl backdrop-blur-sm"
          >
            <div className="relative aspect-video w-full">
               <Image
                src="/images/3d-globe.png"
                alt="3D Globe Visualization"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
