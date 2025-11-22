use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use super::utils::{get_fire_dir, read_config_file, write_config_file};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub theme: String,
    pub maximized: bool,
    pub width: i32,
    pub height: i32,
    pub pos_x: i32,
    pub pos_y: i32,
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            maximized: false,
            width: 1200,
            height: 800,
            pos_x: 100,
            pos_y: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preferences {
    pub default_map_view: String,
    pub auto_check_updates: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            default_map_view: "3D".to_string(),
            auto_check_updates: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flags {
    pub python_venv_extracted: bool,
}

impl Default for Flags {
    fn default() -> Self {
        Self {
            python_venv_extracted: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub window: WindowSettings,
    pub preferences: Preferences,
    #[serde(default)]
    pub flags: Flags,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            window: WindowSettings::default(),
            preferences: Preferences::default(),
            flags: Flags::default(),
        }
    }
}

impl Settings {
    /// Get the path to the settings file
    fn get_path() -> Result<PathBuf> {
        let fire_dir = get_fire_dir()?;
        Ok(fire_dir.join("settings.toml"))
    }

    /// Load settings from disk, or return defaults if file doesn't exist
    pub fn load() -> Self {
        match Self::try_load() {
            Ok(settings) => {
                settings
            }
            Err(e) => {
                Self::default()
            }
        }
    }

    /// Try to load settings, returning an error if it fails
    fn try_load() -> Result<Self> {
        let path = Self::get_path()?;

        if !path.exists() {
            return Ok(Self::default());
        }

        let contents = read_config_file(&path)?;

        let settings: Settings = toml::from_str(&contents)
            .context("Failed to parse settings.toml")?;

        Ok(settings)
    }

    /// Save settings to disk
    pub fn save(&self) -> Result<()> {
        let path = Self::get_path()?;

        let contents = toml::to_string_pretty(self)
            .context("Failed to serialize settings")?;

        write_config_file(&path, &contents)?;

        Ok(())
    }

    /// Update window settings
    pub fn update_window(&mut self, window: WindowSettings) {
        self.window = window;
    }

    /// Update preferences
    #[allow(dead_code)]
    pub fn update_preferences(&mut self, preferences: Preferences) {
        self.preferences = preferences;
    }
}

