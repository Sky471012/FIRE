// Data Loader Commands

#[derive(Debug, Clone, serde::Serialize)]
pub struct DataLoadResult {
    pub success: bool,
    pub message: String,
    pub logs: Vec<String>,
}

/// Ingest documentation from URL using the link parser
#[tauri::command]
pub async fn ingest_docs_from_url(
    project_path: String,
    url: String,
    mode: String,
    max_depth: u32,
) -> Result<DataLoadResult, String> {
    // Verify project path exists
    if !std::path::Path::new(&project_path).exists() {
        return Err(format!("Project path not found: {}", project_path));
    }

    // Validate mode
    if mode != "static" && mode != "dynamic" {
        return Err("mode must be 'static' or 'dynamic'".to_string());
    }

    // Construct data_path (project_path/data)
    let data_path = std::path::Path::new(&project_path).join("data");

    // Create data directory if it doesn't exist
    if !data_path.exists() {
        std::fs::create_dir_all(&data_path)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let data_path_str = data_path.to_string_lossy().to_string();

    // Build the POST request URL
    let request_url = format!(
        "http://localhost:8001/docs/ingest?url={}&data_path={}&mode={}&max_depth={}&auto_embed=true",
        urlencoding::encode(&url),
        urlencoding::encode(&data_path_str),
        mode,
        max_depth
    );

    let _ = crate::utils::logger::log_info(format!("Ingesting docs from URL: {}", request_url));

    // Make the POST request
    let client = reqwest::Client::new();
    let response = client.post(&request_url).send().await.map_err(|e| {
        format!(
            "Failed to send request: {}. Make sure the Python server is running.",
            e
        )
    })?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .unwrap_or_else(|_| "Failed to read response".to_string());

    if status.is_success() {
        Ok(DataLoadResult {
            success: true,
            message: format!("Successfully ingested documentation from {}", url),
            logs: vec![response_text],
        })
    } else {
        Ok(DataLoadResult {
            success: false,
            message: format!("Failed to ingest documentation"),
            logs: vec![format!("HTTP {}: {}", status, response_text)],
        })
    }
}
