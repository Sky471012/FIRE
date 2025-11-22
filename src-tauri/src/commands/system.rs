use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::State;
use std::sync::Mutex;

pub struct SystemState {
    system: Mutex<System>,
}

impl SystemState {
    pub fn new() -> Self {
        Self {
            system: Mutex::new(System::new_all()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub ram_used_gb: f64,
    pub ram_total_gb: f64,
}

#[tauri::command]
pub fn get_system_stats(state: State<SystemState>) -> Result<SystemStats, String> {
    let mut system = state
        .system
        .lock()
        .map_err(|e| format!("Failed to lock system state: {}", e))?;

    // Refresh CPU and memory information
    system.refresh_cpu_usage();
    system.refresh_memory();

    // Get global CPU usage
    let cpu_usage = system.global_cpu_usage();

    // Get memory usage in GB
    let ram_used_bytes = system.used_memory();
    let ram_total_bytes = system.total_memory();
    
    let ram_used_gb = ram_used_bytes as f64 / 1_073_741_824.0; // Convert bytes to GB
    let ram_total_gb = ram_total_bytes as f64 / 1_073_741_824.0;

    Ok(SystemStats {
        cpu_usage,
        ram_used_gb,
        ram_total_gb,
    })
}

