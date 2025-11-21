// Window Management Commands

use tauri::Manager;

/// Create a modal child window that locks its parent
///
/// This creates a dialog window with the following properties:
/// - Modal behavior: parent window is disabled until child is closed
/// - No minimize/maximize buttons (only close button)
/// - Stays on top of parent
/// - Hidden from taskbar
/// - When parent minimizes/closes, child follows
/// - Loads window state from global_settings.toml
#[tauri::command]
pub async fn create_child_window(
    app: tauri::AppHandle,
    parent_label: String,
    label: String,
    title: String,
    url: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use crate::commands::AppState;

    // Check if window already exists
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Get the parent window
    let parent_window = app
        .get_webview_window(&parent_label)
        .ok_or_else(|| format!("Parent window '{}' not found", parent_label))?;

    // Load window settings
    let app_state = app.state::<AppState>();
    let window_state = if let Ok(global_settings) = app_state.global_settings.lock() {
        global_settings.get_window_state(&label)
    } else {
        // Fallback to defaults if lock fails
        crate::utils::global_settings::WindowState::child_default(width as i32, height as i32)
    };

    // Parse the URL
    let webview_url = if url.starts_with("http://") || url.starts_with("https://") {
        // External URL (dev mode)
        let parsed_url: tauri::Url = url.parse().map_err(|e| format!("Invalid URL: {}", e))?;
        tauri::WebviewUrl::External(parsed_url)
    } else {
        // App URL (production mode) - relative path
        tauri::WebviewUrl::App(url.into())
    };

    // Create new child window with modal properties
    let child_window = tauri::WebviewWindowBuilder::new(&app, label.clone(), webview_url)
        .title(title)
        .inner_size(window_state.width as f64, window_state.height as f64)
        .position(window_state.pos_x as f64, window_state.pos_y as f64)
        .resizable(true)
        .minimizable(false)
        .maximizable(false)
        .closable(true)
        .focused(true)
        .visible(false) // Start hidden, show after setup
        .decorations(false) // Custom window controls
        .skip_taskbar(true)
        .parent(&parent_window)
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;

    // Set always on top to keep child above parent
    child_window
        .set_always_on_top(true)
        .map_err(|e| e.to_string())?;

    // Show child window
    child_window.show().map_err(|e| e.to_string())?;

    // Bring child window to front
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;

        if let Ok(child_hwnd) = child_window.hwnd() {
            unsafe {
                let _ = SetForegroundWindow(HWND(child_hwnd.0 as *mut _));
            }
        }
    }

    // Setup event listeners for parent-child synchronization
    let parent_label_clone = parent_label.clone();
    let label_clone = label.clone();
    let app_handle = app.clone();
    child_window.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                // Note: Window state is saved by the frontend hook with debouncing
                // This is just for cleanup and re-focusing parent

                // Re-focus parent window when child closes
                #[cfg(target_os = "windows")]
                {
                    use windows::Win32::Foundation::HWND;
                    use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;

                    if let Some(parent) = app_handle.get_webview_window(&parent_label_clone) {
                        if let Ok(parent_hwnd) = parent.hwnd() {
                            unsafe {
                                let _ = SetForegroundWindow(HWND(parent_hwnd.0 as *mut _));
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    });

    Ok(())
}

/// Close a child window and re-enable its parent
#[tauri::command]
pub async fn close_child_window(
    app: tauri::AppHandle,
    parent_label: String,
    label: String,
) -> Result<(), String> {
    // Get the child window
    if let Some(child_window) = app.get_webview_window(&label) {
        // Re-focus parent window before closing child
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;

            if let Some(parent) = app.get_webview_window(&parent_label) {
                if let Ok(parent_hwnd) = parent.hwnd() {
                    unsafe {
                        let _ = SetForegroundWindow(HWND(parent_hwnd.0 as *mut _));
                    }
                }
            }
        }

        // Close the child window
        child_window.close().map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Check if a window exists
#[tauri::command]
pub fn window_exists(app: tauri::AppHandle, label: String) -> bool {
    app.get_webview_window(&label).is_some()
}

