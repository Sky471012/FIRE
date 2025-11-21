// File System Commands

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileSystemEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<i64>,
    pub children: Option<Vec<FileSystemEntry>>,
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileSystemEntry>, String> {
    use std::fs;
    use std::path::Path;

    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let entries = fs::read_dir(dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().ok();

        let is_directory = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = metadata
            .as_ref()
            .and_then(|m| if !m.is_dir() { Some(m.len()) } else { None });
        let modified = metadata.as_ref().and_then(|m| {
            m.modified().ok().and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .map(|d| d.as_secs() as i64)
            })
        });

        let name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path().to_string_lossy().to_string();

        result.push(FileSystemEntry {
            name,
            path: entry_path,
            is_directory,
            size,
            modified,
            children: None,
        });
    }

    // Sort: directories first, then alphabetically
    result.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(result)
}

#[tauri::command]
pub fn read_directory_recursive(
    path: String,
    max_depth: Option<u32>,
) -> Result<FileSystemEntry, String> {
    use std::fs;
    use std::path::Path;

    let max_depth = max_depth.unwrap_or(3); // Default max depth

    fn read_recursive(
        path: &Path,
        current_depth: u32,
        max_depth: u32,
    ) -> Result<FileSystemEntry, String> {
        let metadata = fs::metadata(path).map_err(|e| format!("Failed to read metadata: {}", e))?;

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let path_str = path.to_string_lossy().to_string();
        let is_directory = metadata.is_dir();
        let size = if !is_directory {
            Some(metadata.len())
        } else {
            None
        };
        let modified = metadata.modified().ok().and_then(|t| {
            t.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|d| d.as_secs() as i64)
        });

        let mut children = None;

        if is_directory && current_depth < max_depth {
            if let Ok(entries) = fs::read_dir(path) {
                let mut child_entries = Vec::new();

                for entry in entries.flatten() {
                    if let Ok(child) = read_recursive(&entry.path(), current_depth + 1, max_depth) {
                        child_entries.push(child);
                    }
                }

                // Sort: directories first, then alphabetically
                child_entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                });

                children = Some(child_entries);
            }
        }

        Ok(FileSystemEntry {
            name,
            path: path_str,
            is_directory,
            size,
            modified,
            children,
        })
    }

    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    read_recursive(dir_path, 0, max_depth)
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileSystemEntry, String> {
    use std::fs;
    use std::path::Path;

    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }

    let metadata =
        fs::metadata(file_path).map_err(|e| format!("Failed to read metadata: {}", e))?;

    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let is_directory = metadata.is_dir();
    let size = if !is_directory {
        Some(metadata.len())
    } else {
        None
    };
    let modified = metadata.modified().ok().and_then(|t| {
        t.duration_since(std::time::UNIX_EPOCH)
            .ok()
            .map(|d| d.as_secs() as i64)
    });

    Ok(FileSystemEntry {
        name,
        path: path.clone(),
        is_directory,
        size,
        modified,
        children: None,
    })
}
