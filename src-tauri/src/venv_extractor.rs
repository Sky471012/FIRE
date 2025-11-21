use anyhow::{Context, Result};
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};

/// Check if running in development mode
fn is_dev_mode() -> bool {
    let exe_path = std::env::current_exe().ok();
    if let Some(path) = exe_path {
        let path_str = path.to_string_lossy();
        return path_str.contains("target/debug")
            || path_str.contains("target\\debug")
            || path_str.contains("target/release")
            || path_str.contains("target\\release");
    }
    false
}

/// Get the application's installation directory
/// This returns the directory where the application binary is located
pub fn get_install_dir() -> Result<PathBuf> {
    let exe_path = std::env::current_exe().context("Failed to get current executable path")?;

    let mut install_dir = exe_path
        .parent()
        .context("Failed to get parent directory of executable")?
        .to_path_buf();

    // In development mode (when running from target/debug or target/release),
    // navigate up to the src-tauri directory
    if is_dev_mode() {
        // Go up two levels: target/debug -> target -> src-tauri
        install_dir = install_dir
            .parent()
            .and_then(|p| p.parent())
            .context("Failed to navigate to src-tauri directory")?
            .to_path_buf();
    }

    Ok(install_dir)
}

/// Get the path to the Python embedded directory or venv
pub fn get_python_embed_dir() -> Result<PathBuf> {
    if is_dev_mode() {
        // In dev mode, use .venv from project root (one level up from src-tauri)
        let install_dir = get_install_dir()?;
        let project_root = install_dir
            .parent()
            .context("Failed to get project root directory")?;
        Ok(project_root.join(".venv"))
    } else {
        // In production, use the bundled python-embed in the python folder
        let install_dir = get_install_dir()?;
        Ok(install_dir.join("python").join("python-embed"))
    }
}

/// Get the path to the Python executable in the embedded Python or venv
pub fn get_python_executable() -> Result<PathBuf> {
    let python_dir = get_python_embed_dir()?;

    let python_path = if is_dev_mode() {
        // In dev mode, use .venv structure
        if cfg!(target_os = "windows") {
            python_dir.join("Scripts").join("python.exe")
        } else {
            python_dir.join("bin").join("python")
        }
    } else {
        // In production, use python-embed structure
        if cfg!(target_os = "windows") {
            python_dir.join("python.exe")
        } else {
            python_dir.join("bin").join("python")
        }
    };

    if !python_path.exists() {
        let mode = if is_dev_mode() {
            "development"
        } else {
            "production"
        };
        return Err(anyhow::anyhow!(
            "Python executable not found at: {} (running in {} mode). {}",
            python_path.display(),
            mode,
            if is_dev_mode() {
                "Please ensure you have a .venv in the project root with Python installed."
            } else {
                "Please reinstall the application."
            }
        ));
    }

    Ok(python_path)
}

/// Get the path to Python scripts in the installation directory
pub fn get_python_scripts_dir() -> Result<PathBuf> {
    let install_dir = get_install_dir()?;
    Ok(install_dir.join("python"))
}

/// Extract the python-embed.zip file to the python folder
/// Returns Ok(true) if extraction was performed, Ok(false) if already extracted
/// Note: In development mode, this skips extraction and uses the project root .venv
pub fn extract_python_if_needed(settings: &mut crate::utils::settings::Settings) -> Result<bool> {
    // Skip extraction in development mode
    if is_dev_mode() {
        // Verify that .venv exists
        let python_path = get_python_executable()?;

        return Ok(false);
    }

    let install_dir = get_install_dir()?;

    let python_dir = install_dir.join("python");
    let python_archive = python_dir.join("python-embed.zip");
    let python_target = python_dir.join("python-embed");

    // Check if python-embed already exists and is valid
    if python_target.exists() {
        let python_executable = if cfg!(target_os = "windows") {
            python_target.join("python.exe")
        } else {
            python_target.join("bin").join("python")
        };

        if python_executable.exists() {
            if !settings.flags.python_venv_extracted {
                settings.flags.python_venv_extracted = true;
                let _ = settings.save();
            }
            return Ok(false);
        } else {
        }
    } else {
    }

    // Check if already extracted (but python-embed doesn't exist - shouldn't happen)
    if settings.flags.python_venv_extracted && !python_target.exists() {
        settings.flags.python_venv_extracted = false;
    }

    // Check if the archive exists
    if !python_archive.exists() {
        settings.flags.python_venv_extracted = true;
        settings.save()?;
        return Ok(false);
    }

    // Create python directory if it doesn't exist
    if !python_dir.exists() {
        fs::create_dir_all(&python_dir).context("Failed to create python directory")?;
    }

    // Extract the ZIP archive
    match extract_zip(&python_archive, &python_dir) {
        Ok(_) => {
            // Verify the extraction was successful
            let python_executable = if cfg!(target_os = "windows") {
                python_target.join("python.exe")
            } else {
                python_target.join("bin").join("python")
            };

            if python_executable.exists() {
                // Get size of executable for confirmation
                if let Ok(metadata) = fs::metadata(&python_executable) {}
            } else {
                return Err(anyhow::anyhow!(
                    "Python extraction completed but executable not found at expected location"
                ));
            }

            // Delete the archive file after successful extraction
            fs::remove_file(&python_archive)
                .context("Failed to delete Python archive after extraction")?;

            // Update the flag to indicate extraction is complete
            settings.flags.python_venv_extracted = true;
            settings.save()?;

            Ok(true)
        }
        Err(e) => Err(e).context("Python extraction failed"),
    }
}

/// Extract a ZIP archive to the specified directory
fn extract_zip(archive_path: &Path, target_dir: &Path) -> Result<()> {
    let file = File::open(archive_path)
        .with_context(|| format!("Failed to open ZIP archive: {:?}", archive_path))?;

    let mut archive = zip::ZipArchive::new(file).context("Failed to read ZIP archive")?;

    let total_files = archive.len();

    // Extract all files
    for i in 0..total_files {
        let mut file = archive
            .by_index(i)
            .with_context(|| format!("Failed to access file at index {}", i))?;

        let outpath = match file.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => {
                continue;
            }
        };

        if file.name().ends_with('/') {
            // It's a directory
            fs::create_dir_all(&outpath)
                .with_context(|| format!("Failed to create directory: {:?}", outpath))?;
        } else {
            // It's a file
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent).with_context(|| {
                        format!("Failed to create parent directory: {:?}", parent)
                    })?;
                }
            }

            let mut outfile = File::create(&outpath)
                .with_context(|| format!("Failed to create file: {:?}", outpath))?;

            io::copy(&mut file, &mut outfile)
                .with_context(|| format!("Failed to extract file: {:?}", outpath))?;

            // Set Unix permissions if available
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = file.unix_mode() {
                    fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).ok();
                    // Ignore permission errors
                }
            }
        }
    }

    // List top-level extracted contents for verification
    if let Ok(entries) = fs::read_dir(target_dir) {
        for entry in entries.flatten().take(10) {}
    }

    Ok(())
}
