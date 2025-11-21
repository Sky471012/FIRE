use tauri::State;

use super::state::AppState;

// Recent Projects Commands

#[tauri::command]
pub fn get_recent_projects(
    state: State<AppState>,
) -> Result<Vec<crate::utils::recent_projects::RecentProject>, String> {
    let recent = state
        .recent_projects
        .lock()
        .map_err(|e| format!("Failed to lock recent projects: {}", e))?;
    Ok(recent.get_projects().to_vec())
}

#[tauri::command]
pub fn add_recent_project(state: State<AppState>, path: String) -> Result<(), String> {
    let mut recent = state
        .recent_projects
        .lock()
        .map_err(|e| format!("Failed to lock recent projects: {}", e))?;

    recent.add_project(path);

    recent
        .save()
        .map_err(|e| format!("Failed to save recent projects: {}", e))
}

#[tauri::command]
pub fn remove_recent_project(state: State<AppState>, path: String) -> Result<(), String> {
    let mut recent = state
        .recent_projects
        .lock()
        .map_err(|e| format!("Failed to lock recent projects: {}", e))?;

    recent.remove_project(&path);

    recent
        .save()
        .map_err(|e| format!("Failed to save recent projects: {}", e))
}

#[tauri::command]
pub fn clear_recent_projects(state: State<AppState>) -> Result<(), String> {
    let mut recent = state
        .recent_projects
        .lock()
        .map_err(|e| format!("Failed to lock recent projects: {}", e))?;

    recent.clear();

    recent
        .save()
        .map_err(|e| format!("Failed to save recent projects: {}", e))
}

// Project Management Commands

#[tauri::command]
pub fn is_directory_empty(path: String) -> Result<bool, String> {
    use std::fs;

    let path = std::path::Path::new(&path);

    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    // Check if directory has any entries
    Ok(entries.count() == 0)
}

#[tauri::command]
pub fn initialize_project(path: String, app_version: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    let project_path = Path::new(&path);

    // Verify directory exists and is empty
    if !project_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !project_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let entries =
        fs::read_dir(project_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    if entries.count() > 0 {
        return Err("Directory is not empty".to_string());
    }

    // Create data folder
    let data_folder = project_path.join("data");
    fs::create_dir(&data_folder).map_err(|e| format!("Failed to create data folder: {}", e))?;

    // Extract folder name for project name
    let project_name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled Project")
        .to_string();

    // Create project.toml file
    let toml_content = format!(
        r#"# FIRE Project Configuration

[project]
name = "{}"
version = "{}"
"#,
        project_name, app_version
    );

    let toml_path = project_path.join("project.toml");
    fs::write(&toml_path, toml_content)
        .map_err(|e| format!("Failed to create project.toml: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn is_valid_project(path: String) -> Result<bool, String> {
    use std::path::Path;

    let project_path = Path::new(&path);

    if !project_path.exists() || !project_path.is_dir() {
        return Ok(false);
    }

    // Check if project.toml exists
    let toml_path = project_path.join("project.toml");
    Ok(toml_path.exists() && toml_path.is_file())
}

#[tauri::command]
pub fn get_project_name(path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let project_path = Path::new(&path);

    if !project_path.exists() || !project_path.is_dir() {
        return Err("Project directory does not exist".to_string());
    }

    let toml_path = project_path.join("project.toml");

    if !toml_path.exists() {
        return Err("project.toml not found".to_string());
    }

    // Read and parse the TOML file
    let toml_content = fs::read_to_string(&toml_path)
        .map_err(|e| format!("Failed to read project.toml: {}", e))?;

    let toml_value: toml::Value = toml::from_str(&toml_content)
        .map_err(|e| format!("Failed to parse project.toml: {}", e))?;

    // Extract project name
    let project_name = toml_value
        .get("project")
        .and_then(|p| p.get("name"))
        .and_then(|n| n.as_str())
        .ok_or_else(|| "Project name not found in project.toml".to_string())?
        .to_string();

    Ok(project_name)
}

#[tauri::command]
pub fn get_current_project_path(state: State<AppState>) -> Result<Option<String>, String> {
    let workspace = state
        .workspace
        .lock()
        .map_err(|e| format!("Failed to lock workspace: {}", e))?;
    Ok(workspace.last_open_project_path.clone())
}

#[allow(dead_code)]
#[tauri::command]
pub fn set_current_project_path(
    state: State<AppState>,
    path: Option<String>,
) -> Result<(), String> {
    let mut workspace = state
        .workspace
        .lock()
        .map_err(|e| format!("Failed to lock workspace: {}", e))?;

    workspace.last_open_project_path = path;

    workspace
        .save()
        .map_err(|e| format!("Failed to save workspace: {}", e))
}
