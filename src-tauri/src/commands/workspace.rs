use tauri::State;

use crate::utils::workspace::WorkspaceState;

use super::state::AppState;

// Workspace Commands - All operations now work with project-specific FIRE.toml

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
    // Use the project path from the workspace being saved (not the old in-memory one)
    let project_path = workspace.last_open_project_path.clone();

    if let Some(path) = project_path {
        // Save to the project's FIRE.toml
        workspace
            .save_to_project(&path)
            .map_err(|e| format!("Failed to save workspace to project: {}", e))?;

        // Update in-memory state
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

// Alias for backwards compatibility
#[tauri::command]
pub fn get_project_workspace_state(state: State<AppState>) -> Result<WorkspaceState, String> {
    get_workspace_state(state)
}

// Alias for backwards compatibility
#[tauri::command]
pub fn save_project_workspace_state(
    state: State<AppState>,
    workspace: WorkspaceState,
) -> Result<(), String> {
    save_workspace_state(state, workspace)
}

#[tauri::command]
pub fn save_workspace_to_project_path(
    project_path: String,
    workspace: WorkspaceState,
) -> Result<(), String> {
    // Save workspace state to a specific project's FIRE.toml
    workspace
        .save_to_project(&project_path)
        .map_err(|e| format!("Failed to save workspace to project: {}", e))
}
