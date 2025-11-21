use std::process::Child;
use std::sync::Mutex;

use crate::utils::recent_projects::RecentProjects;
use crate::utils::settings::Settings;
use crate::utils::workspace::WorkspaceState;

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub workspace: Mutex<WorkspaceState>,
    pub recent_projects: Mutex<RecentProjects>,
    pub server_process: Mutex<Option<Child>>,
}

impl AppState {
    pub fn new() -> Self {
        let _ = crate::utils::logger::log_info("Initializing AppState...".to_string());

        let _ = crate::utils::logger::log_debug("Loading settings...".to_string());
        let settings = Settings::load();

        let _ = crate::utils::logger::log_debug("Loading workspace state...".to_string());
        let workspace = WorkspaceState::load();

        let _ = crate::utils::logger::log_debug("Loading recent projects...".to_string());
        let recent_projects = RecentProjects::load();

        let _ = crate::utils::logger::log_info("✓ AppState initialized successfully".to_string());

        Self {
            settings: Mutex::new(settings),
            workspace: Mutex::new(workspace),
            recent_projects: Mutex::new(recent_projects),
            server_process: Mutex::new(None),
        }
    }
}
