use duckdb::Connection;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct FluxPreview {
    pub columns: Vec<String>,
    #[serde(rename = "rows")]
    pub sample_data: Vec<Vec<String>>,
    pub row_count: i64,
}

#[derive(Serialize)]
pub struct SchemaItem {
    pub cid: i64,
    pub name: String,
    pub r#type: String,
    pub notnull: bool,
    pub dflt_value: Option<String>,
    pub pk: bool,
}

#[tauri::command]
pub fn create_flux_view(
    project_path: String,
    view_name: String,
    sql_query: String,
) -> Result<(), String> {
    let db_path = Path::new(&project_path)
        .join("data")
        .join("project_data.db");

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let create_view_sql = format!("CREATE OR REPLACE VIEW \"{}\" AS {}", view_name, sql_query);

    conn.execute(&create_view_sql, [])
        .map_err(|e| format!("Failed to create view: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_view_schema(project_path: String, tableName: String) -> Result<Vec<SchemaItem>, String> {
    let db_path = Path::new(&project_path)
        .join("data")
        .join("project_data.db");

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info('{}')", tableName))
        .map_err(|e| format!("Failed to prepare schema query: {}", e))?;

    let schema_iter = stmt
        .query_map([], |row| {
            // dflt_value can be null, so handle Option
            let dflt_val: Option<String> = row.get(4).ok();
            Ok(SchemaItem {
                cid: row.get(0)?,
                name: row.get(1)?,
                r#type: row.get(2)?,
                notnull: row.get(3)?,
                dflt_value: dflt_val,
                pk: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to fetch schema: {}", e))?;

    let mut schema = Vec::new();
    for item in schema_iter {
        schema.push(item.map_err(|e| format!("Schema row error: {}", e))?);
    }

    Ok(schema)
}

#[tauri::command]
pub fn preview_flux_view(
    project_path: String,
    view_name: String,
    limit: Option<i64>,
) -> Result<FluxPreview, String> {
    let db_path = Path::new(&project_path)
        .join("data")
        .join("project_data.db");

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // 1. Get row count
    let count_query = format!("SELECT COUNT(*) FROM \"{}\"", view_name);
    let row_count: i64 = conn
        .query_row(&count_query, [], |row| row.get(0))
        .unwrap_or(0);

    // 2. Get Columns via PRAGMA to avoid Statement panic issues
    let mut column_names = Vec::new();
    let mut col_stmt = conn
        .prepare(&format!("PRAGMA table_info('{}')", view_name))
        .map_err(|e| format!("Failed to prepare column info: {}", e))?;

    let col_rows = col_stmt
        .query_map([], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        })
        .map_err(|e| format!("Failed to query columns: {}", e))?;

    for name in col_rows {
        column_names.push(name.map_err(|e| format!("Column error: {}", e))?);
    }

    // 3. Get Data
    let limit_val = limit.unwrap_or(50);
    let select_query = format!("SELECT * FROM \"{}\" LIMIT {}", view_name, limit_val);
    let mut stmt = conn
        .prepare(&select_query)
        .map_err(|e| format!("Failed to prepare select: {}", e))?;

    let column_count = column_names.len();

    let mut rows = stmt
        .query([])
        .map_err(|e| format!("Failed to execute query: {}", e))?;

    let mut sample_data: Vec<Vec<String>> = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|e| format!("Failed to get next row: {}", e))?
    {
        let mut row_values = Vec::new();
        for i in 0..column_count {
            let value_str = match row.get_ref(i) {
                Ok(val_ref) => {
                    use duckdb::types::ValueRef;
                    match val_ref {
                        ValueRef::Null => "".to_string(),
                        ValueRef::Boolean(b) => b.to_string(),
                        ValueRef::TinyInt(i) => i.to_string(),
                        ValueRef::SmallInt(i) => i.to_string(),
                        ValueRef::Int(i) => i.to_string(),
                        ValueRef::BigInt(i) => i.to_string(),
                        ValueRef::HugeInt(i) => i.to_string(),
                        ValueRef::UTinyInt(i) => i.to_string(),
                        ValueRef::USmallInt(i) => i.to_string(),
                        ValueRef::UInt(i) => i.to_string(),
                        ValueRef::UBigInt(i) => i.to_string(),
                        ValueRef::Float(f) => f.to_string(),
                        ValueRef::Double(f) => f.to_string(),
                        ValueRef::Text(s) => String::from_utf8_lossy(s).to_string(),
                        ValueRef::Blob(b) => format!("<BLOB {} bytes>", b.len()),
                        _ => format!("{:?}", val_ref),
                    }
                }
                Err(_) => "".to_string(),
            };
            row_values.push(value_str);
        }
        sample_data.push(row_values);
    }

    Ok(FluxPreview {
        columns: column_names,
        sample_data,
        row_count,
    })
}

#[tauri::command]
pub fn save_view_as_table(
    project_path: String,
    source_view: String,
    new_table_name: String,
) -> Result<(), String> {
    let db_path = Path::new(&project_path)
        .join("data")
        .join("project_data.db");

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let create_table_sql = format!(
        "CREATE TABLE \"{}\" AS SELECT * FROM \"{}\"",
        new_table_name, source_view
    );

    conn.execute(&create_table_sql, [])
        .map_err(|e| format!("Failed to save table (it might already exist): {}", e))?;

    Ok(())
}
