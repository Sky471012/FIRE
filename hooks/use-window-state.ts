"use client";

import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowState } from "@/types/window-state";

const DEBOUNCE_DELAY = 500; // 500ms debounce

/**
 * Hook to manage window state persistence with debouncing
 * @param windowLabel The label of the window (e.g., "main", "settings")
 */
export function useWindowState(windowLabel: string) {
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const pendingStateRef = useRef<Partial<WindowState> | null>(null);
	const initializedRef = useRef(false);

	// Load initial window state
	useEffect(() => {
		if (initializedRef.current) return;
		initializedRef.current = true;

		async function loadWindowState() {
			try {
				const state = await invoke<WindowState>("get_window_state", {
					label: windowLabel,
				});

				// State is already applied in Rust setup for main window
				// For other windows, you might want to apply it here
				console.log(`Loaded window state for ${windowLabel}:`, state);
			} catch (error) {
				console.error(`Failed to load window state for ${windowLabel}:`, error);
			}
		}

		loadWindowState();
	}, [windowLabel]);

	// Debounced save function
	const saveWindowState = useCallback(
		async (state: Partial<WindowState>) => {
			// Merge with pending state
			pendingStateRef.current = {
				...pendingStateRef.current,
				...state,
			};

			// Clear existing timeout
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// Set new timeout
			saveTimeoutRef.current = setTimeout(async () => {
				if (!pendingStateRef.current) return;

				try {
					// Get current complete state
					const currentState = await invoke<WindowState>("get_window_state", {
						label: windowLabel,
					});

					// Merge with pending changes
					const updatedState = {
						...currentState,
						...pendingStateRef.current,
					};

					await invoke("save_window_state", {
						label: windowLabel,
						windowState: updatedState,
					});

					console.log(`Saved window state for ${windowLabel}`);
					pendingStateRef.current = null;
				} catch (error) {
					console.error(`Failed to save window state for ${windowLabel}:`, error);
				}
			}, DEBOUNCE_DELAY);
		},
		[windowLabel]
	);

	// Listen to window events
	useEffect(() => {
		const window = getCurrentWindow();
		let unlistenResize: (() => void) | undefined;
		let unlistenMove: (() => void) | undefined;

		async function setupListeners() {
			try {
				// Listen to resize events
				unlistenResize = await window.onResized(async (event) => {
					const { width, height } = event.payload;

					// Also check if window is maximized when resized
					const isMaximized = await window.isMaximized();

					await saveWindowState({
						width: Math.round(width),
						height: Math.round(height),
						maximized: isMaximized,
					});
				});

				// Listen to move events
				unlistenMove = await window.onMoved(async (event) => {
					const { x, y } = event.payload;
					await saveWindowState({
						pos_x: Math.round(x),
						pos_y: Math.round(y),
					});
				});
			} catch (error) {
				console.error("Failed to setup window event listeners:", error);
			}
		}

		setupListeners();

		return () => {
			if (unlistenResize) unlistenResize();
			if (unlistenMove) unlistenMove();
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [saveWindowState]);

	// Save maximized state
	const saveMaximizedState = useCallback(
		async (maximized: boolean) => {
			await saveWindowState({ maximized });
		},
		[saveWindowState]
	);

	// Save theme
	const saveTheme = useCallback(
		async (theme: string) => {
			await saveWindowState({ theme });
		},
		[saveWindowState]
	);

	return {
		saveMaximizedState,
		saveTheme,
	};
}

