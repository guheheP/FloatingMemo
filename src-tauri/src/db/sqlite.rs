use super::{migrations, Note, NoteRepository, DEFAULT_NOTE_ID};
use crate::error::{AppError, AppResult};
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Mutex;
use uuid::Uuid;

const SELECT_COLS: &str =
    "id, title, kind, content, created_at, updated_at, pinned, sort_order, tags";

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
        migrations::run(&conn)?;
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
        title: row.get("title")?,
        kind: row.get("kind")?,
        content: row.get("content")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        pinned: row.get::<_, i64>("pinned")? != 0,
        sort_order: row.get("sort_order")?,
        tags,
    })
}

impl NoteRepository for SqliteNoteRepository {
    fn get_or_create_default(&self) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let existing = conn
            .query_row(
                &format!("SELECT {SELECT_COLS} FROM notes WHERE id = ?1"),
                params![DEFAULT_NOTE_ID],
                row_to_note,
            )
            .ok();

        if let Some(note) = existing {
            return Ok(note);
        }

        let note = Note::new_default();
        conn.execute(
            "INSERT INTO notes
                (id, title, kind, content, created_at, updated_at, pinned, sort_order, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                note.id,
                note.title,
                note.kind,
                note.content,
                note.created_at,
                note.updated_at,
                note.pinned as i64,
                note.sort_order,
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
            &format!("SELECT {SELECT_COLS} FROM notes WHERE id = ?1"),
            params![id],
            row_to_note,
        )?;
        Ok(note)
    }

    fn list_all(&self) -> AppResult<Vec<Note>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(&format!(
            "SELECT {SELECT_COLS} FROM notes
             ORDER BY pinned DESC, sort_order ASC, updated_at DESC"
        ))?;
        let rows = stmt.query_map([], row_to_note)?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    fn create_note(&self, title: &str, kind: &str) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        let id = Uuid::now_v7().to_string();
        conn.execute(
            "INSERT INTO notes
                (id, title, kind, content, created_at, updated_at, pinned, sort_order, tags)
             VALUES (?1, ?2, ?3, '', ?4, ?5, 0, 0, '[]')",
            params![id, title, kind, now, now],
        )?;
        let note = conn.query_row(
            &format!("SELECT {SELECT_COLS} FROM notes WHERE id = ?1"),
            params![id],
            row_to_note,
        )?;
        Ok(note)
    }

    fn delete_note(&self, id: &str) -> AppResult<()> {
        if id == DEFAULT_NOTE_ID {
            return Err(AppError::Other(
                "default note cannot be deleted".to_string(),
            ));
        }
        let conn = self.lock_conn()?;
        let n = conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        if n == 0 {
            return Err(AppError::NotFound(id.to_string()));
        }
        Ok(())
    }

    fn update_title(&self, id: &str, title: &str) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        let n = conn.execute(
            "UPDATE notes SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id],
        )?;
        if n == 0 {
            return Err(AppError::NotFound(id.to_string()));
        }
        let note = conn.query_row(
            &format!("SELECT {SELECT_COLS} FROM notes WHERE id = ?1"),
            params![id],
            row_to_note,
        )?;
        Ok(note)
    }

    fn set_pinned(&self, id: &str, pinned: bool) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        let n = conn.execute(
            "UPDATE notes SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
            params![pinned as i64, now, id],
        )?;
        if n == 0 {
            return Err(AppError::NotFound(id.to_string()));
        }
        let note = conn.query_row(
            &format!("SELECT {SELECT_COLS} FROM notes WHERE id = ?1"),
            params![id],
            row_to_note,
        )?;
        Ok(note)
    }

    fn get_note(&self, id: &str) -> AppResult<Note> {
        let conn = self.lock_conn()?;
        let note = conn
            .query_row(
                &format!("SELECT {SELECT_COLS} FROM notes WHERE id = ?1"),
                params![id],
                row_to_note,
            )
            .map_err(|_| AppError::NotFound(id.to_string()))?;
        Ok(note)
    }

    fn search(&self, query: &str, limit: usize) -> AppResult<Vec<Note>> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return self.list_all().map(|v| v.into_iter().take(limit).collect());
        }
        // Use LIKE substring match — Japanese-safe and avoids FTS5 tokenizer issues.
        // Escape % and _ from user input so it stays a literal substring search.
        let escaped = trimmed.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
        let pattern = format!("%{escaped}%");
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(&format!(
            "SELECT {SELECT_COLS} FROM notes
             WHERE title LIKE ?1 ESCAPE '\\' OR content LIKE ?1 ESCAPE '\\'
             ORDER BY pinned DESC, updated_at DESC
             LIMIT ?2"
        ))?;
        let rows = stmt.query_map(params![pattern, limit as i64], row_to_note)?;
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
    fn create_list_pin_delete_roundtrip() {
        let (_dir, repo) = make_repo();
        let _ = repo.get_or_create_default().unwrap();
        let a = repo.create_note("メモ A", "memo").unwrap();
        let b = repo.create_note("メモ B", "memo").unwrap();
        assert_ne!(a.id, b.id);
        assert_eq!(a.title, "メモ A");

        let _ = repo.set_pinned(&b.id, true).unwrap();
        let listed = repo.list_all().unwrap();
        // pinned first
        assert_eq!(listed[0].id, b.id);
        assert!(listed.iter().any(|n| n.id == DEFAULT_NOTE_ID));

        repo.delete_note(&a.id).unwrap();
        let listed = repo.list_all().unwrap();
        assert!(!listed.iter().any(|n| n.id == a.id));
    }

    #[test]
    fn delete_default_is_rejected() {
        let (_dir, repo) = make_repo();
        let _ = repo.get_or_create_default().unwrap();
        let err = repo.delete_note(DEFAULT_NOTE_ID).unwrap_err();
        match err {
            AppError::Other(msg) => assert!(msg.contains("default")),
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[test]
    fn update_title_changes_title_only() {
        let (_dir, repo) = make_repo();
        let n = repo.create_note("初期", "memo").unwrap();
        let updated = repo.update_title(&n.id, "改題").unwrap();
        assert_eq!(updated.title, "改題");
        let fetched = repo.get_note(&n.id).unwrap();
        assert_eq!(fetched.title, "改題");
    }

    #[test]
    fn search_matches_title_and_content_substrings() {
        let (_dir, repo) = make_repo();
        let _ = repo.get_or_create_default().unwrap();
        let a = repo.create_note("買い物リスト", "memo").unwrap();
        let _ = repo.save_content(&a.id, "牛乳とパン").unwrap();
        let b = repo.create_note("読書メモ", "memo").unwrap();
        let _ = repo.save_content(&b.id, "技術書").unwrap();

        let r = repo.search("牛乳", 10).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].id, a.id);

        let r = repo.search("読書", 10).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].id, b.id);
    }

    #[test]
    fn search_blank_returns_listing() {
        let (_dir, repo) = make_repo();
        let _ = repo.get_or_create_default().unwrap();
        let _ = repo.create_note("a", "memo").unwrap();
        let r = repo.search("", 10).unwrap();
        assert!(r.len() >= 2);
    }

    #[test]
    fn search_special_chars_are_literal() {
        let (_dir, repo) = make_repo();
        let n = repo.create_note("100% pure", "memo").unwrap();
        let _ = repo.save_content(&n.id, "with literal %").unwrap();
        let r = repo.search("100%", 10).unwrap();
        assert_eq!(r.len(), 1);
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
