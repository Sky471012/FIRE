use crate::db;
use calamine::{open_workbook, Reader, Xlsx};
use regex::Regex;
use std::path::PathBuf;

pub fn valid_name(file_name: String) -> String {
    let mut table_name = Regex::new(r"[^a-zA-Z0-9]")
        .unwrap()
        .replace_all(&file_name, "_")
        .to_string();
    if !table_name.is_empty() && table_name.chars().nth(0).unwrap().is_digit(10) {
        table_name = format!("t_{}", table_name);
    }
    table_name
}

#[tauri::command]
pub fn from_csv(file_path: String, project_path: String) {
    let file_name = std::path::Path::new(&file_path).file_stem();
    if let Some(n) = file_name {
        let table_name = valid_name(n.to_string_lossy().to_string());
        let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
        std::fs::create_dir_all(path_dir.clone()).unwrap();
        let db_path = path_dir
            .join("project_data.db")
            .to_string_lossy()
            .to_string();
        let _ = db::execute_query(
            db_path,
            "CREATE TABLE IF NOT EXISTS {table_name} AS
            SELECT *
            FROM read_csv(
                '{file_path}',
                header = true
            )"
            .to_string(),
        )
        .unwrap();
    }
}

#[tauri::command]
pub fn from_excel(file_path: String, project_path: String) -> Result<(), String> {
    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .ok_or("Invalid file path: no file stem")?;

    let file_stem = file_name.to_string_lossy().to_string();
    let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
    std::fs::create_dir_all(path_dir.clone()).map_err(|e| e.to_string())?;

    let db_path = path_dir
        .join("project_data.db")
        .to_string_lossy()
        .to_string();

    db::execute_query(db_path.clone(), "INSTALL excel;".to_string()).map_err(|e| e.to_string())?;
    db::execute_query(db_path.clone(), "LOAD excel;".to_string()).map_err(|e| e.to_string())?;

    let workbook: Xlsx<_> = open_workbook(file_path.clone()).map_err(|e| format!("{}", e))?;
    let sheets = workbook.sheet_names().to_owned();

    for sheet in sheets {
        let safe_sheet = valid_name(sheet.clone());
        let table_name = format!("{}_{}", file_stem, safe_sheet);

        let query = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_xlsx('{}', sheet='{}', header=true)",
            table_name, file_path, sheet
        );

        db::execute_query(db_path.clone(), query).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn from_netcdf(file_path: String, project_path: String) -> Result<(), String> {
    
    Ok(())
}

#[tauri::command]
pub fn from_parquet(file_path: String, project_path: String) -> Result<(), String> {
    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .ok_or("Invalid file path: no file stem")?;

    let file_stem = file_name.to_string_lossy().to_string();
    let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
    std::fs::create_dir_all(path_dir.clone()).map_err(|e| e.to_string())?;

    let db_path = path_dir
        .join("project_data.db")
        .to_string_lossy()
        .to_string();

    let table_name = valid_name(file_stem);

    let query = format!(
        "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_parquet('{}')",
        table_name, file_path
    );

    db::execute_query(db_path, query).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::valid_name;

    #[test]
    fn valid_name_test() {
        assert_eq!(valid_name("hello world".to_string()), "hello_world");
        assert_eq!(valid_name("file-name".to_string()), "file_name");
        assert_eq!(valid_name("data@set#1".to_string()), "data_set_1");
        assert_eq!(valid_name("1file".to_string()), "t_1file");
        assert_eq!(valid_name("9".to_string()), "t_9");
        assert_eq!(valid_name("123_name".to_string()), "t_123_name");
    }
}
