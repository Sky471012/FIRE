"use client";

import { Clock, Cpu, HardDrive, Moon, Signal, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function StatusBar() {
	const [time, setTime] = useState<string>("");
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const updateTime = () => {
			setTime(new Date().toLocaleTimeString());
		};
		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<div className="h-6 bg-muted/30 border-t border-border flex items-center justify-between px-3 text-xs">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<Signal className="h-3 w-3" />
					<span>Connected</span>
				</div>
				<div className="h-3 w-px bg-border" />
				<span className="text-muted-foreground">Ready</span>
			</div>

			<div className="flex items-center gap-3 text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<Cpu className="h-3 w-3" />
					<span>CPU: 12%</span>
				</div>
				<div className="h-3 w-px bg-border" />
				<div className="flex items-center gap-1.5">
					<HardDrive className="h-3 w-3" />
					<span>2.4 GB</span>
				</div>
				<div className="h-3 w-px bg-border" />
				<div className="flex items-center gap-1.5">
					<Clock className="h-3 w-3" />
					<span>{time}</span>
				</div>
				<div className="h-3 w-px bg-border" />
				<button
					type="button"
					onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
					className="h-5 w-5 flex items-center justify-center hover:bg-accent rounded transition-colors"
					aria-label="Toggle theme"
				>
					{theme === "dark" ? (
						<Sun className="h-3 w-3" />
					) : (
						<Moon className="h-3 w-3" />
					)}
				</button>
			</div>
		</div>
	);
}
