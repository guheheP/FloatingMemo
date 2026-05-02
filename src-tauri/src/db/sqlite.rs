use super::{Note, NoteRepository, DEFAULT_NOTE_ID};
use crate::error::{AppError, AppResult};
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Mutex;

const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    pinned      INTEGER NOT NULL DEFAULT 0,
    tags        TEXT NOT NULL DEFAULT '[]'
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    content,
    content='notes',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;

pub struct SqliteNoteRepository {
    conn: Mutex<Connection>,
}

impl SqliteNoteRepository {
    pub fn new(db_path: &Path) -> AppResult<Self> {
        let conn = Connection::open(db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA foreign_keys=ON;",
        )?;
        conn.execute_batch(SCHEMA_SQL)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn lock_conn(&self) -> AppResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|e| AppError::Other(format!("conn mutex poisoned: {e}")))
    }
}

fn row_to_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    let tags_json: String = row.get("tags")?;
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    Ok(Note {
        id: row.get("id")?,
        content: row.get("content")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        pinned: row.get::<_, i64>("pinned")? != 0,
        tags,
    })
}

impl NoteRepository for SqliteNoteRepository {
    fn get_or_create_default(&self) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let existing = conn
            .query_row(
                "SELECT id, content, created_at, updated_at, pinned, tags
                 FROM notes WHERE id = ?1",
                params![DEFAULT_NOTE_ID],
                row_to_note,
            )
            .ok();

        if let Some(note) = existing {
            return Ok(note);
        }

        let note = Note::new_default();
        conn.execute(
            "INSERT INTO notes (id, content, created_at, updated_at, pinned, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                note.id,
                note.content,
                note.created_at,
                note.updated_at,
                note.pinned as i64,
                serde_json::to_string(&note.tags).unwrap_or_else(|_| "[]".to_string()),
            ],
        )?;
        Ok(note)
    }

    fn save_content(&self, id: &str, content: &str) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        let updated = conn.execute(
            "UPDATE notes SET content = ?1, updated_at = ?2 WHERE id = ?3",
            params![content, now, id],
        )?;
        if updated == 0 {
            return Err(AppError::NotFound(id.to_string()));
        }
        let note = conn.query_row(
            "SELECT id, content, created_at, updated_at, pinned, tags
             FROM notes WHERE id = ?1",
            params![id],
            row_to_note,
        )?;
        Ok(note)
    }

    fn list_all(&self) -> AppResult<Vec<Note>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, content, created_at, updated_at, pinned, tags
             FROM notes ORDER BY pinned DESC, updated_at DESC",
        )?;
        let rows = stmt.query_map([], row_to_note)?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn make_repo() -> (tempfile::TempDir, SqliteNoteRepository) {
        let dir = tempdir().unwrap();
        let db = dir.path().join("test.db");
        let repo = SqliteNoteRepository::new(&db).unwrap();
        (dir, repo)
    }

    #[test]
    fn get_or_create_default_creates_then_returns_same() {
        let (_dir, repo) = make_repo();
        let a = repo.get_or_create_default().unwrap();
        let b = repo.get_or_create_default().unwrap();
        assert_eq!(a.id, DEFAULT_NOTE_ID);
        assert_eq!(a.id, b.id);
        assert_eq!(a.created_at, b.created_at);
    }

    #[test]
    fn save_content_updates_and_persists() {
        let (_dir, repo) = make_repo();
        let _ = repo.get_or_create_default().unwrap();
        let saved = repo.save_content(DEFAULT_NOTE_ID, "hello world").unwrap();
        assert_eq!(saved.content, "hello world");
        let again = repo.get_or_create_default().unwrap();
        assert_eq!(again.content, "hello world");
        assert!(again.updated_at >= again.created_at);
    }

    #[test]
    fn save_content_unknown_id_returns_not_found() {
        let (_dir, repo) = make_repo();
        let err = repo.save_content("nope", "x").unwrap_err();
        match err {
            AppError::NotFound(id) => assert_eq!(id, "nope"),
            other => panic!("unexpected error: {other:?}"),
        }
    }
}
