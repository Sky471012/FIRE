use std::process::Child;
use std::sync::Mutex;

use crate::utils::global_settings::GlobalSettings;
use crate::utils::recent_projects::RecentProjects;
use crate::utils::settings::Settings;
use crate::utils::workspace::WorkspaceState;

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub global_settings: Mutex<GlobalSettings>,
    pub workspace: Mutex<WorkspaceState>,
    pub recent_projects: Mutex<RecentProjects>,
    pub server_process: Mutex<Option<Child>>,
}

impl AppState {
    pub fn new() -> Self {
        let _ = crate::utils::logger::log_info("Initializing AppState...".to_string());

        let _ = crate::utils::logger::log_debug("Loading settings...".to_string());
        let settings = Settings::load();

        let _ = crate::utils::logger::log_debug("Loading global settings...".to_string());
        let global_settings = GlobalSettings::load();

        let _ = crate::utils::logger::log_debug("Loading workspace state...".to_string());
        let workspace = WorkspaceState::load();

        let _ = crate::utils::logger::log_debug("Loading recent projects...".to_string());
        let recent_projects = RecentProjects::load();

        let _ = crate::utils::logger::log_info("✓ AppState initialized successfully".to_string());

        Self {
            settings: Mutex::new(settings),
            global_settings: Mutex::new(global_settings),
            workspace: Mutex::new(workspace),
            recent_projects: Mutex::new(recent_projects),
            server_process: Mutex::new(None),
        }
    }
}

impl Drop for AppState {
    fn drop(&mut self) {
        let _ = crate::utils::logger::log_info("Cleaning up AppState...".to_string());

        // Kill the server process if it's running
        if let Ok(mut server_process) = self.server_process.lock() {
            if let Some(mut child) = server_process.take() {
                let pid = child.id();
                let _ = crate::utils::logger::log_info(format!(
                    "Stopping server process (PID: {}) on application shutdown...",
                    pid
                ));

                // Try to check if process is still running
                match child.try_wait() {
                    Ok(Some(_)) => {
                        // Process already exited
                        let _ = crate::utils::logger::log_info(
                            "Server process had already exited".to_string()
                        );
                    }
                    Ok(None) | Err(_) => {
                        // Process is running or we can't check - kill it
                        #[cfg(target_os = "windows")]
                        {
                            use std::process::Command;
                            // Use taskkill to ensure the enfire process tree is killed
                            let _ = Command::new("taskkill")
                                .args(["/F", "/T", "/PID", &pid.to_string()])
                                .output();
                        }

                        #[cfg(not(target_os = "windows"))]
                        {
                            let _ = child.kill();
                        }

                        let _ = child.wait();
                        let _ = crate::utils::logger::log_info(
                            "Server process stopped successfully".to_string()
                        );
                    }
                }
            }
        }

        let _ = crate::utils::logger::log_info("✓ AppState cleanup complete".to_string());
    }
}

