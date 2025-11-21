pub mod data_load;
pub mod db;
pub mod utils;

use utils::logger;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    if let Err(e) = logger::init_logger() {
        eprintln!("Failed to initialize logger: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            logger::log_info,
            logger::log_warn,
            logger::log_error,
            logger::log_debug,
            logger::get_log_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
