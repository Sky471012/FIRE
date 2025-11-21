/**
 * TypeScript types for window state management
 */

export interface WindowState {
	theme: string;
	maximized?: boolean;
	width: number;
	height: number;
	pos_x: number;
	pos_y: number;
}

export interface GlobalSettings {
	[key: string]: WindowState;
}

/**
 * Window labels used in the application
 */
export const WINDOW_LABELS = {
	MAIN: "main",
	SETTINGS: "settings",
	DEMO_DIALOG: "demo-dialog",
} as const;

export type WindowLabel = (typeof WINDOW_LABELS)[keyof typeof WINDOW_LABELS];

