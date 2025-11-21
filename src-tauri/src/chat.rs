use duckdb::Connection;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub created_at: String,
}

fn get_chat_db_path(data_path: &str) -> PathBuf {
    Path::new(data_path).join("chat_history.db")
}

fn ensure_chat_db_schema(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            summary TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create sessions table: {}", e))?;

    conn.execute("CREATE SEQUENCE IF NOT EXISTS message_id_seq", [])
        .map_err(|e| format!("Failed to create sequence: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER DEFAULT nextval('message_id_seq'),
            session_id VARCHAR,
            role VARCHAR,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| format!("Failed to create messages table: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn create_chat_session(data_path: String) -> Result<String, String> {
    let db_path = get_chat_db_path(&data_path);

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    ensure_chat_db_schema(&conn)?;

    let session_id = Uuid::new_v4().to_string();

    conn.execute("INSERT INTO sessions (id) VALUES (?)", [&session_id])
        .map_err(|e| format!("Failed to create session: {}", e))?;

    Ok(session_id)
}

#[tauri::command]
pub fn get_chat_sessions(data_path: String) -> Result<Vec<ChatSession>, String> {
    let db_path = get_chat_db_path(&data_path);

    // If database doesn't exist, return empty list
    if !db_path.exists() {
        return Ok(Vec::new());
    }

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    ensure_chat_db_schema(&conn)?;

    let mut stmt = conn
        .prepare("SELECT id, CAST(created_at AS VARCHAR) as created_at FROM sessions ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let sessions = stmt
        .query_map([], |row| {
            Ok(ChatSession {
                id: row.get(0)?,
                created_at: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query sessions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect sessions: {}", e))?;

    Ok(sessions)
}

#[tauri::command]
pub fn get_chat_history(session_id: String, data_path: String) -> Result<Vec<ChatMessage>, String> {
    let db_path = get_chat_db_path(&data_path);

    if !db_path.exists() {
        return Err("Chat database not found".to_string());
    }

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    ensure_chat_db_schema(&conn)?;

    let mut stmt = conn
        .prepare("SELECT role, content, CAST(created_at AS VARCHAR) as created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let messages = stmt
        .query_map([&session_id], |row| {
            Ok(ChatMessage {
                role: row.get(0)?,
                content: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query messages: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect messages: {}", e))?;

    // Verify the session exists even if it has no messages
    if messages.is_empty() {
        let session_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sessions WHERE id = ?",
                [&session_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check session existence: {}", e))?;

        if !session_exists {
            return Err("Session not found".to_string());
        }
    }

    Ok(messages)
}

#[tauri::command]
pub fn delete_chat_session(session_id: String, data_path: String) -> Result<(), String> {
    let db_path = get_chat_db_path(&data_path);

    if !db_path.exists() {
        return Err("Chat database not found".to_string());
    }

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    ensure_chat_db_schema(&conn)?;

    // Delete messages first
    conn.execute("DELETE FROM messages WHERE session_id = ?", [&session_id])
        .map_err(|e| format!("Failed to delete messages: {}", e))?;

    // Then delete session
    conn.execute("DELETE FROM sessions WHERE id = ?", [&session_id])
        .map_err(|e| format!("Failed to delete session: {}", e))?;

    Ok(())
}
