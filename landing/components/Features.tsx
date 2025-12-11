"use client";

import { FeatureShowcase } from "./FeatureShowcase";

const features = [
  {
    title: "Hybrid Rust + Python Architecture",
    description:
      "Experience blazing-fast performance with Rust's system-level efficiency combined with Python's rich ecosystem for AI and data science. Our unique architecture handles heavy scientific datasets close to the metal while leveraging powerful libraries for analysis and visualization.",
    imageSrc: "/images/architecture.png",
  },
  {
    title: "Agentic AI Workflow",
    description:
      "Powered by LangGraph, our AI agent doesn't just answer questions—it reasons cyclically, plans complex analyses, and autonomously generates dynamic visualizations. It inspects data schemas before querying to prevent hallucinations and intelligently routes between SQL and semantic search.",
    imageSrc: "/images/user-flow.png",
  },
  {
    title: "Scientific Data Native",
    description:
      "Out-of-the-box support for formats often ignored by standard BI tools. Native Rust implementations for high-performance ingestion of NetCDF climate data, optimized Parquet loading, and seamless Excel integration. Your data, your way.",
    imageSrc: "/images/local-data-load.png",
  },
  {
    title: "Dynamic 3D Visualization",
    description:
      "Transform your data into stunning interactive 3D globes, scatter plots, and charts rendered directly in the chat interface. Our AI agent generates SQL to fetch geospatial coordinates and renders them instantly using react-globe.gl and ECharts.",
    imageSrc: "/images/3d-globe.png",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Built for Modern{" "}
            <span className="text-gradient">Scientific Research</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            FIRE bridges the gap between raw data, documentation, and analysis
            tools.
          </p>
        </div>

        <div className="space-y-32">
          {features.map((feature, index) => (
            <FeatureShowcase
              key={feature.title}
              title={feature.title}
              description={feature.description}
              imageSrc={feature.imageSrc}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
