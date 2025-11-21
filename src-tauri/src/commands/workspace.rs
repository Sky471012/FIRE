use tauri::State;

use crate::utils::workspace::WorkspaceState;

use super::state::AppState;

// Workspace Commands (Legacy - kept for backwards compatibility)

#[tauri::command]
pub fn get_workspace_state(state: State<AppState>) -> Result<WorkspaceState, String> {
    let workspace = state
        .workspace
        .lock()
        .map_err(|e| format!("Failed to lock workspace: {}", e))?;
    Ok(workspace.clone())
}

#[tauri::command]
pub fn save_workspace_state(
    state: State<AppState>,
    workspace: WorkspaceState,
) -> Result<(), String> {
    let mut current_workspace = state
        .workspace
        .lock()
        .map_err(|e| format!("Failed to lock workspace: {}", e))?;

    *current_workspace = workspace.clone();

    current_workspace
        .save()
        .map_err(|e| format!("Failed to save workspace: {}", e))
}

// Project-Based Workspace Commands

#[tauri::command]
pub fn get_project_workspace_state(state: State<AppState>) -> Result<WorkspaceState, String> {
    let workspace_lock = state
        .workspace
        .lock()
        .map_err(|e| format!("Failed to lock workspace: {}", e))?;

    let project_path = workspace_lock.last_open_project_path.clone();
    drop(workspace_lock); // Release lock before potentially loading from disk

    if let Some(path) = project_path {
        // Load workspace state from the project's project.toml
        WorkspaceState::load_from_project(&path)
            .map_err(|e| format!("Failed to load project workspace: {}", e))
    } else {
        // No project loaded, return default workspace
        Ok(WorkspaceState::default())
    }
}

#[tauri::command]
pub fn save_project_workspace_state(
    state: State<AppState>,
    workspace: WorkspaceState,
) -> Result<(), String> {
    let workspace_lock = state
        .workspace
        .lock()
        .map_err(|e| format!("Failed to lock workspace: {}", e))?;

    let project_path = workspace_lock.last_open_project_path.clone();
    drop(workspace_lock); // Release lock before saving

    if let Some(path) = project_path {
        // Save workspace state to the project's project.toml
        workspace
            .save_to_project(&path)
            .map_err(|e| format!("Failed to save project workspace: {}", e))?;

        // Also update in-memory state
        let mut current_workspace = state
            .workspace
            .lock()
            .map_err(|e| format!("Failed to lock workspace: {}", e))?;
        *current_workspace = workspace;

        Ok(())
    } else {
        Err("No project loaded, cannot save workspace state".to_string())
    }
}

#[tauri::command]
pub fn save_workspace_to_project_path(
    project_path: String,
    workspace: WorkspaceState,
) -> Result<(), String> {
    // Save workspace state to a specific project's project.toml
    workspace
        .save_to_project(&project_path)
        .map_err(|e| format!("Failed to save workspace to project: {}", e))
}
