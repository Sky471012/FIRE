// Window Management Commands

#[tauri::command]
pub async fn create_child_window(
    app: tauri::AppHandle,
    label: String,
    title: String,
    url: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::Manager;

    // Check if window already exists
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Parse the URL - External expects a url::Url type
    let parsed_url: tauri::Url = url.parse().map_err(|e| format!("Invalid URL: {}", e))?;

    // Create new window
    tauri::WebviewWindowBuilder::new(&app, label.clone(), tauri::WebviewUrl::External(parsed_url))
        .title(title)
        .inner_size(width, height)
        .resizable(true)
        .minimizable(false)
        .maximizable(false)
        .center()
        .focused(true)
        .visible(true)
        .decorations(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
