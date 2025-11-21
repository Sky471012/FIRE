use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use super::utils::{get_fire_dir, read_config_file, write_config_file};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub theme: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maximized: Option<bool>,
    pub width: i32,
    pub height: i32,
    pub pos_x: i32,
    pub pos_y: i32,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            maximized: Some(false),
            width: 1200,
            height: 800,
            pos_x: 100,
            pos_y: 100,
        }
    }
}

impl WindowState {
    /// Create window state for main window
    pub fn main_default() -> Self {
        Self {
            theme: "system".to_string(),
            maximized: Some(false),
            width: 1200,
            height: 800,
            pos_x: 100,
            pos_y: 100,
        }
    }

    /// Create window state for child windows (no maximized property)
    pub fn child_default(width: i32, height: i32) -> Self {
        Self {
            theme: "system".to_string(),
            maximized: None,
            width,
            height,
            pos_x: 100,
            pos_y: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    #[serde(flatten)]
    pub windows: HashMap<String, WindowState>,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        let mut windows = HashMap::new();
        windows.insert("main".to_string(), WindowState::main_default());
        Self { windows }
    }
}

impl GlobalSettings {
    /// Get the path to the global_settings.toml file
    fn get_path() -> Result<PathBuf> {
        let fire_dir = get_fire_dir()?;
        Ok(fire_dir.join("global_settings.toml"))
    }

    /// Load global settings from disk, or return defaults if file doesn't exist
    pub fn load() -> Self {
        match Self::try_load() {
            Ok(settings) => settings,
            Err(_e) => Self::default(),
        }
    }

    /// Try to load global settings, returning an error if it fails
    fn try_load() -> Result<Self> {
        let path = Self::get_path()?;

        if !path.exists() {
            return Ok(Self::default());
        }

        let contents = read_config_file(&path)?;

        // Parse as a flat map with "window.{label}" keys
        let toml_value: toml::Value = toml::from_str(&contents)
            .context("Failed to parse global_settings.toml")?;

        let mut windows = HashMap::new();

        if let toml::Value::Table(table) = toml_value {
            if let Some(toml::Value::Table(window_table)) = table.get("window") {
                for (key, value) in window_table.iter() {
                    if let Ok(window_state) = toml::from_str::<WindowState>(&toml::to_string(value)?) {
                        windows.insert(key.clone(), window_state);
                    }
                }
            }
        }

        if windows.is_empty() {
            return Ok(Self::default());
        }

        Ok(Self { windows })
    }

    /// Save global settings to disk
    pub fn save(&self) -> Result<()> {
        let path = Self::get_path()?;

        // Create a nested structure for TOML: [window.{label}]
        let mut table = toml::map::Map::new();
        let mut window_table = toml::map::Map::new();

        for (label, state) in &self.windows {
            let state_str = toml::to_string(state)
                .context("Failed to serialize window state")?;
            let state_value: toml::Value = toml::from_str(&state_str)
                .context("Failed to parse window state as TOML value")?;
            window_table.insert(label.clone(), state_value);
        }

        table.insert("window".to_string(), toml::Value::Table(window_table));

        let contents = toml::to_string_pretty(&toml::Value::Table(table))
            .context("Failed to serialize global settings")?;

        write_config_file(&path, &contents)?;

        Ok(())
    }

    /// Get window state for a specific window label
    pub fn get_window_state(&self, label: &str) -> WindowState {
        self.windows
            .get(label)
            .cloned()
            .unwrap_or_else(|| {
                if label == "main" {
                    WindowState::main_default()
                } else {
                    WindowState::child_default(800, 600)
                }
            })
    }

    /// Update window state for a specific window label
    pub fn update_window_state(&mut self, label: String, state: WindowState) {
        self.windows.insert(label, state);
    }

    /// Remove window state for a specific window label
    pub fn remove_window_state(&mut self, label: &str) {
        self.windows.remove(label);
    }
}

