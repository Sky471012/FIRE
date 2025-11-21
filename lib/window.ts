/**
 * Window Management Utilities
 *
 * This module provides utilities for creating and managing child dialog windows
 * in the Tauri application.
 */

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface ChildWindowOptions {
	/** Unique identifier for the window */
	label: string;
	/** Window title */
	title: string;
	/** URL to load in the window (dev: http://localhost:3000/path, prod: /path) */
	url: string;
	/** Window width in pixels */
	width?: number;
	/** Window height in pixels */
	height?: number;
	/** Parent window label (defaults to current window) */
	parentLabel?: string;
}

/**
 * Creates a modal child dialog window
 *
 * The child window will:
 * - Lock the parent window (modal behavior)
 * - Have only a close button (no minimize/maximize)
 * - Move with the parent when minimized/maximized
 * - Be hidden from the taskbar
 *
 * @param options - Configuration for the child window
 * @returns Promise that resolves when the window is created
 *
 * @example
 * ```typescript
 * // Open settings dialog
 * await createChildWindow({
 *   label: 'settings',
 *   title: 'Settings',
 *   url: '/settings',
 *   width: 600,
 *   height: 400
 * });
 * ```
 */
export async function createChildWindow(options: ChildWindowOptions): Promise<void> {
	const {
		label,
		title,
		url,
		width = 600,
		height = 400,
		parentLabel,
	} = options;

	const parent = parentLabel || getCurrentWindow().label;

	// Determine the full URL based on environment
	const isDev = process.env.NODE_ENV === "development";
	const fullUrl = isDev
		? `http://localhost:3000${url.startsWith("/") ? url : `/${url}`}`
		: url.startsWith("/") ? url : `/${url}`;

	await invoke("create_child_window", {
		parentLabel: parent,
		label,
		title,
		url: fullUrl,
		width,
		height,
	});
}

/**
 * Closes a child window and re-enables its parent
 *
 * @param label - The label of the child window to close
 * @param parentLabel - The label of the parent window (defaults to current window)
 * @returns Promise that resolves when the window is closed
 */
export async function closeChildWindow(
	label: string,
	parentLabel?: string,
): Promise<void> {
	const parent = parentLabel || getCurrentWindow().label;

	await invoke("close_child_window", {
		parentLabel: parent,
		label,
	});
}

/**
 * Checks if a window exists
 *
 * @param label - The label of the window to check
 * @returns Promise that resolves to true if the window exists, false otherwise
 */
export async function windowExists(label: string): Promise<boolean> {
	return await invoke("window_exists", { label });
}

/**
 * Opens the settings dialog window
 *
 * @returns Promise that resolves when the window is created
 */
export async function openSettingsDialog(): Promise<void> {
	return createChildWindow({
		label: "settings",
		title: "Settings",
		url: "/settings",
		width: 700,
		height: 500,
	});
}

/**
 * Opens a preferences dialog window
 *
 * @returns Promise that resolves when the window is created
 */
export async function openPreferencesDialog(): Promise<void> {
	return createChildWindow({
		label: "preferences",
		title: "Preferences",
		url: "/preferences",
		width: 600,
		height: 450,
	});
}

/**
 * Hook for closing the current window (useful in child windows)
 *
 * @example
 * ```typescript
 * import { closeCurrentWindow } from '@/lib/window';
 *
 * function SettingsDialog() {
 *   const handleClose = async () => {
 *     await closeCurrentWindow();
 *   };
 *
 *   return <button onClick={handleClose}>Close</button>;
 * }
 * ```
 */
export async function closeCurrentWindow(): Promise<void> {
	const currentWindow = getCurrentWindow();
	await currentWindow.close();
}

