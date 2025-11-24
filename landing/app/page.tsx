import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { ParallaxShowcase } from "@/components/ParallaxShowcase";
import { CTASection } from "@/components/CTASection";
import { GitLabShowcase } from "@/components/GitLabShowcase";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <Hero />
      <ParallaxShowcase />
      <Features />
      <GitLabShowcase />
      <CTASection />
      <Footer />
    </main>
  );
}
