use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraState {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub target_x: f64,
    pub target_y: f64,
    pub target_z: f64,
    pub zoom: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabState {
    pub id: String,
    pub title: String,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tab_type: Option<String>, // "file", "view", "welcome"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(rename = "isDirty", skip_serializing_if = "Option::is_none")]
    pub is_dirty: Option<bool>,
    #[serde(rename = "isPinned", skip_serializing_if = "Option::is_none")]
    pub is_pinned: Option<bool>,
    #[serde(rename = "filePath", skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    #[serde(rename = "isBinary", skip_serializing_if = "Option::is_none")]
    pub is_binary: Option<bool>,
    #[serde(rename = "viewId", skip_serializing_if = "Option::is_none")]
    pub view_id: Option<String>,
    // Legacy fields for backwards compatibility
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dataset_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_layers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub camera_state: Option<CameraState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub simulation_params: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat_history_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceState {
    pub last_open_project_path: Option<String>,
    pub open_tabs: Vec<TabState>,
    pub active_tab_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub panel_layout_state: Option<HashMap<String, serde_json::Value>>,
    pub sidebar_collapsed: bool,
}

impl Default for WorkspaceState {
    fn default() -> Self {
        Self {
            last_open_project_path: None,
            open_tabs: Vec::new(),
            active_tab_id: None,
            panel_layout_state: None,
            sidebar_collapsed: false,
        }
    }
}

impl WorkspaceState {
    /// Load workspace state from a specific project's FIRE.toml
    pub fn load_from_project(project_path: &str) -> Result<Self> {
        let project_dir = Path::new(project_path);
        let toml_path = project_dir.join("FIRE.toml");

        if !toml_path.exists() {
            return Ok(Self::default());
        }

        let toml_content = fs::read_to_string(&toml_path)
            .context("Failed to read FIRE.toml")?;

        let toml_value: toml::Table = toml::from_str(&toml_content)
            .context("Failed to parse FIRE.toml")?;

        // Extract workspace section if it exists
        if let Some(workspace_value) = toml_value.get("workspace") {
            // Convert TOML value to JSON then to WorkspaceState
            let json_value = toml_to_json_value(workspace_value);
            let mut workspace: WorkspaceState = serde_json::from_value(json_value)
                .context("Failed to deserialize workspace from FIRE.toml")?;

            // Always set the last_open_project_path to the current project path
            workspace.last_open_project_path = Some(project_path.to_string());

            Ok(workspace)
        } else {
            // Return default workspace with the project path set
            let mut workspace = Self::default();
            workspace.last_open_project_path = Some(project_path.to_string());
            Ok(workspace)
        }
    }

    /// Save workspace state to a specific project's FIRE.toml
    pub fn save_to_project(&self, project_path: &str) -> Result<()> {
        let project_dir = Path::new(project_path);
        let toml_path = project_dir.join("FIRE.toml");

        if !toml_path.exists() {
            return Err(anyhow::anyhow!("FIRE.toml not found for project: {}", project_path));
        }

        let toml_content = fs::read_to_string(&toml_path)
            .context("Failed to read FIRE.toml")?;

        let mut toml_value: toml::Table = toml::from_str(&toml_content)
            .context("Failed to parse FIRE.toml")?;

        // Create a clone without the last_open_project_path field (we don't want to save this)
        let mut workspace_to_save = self.clone();
        workspace_to_save.last_open_project_path = None;

        // Convert workspace state to TOML value
        let json_value = serde_json::to_value(&workspace_to_save)
            .context("Failed to serialize workspace state")?;
        let workspace_toml = json_to_toml_value(json_value)
            .context("Failed to convert workspace to TOML")?;

        // Update or insert workspace section
        toml_value.insert("workspace".to_string(), workspace_toml);

        // Write back to file
        let updated_content = toml::to_string_pretty(&toml_value)
            .context("Failed to serialize TOML")?;

        fs::write(&toml_path, updated_content)
            .context("Failed to write FIRE.toml")?;

        Ok(())
    }

    /// Load initial workspace state - tries to load from last opened project if available
    pub fn load_initial() -> Self {
        // Try to load recent projects to find the last opened project
        use super::recent_projects::RecentProjects;
        
        let recent_projects = RecentProjects::load();
        let projects = recent_projects.get_projects();
        
        if let Some(last_project) = projects.first() {
            // Try to load workspace from the last opened project
            match Self::load_from_project(&last_project.path) {
                Ok(workspace) => {
                    return workspace;
                }
                Err(e) => {
                    eprintln!("Failed to load workspace from last project: {}", e);
                }
            }
        }
        
        // Return default if no recent projects or loading failed
        Self::default()
    }
}

/// Helper function to convert TOML value to JSON value
fn toml_to_json_value(toml_val: &toml::Value) -> serde_json::Value {
    match toml_val {
        toml::Value::String(s) => serde_json::Value::String(s.clone()),
        toml::Value::Integer(i) => serde_json::Value::Number((*i).into()),
        toml::Value::Float(f) => serde_json::Number::from_f64(*f)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        toml::Value::Boolean(b) => serde_json::Value::Bool(*b),
        toml::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(toml_to_json_value).collect())
        }
        toml::Value::Table(table) => {
            let mut map = serde_json::Map::new();
            for (k, v) in table {
                map.insert(k.clone(), toml_to_json_value(v));
            }
            serde_json::Value::Object(map)
        }
        toml::Value::Datetime(dt) => serde_json::Value::String(dt.to_string()),
    }
}

/// Helper function to convert JSON value to TOML value
fn json_to_toml_value(json_val: serde_json::Value) -> Result<toml::Value> {
    match json_val {
        serde_json::Value::String(s) => Ok(toml::Value::String(s)),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(toml::Value::Integer(i))
            } else if let Some(f) = n.as_f64() {
                Ok(toml::Value::Float(f))
            } else {
                Err(anyhow::anyhow!("Invalid number"))
            }
        }
        serde_json::Value::Bool(b) => Ok(toml::Value::Boolean(b)),
        serde_json::Value::Array(arr) => {
            let toml_arr: Result<Vec<toml::Value>> = arr.into_iter()
                .map(json_to_toml_value)
                .collect();
            Ok(toml::Value::Array(toml_arr?))
        }
        serde_json::Value::Object(obj) => {
            let mut table = toml::Table::new();
            for (k, v) in obj {
                table.insert(k, json_to_toml_value(v)?);
            }
            Ok(toml::Value::Table(table))
        }
        serde_json::Value::Null => Ok(toml::Value::String(String::new())),
    }
}

