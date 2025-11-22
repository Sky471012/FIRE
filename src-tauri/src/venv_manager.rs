use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::utils::utils::get_fire_dir;
use crate::utils::logger::{internal_log_info, internal_log_error, internal_log_debug};

/// Get the path to the pyproject.toml file
fn get_pyproject_path() -> Result<PathBuf> {
    let fire_dir = get_fire_dir()?;
    Ok(fire_dir.join("pyproject.toml"))
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
        internal_log_info("Creating pyproject.toml in ~/.fire/");
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
    let fire_dir = get_fire_dir()?;
    let venv_dir = fire_dir.join(".venv");
    Ok(venv_dir.exists() && venv_dir.is_dir())
}

/// Run uv sync command in the .fire directory
fn run_uv_sync() -> Result<()> {
    let fire_dir = get_fire_dir()?;

    internal_log_info(&format!("Running 'uv sync' in {:?}", fire_dir));
    internal_log_info("This may take a few minutes on first run...");

    let output = Command::new("uv")
        .arg("sync")
        .current_dir(&fire_dir)
        .output()
        .context("Failed to execute 'uv sync' command. Is 'uv' installed and in PATH?")?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.is_empty() {
            internal_log_debug(&format!("uv sync output: {}", stdout));
        }
        internal_log_info("✓ uv sync completed successfully");
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        internal_log_error(&format!("uv sync stderr: {}", stderr));

        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.is_empty() {
            internal_log_error(&format!("uv sync stdout: {}", stdout));
        }

        anyhow::bail!("uv sync command failed with exit code: {:?}", output.status.code())
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

