use std::process::{Command, Stdio};
use tauri::State;

use super::state::AppState;
use crate::venv_extractor;

// Server Management Commands

/// Start the Python server using uvicorn
#[tauri::command]
pub async fn start_python_server(state: State<'_, AppState>) -> Result<String, String> {
    use std::env;

    // Check if server is already running
    {
        let mut server_process = state
            .server_process
            .lock()
            .map_err(|e| format!("Failed to lock server process: {}", e))?;

        if let Some(ref mut child) = *server_process {
            // Check if process is still alive
            match child.try_wait() {
                Ok(None) => {
                    // Process is still running
                    return Err("Server is already running".to_string());
                }
                Ok(Some(_status)) => {
                    // Process has exited, clean it up
                    *server_process = None;
                }
                Err(_) => {
                    // Error checking status, assume dead and clean up
                    *server_process = None;
                }
            }
        }
    }

    let _ = crate::utils::logger::log_info("Starting Python server...".to_string());

    // Determine if we're in dev or production mode
    let exe_path =
        env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;
    let exe_path_str = exe_path.to_string_lossy();

    let is_dev = exe_path_str.contains("target/debug")
        || exe_path_str.contains("target\\debug")
        || exe_path_str.contains("target/release")
        || exe_path_str.contains("target\\release");

    let _ = crate::utils::logger::log_info(format!(
        "Running in {} mode",
        if is_dev { "development" } else { "production" }
    ));

    // Get the server.py location
    let server_script_path = if is_dev {
        // In dev mode, current_dir is already in src-tauri when running cargo/tauri
        // So we need to go up one level to project root, then into src-tauri/python
        let current_dir =
            env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;

        // Check if we're already in src-tauri directory
        let path_str = current_dir.to_string_lossy();
        if path_str.ends_with("src-tauri")
            || path_str.contains("src-tauri\\")
            || path_str.contains("src-tauri/")
        {
            // Already in src-tauri, just append python path
            current_dir
                .join("python")
                .join("AI Agent")
                .join("server.py")
        } else {
            // Not in src-tauri, need to add it
            current_dir
                .join("src-tauri")
                .join("python")
                .join("AI Agent")
                .join("server.py")
        }
    } else {
        // In production, use the embedded Python scripts directory
        let python_dir = venv_extractor::get_python_scripts_dir()
            .map_err(|e| format!("Failed to get Python scripts directory: {}", e))?;
        python_dir.join("AI Agent").join("server.py")
    };

    if !server_script_path.exists() {
        return Err(format!(
            "Server script not found at: {}. Please ensure the application is properly installed.",
            server_script_path.display()
        ));
    }

    let server_dir = server_script_path
        .parent()
        .ok_or_else(|| "Failed to get server directory".to_string())?;

    // Get the Python executable from ~/.tire/.venv (for both dev and production)
    let tire_dir = crate::utils::utils::get_tire_dir()
        .map_err(|e| format!("Failed to get .tire directory: {}", e))?;

    #[cfg(target_os = "windows")]
    let venv_python = tire_dir.join(".venv").join("Scripts").join("python.exe");

    #[cfg(not(target_os = "windows"))]
    let venv_python = tire_dir.join(".venv").join("bin").join("python");

    if !venv_python.exists() {
        return Err(format!(
            "Python not found at: {}. Please ensure the virtual environment is set up.",
            venv_python.display()
        ));
    }

    let python_cmd = venv_python
        .to_str()
        .ok_or_else(|| "Invalid Python path".to_string())?
        .to_string();


    let _ = crate::utils::logger::log_info(format!("Python command: {}", python_cmd));
    let _ = crate::utils::logger::log_info(format!("Server directory: {}", server_dir.display()));

    // Build the command
    let mut cmd = Command::new(&python_cmd);

    // Always use -m uvicorn for both dev and production
    cmd.arg("-m")
        .arg("uvicorn")
        .arg("server:app")
        .arg("--port")
        .arg("8001");

    // Add --reload only in dev mode
    if is_dev {
        cmd.arg("--reload");
    }

    cmd.current_dir(server_dir).stdin(Stdio::null());

    // In development, show output for debugging
    // In production, hide console window
    #[cfg(target_os = "windows")]
    {
        if !is_dev {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        } else {
            // In dev mode, inherit stdout/stderr so we can see server logs
            cmd.stdout(Stdio::inherit()).stderr(Stdio::inherit());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if !is_dev {
            cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        } else {
            cmd.stdout(Stdio::inherit()).stderr(Stdio::inherit());
        }
    }

    // Spawn the server process
    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn Python server process: {}", e))?;

    let pid = child.id();
    let _ = crate::utils::logger::log_info(format!(
        "Python server process spawned successfully (PID: {})",
        pid
    ));
    let _ = crate::utils::logger::log_info(
        "Server should be starting on http://localhost:8001".to_string(),
    );

    // Store the child process
    {
        let mut server_process = state
            .server_process
            .lock()
            .map_err(|e| format!("Failed to lock server process: {}", e))?;
        *server_process = Some(child);
    }

    Ok(format!("Python server started on port 8001 (PID: {})", pid))
}

/// Stop the Python server
#[tauri::command]
pub async fn stop_python_server(state: State<'_, AppState>) -> Result<String, String> {
    let _ = crate::utils::logger::log_info("Stopping Python server...".to_string());

    let mut server_process = state
        .server_process
        .lock()
        .map_err(|e| format!("Failed to lock server process: {}", e))?;

    if let Some(mut child) = server_process.take() {
        let pid = child.id();

        match child.try_wait() {
            Ok(Some(status)) => {
                let _ = crate::utils::logger::log_info(format!(
                    "Server process had already exited with status: {}",
                    status
                ));
                return Ok("Server was not running".to_string());
            }
            Ok(None) => {
                let _ = crate::utils::logger::log_info(format!(
                    "Killing server process tree (PID: {})",
                    pid
                ));

                // On Windows, kill the entire process tree including uvicorn reload children
                #[cfg(target_os = "windows")]
                {
                    // Use taskkill to kill the process tree
                    let kill_result = Command::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .output();

                    match kill_result {
                        Ok(output) => {
                            if output.status.success() {
                                let _ = crate::utils::logger::log_info(
                                    "Process tree killed successfully via taskkill".to_string(),
                                );
                            } else {
                                let _ = crate::utils::logger::log_warn(
                                    "Taskkill returned non-zero status, trying child.kill()"
                                        .to_string(),
                                );
                                let _ = child.kill();
                            }
                        }
                        Err(e) => {
                            let _ = crate::utils::logger::log_warn(format!(
                                "Failed to run taskkill: {}, trying child.kill()",
                                e
                            ));
                            let _ = child.kill();
                        }
                    }
                }

                // On Unix-like systems, kill the process group
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = child.kill();
                }

                // Wait for the process to exit
                let _ = child.wait();
                let _ = crate::utils::logger::log_info("Server process stopped".to_string());

                return Ok("Python server stopped".to_string());
            }
            Err(e) => {
                return Err(format!("Error checking server status: {}", e));
            }
        }
    } else {
        return Err("Server is not running".to_string());
    }
}

/// Check if the Python server is running
#[tauri::command]
pub async fn is_server_running(state: State<'_, AppState>) -> Result<bool, String> {
    let mut server_process = state
        .server_process
        .lock()
        .map_err(|e| format!("Failed to lock server process: {}", e))?;

    if let Some(ref mut child) = *server_process {
        match child.try_wait() {
            Ok(None) => {
                // Process is still running
                Ok(true)
            }
            Ok(Some(_)) => {
                // Process has exited, clean up
                *server_process = None;
                Ok(false)
            }
            Err(_) => {
                // Error checking, assume dead
                *server_process = None;
                Ok(false)
            }
        }
    } else {
        Ok(false)
    }
}
