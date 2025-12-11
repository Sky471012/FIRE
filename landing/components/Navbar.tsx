"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b navbar-bg backdrop-blur-md"
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/icon.png"
            alt="FIRE Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-bold tracking-tight">FIRE</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#docs"
            className="text-sm text-muted-foreground transition-colors hover:text-white"
          >
            Documentation
          </Link>
          <Link
            href="https://gitlab.com/DilicalFlame/FIRE"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white"
          >
            <Github className="h-4 w-4" />
            GitLab
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="https://gitlab.com/DilicalFlame/FIRE"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
