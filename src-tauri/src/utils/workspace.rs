use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;

use super::utils::{get_gaia_dir, read_config_file, write_config_file};

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
    #[serde(rename = "type")]
    pub tab_type: String, // "map_view", "chart_view", "simulation_view", "notes_view", "chat_view", "file_editor"
    pub id: String,
    pub title: String,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
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
    /// Get the path to the legacy global workspace state file (deprecated)
    fn get_legacy_path() -> Result<PathBuf> {
        let gaia_dir = get_gaia_dir()?;
        Ok(gaia_dir.join("workspace.json"))
    }

    /// Load workspace state from disk (legacy global method), or return defaults if file doesn't exist
    pub fn load() -> Self {
        match Self::try_load_legacy() {
            Ok(state) => {
                state
            }
            Err(e) => {
                Self::default()
            }
        }
    }

    /// Try to load workspace state from legacy global file, returning an error if it fails
    fn try_load_legacy() -> Result<Self> {
        let path = Self::get_legacy_path()?;

        if !path.exists() {
            return Ok(Self::default());
        }

        let contents = read_config_file(&path)?;
        let state: WorkspaceState = serde_json::from_str(&contents)
            .context("Failed to parse workspace.json")?;

        Ok(state)
    }

    /// Save workspace state to disk (legacy global method)
    pub fn save(&self) -> Result<()> {
        let path = Self::get_legacy_path()?;
        let contents = serde_json::to_string_pretty(self)
            .context("Failed to serialize workspace state")?;

        write_config_file(&path, &contents)?;

        Ok(())
    }

    /// Load workspace state from a specific project's project.toml
    pub fn load_from_project(project_path: &str) -> Result<Self> {
        let project_dir = Path::new(project_path);
        let toml_path = project_dir.join("project.toml");

        if !toml_path.exists() {
            return Ok(Self::default());
        }

        let toml_content = fs::read_to_string(&toml_path)
            .context("Failed to read project.toml")?;

        let toml_value: toml::Table = toml::from_str(&toml_content)
            .context("Failed to parse project.toml")?;

        // Extract workspace section if it exists
        if let Some(workspace_value) = toml_value.get("workspace") {
            // Convert TOML value to JSON then to WorkspaceState
            let json_value = toml_to_json_value(workspace_value);
            let workspace: WorkspaceState = serde_json::from_value(json_value)
                .context("Failed to deserialize workspace from project.toml")?;

            Ok(workspace)
        } else {
            Ok(Self::default())
        }
    }

    /// Save workspace state to a specific project's project.toml
    pub fn save_to_project(&self, project_path: &str) -> Result<()> {
        let project_dir = Path::new(project_path);
        let toml_path = project_dir.join("project.toml");

        if !toml_path.exists() {
            return Err(anyhow::anyhow!("project.toml not found for project: {}", project_path));
        }

        let toml_content = fs::read_to_string(&toml_path)
            .context("Failed to read project.toml")?;

        let mut toml_value: toml::Table = toml::from_str(&toml_content)
            .context("Failed to parse project.toml")?;

        // Convert workspace state to TOML value
        let json_value = serde_json::to_value(self)
            .context("Failed to serialize workspace state")?;
        let workspace_toml = json_to_toml_value(json_value)
            .context("Failed to convert workspace to TOML")?;

        // Update or insert workspace section
        toml_value.insert("workspace".to_string(), workspace_toml);

        // Write back to file
        let updated_content = toml::to_string_pretty(&toml_value)
            .context("Failed to serialize TOML")?;

        fs::write(&toml_path, updated_content)
            .context("Failed to write project.toml")?;

        Ok(())
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

