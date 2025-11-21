/**
 * Window State Management Example
 * 
 * This demonstrates how the global window state management system works.
 * 
 * Key Features:
 * 1. Each window (main, settings, demo-dialog) has its own state saved to ~/.fire/global_settings.toml
 * 2. Window state includes: theme, position (x, y), size (width, height), and maximized state
 * 3. State is debounced (500ms) to avoid excessive disk writes
 * 4. Windows start invisible and become visible after settings are applied
 * 5. Child windows don't have a maximized property
 * 
 * File Structure:
 * ~/.fire/global_settings.toml
 * 
 * Example Contents:
 * [window.main]
 * theme = "system"
 * maximized = true
 * width = 1200
 * height = 800
 * pos_x = 100
 * pos_y = 100
 * 
 * [window.settings]
 * theme = "system"
 * width = 600
 * height = 400
 * pos_x = 300
 * pos_y = 200
 * 
 * Usage in Layouts:
 * ```tsx
 * import { useWindowState } from "@/hooks/use-window-state";
 * 
 * function MyLayout() {
 *   // This automatically loads and saves window state
 *   useWindowState("main"); // or "settings", "demo-dialog", etc.
 *   
 *   return <div>Your content</div>;
 * }
 * ```
 * 
 * Tauri Commands Available:
 * - get_window_state(label: string): Promise<WindowState>
 * - save_window_state(label: string, state: WindowState): Promise<void>
 * - remove_window_state(label: string): Promise<void>
 * - get_global_settings(): Promise<GlobalSettings>
 */

export {};

