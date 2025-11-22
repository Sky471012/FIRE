use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use chrono::{DateTime, Local};

static LOG_FILE: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));

/// Initialize the logger with a session-based log file
pub fn init_logger() -> Result<String, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?;

    let log_dir = home_dir.join(".fire").join("temp");

    // Create directory if it doesn't exist
    fs::create_dir_all(&log_dir)
        .map_err(|e| format!("Failed to create log directory: {}", e))?;

    // Generate session filename with current datetime
    let now: DateTime<Local> = Local::now();
    let filename = format!("session_{}.log", now.format("%Y%m%d_%H%M%S"));
    let log_path = log_dir.join(&filename);

    // Store the log file path
    let mut log_file = LOG_FILE.lock().unwrap();
    *log_file = Some(log_path.clone());

    // Create the file and write initial log entry
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to create log file: {}", e))?;

    writeln!(file, "[{}] Logger initialized", now.format("%Y-%m-%d %H:%M:%S%.3f"))
        .map_err(|e| format!("Failed to write to log file: {}", e))?;

    Ok(log_path.to_string_lossy().to_string())
}

/// Write a log entry to the log file
fn write_log(level: &str, message: &str) -> Result<(), String> {
    let log_file_guard = LOG_FILE.lock().unwrap();
    let log_path = log_file_guard
        .as_ref()
        .ok_or_else(|| "Logger not initialized. Call init_logger first.".to_string())?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    let now: DateTime<Local> = Local::now();
    let timestamp = now.format("%Y-%m-%d %H:%M:%S%.3f");

    writeln!(file, "[{}] [{}] {}", timestamp, level, message)
        .map_err(|e| format!("Failed to write to log file: {}", e))?;

    Ok(())
}

/// Internal logging functions that can be called from Rust code
pub fn internal_log_info(message: &str) {
    let _ = write_log("INFO", message);
}

pub fn internal_log_warn(message: &str) {
    let _ = write_log("WARN", message);
}

pub fn internal_log_error(message: &str) {
    let _ = write_log("ERROR", message);
}

pub fn internal_log_debug(message: &str) {
    let _ = write_log("DEBUG", message);
}

/// Log an info message
#[tauri::command]
pub fn log_info(message: String) -> Result<(), String> {
    write_log("INFO", &message)
}

/// Log a warning message
#[tauri::command]
pub fn log_warn(message: String) -> Result<(), String> {
    write_log("WARN", &message)
}

/// Log an error message
#[tauri::command]
pub fn log_error(message: String) -> Result<(), String> {
    write_log("ERROR", &message)
}

/// Log a debug message
#[tauri::command]
pub fn log_debug(message: String) -> Result<(), String> {
    write_log("DEBUG", &message)
}

/// Get the current log file path
#[tauri::command]
pub fn get_log_path() -> Result<String, String> {
    let log_file_guard = LOG_FILE.lock().unwrap();
    log_file_guard
        .as_ref()
        .map(|path| path.to_string_lossy().to_string())
        .ok_or_else(|| "Logger not initialized".to_string())
}

