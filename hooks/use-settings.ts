"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export interface GeneralSettings {
	user_name: string;
}

export interface AppearanceSettings {
	theme: string;
	font_size: number;
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
			setLoading(true);
			setError(null);
			const result = await invoke<GlobalSettings>("get_global_settings");
			setSettings(result);
		} catch (err) {
			console.error("Failed to load settings:", err);
			setError(err instanceof Error ? err.message : "Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, []);

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
		async (theme: string, fontSize: number) => {
			try {
				await invoke("update_appearance_settings", { theme, fontSize });
				// Update local state
				setSettings((prev) =>
					prev
						? {
								...prev,
								appearance: { theme, font_size: fontSize },
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

