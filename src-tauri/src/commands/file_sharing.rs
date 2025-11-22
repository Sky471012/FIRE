use std::io::{Read, Write};
use std::path::Path;
use std::process::{Command, Stdio};
use zip::write::FileOptions;
use zip::CompressionMethod;

pub fn zip_files(file_paths: Vec<String>, zip_path: String) -> Result<(), String> {
    let zip_file_handle = std::fs::File::create(&zip_path)
        .map_err(|e| format!("Failed to create zip file: {}", e))?;

    let mut zip_writer = zip::ZipWriter::new(zip_file_handle);
    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o755);

    for file_path in file_paths {
        let mut src_file = std::fs::File::open(&file_path)
            .map_err(|e| format!("Failed to open source file '{}': {}", file_path, e))?;

        let mut buffer = Vec::new();
        src_file
            .read_to_end(&mut buffer)
            .map_err(|e| format!("Failed to read source file '{}': {}", file_path, e))?;

        let file_name = Path::new(&file_path)
            .file_name()
            .ok_or("Cannot get file name")?
            .to_str()
            .ok_or("Invalid file name encoding")?;

        zip_writer
            .start_file(file_name, options)
            .map_err(|e| format!("Failed to start zip file entry for '{}': {}", file_name, e))?;

        zip_writer
            .write_all(&buffer)
            .map_err(|e| format!("Failed to write to zip for '{}': {}", file_name, e))?;
    }

    zip_writer
        .finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;

    Ok(())
}

pub fn call_croc(file_path: String) -> Result<String, String> {
    let output = Command::new("croc")
        .arg("send")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute croc: {}. Make sure croc is installed and in PATH.",
                e
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Croc command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        if line.contains("Code is:") || line.contains("code is:") {
            if let Some(code) = line.split(':').nth(1) {
                return Ok(code.trim().to_string());
            }
        }
        if line.contains('-') && line.split('-').count() >= 3 {
            if let Some(code_part) = line
                .split_whitespace()
                .find(|s| s.contains('-') && s.split('-').count() >= 3)
            {
                return Ok(code_part.to_string());
            }
        }
    }

    Ok(stdout.to_string())
}

#[tauri::command]
pub async fn zip_and_send_files(file_paths: Vec<String>) -> Result<String, String> {
    if file_paths.is_empty() {
        return Err("No files provided".to_string());
    }

    let first_file = &file_paths[0];
    let zip_path = if file_paths.len() == 1 {
        format!("{}.zip", first_file)
    } else {
        format!(
            "{}_files.zip",
            first_file.trim_end_matches(|c: char| !c.is_alphanumeric())
        )
    };

    zip_files(file_paths.clone(), zip_path.clone())?;

    let secret_code = call_croc(zip_path.clone())?;

    Ok(secret_code)
}
