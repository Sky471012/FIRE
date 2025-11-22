use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::utils::utils::get_tire_dir;
use crate::utils::logger::{internal_log_info, internal_log_error, internal_log_debug};

/// Show error dialog for UV installation requirement
pub fn show_uv_installation_error(app_handle: &tauri::AppHandle) {
    internal_log_info("Showing UV installation error dialog");

    let app_handle_clone = app_handle.clone();

    // Spawn in a separate thread to avoid blocking
    std::thread::spawn(move || {
        if let Err(e) = create_uv_error_dialog(&app_handle_clone) {
            internal_log_error(&format!("Failed to create UV error dialog: {}", e));
        }
    });
}

/// Create the UV installation error dialog window
fn create_uv_error_dialog(app_handle: &tauri::AppHandle) -> Result<()> {
    use tauri::Manager;

    // Check if a dialog already exists
    if app_handle.get_webview_window("uv-error-dialog").is_some() {
        internal_log_debug("UV error dialog already exists");
        return Ok(());
    }

    let url = "/uv-error";
    let title = "UV Installation Required";

    let webview_url = tauri::WebviewUrl::App(url.into());

    let _window = tauri::WebviewWindowBuilder::new(
        app_handle,
        "uv-error-dialog",
        webview_url,
    )
    .title(title)
    .inner_size(500.0, 300.0)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .center()
    .always_on_top(true)
    .skip_taskbar(true)
    .build()
    .context("Failed to create UV error dialog window")?;

    internal_log_info("UV error dialog created");
    Ok(())
}

/// Get the path to the pyproject.toml file
fn get_pyproject_path() -> Result<PathBuf> {
    let tire_dir = get_tire_dir()?;
    Ok(tire_dir.join("pyproject.toml"))
}

/// Get the pyproject.toml content
fn get_pyproject_content() -> &'static str {
    r#"[project]
name = "gaia"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "aiohttp>=3.13.2",
    "beautifulsoup4>=4.14.2",
    "chromadb>=1.3.0",
    "duckdb>=1.4.1",
    "fastapi>=0.120.4",
    "google-genai>=1.47.0",
    "langchain-community>=0.4.1",
    "langchain-core>=1.0.2",
    "langchain-groq>=1.0.0",
    "langchain-text-splitters>=1.0.0",
    "langgraph>=1.0.2",
    "lxml>=6.0.2",
    "netcdf4>=1.7.3",
    "openpyxl>=3.1.5",
    "playwright>=1.55.0",
    "pydantic>=2.12.3",
    "python-dotenv>=1.2.1",
    "python-multipart>=0.0.20",
    "requests>=2.32.5",
    "scipy>=1.16.3",
    "sentence-transformers>=5.1.2",
    "torch>=2.9.0",
    "transformers>=4.57.1",
    "uvicorn>=0.38.0",
    "xarray>=2025.10.1",
]
"#
}

/// Create the pyproject.toml file if it doesn't exist
fn ensure_pyproject_file() -> Result<()> {
    let pyproject_path = get_pyproject_path()?;

    if !pyproject_path.exists() {
        internal_log_info("Creating pyproject.toml in ~/.tire/");
        fs::write(&pyproject_path, get_pyproject_content())
            .context("Failed to write pyproject.toml")?;
        internal_log_info(&format!("✓ Created pyproject.toml at {:?}", pyproject_path));
    } else {
        internal_log_debug("pyproject.toml already exists");
    }

    Ok(())
}

/// Check if the venv directory exists
fn venv_exists() -> Result<bool> {
    let tire_dir = get_tire_dir()?;
    let venv_dir = tire_dir.join(".venv");
    Ok(venv_dir.exists() && venv_dir.is_dir())
}

/// Run uv sync command in the .tire directory
fn run_uv_sync() -> Result<()> {
    let tire_dir = get_tire_dir()?;

    internal_log_info(&format!("Running 'uv sync' in {:?}", tire_dir));
    internal_log_info("This may take a few minutes on first run...");

    let output = Command::new("uv")
        .arg("sync")
        .current_dir(&tire_dir)
        .output();

    match output {
        Err(e) => {
            // Command execution failed - likely uv is not installed
            if e.kind() == std::io::ErrorKind::NotFound {
                internal_log_error("'uv' command not found - uv is not installed or not in PATH");
                anyhow::bail!("UV_NOT_INSTALLED: uv command not found")
            } else {
                internal_log_error(&format!("Failed to execute uv command: {}", e));
                anyhow::bail!("Failed to execute uv: {}", e)
            }
        }
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if !stdout.is_empty() {
                    internal_log_debug(&format!("uv sync output: {}", stdout));
                }
                internal_log_info("✓ uv sync completed successfully");
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stderr_lower = stderr.to_lowercase();

                internal_log_error(&format!("uv sync stderr: {}", stderr));

                let stdout = String::from_utf8_lossy(&output.stdout);
                if !stdout.is_empty() {
                    internal_log_error(&format!("uv sync stdout: {}", stdout));
                }

                // Check if it's a network/internet error
                if stderr_lower.contains("network")
                    || stderr_lower.contains("connection")
                    || stderr_lower.contains("timeout")
                    || stderr_lower.contains("dns")
                    || stderr_lower.contains("offline") {
                    anyhow::bail!("NETWORK_ERROR: {}", stderr)
                } else {
                    anyhow::bail!("uv sync command failed with exit code: {:?}", output.status.code())
                }
            }
        }
    }
}

/// Initialize or verify the Python virtual environment
pub fn initialize_venv(venv_configured: bool) -> Result<bool> {
    internal_log_info("Checking Python virtual environment...");
    internal_log_debug(&format!("venv_configured flag: {}", venv_configured));

    // Ensure pyproject.toml exists
    ensure_pyproject_file()?;

    // Check if venv exists
    let venv_exists = venv_exists()?;
    internal_log_debug(&format!("venv directory exists: {}", venv_exists));

    // If venv is not configured or doesn't exist, run uv sync
    if !venv_configured || !venv_exists {
        if !venv_configured {
            internal_log_info("Virtual environment not configured (config.venv = false)");
        }
        if !venv_exists {
            internal_log_info("Virtual environment directory (.venv) not found");
        }
        internal_log_info("Initializing virtual environment with uv sync...");

        run_uv_sync()?;

        internal_log_info("✓ Virtual environment initialization complete");
        return Ok(true); // Indicates that venv was just set up
    } else {
        internal_log_info("✓ Virtual environment already configured and exists");
        Ok(false) // Venv was already set up
    }
}

