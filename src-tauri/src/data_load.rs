use crate::db;
use calamine::{open_workbook, Reader, Xlsx};
use netcdf;
use once_cell::sync::Lazy;
use regex::Regex;
use std::path::PathBuf;
use std::sync::Mutex;

static DB_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

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
pub fn from_csv(file_path: String, project_path: String) -> Result<(), String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|e| format!("Failed to acquire database lock: {}", e))?;

    println!("[DEBUG] from_csv called");
    println!("[DEBUG] Input file: {}", file_path);
    println!("[DEBUG] Project path: {}", project_path);

    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .ok_or("Invalid file path: no file stem")?;

    let table_name = valid_name(file_name.to_string_lossy().to_string());
    println!("[DEBUG] Table name: {}", table_name);

    let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
    println!("[DEBUG] Data directory: {}", path_dir.display());

    std::fs::create_dir_all(path_dir.clone()).map_err(|e| e.to_string())?;

    let db_path = path_dir
        .join("project_data.db")
        .to_string_lossy()
        .to_string();

    println!("[DEBUG] Database path: {}", db_path);
    println!(
        "[DEBUG] Database exists: {}",
        std::path::Path::new(&db_path).exists()
    );

    let query = format!(
        "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_csv('{}', header = true)",
        table_name, file_path
    );

    println!("[DEBUG] Executing query: {}", query);

    db::execute_statement(db_path.clone(), query).map_err(|e| e.to_string())?;

    println!("[DEBUG] CSV import completed successfully");
    Ok(())
}

#[tauri::command]
pub fn from_excel(file_path: String, project_path: String) -> Result<(), String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|e| format!("Failed to acquire database lock: {}", e))?;

    println!("[DEBUG] from_excel called");
    println!("[DEBUG] Input file: {}", file_path);
    println!("[DEBUG] Project path: {}", project_path);

    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .ok_or("Invalid file path: no file stem")?;

    let file_stem = file_name.to_string_lossy().to_string();
    println!("[DEBUG] File stem: {}", file_stem);

    let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
    println!("[DEBUG] Data directory: {}", path_dir.display());

    std::fs::create_dir_all(path_dir.clone()).map_err(|e| e.to_string())?;

    let db_path = path_dir
        .join("project_data.db")
        .to_string_lossy()
        .to_string();

    println!("[DEBUG] Database path: {}", db_path);
    println!(
        "[DEBUG] Database exists: {}",
        std::path::Path::new(&db_path).exists()
    );

    println!("[DEBUG] Installing excel extension");
    db::execute_statement(db_path.clone(), "INSTALL excel;".to_string())
        .map_err(|e| e.to_string())?;
    println!("[DEBUG] Loading excel extension");
    db::execute_statement(db_path.clone(), "LOAD excel;".to_string()).map_err(|e| e.to_string())?;

    println!("[DEBUG] Opening workbook");
    let workbook: Xlsx<_> = open_workbook(file_path.clone()).map_err(|e| format!("{}", e))?;
    let sheets = workbook.sheet_names().to_owned();
    println!("[DEBUG] Found {} sheets: {:?}", sheets.len(), sheets);

    for sheet in sheets {
        let safe_sheet = valid_name(sheet.clone());
        let table_name = format!("{}_{}", file_stem, safe_sheet);
        println!(
            "[DEBUG] Processing sheet '{}' -> table '{}'",
            sheet, table_name
        );

        let query = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_xlsx('{}', sheet='{}', header=true)",
            table_name, file_path, sheet
        );

        db::execute_statement(db_path.clone(), query).map_err(|e| e.to_string())?;
    }

    println!("[DEBUG] Excel import completed successfully");
    Ok(())
}

pub fn from_netcdf(file_path: String, project_path: String) -> Result<(), String> {
    println!("[DEBUG] from_netcdf called");
    println!("[DEBUG] Input file: {}", file_path);
    println!("[DEBUG] Project path: {}", project_path);
    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .ok_or("Invalid file path: no file stem")?;

    let file_stem = file_name.to_string_lossy().to_string();
    println!("[DEBUG] File stem: {}", file_stem);

    let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
    println!("[DEBUG] Data directory: {}", path_dir.display());

    std::fs::create_dir_all(path_dir.clone()).map_err(|e| e.to_string())?;

    let db_path = path_dir
        .join("project_data.db")
        .to_string_lossy()
        .to_string();

    let _file = netcdf::open(file_path.clone())
        .map_err(|e| format!("Failed to open NetCDF file: {}", e))?;

    let temp_var = _file.variable("name").unwrap();
    let temp_values: Vec<f32> = temp_var.get_values(..).unwrap();

    let table_name = valid_name(file_stem);
    let query = format!(
        "CREATE TABLE IF NOT EXISTS \"{}\" (
        //define table
    ) ",
        table_name
    );
    db::execute_query(db_path, query);

    println!("[DEBUG] NetCDF file opened successfully");
    Ok(())
}

#[tauri::command]
pub fn from_parquet(file_path: String, project_path: String) -> Result<(), String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|e| format!("Failed to acquire database lock: {}", e))?;

    println!("[DEBUG] from_parquet called");
    println!("[DEBUG] Input file: {}", file_path);
    println!("[DEBUG] Project path: {}", project_path);

    let file_name = std::path::Path::new(&file_path)
        .file_stem()
        .ok_or("Invalid file path: no file stem")?;

    let file_stem = file_name.to_string_lossy().to_string();
    let table_name = valid_name(file_stem);
    println!("[DEBUG] Table name: {}", table_name);

    let path_dir: PathBuf = std::path::Path::new(&project_path).join("data");
    println!("[DEBUG] Data directory: {}", path_dir.display());

    std::fs::create_dir_all(path_dir.clone()).map_err(|e| e.to_string())?;

    let db_path = path_dir
        .join("project_data.db")
        .to_string_lossy()
        .to_string();

    println!("[DEBUG] Database path: {}", db_path);
    println!(
        "[DEBUG] Database exists: {}",
        std::path::Path::new(&db_path).exists()
    );

    let query = format!(
        "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_parquet('{}')",
        table_name, file_path
    );

    println!("[DEBUG] Executing query: {}", query);

    db::execute_statement(db_path, query).map_err(|e| e.to_string())?;

    println!("[DEBUG] Parquet import completed successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_name_test() {
        assert_eq!(valid_name("hello world".to_string()), "hello_world");
        assert_eq!(valid_name("file-name".to_string()), "file_name");
        assert_eq!(valid_name("data@set#1".to_string()), "data_set_1");
        assert_eq!(valid_name("1file".to_string()), "t_1file");
        assert_eq!(valid_name("9".to_string()), "t_9");
        assert_eq!(valid_name("123_name".to_string()), "t_123_name");
    }

    #[test]
    fn test_from_csv() {
        let test_dir = "C:\\USERS\\ARINC\\GAIA_DUMMY1";
        let result = from_csv(
            "C:\\Users\\arinc\\Documents\\code\\customers.csv".to_string(),
            test_dir.to_string(),
        );
        match result {
            Ok(_) => println!("from_csv: SUCCESS"),
            Err(e) => println!("from_csv: ERROR - {}", e),
        }
    }

    #[test]
    fn test_from_excel() {
        let test_dir = "C:\\USERS\\ARINC\\GAIA_DUMMY1";
        let result = from_excel(
            "C:\\Users\\arinc\\Documents\\code\\data.xlsx".to_string(),
            test_dir.to_string(),
        );
        match result {
            Ok(_) => println!("from_excel: SUCCESS"),
            Err(e) => println!("from_excel: ERROR - {}", e),
        }
    }

    #[test]
    fn test_from_parquet() {
        let test_dir = "C:\\USERS\\ARINC\\GAIA_DUMMY1";
        let result = from_parquet(
            "C:\\Users\\arinc\\Documents\\code\\userdata.parquet".to_string(),
            test_dir.to_string(),
        );
        match result {
            Ok(_) => println!("from_parquet: SUCCESS"),
            Err(e) => println!("from_parquet: ERROR - {}", e),
        }
    }

    #[test]
    fn test_from_netcdf() {
        let test_dir = "C:\\USERS\\ARINC\\GAIA_DUMMY1";
        let result = from_netcdf(
            "C:\\Users\\arinc\\Documents\\code\\mera.nc".to_string(),
            test_dir.to_string(),
        );
        match result {
            Ok(_) => println!("from_netcdf: SUCCESS"),
            Err(e) => println!("from_netcdf: ERROR - {}", e),
        }
    }
}
