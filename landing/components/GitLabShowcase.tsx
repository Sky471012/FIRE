"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  GitBranch,
  Rocket,
  MessageSquare,
  FileCode,
  Milestone,
} from "lucide-react";

const gitlabFeatures = [
  {
    icon: GitBranch,
    title: "Issue Boards & Project Management",
    description:
      "Kanban-style boards to track velocity and ensure nothing falls through the cracks during intense development.",
    imageSrc: "/images/gitlab_board.png",
  },
  {
    icon: Milestone,
    title: "Milestones & Planning",
    description:
      "Complex features like the LangGraph Agent tracked using GitLab Milestones for structured delivery.",
    imageSrc: "/images/Milestones.png",
  },
  {
    icon: Rocket,
    title: "CI/CD Pipelines",
    description:
      "Automated testing ensuring Rust builds don't break Python functionality, with intelligent caching for rapid iteration.",
    imageSrc: "/images/gitlab_pipeline.png",
  },
  {
    icon: MessageSquare,
    title: "Telegram ChatOps Integration",
    description:
      "Real-time notifications for every push, merge request, and pipeline status directly to our team channel.",
    imageSrc: "/images/telegram_chatops.png",
  },
  {
    icon: FileCode,
    title: "Code Snippets",
    description:
      "Shared code snippets for quick collaboration and knowledge sharing across the team.",
    imageSrc: "/images/Snippets.png",
  },
];

export function GitLabShowcase() {
  return (
    <section className="py-24 sm:py-32 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 mb-6">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187" />
            </svg>
            Built with GitLab DevOps
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6">
            Powered by <span className="text-gradient">GitLab Platform</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We leveraged the full power of GitLab to manage our intense
            development lifecycle during the hackathon.
          </p>
        </motion.div>

        <div className="space-y-24">
          {gitlabFeatures.map((feature, index) => {
            const isEven = index % 2 === 0;
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`flex flex-col gap-8 lg:flex-row lg:items-center ${isEven ? "" : "lg:flex-row-reverse"}`}
              >
                {/* Text Content */}
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-2">
                    <Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-semibold text-sm">
                      {feature.title}
                    </span>
                  </div>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Screenshot */}
                <div className="flex-1">
                  <div className="relative overflow-hidden rounded-xl border border-border card-bg shadow-xl">
                    <div className="relative aspect-video w-full">
                      <Image
                        src={feature.imageSrc}
                        alt={feature.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Built for the{" "}
            <a
              href="https://unstop.com/hackathons/i-hack-iit-bombay-1580510"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
            >
              GitLab IIT Bombay E-Summit '25 Hackathon
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
