use tauri::State;

use crate::utils::settings::Settings;

use super::state::AppState;

// Settings Commands

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: Settings) -> Result<(), String> {
    let mut current_settings = state
        .settings
        .lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;

    *current_settings = settings.clone();

    current_settings
        .save()
        .map_err(|e| format!("Failed to save settings: {}", e))
}

#[tauri::command]
pub fn update_window_settings(
    state: State<AppState>,
    window_settings: crate::utils::settings::WindowSettings,
) -> Result<(), String> {
    let mut settings = state
        .settings
        .lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;

    settings.update_window(window_settings);

    settings
        .save()
        .map_err(|e| format!("Failed to save settings: {}", e))
}
