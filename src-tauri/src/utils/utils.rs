use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

/// Get the .tire directory path in the user's home directory
pub fn get_tire_dir() -> Result<PathBuf> {
    let home_dir = dirs::home_dir().context("Failed to determine home directory")?;

    let tire_dir = home_dir.join(".tire");

    // Create the directory if it doesn't exist
    if !tire_dir.exists() {
        fs::create_dir_all(&tire_dir).context("Failed to create .tire directory")?;
    } else {
        println!(".tire directory already exists");
    }

    Ok(tire_dir)
}

/// Read a file and return its contents as a String
pub fn read_config_file(path: &PathBuf) -> Result<String> {
    fs::read_to_string(path).with_context(|| format!("Failed to read file: {:?}", path))
}

/// Write contents to a file
pub fn write_config_file(path: &PathBuf, contents: &str) -> Result<()> {
    fs::write(path, contents).with_context(|| format!("Failed to write file: {:?}", path))
}
