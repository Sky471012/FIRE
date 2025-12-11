/**
 * Example: How to use the window state management system
 */

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { GlobalSettings, WindowState } from "@/types/window-state";

/**
 * Example 1: Get window state for current window
 */
export async function getMyWindowState() {
    const currentWindow = getCurrentWindow();
    const label = currentWindow.label;

    const state = await invoke<WindowState>("get_window_state", { label });
    console.log("Current window state:", state);

    return state;
}

/**
 * Example 2: Manually save window state
 */
export async function saveMyWindowState(newState: Partial<WindowState>) {
    const currentWindow = getCurrentWindow();
    const label = currentWindow.label;

    // Get current state first
    const currentState = await invoke<WindowState>("get_window_state", { label });

    // Merge with new state
    const updatedState: WindowState = {
        ...currentState,
        ...newState,
    };

    await invoke("save_window_state", {
        label,
        windowState: updatedState,
    });

    console.log("Saved window state:", updatedState);
}

/**
 * Example 3: Get all window states
 */
export async function getAllWindowStates() {
    const settings = await invoke<GlobalSettings>("get_global_settings");
    console.log("All window states:", settings);

    return settings;
}

/**
 * Example 4: Change theme for current window
 */
export async function changeWindowTheme(theme: "light" | "dark" | "system") {
    await saveMyWindowState({ theme });
}

/**
 * Example 5: Reset window to default position
 */
export async function resetWindowPosition() {
    await saveMyWindowState({
        width: 800,
        height: 600,
        pos_x: 100,
        pos_y: 100,
    });
}

/**
 * Example 6: Clean up window state when closing
 */
export async function cleanupWindowState(label: string) {
    await invoke("remove_window_state", { label });
    console.log(`Removed window state for: ${label}`);
}

/**
 * Example 7: Using in a React component
 */
/*
import { useWindowState } from "@/hooks/use-window-state";

export function MyComponent() {
	// This hook automatically handles all state management
	const { saveMaximizedState, saveTheme } = useWindowState("main");

	// Optionally save maximized state manually
	const handleMaximize = async () => {
		await saveMaximizedState(true);
	};

	// Optionally save theme manually
	const handleThemeChange = async (theme: string) => {
		await saveTheme(theme);
	};

	return (
		<div>
			<button onClick={handleMaximize}>Maximize</button>
			<button onClick={() => handleThemeChange("dark")}>Dark Theme</button>
		</div>
	);
}
*/

/**
 * Example 8: Monitor window state changes
 */
export async function monitorWindowChanges() {
    const window = getCurrentWindow();

    // Listen to resize
    const unlistenResize = await window.onResized((event) => {
        console.log("Window resized:", event.payload);
    });

    // Listen to move
    const unlistenMove = await window.onMoved((event) => {
        console.log("Window moved:", event.payload);
    });

    // Cleanup function
    return () => {
        unlistenResize();
        unlistenMove();
    };
}
