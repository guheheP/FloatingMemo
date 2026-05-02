use crate::error::AppResult;
use rusqlite::Connection;

const LATEST_VERSION: i64 = 3;

pub fn run(conn: &Connection) -> AppResult<()> {
    let current = current_version(conn)?;
    if current >= LATEST_VERSION {
        return Ok(());
    }

    if current < 2 {
        apply_v2(conn)?;
    }
    if current < 3 {
        apply_v3(conn)?;
    }

    set_version(conn, LATEST_VERSION)?;
    Ok(())
}

fn current_version(conn: &Connection) -> AppResult<i64> {
    let v: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    Ok(v)
}

fn set_version(conn: &Connection, v: i64) -> AppResult<()> {
    conn.execute_batch(&format!("PRAGMA user_version = {v};"))?;
    Ok(())
}

fn apply_v2(conn: &Connection) -> AppResult<()> {
    let has_title = column_exists(conn, "notes", "title")?;
    let has_kind = column_exists(conn, "notes", "kind")?;
    let has_sort = column_exists(conn, "notes", "sort_order")?;

    if !has_title {
        conn.execute_batch("ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT ''")?;
    }
    if !has_kind {
        conn.execute_batch("ALTER TABLE notes ADD COLUMN kind TEXT NOT NULL DEFAULT 'memo'")?;
    }
    if !has_sort {
        conn.execute_batch("ALTER TABLE notes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0")?;
    }

    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_notes_kind ON notes(kind);
         CREATE INDEX IF NOT EXISTS idx_notes_pinned_upd ON notes(pinned DESC, updated_at DESC);",
    )?;
    Ok(())
}

fn apply_v3(conn: &Connection) -> AppResult<()> {
    if !column_exists(conn, "notes", "note_date")? {
        conn.execute_batch("ALTER TABLE notes ADD COLUMN note_date TEXT NULL")?;
    }
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_notes_note_date
            ON notes(note_date) WHERE note_date IS NOT NULL;",
    )?;
    Ok(())
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> AppResult<bool> {
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn create_v1_db(path: &std::path::Path) {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            "CREATE TABLE notes (
                id          TEXT PRIMARY KEY,
                content     TEXT NOT NULL,
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL,
                pinned      INTEGER NOT NULL DEFAULT 0,
                tags        TEXT NOT NULL DEFAULT '[]'
            );
            INSERT INTO notes (id, content, created_at, updated_at)
            VALUES ('default', 'legacy memo', 1700000000000, 1700000000000);
            PRAGMA user_version = 1;",
        )
        .unwrap();
    }

    #[test]
    fn migrates_v1_to_latest_preserving_existing_rows() {
        let dir = tempdir().unwrap();
        let db = dir.path().join("legacy.db");
        create_v1_db(&db);

        let conn = Connection::open(&db).unwrap();
        run(&conn).unwrap();

        assert_eq!(current_version(&conn).unwrap(), LATEST_VERSION);
        assert!(column_exists(&conn, "notes", "title").unwrap());
        assert!(column_exists(&conn, "notes", "kind").unwrap());
        assert!(column_exists(&conn, "notes", "sort_order").unwrap());
        assert!(column_exists(&conn, "notes", "note_date").unwrap());

        let (id, content, kind): (String, String, String) = conn
            .query_row(
                "SELECT id, content, kind FROM notes WHERE id = 'default'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(id, "default");
        assert_eq!(content, "legacy memo");
        assert_eq!(kind, "memo");
    }

    #[test]
    fn idempotent_when_already_at_latest() {
        let dir = tempdir().unwrap();
        let db = dir.path().join("fresh.db");
        let conn = Connection::open(&db).unwrap();
        conn.execute_batch(
            "CREATE TABLE notes (
                id          TEXT PRIMARY KEY,
                content     TEXT NOT NULL,
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL,
                pinned      INTEGER NOT NULL DEFAULT 0,
                tags        TEXT NOT NULL DEFAULT '[]',
                title       TEXT NOT NULL DEFAULT '',
                kind        TEXT NOT NULL DEFAULT 'memo',
                sort_order  INTEGER NOT NULL DEFAULT 0,
                note_date   TEXT NULL
            );",
        )
        .unwrap();
        conn.execute_batch(&format!("PRAGMA user_version = {LATEST_VERSION};"))
            .unwrap();

        run(&conn).unwrap();
        run(&conn).unwrap();
        assert_eq!(current_version(&conn).unwrap(), LATEST_VERSION);
    }
}
