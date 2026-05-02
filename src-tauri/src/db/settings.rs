use crate::error::{AppError, AppResult};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

pub const KEY_ALWAYS_ON_TOP: &str = "always_on_top";
pub const KEY_AUTOSTART: &str = "autostart";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub always_on_top: bool,
    pub autostart: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            always_on_top: false,
            autostart: false,
        }
    }
}

pub trait SettingsRepository: Send + Sync {
    fn load(&self) -> AppResult<Settings>;
    fn set_bool(&self, key: &str, value: bool) -> AppResult<()>;
}

pub struct SqliteSettingsRepository {
    conn: Mutex<Connection>,
}

impl SqliteSettingsRepository {
    pub fn new(db_path: &Path) -> AppResult<Self> {
        let conn = Connection::open(db_path)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn lock(&self) -> AppResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|e| AppError::Other(format!("settings mutex poisoned: {e}")))
    }

    fn read_bool(&self, conn: &Connection, key: &str, default: bool) -> AppResult<bool> {
        let value: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .ok();
        Ok(value.as_deref().map(parse_bool).unwrap_or(default))
    }
}

fn parse_bool(s: &str) -> bool {
    matches!(s.trim().to_ascii_lowercase().as_str(), "true" | "1" | "yes")
}

impl SettingsRepository for SqliteSettingsRepository {
    fn load(&self) -> AppResult<Settings> {
        let conn = self.lock()?;
        Ok(Settings {
            always_on_top: self.read_bool(&conn, KEY_ALWAYS_ON_TOP, false)?,
            autostart: self.read_bool(&conn, KEY_AUTOSTART, false)?,
        })
    }

    fn set_bool(&self, key: &str, value: bool) -> AppResult<()> {
        let conn = self.lock()?;
        let v = if value { "true" } else { "false" };
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, v],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::sqlite::SqliteNoteRepository;
    use tempfile::tempdir;

    fn fresh_db() -> (tempfile::TempDir, std::path::PathBuf) {
        let dir = tempdir().unwrap();
        let db = dir.path().join("test.db");
        let _ = SqliteNoteRepository::new(&db).unwrap();
        (dir, db)
    }

    #[test]
    fn load_returns_defaults_when_empty() {
        let (_dir, db) = fresh_db();
        let repo = SqliteSettingsRepository::new(&db).unwrap();
        let s = repo.load().unwrap();
        assert!(!s.always_on_top);
        assert!(!s.autostart);
    }

    #[test]
    fn set_bool_round_trips() {
        let (_dir, db) = fresh_db();
        let repo = SqliteSettingsRepository::new(&db).unwrap();
        repo.set_bool(KEY_ALWAYS_ON_TOP, true).unwrap();
        repo.set_bool(KEY_AUTOSTART, false).unwrap();
        let s = repo.load().unwrap();
        assert!(s.always_on_top);
        assert!(!s.autostart);

        repo.set_bool(KEY_ALWAYS_ON_TOP, false).unwrap();
        let s = repo.load().unwrap();
        assert!(!s.always_on_top);
    }
}
