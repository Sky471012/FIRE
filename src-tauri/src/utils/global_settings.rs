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
pub struct AppearanceSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_font_size")]
    pub font_size: u32,
    #[serde(default = "default_show_status_bar")]
    pub show_status_bar: bool,
    #[serde(default = "default_status_bar_refresh_ms")]
    pub status_bar_refresh_ms: u32,
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_font_size() -> u32 {
    14
}

fn default_show_status_bar() -> bool {
    true
}

fn default_status_bar_refresh_ms() -> u32 {
    2000 // 2 seconds default
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            font_size: default_font_size(),
            show_status_bar: default_show_status_bar(),
            status_bar_refresh_ms: default_status_bar_refresh_ms(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    #[serde(default)]
    pub user_name: String,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            user_name: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSettings {
    #[serde(default)]
    pub venv: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub groq_api_key: Option<String>,
}

impl Default for ConfigSettings {
    fn default() -> Self {
        Self {
            venv: false,
            groq_api_key: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(default)]
    pub appearance: AppearanceSettings,
    #[serde(default)]
    pub config: ConfigSettings,
    #[serde(flatten)]
    pub windows: HashMap<String, WindowState>,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        let mut windows = HashMap::new();
        windows.insert("main".to_string(), WindowState::main_default());
        Self {
            general: GeneralSettings::default(),
            appearance: AppearanceSettings::default(),
            config: ConfigSettings::default(),
            windows,
        }
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
        let toml_value: toml::Value =
            toml::from_str(&contents).context("Failed to parse global_settings.toml")?;

        let mut windows = HashMap::new();
        let mut general = GeneralSettings::default();
        let mut appearance = AppearanceSettings::default();
        let mut config = ConfigSettings::default();

        if let toml::Value::Table(table) = toml_value {
            // Parse window states
            if let Some(toml::Value::Table(window_table)) = table.get("window") {
                for (key, value) in window_table.iter() {
                    if let Ok(window_state) =
                        toml::from_str::<WindowState>(&toml::to_string(value)?)
                    {
                        windows.insert(key.clone(), window_state);
                    }
                }
            }

            // Parse general settings
            if let Some(value) = table.get("general") {
                if let Ok(parsed_general) =
                    toml::from_str::<GeneralSettings>(&toml::to_string(value)?)
                {
                    general = parsed_general;
                }
            }

            // Parse appearance settings
            if let Some(value) = table.get("appearance") {
                if let Ok(parsed_appearance) =
                    toml::from_str::<AppearanceSettings>(&toml::to_string(value)?)
                {
                    appearance = parsed_appearance;
                }
            }

            // Parse config settings
            if let Some(value) = table.get("config") {
                if let Ok(parsed_config) =
                    toml::from_str::<ConfigSettings>(&toml::to_string(value)?)
                {
                    config = parsed_config;
                }
            }
        }

        if windows.is_empty() {
            windows.insert("main".to_string(), WindowState::main_default());
        }

        Ok(Self {
            general,
            appearance,
            config,
            windows,
        })
    }

    /// Save global settings to disk
    pub fn save(&self) -> Result<()> {
        let path = Self::get_path()?;

        // Create a nested structure for TOML
        let mut table = toml::map::Map::new();

        // Add general settings
        let general_str =
            toml::to_string(&self.general).context("Failed to serialize general settings")?;
        let general_value: toml::Value = toml::from_str(&general_str)
            .context("Failed to parse general settings as TOML value")?;
        table.insert("general".to_string(), general_value);

        // Add appearance settings
        let appearance_str =
            toml::to_string(&self.appearance).context("Failed to serialize appearance settings")?;
        let appearance_value: toml::Value = toml::from_str(&appearance_str)
            .context("Failed to parse appearance settings as TOML value")?;
        table.insert("appearance".to_string(), appearance_value);

        // Add config settings
        let config_str =
            toml::to_string(&self.config).context("Failed to serialize config settings")?;
        let config_value: toml::Value =
            toml::from_str(&config_str).context("Failed to parse config settings as TOML value")?;
        table.insert("config".to_string(), config_value);

        // Add window states
        let mut window_table = toml::map::Map::new();
        for (label, state) in &self.windows {
            let state_str = toml::to_string(state).context("Failed to serialize window state")?;
            let state_value: toml::Value =
                toml::from_str(&state_str).context("Failed to parse window state as TOML value")?;
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
        self.windows.get(label).cloned().unwrap_or_else(|| {
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

    /// Get the venv configuration status
    pub fn get_venv_configured(&self) -> bool {
        self.config.venv
    }

    /// Set the venv configuration status
    pub fn set_venv_configured(&mut self, configured: bool) {
        self.config.venv = configured;
    }

    /// Get the GROQ API key
    pub fn get_groq_api_key(&self) -> Option<String> {
        self.config.groq_api_key.clone()
    }

    /// Set the GROQ API key
    pub fn set_groq_api_key(&mut self, api_key: Option<String>) {
        self.config.groq_api_key = api_key;
    }
}
