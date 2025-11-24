import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted py-12">
      <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <span className="text-xl font-bold tracking-tight">FIRE</span>
          <p className="text-sm text-muted-foreground">
            Fast Integrated Research Environment
          </p>
        </div>

        <div className="flex gap-6">
          <Link href="https://gitlab.com/DilicalFlame/FIRE" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            <Github className="h-5 w-5" />
            <span className="sr-only">GitLab</span>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FIRE Project. MIT License.
        </p>
      </div>
    </footer>
  );
}
