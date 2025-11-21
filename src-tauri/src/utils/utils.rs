use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

/// Get the .fire directory path in the user's home directory
pub fn get_fire_dir() -> Result<PathBuf> {
    let home_dir = dirs::home_dir().context("Failed to determine home directory")?;

    let fire_dir = home_dir.join(".fire");

    // Create the directory if it doesn't exist
    if !fire_dir.exists() {
        fs::create_dir_all(&fire_dir).context("Failed to create .fire directory")?;
    } else {
        println!(".fire directory already exists");
    }

    Ok(fire_dir)
}

/// Read a file and return its contents as a String
pub fn read_config_file(path: &PathBuf) -> Result<String> {
    fs::read_to_string(path).with_context(|| format!("Failed to read file: {:?}", path))
}

/// Write contents to a file
pub fn write_config_file(path: &PathBuf, contents: &str) -> Result<()> {
    fs::write(path, contents).with_context(|| format!("Failed to write file: {:?}", path))
}
