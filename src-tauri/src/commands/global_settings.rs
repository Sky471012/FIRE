use tauri::State;

use crate::utils::global_settings::{GlobalSettings, WindowState};

use super::state::AppState;

// Global Settings Commands

#[tauri::command]
pub fn get_global_settings(state: State<AppState>) -> Result<GlobalSettings, String> {
    let settings = state
        .global_settings
        .lock()
        .map_err(|e| format!("Failed to lock global settings: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
pub fn get_window_state(state: State<AppState>, label: String) -> Result<WindowState, String> {
    let settings = state
        .global_settings
        .lock()
        .map_err(|e| format!("Failed to lock global settings: {}", e))?;
    Ok(settings.get_window_state(&label))
}

#[tauri::command]
pub fn save_window_state(
    state: State<AppState>,
    label: String,
    window_state: WindowState,
) -> Result<(), String> {
    let mut settings = state
        .global_settings
        .lock()
        .map_err(|e| format!("Failed to lock global settings: {}", e))?;

    settings.update_window_state(label, window_state);

    settings
        .save()
        .map_err(|e| format!("Failed to save global settings: {}", e))
}

#[tauri::command]
pub fn remove_window_state(state: State<AppState>, label: String) -> Result<(), String> {
    let mut settings = state
        .global_settings
        .lock()
        .map_err(|e| format!("Failed to lock global settings: {}", e))?;

    settings.remove_window_state(&label);

    settings
        .save()
        .map_err(|e| format!("Failed to save global settings: {}", e))
}

