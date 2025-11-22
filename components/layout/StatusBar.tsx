"use client";

import { invoke } from "@tauri-apps/api/core";
import { Clock, Cpu, HardDrive, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";

interface SystemStats {
	cpu_usage: number;
	ram_used_gb: number;
	ram_total_gb: number;
}

export function StatusBar() {
	const [time, setTime] = useState<string>("");
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [systemStats, setSystemStats] = useState<SystemStats>({
		cpu_usage: 0,
		ram_used_gb: 0,
		ram_total_gb: 0,
	});
	const { settings, loading, loadSettings } = useSettings();

	useEffect(() => {
		setMounted(true);
		const updateTime = () => {
			setTime(new Date().toLocaleTimeString());
		};
		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	}, []);

	// Poll for settings changes every 1 second to detect external changes to global_settings.toml
	useEffect(() => {
		const pollInterval = setInterval(() => {
			loadSettings();
		}, 1000);

		return () => clearInterval(pollInterval);
	}, [loadSettings]);

	useEffect(() => {
		// Don't fetch stats if status bar is hidden
		if (!settings?.appearance.show_status_bar) {
			return;
		}

		const fetchSystemStats = async () => {
			try {
				const stats = await invoke<SystemStats>("get_system_stats");
				setSystemStats(stats);
			} catch (error) {
				console.error("Failed to fetch system stats:", error);
			}
		};

		// Initial fetch
		fetchSystemStats();

		// Set up interval based on settings (default 2000ms)
		const refreshInterval = settings?.appearance.status_bar_refresh_ms || 2000;
		const interval = setInterval(fetchSystemStats, refreshInterval);

		return () => clearInterval(interval);
	}, [
		settings?.appearance.status_bar_refresh_ms,
		settings?.appearance.show_status_bar,
	]);

	// Don't render anything until mounted and settings are loaded
	if (!mounted || loading) {
		return null;
	}

	// Hide status bar if setting is explicitly false
	if (settings && !settings.appearance.show_status_bar) {
		return null;
	}

	return (
		<div className="h-6 bg-muted/30 border-t border-border flex items-center justify-end px-3 text-xs">
			<div className="flex items-center gap-3 text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<Cpu className="h-3 w-3" />
					<span>CPU: {systemStats.cpu_usage.toFixed(1)}%</span>
				</div>
				<div className="h-3 w-px bg-border" />
				<div className="flex items-center gap-1.5">
					<HardDrive className="h-3 w-3" />
					<span>{systemStats.ram_used_gb.toFixed(1)} GB</span>
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
