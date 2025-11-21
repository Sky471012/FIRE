use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use super::utils::{get_gaia_dir, read_config_file, write_config_file};

const MAX_RECENT_PROJECTS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProject {
    pub path: String,
    pub last_accessed: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProjects {
    projects: Vec<RecentProject>,
}

impl Default for RecentProjects {
    fn default() -> Self {
        Self {
            projects: Vec::new(),
        }
    }
}

impl RecentProjects {
    /// Get the path to the recent projects file
    fn get_path() -> Result<PathBuf> {
        let gaia_dir = get_gaia_dir()?;
        Ok(gaia_dir.join("recent_projects.json"))
    }

    /// Load recent projects from disk, or return defaults if file doesn't exist
    pub fn load() -> Self {
        match Self::try_load() {
            Ok(projects) => projects,
            Err(e) => Self::default(),
        }
    }

    /// Try to load recent projects, returning an error if it fails
    fn try_load() -> Result<Self> {
        let path = Self::get_path()?;

        if !path.exists() {
            return Ok(Self::default());
        }

        let contents = read_config_file(&path)?;
        let projects: Vec<RecentProject> =
            serde_json::from_str(&contents).context("Failed to parse recent_projects.json")?;

        Ok(Self { projects })
    }

    /// Save recent projects to disk
    pub fn save(&self) -> Result<()> {
        let path = Self::get_path()?;
        let contents = serde_json::to_string_pretty(&self.projects)
            .context("Failed to serialize recent projects")?;

        write_config_file(&path, &contents)?;

        Ok(())
    }

    pub fn add_project(&mut self, path: String) {
        let now = Utc::now();

        self.projects.retain(|p| p.path != path);

        self.projects.insert(
            0,
            RecentProject {
                path,
                last_accessed: now,
            },
        );

        if self.projects.len() > MAX_RECENT_PROJECTS {
            self.projects.truncate(MAX_RECENT_PROJECTS);
        }
    }

    /// Get all recent projects
    pub fn get_projects(&self) -> &[RecentProject] {
        &self.projects
    }

    /// Clear all recent projects
    pub fn clear(&mut self) {
        self.projects.clear();
    }

    /// Remove a project from the recent projects list
    pub fn remove_project(&mut self, path: &str) {
        self.projects.retain(|p| p.path != path);
    }
}
