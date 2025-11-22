"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export interface GeneralSettings {
	user_name: string;
}

export interface AppearanceSettings {
	theme: string;
	font_size: number;
	show_status_bar: boolean;
	status_bar_refresh_ms: number;
}

export interface GlobalSettings {
	general: GeneralSettings;
	appearance: AppearanceSettings;
}

export function useSettings() {
	const [settings, setSettings] = useState<GlobalSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load settings on mount
	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = useCallback(async () => {
		try {
			// Don't show loading state when polling/refreshing
			const isInitialLoad = settings === null;
			if (isInitialLoad) {
				setLoading(true);
			}
			setError(null);
			const result = await invoke<GlobalSettings>("get_global_settings");
			setSettings(result);
		} catch (err) {
			console.error("Failed to load settings:", err);
			setError(err instanceof Error ? err.message : "Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [settings]);

	const updateGeneralSettings = useCallback(async (userName: string) => {
		try {
			await invoke("update_general_settings", { userName });
			// Update local state
			setSettings((prev) =>
				prev
					? {
							...prev,
							general: { ...prev.general, user_name: userName },
						}
					: null,
			);
		} catch (err) {
			console.error("Failed to update general settings:", err);
			throw err;
		}
	}, []);

	const updateAppearanceSettings = useCallback(
		async (
			theme: string,
			fontSize: number,
			showStatusBar: boolean,
			statusBarRefreshMs: number,
		) => {
			try {
				await invoke("update_appearance_settings", {
					theme,
					fontSize,
					showStatusBar,
					statusBarRefreshMs,
				});
				// Update local state
				setSettings((prev) =>
					prev
						? {
								...prev,
								appearance: {
									theme,
									font_size: fontSize,
									show_status_bar: showStatusBar,
									status_bar_refresh_ms: statusBarRefreshMs,
								},
							}
						: null,
				);
			} catch (err) {
				console.error("Failed to update appearance settings:", err);
				throw err;
			}
		},
		[],
	);

	return {
		settings,
		loading,
		error,
		loadSettings,
		updateGeneralSettings,
		updateAppearanceSettings,
	};
}

