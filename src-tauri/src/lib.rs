mod auth;
mod chat;
pub mod commands;
pub mod data_load;
pub mod db;
pub mod file_operations;
pub mod utils;
mod venv_extractor;
mod venv_manager;

use tauri::Manager;
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(commands::AppState::new())
        .manage(commands::system::SystemState::new())
        .setup(|app| {
            let app_state = app.state::<commands::AppState>();

            logger::internal_log_info("Starting application setup...");

            // Initialize Python virtual environment on startup
            {
                logger::internal_log_info("Checking Python virtual environment...");

                let venv_configured = {
                    let global_settings = app_state
                        .global_settings
                        .lock()
                        .expect("Failed to lock global settings");
                    let configured = global_settings.get_venv_configured();
                    logger::internal_log_debug(&format!("Current config.venv = {}", configured));
                    configured
                };

                match venv_manager::initialize_venv(venv_configured) {
                    Ok(was_initialized) => {
                        if was_initialized {
                            // Reacquire lock to update config
                            let mut global_settings = app_state
                                .global_settings
                                .lock()
                                .expect("Failed to lock global settings");
                            global_settings.set_venv_configured(true);

                            if let Err(e) = global_settings.save() {
                                logger::internal_log_error(&format!(
                                    "Failed to save venv configuration: {}",
                                    e
                                ));
                            } else {
                                logger::internal_log_info(
                                    "✓ Updated config.venv = true in global_settings.toml",
                                );
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = e.to_string();
                        logger::internal_log_error(&format!(
                            "Failed to initialize virtual environment: {}",
                            error_msg
                        ));

                        // Check if it's a UV not installed error (not a network error)
                        if error_msg.contains("UV_NOT_INSTALLED") {
                            logger::internal_log_error(
                                "UV is not installed - showing error dialog",
                            );
                            venv_manager::show_uv_installation_error(&app.handle());
                        } else if !error_msg.contains("NETWORK_ERROR") {
                            // Show error dialog for other non-network errors too
                            logger::internal_log_error("UV command failed - showing error dialog");
                            venv_manager::show_uv_installation_error(&app.handle());
                        } else {
                            logger::internal_log_error(
                                "Network error - skipping UV installation dialog",
                            );
                        }

                        logger::internal_log_error(
                            "Application will continue, but Python features may not work",
                        );
                    }
                }
            }

            logger::internal_log_debug("Setting up main window...");

            // Setup main window with saved settings
            if let Some(main_window) = app.get_webview_window("main") {
                // Load window state in a separate scope to drop the mutex guard
                let window_state = {
                    let global_settings = app_state
                        .global_settings
                        .lock()
                        .expect("Failed to lock global settings");
                    global_settings.get_window_state("main")
                };

                // Apply maximized state first if present
                if let Some(maximized) = window_state.maximized {
                    if maximized {
                        let _ = main_window.maximize();
                    } else {
                        // Only set size and position if not maximized
                        let _ = main_window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                            width: window_state.width as u32,
                            height: window_state.height as u32,
                        }));

                        let _ =
                            main_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                                x: window_state.pos_x,
                                y: window_state.pos_y,
                            }));
                    }
                } else {
                    // No maximized state, just set size and position
                    let _ = main_window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: window_state.width as u32,
                        height: window_state.height as u32,
                    }));

                    let _ =
                        main_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                            x: window_state.pos_x,
                            y: window_state.pos_y,
                        }));
                }

                // Show window after applying settings
                let _ = main_window.show();

                logger::internal_log_info("✓ Main window configured and shown");
            } else {
                logger::internal_log_warn("Main window not found!");
            }

            logger::internal_log_info("✓ Application setup complete");
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    // Cleanup server process when main window is closing
                    logger::internal_log_info("Main window closing, cleaning up server process...");

                    if let Some(app_state) = window.try_state::<commands::AppState>() {
                        if let Ok(mut server_process) = app_state.server_process.lock() {
                            if let Some(mut child) = server_process.take() {
                                let pid = child.id();
                                logger::internal_log_info(&format!(
                                    "Stopping server process (PID: {}) on window close...",
                                    pid
                                ));

                                match child.try_wait() {
                                    Ok(Some(_)) => {
                                        logger::internal_log_info(
                                            "Server process had already exited",
                                        );
                                    }
                                    Ok(None) | Err(_) => {
                                        #[cfg(target_os = "windows")]
                                        {
                                            use std::process::Command;
                                            let _ = Command::new("taskkill")
                                                .args(["/F", "/T", "/PID", &pid.to_string()])
                                                .output();
                                        }

                                        #[cfg(not(target_os = "windows"))]
                                        {
                                            let _ = child.kill();
                                        }

                                        let _ = child.wait();
                                        logger::internal_log_info(
                                            "Server process stopped successfully",
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            logger::log_info,
            logger::log_warn,
            logger::log_error,
            logger::log_debug,
            logger::get_log_path,
            // Settings commands
            commands::get_settings,
            commands::save_settings,
            commands::update_window_settings,
            // Global settings commands
            commands::get_global_settings,
            commands::get_window_state,
            commands::save_window_state,
            commands::remove_window_state,
            commands::update_general_settings,
            commands::update_appearance_settings,
            commands::get_groq_api_key,
            commands::update_groq_api_key,
            // Workspace commands
            commands::get_workspace_state,
            commands::save_workspace_state,
            commands::get_project_workspace_state,
            commands::save_project_workspace_state,
            commands::save_workspace_to_project_path,
            // Recent projects commands
            commands::get_recent_projects,
            commands::add_recent_project,
            commands::remove_recent_project,
            commands::clear_recent_projects,
            // Project management commands
            commands::is_directory_empty,
            commands::initialize_project,
            commands::is_valid_project,
            commands::get_project_name,
            commands::get_current_project_path,
            commands::set_current_project_path,
            commands::open_project,
            commands::create_project,
            // Window management commands
            commands::create_child_window,
            // File system commands
            commands::read_directory,
            commands::read_directory_recursive,
            commands::get_file_info,
            // Data loader commands
            commands::ingest_docs_from_url,
            // File sharing commands
            commands::zip_and_send_files,
            // Server management commands
            commands::start_python_server,
            commands::stop_python_server,
            commands::is_server_running,
            // Data load commands (from data_load module)
            data_load::from_csv,
            data_load::from_excel,
            data_load::from_parquet,
            data_load::from_netcdf,
            // Database commands (from db module)
            db::get_databases,
            db::get_tables,
            db::drop_table,
            db::truncate_table,
            db::get_table_schema,
            db::execute_sql_query,
            // File operations commands
            file_operations::create_file,
            file_operations::create_folder,
            file_operations::delete_file,
            file_operations::read_file_content,
            file_operations::write_file_content,
            file_operations::is_file_binary,
            file_operations::delete_folder,
            file_operations::rename_entry,
            file_operations::copy_entry,
            file_operations::move_entry,
            // Chat commands
            chat::create_chat_session,
            chat::get_chat_sessions,
            chat::get_chat_history,
            chat::delete_chat_session,
            // System commands
            commands::get_system_stats,
            // Auth commands
            auth::sign_up,
            auth::confirm_sign_up,
            auth::sign_in,
            auth::sign_out,
            auth::forgot_password,
            auth::confirm_forgot_password,
            auth::get_current_user,
            auth::send_file_to_user,
            auth::check_incoming_transfers,
            auth::accept_transfer,
            commands::flux::create_flux_view,
            commands::flux::preview_flux_view,
            commands::flux::save_view_as_table,
            commands::flux::get_view_schema
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
