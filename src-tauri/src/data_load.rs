use crate::db;
use calamine::{open_workbook, Reader, Xlsx};
// use netcdf;  // Commented out for faster dev builds
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

#[tauri::command]
pub fn from_pdf(file_path: String, project_path: String) -> Result<(), String> {
    Ok(())
}

// NetCDF support commented out for faster dev builds
/*
#[tauri::command]
pub fn from_netcdf(file_path: String, project_path: String) -> Result<(), String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|e| format!("Failed to acquire database lock: {}", e))?;

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

    println!("[DEBUG] Opening NetCDF file");
    let nc_file = netcdf::open(file_path.clone())
        .map_err(|e| format!("Failed to open NetCDF file: {}", e))?;

    println!("[DEBUG] Reading dimensions");
    let dimensions: Vec<_> = nc_file.dimensions().collect();
    println!(
        "[DEBUG] Found {} dimensions: {:?}",
        dimensions.len(),
        dimensions.iter().map(|d| d.name()).collect::<Vec<_>>()
    );

    println!("[DEBUG] Reading variables");
    let variables: Vec<_> = nc_file.variables().collect();
    println!(
        "[DEBUG] Found {} variables: {:?}",
        variables.len(),
        variables.iter().map(|v| v.name()).collect::<Vec<_>>()
    );

    // Find variables that have the same dimensions (coordinate system)
    // Typically this will be the main data variables
    if variables.is_empty() {
        return Err("No variables found in NetCDF file".to_string());
    }

    // Get dimension variable names (coordinate variables) to exclude them
    let dim_var_names: Vec<String> = dimensions.iter().map(|d| d.name().to_string()).collect();
    println!(
        "[DEBUG] Dimension variable names to exclude: {:?}",
        dim_var_names
    );

    // Use the first multi-dimensional DATA variable (not coordinate variable) to determine the grid structure
    let main_vars: Vec<_> = variables
        .iter()
        .filter(|v| {
            let num_dims = v.dimensions().into_iter().count();
            // Must have multiple dimensions AND not be a coordinate variable
            num_dims > 1 && !dim_var_names.contains(&v.name().to_string())
        })
        .collect();

    if main_vars.is_empty() {
        return Err(
            "No multi-dimensional data variables found (only found coordinate variables)"
                .to_string(),
        );
    }

    println!(
        "[DEBUG] Using variable '{}' as template",
        main_vars[0].name()
    );

    // Get the dimension structure from the first data variable
    let dim_names: Vec<String> = main_vars[0]
        .dimensions()
        .into_iter()
        .map(|d| valid_name(d.name().to_string()))
        .collect();
    let dim_sizes: Vec<usize> = main_vars[0]
        .dimensions()
        .into_iter()
        .map(|d| d.len())
        .collect();

    println!(
        "[DEBUG] Using dimensions: {:?} with sizes {:?}",
        dim_names, dim_sizes
    );

    // Collect all variables with the same dimensions, excluding coordinate variables
    let compatible_vars: Vec<_> = variables
        .iter()
        .filter(|v| {
            // Exclude coordinate variables (variables with same name as dimensions)
            if dim_var_names.contains(&v.name().to_string()) {
                return false;
            }

            let v_dims: Vec<_> = v.dimensions().into_iter().map(|d| d.name()).collect();
            let main_dims: Vec<_> = main_vars[0]
                .dimensions()
                .into_iter()
                .map(|d| d.name())
                .collect();
            v_dims == main_dims
        })
        .collect();

    println!(
        "[DEBUG] Found {} compatible variables",
        compatible_vars.len()
    );

    let table_name = valid_name(file_stem);

    // Build column list: dimensions + all variable names
    let mut columns = dim_names.clone();
    for var in &compatible_vars {
        columns.push(valid_name(var.name().to_string()));
    }

    println!("[DEBUG] Creating table with columns: {:?}", columns);

    // Create table
    db::create_table_with_columns(db_path.clone(), table_name.clone(), columns.clone())?;

    // Calculate total number of rows
    let total_rows: usize = dim_sizes.iter().product();
    println!("[DEBUG] Will insert {} rows", total_rows);

    // Read all variable data
    let mut var_data: Vec<Vec<f64>> = Vec::new();
    for var in &compatible_vars {
        println!("[DEBUG] Reading variable: {}", var.name());

        // Try different types and convert to f64
        let values: Vec<f64> = if let Ok(vals) = var.get_values::<f64, _>(..) {
            vals
        } else if let Ok(vals) = var.get_values::<f32, _>(..) {
            vals.into_iter().map(|v| v as f64).collect()
        } else if let Ok(vals) = var.get_values::<i32, _>(..) {
            vals.into_iter().map(|v| v as f64).collect()
        } else if let Ok(vals) = var.get_values::<i16, _>(..) {
            vals.into_iter().map(|v| v as f64).collect()
        } else {
            return Err(format!("Unsupported type for variable {}", var.name()));
        };

        if values.len() != total_rows {
            return Err(format!(
                "Variable {} has {} values but expected {}",
                var.name(),
                values.len(),
                total_rows
            ));
        }

        var_data.push(values);
    }

    println!("[DEBUG] Using DuckDB Appender for fast bulk insert");

    // Use DuckDB's Appender API for much faster inserts
    db::bulk_insert_with_appender(db_path, table_name, &dim_sizes, var_data)?;

    println!("[DEBUG] NetCDF import completed successfully");
    Ok(())
}
*/

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

    // NetCDF test commented out for faster dev builds
    /*
    #[test]
    fn test_from_netcdf() {
        let test_dir = "C:\\USERS\\ARINC\\GAIA_DUMMY1";
        let result = from_netcdf(
            "C:\\Users\\arinc\\Documents\\code\\sample.nc".to_string(),
            test_dir.to_string(),
        );
        match result {
            Ok(_) => println!("from_netcdf: SUCCESS"),
            Err(e) => println!("from_netcdf: ERROR - {}", e),
        }
    }
    */
}
