use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

/// Get the .gaia directory path in the user's home directory
pub fn get_gaia_dir() -> Result<PathBuf> {
    let home_dir = dirs::home_dir().context("Failed to determine home directory")?;

    let gaia_dir = home_dir.join(".gaia");

    // Create the directory if it doesn't exist
    if !gaia_dir.exists() {
        fs::create_dir_all(&gaia_dir).context("Failed to create .gaia directory")?;
    } else {
        println!(".gaia directory already exists");
    }

    Ok(gaia_dir)
}

/// Read a file and return its contents as a String
pub fn read_config_file(path: &PathBuf) -> Result<String> {
    fs::read_to_string(path).with_context(|| format!("Failed to read file: {:?}", path))
}

/// Write contents to a file
pub fn write_config_file(path: &PathBuf, contents: &str) -> Result<()> {
    fs::write(path, contents).with_context(|| format!("Failed to write file: {:?}", path))
}
