use duckdb::{Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
    pub column_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableData {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: i64,
}

#[tauri::command]
pub fn get_databases(
    project_path: String,
) -> Result<Vec<DatabaseInfo>, String> {
    let data_path = std::path::Path::new(&project_path).join("data");
    if !data_path.exists() {
        return Ok(Vec::new());
    }
    let mut databases = Vec::new();
    match std::fs::read_dir(&data_path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "db" {
                            let name = path
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("unknown.db")
                                .to_string();
                            let size = entry.metadata().ok().map(|m| m.len()).unwrap_or(0);

                            databases.push(DatabaseInfo {
                                name,
                                path: path.to_string_lossy().to_string(),
                                size,
                            });
                        }
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("failed to read data directory: {}", e));
        }
    }
    Ok(databases)
}

#[tauri::command]
pub fn get_tables(db_path: String) -> Result<Vec<TableInfo>, String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let tables: Result<Vec<TableInfo>, String> = stmt
        .query_map([], |row| {
            let table_name: String = row.get(0)?;
            Ok(table_name)
        })
        .map_err(|e| format!("Failed to query tables: {}", e))?
        .map(|result| {
            let table_name: String = result.map_err(|e| format!("Failed to get table name: {}", e))?;

            let row_count: i64 = conn
                .query_row(
                    &format!("SELECT COUNT(*) FROM \"{}\"", table_name),
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            let column_count: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '{}'",
                        table_name
                    ),
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            Ok(TableInfo {
                name: table_name,
                row_count,
                column_count: column_count as usize,
            })
        })
        .collect();

    tables
}

#[tauri::command]
pub fn drop_table(db_path: String, table_name: String) -> Result<(), String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(&format!("DROP TABLE IF EXISTS \"{}\"", table_name), [])
        .map_err(|e| format!("Failed to drop table: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn truncate_table(db_path: String, table_name: String) -> Result<(), String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(&format!("DELETE FROM \"{}\"", table_name), [])
        .map_err(|e| format!("Failed to truncate table: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_table_schema(db_path: String, table_name: String) -> Result<Vec<ColumnInfo>, String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let query = format!(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{}' ORDER BY ordinal_position",
        table_name
    );

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let columns: Result<Vec<ColumnInfo>, String> = stmt
        .query_map([], |row| {
            Ok(ColumnInfo {
                name: row.get(0)?,
                data_type: row.get(1)?,
                nullable: row.get::<_, String>(2)? == "YES",
            })
        })
        .map_err(|e| format!("Failed to query columns: {}", e))?
        .map(|result| result.map_err(|e| format!("Failed to get column info: {}", e)))
        .collect();

    columns
}

#[tauri::command]
pub fn get_table_data(
    db_path: String,
    table_name: String,
    limit: i64,
    offset: i64,
) -> Result<TableData, String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let total_rows: i64 = conn
        .query_row(
            &format!("SELECT COUNT(*) FROM \"{}\"", table_name),
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get row count: {}", e))?;

    let columns = get_table_schema(db_path.clone(), table_name.clone())?;

    let query = format!(
        "SELECT * FROM \"{}\" LIMIT {} OFFSET {}",
        table_name, limit, offset
    );

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let mut rows_iter = stmt
        .query([])
        .map_err(|e| format!("Failed to execute query: {}", e))?;

    let column_count = columns.len();

    let mut rows_result: Vec<Vec<serde_json::Value>> = Vec::new();

    while let Some(row) = rows_iter
        .next()
        .map_err(|e| format!("Failed to get next row: {}", e))?
    {
        let mut values = Vec::new();
        for i in 0..column_count {
            let value = if let Ok(v) = row.get::<_, i64>(i) {
                serde_json::Value::Number(serde_json::Number::from(v))
            } else if let Ok(v) = row.get::<_, f64>(i) {
                serde_json::Value::Number(
                    serde_json::Number::from_f64(v).unwrap_or(serde_json::Number::from(0)),
                )
            } else if let Ok(v) = row.get::<_, String>(i) {
                serde_json::Value::String(v)
            } else if let Ok(v) = row.get::<_, bool>(i) {
                serde_json::Value::Bool(v)
            } else {
                match row.get_ref(i) {
                    Ok(val_ref) => {
                        use duckdb::types::ValueRef;
                        match val_ref {
                            ValueRef::Null => serde_json::Value::Null,
                            ValueRef::Boolean(b) => serde_json::Value::Bool(b),
                            ValueRef::TinyInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::SmallInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::Int(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::BigInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::HugeInt(i) => serde_json::Value::String(i.to_string()),
                            ValueRef::UTinyInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::USmallInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::UInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::UBigInt(i) => {
                                serde_json::Value::Number(serde_json::Number::from(i))
                            }
                            ValueRef::Float(f) => serde_json::Value::Number(
                                serde_json::Number::from_f64(f as f64)
                                    .unwrap_or(serde_json::Number::from(0)),
                            ),
                            ValueRef::Double(f) => serde_json::Value::Number(
                                serde_json::Number::from_f64(f)
                                    .unwrap_or(serde_json::Number::from(0)),
                            ),
                            ValueRef::Text(s) => {
                                serde_json::Value::String(String::from_utf8_lossy(s).to_string())
                            }
                            ValueRef::Blob(b) => {
                                serde_json::Value::String(format!("<BLOB {} bytes>", b.len()))
                            }
                            _ => serde_json::Value::String(format!("{:?}", val_ref)),
                        }
                    }
                    Err(_) => serde_json::Value::Null,
                }
            };
            values.push(value);
        }
        rows_result.push(values);
    }

    Ok(TableData {
        columns,
        rows: rows_result,
        total_rows,
    })
}

#[tauri::command]
pub fn execute_query(db_path: String, query: String) -> Result<TableData, String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let column_count = stmt.column_count();

    let mut rows = stmt
        .query([])
        .map_err(|e| format!("Failed to execute query: {}", e))?;

    let column_names: Vec<String> = (0..column_count).map(|i| format!("column_{}", i)).collect();

    let mut rows_result: Vec<Vec<serde_json::Value>> = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|e| format!("Failed to get next row: {}", e))?
    {
        let mut values = Vec::new();
        for i in 0..column_count {
            let value = match row.get_ref(i) {
                Ok(val_ref) => {
                    use duckdb::types::ValueRef;
                    match val_ref {
                        ValueRef::Null => serde_json::Value::Null,
                        ValueRef::Boolean(b) => serde_json::Value::Bool(b),
                        ValueRef::TinyInt(i) => {
                            serde_json::Value::Number(serde_json::Number::from(i))
                        }
                        ValueRef::SmallInt(i) => {
                            serde_json::Value::Number(serde_json::Number::from(i))
                        }
                        ValueRef::Int(i) => serde_json::Value::Number(serde_json::Number::from(i)),
                        ValueRef::BigInt(i) => {
                            serde_json::Value::Number(serde_json::Number::from(i))
                        }
                        ValueRef::HugeInt(i) => serde_json::Value::String(i.to_string()),
                        ValueRef::UTinyInt(i) => {
                            serde_json::Value::Number(serde_json::Number::from(i))
                        }
                        ValueRef::USmallInt(i) => {
                            serde_json::Value::Number(serde_json::Number::from(i))
                        }
                        ValueRef::UInt(i) => serde_json::Value::Number(serde_json::Number::from(i)),
                        ValueRef::UBigInt(i) => {
                            serde_json::Value::Number(serde_json::Number::from(i))
                        }
                        ValueRef::Float(f) => serde_json::Value::Number(
                            serde_json::Number::from_f64(f as f64)
                                .unwrap_or(serde_json::Number::from(0)),
                        ),
                        ValueRef::Double(f) => serde_json::Value::Number(
                            serde_json::Number::from_f64(f).unwrap_or(serde_json::Number::from(0)),
                        ),
                        ValueRef::Text(s) => {
                            serde_json::Value::String(String::from_utf8_lossy(s).to_string())
                        }
                        ValueRef::Blob(b) => {
                            serde_json::Value::String(format!("<BLOB {} bytes>", b.len()))
                        }
                        _ => serde_json::Value::String(format!("{:?}", val_ref)),
                    }
                }
                Err(_) => serde_json::Value::Null,
            };
            values.push(value);
        }
        rows_result.push(values);
    }

    let total_rows = rows_result.len() as i64;

    let columns: Vec<ColumnInfo> = column_names
        .into_iter()
        .map(|name| ColumnInfo {
            name,
            data_type: "UNKNOWN".to_string(),
            nullable: true,
        })
        .collect();

    Ok(TableData {
        columns,
        rows: rows_result,
        total_rows,
    })
}

pub fn execute_statement(db_path: String, statement: String) -> Result<(), String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(&statement, [])
        .map_err(|e| format!("Failed to execute statement: {}", e))?;

    drop(conn);

    Ok(())
}

pub fn create_table_with_columns(
    db_path: String,
    table_name: String,
    columns: Vec<String>,
) -> Result<(), String> {
    let create_query = format!(
        "CREATE TABLE IF NOT EXISTS \"{}\" ({})",
        table_name,
        columns
            .iter()
            .map(|c| format!("\"{}\" DOUBLE", c))
            .collect::<Vec<_>>()
            .join(", ")
    );

    execute_statement(db_path, create_query)
}

pub fn bulk_insert_rows(
    db_path: String,
    table_name: String,
    columns: Vec<String>,
    rows: Vec<Vec<String>>,
    batch_size: usize,
) -> Result<(), String> {
    if rows.is_empty() {
        return Ok(());
    }

    let column_list = columns
        .iter()
        .map(|c| format!("\"{}\"", c))
        .collect::<Vec<_>>()
        .join(", ");

    let total_rows = rows.len();
    let mut batch_start = 0;

    while batch_start < total_rows {
        let batch_end = std::cmp::min(batch_start + batch_size, total_rows);
        let batch = &rows[batch_start..batch_end];

        let values_str = batch
            .iter()
            .map(|row| format!("({})", row.join(", ")))
            .collect::<Vec<_>>()
            .join(", ");

        let insert_query = format!(
            "INSERT INTO \"{}\" ({}) VALUES {}",
            table_name, column_list, values_str
        );

        execute_statement(db_path.clone(), insert_query)?;

        batch_start = batch_end;

        if batch_start % 10000 == 0 && batch_start < total_rows {
            println!("[DEBUG] Inserted {} / {} rows", batch_start, total_rows);
        }
    }

    println!("[DEBUG] Successfully inserted {} rows", total_rows);
    Ok(())
}

/// Fast bulk insert using temporary CSV file + DuckDB's optimized CSV reader
///
/// This bypasses the slow SQL INSERT statements by:
/// 1. Writing data to a temporary CSV file
/// 2. Using DuckDB's native read_csv() which is highly optimized
/// 3. Cleaning up the temporary file
///
/// This is orders of magnitude faster than INSERT statements for large datasets.
///
/// # Arguments
/// * `db_path` - Path to the DuckDB database
/// * `table_name` - Name of the table to insert into
/// * `dim_sizes` - Sizes of each dimension (for multi-dimensional data)
/// * `var_data` - Vector of variable data, where each inner Vec<f64> contains all values for one variable
pub fn bulk_insert_with_appender(
    db_path: String,
    table_name: String,
    dim_sizes: &[usize],
    var_data: Vec<Vec<f64>>,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::{BufWriter, Write};

    let total_rows: usize = dim_sizes.iter().product();
    println!(
        "[DEBUG] Using temporary CSV for fast bulk insert of {} rows",
        total_rows
    );

    let start_time = std::time::Instant::now();

    // Create temporary CSV file
    let temp_csv_path = std::env::temp_dir().join(format!("netcdf_temp_{}.csv", table_name));
    println!("[DEBUG] Writing to temporary CSV: {:?}", temp_csv_path);

    let file =
        File::create(&temp_csv_path).map_err(|e| format!("Failed to create temp CSV: {}", e))?;
    let mut writer = BufWriter::new(file);

    // Write CSV data (no header needed, we'll use column indices)
    for flat_idx in 0..total_rows {
        // Calculate multi-dimensional indices
        let mut indices = vec![0; dim_sizes.len()];
        let mut remaining = flat_idx;

        for (dim_idx, &dim_size) in dim_sizes.iter().enumerate().rev() {
            indices[dim_idx] = remaining % dim_size;
            remaining /= dim_size;
        }

        // Write dimension values
        for (i, &idx) in indices.iter().enumerate() {
            if i > 0 {
                write!(writer, ",").map_err(|e| format!("Failed to write CSV: {}", e))?;
            }
            write!(writer, "{}", idx).map_err(|e| format!("Failed to write CSV: {}", e))?;
        }

        // Write variable values
        for var_values in &var_data {
            write!(writer, ",{}", var_values[flat_idx])
                .map_err(|e| format!("Failed to write CSV: {}", e))?;
        }

        writeln!(writer).map_err(|e| format!("Failed to write CSV: {}", e))?;

        // // Progress logging every 50k rows
        // if (flat_idx + 1) % 500000 == 0 && flat_idx + 1 < total_rows {
        //     let elapsed = start_time.elapsed().as_secs_f64();
        //     let rows_per_sec = (flat_idx + 1) as f64 / elapsed;
        //     println!(
        //         "[DEBUG] Written {} / {} rows to CSV ({:.0} rows/sec)",
        //         flat_idx + 1,
        //         total_rows,
        //         rows_per_sec
        //     );
        // }
    }

    writer
        .flush()
        .map_err(|e| format!("Failed to flush CSV: {}", e))?;
    drop(writer);

    let csv_write_time = start_time.elapsed().as_secs_f64();
    println!(
        "[DEBUG] CSV write completed in {:.2} seconds",
        csv_write_time
    );

    // Use DuckDB's fast CSV reader to load the data
    dbg!("[DEBUG] Loading CSV into DuckDB using read_csv()");
    let load_start = std::time::Instant::now();

    let temp_csv_str = temp_csv_path.to_string_lossy().to_string();
    let insert_query = format!(
        "INSERT INTO \"{}\" SELECT * FROM read_csv('{}', header=false, auto_detect=true)",
        table_name,
        temp_csv_str.replace('\\', "\\\\")
    );

    execute_statement(db_path, insert_query)?;

    let load_time = load_start.elapsed().as_secs_f64();
    println!("[DEBUG] DuckDB load completed in {:.2} seconds", load_time);

    std::fs::remove_file(&temp_csv_path)
        .map_err(|e| format!("Failed to remove temp CSV: {}", e))?;

    let total_time = start_time.elapsed().as_secs_f64();
    let rows_per_sec = total_rows as f64 / total_time;
    println!(
        "[DEBUG] Successfully loaded {} rows in {:.2} seconds ({:.0} rows/sec)",
        total_rows, total_time, rows_per_sec
    );

    Ok(())
}
