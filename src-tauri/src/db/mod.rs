pub mod backup;
pub mod migrations;
pub mod settings;
pub mod sqlite;

use crate::error::AppResult;
use serde::{Deserialize, Serialize};

pub const DEFAULT_NOTE_ID: &str = "default";
pub const KIND_MEMO: &str = "memo";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub pinned: bool,
    pub sort_order: i64,
    pub tags: Vec<String>,
    pub note_date: Option<String>,
    pub due_at: Option<i64>,
    pub done_at: Option<i64>,
}

impl Note {
    pub fn new_default() -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id: DEFAULT_NOTE_ID.to_string(),
            title: String::new(),
            kind: KIND_MEMO.to_string(),
            content: String::new(),
            created_at: now,
            updated_at: now,
            pinned: false,
            sort_order: 0,
            tags: Vec::new(),
            note_date: None,
            due_at: None,
            done_at: None,
        }
    }
}

pub trait NoteRepository: Send + Sync {
    fn get_or_create_default(&self) -> AppResult<Note>;
    fn save_content(&self, id: &str, content: &str) -> AppResult<Note>;
    fn list_all(&self) -> AppResult<Vec<Note>>;
    fn create_note(&self, title: &str, kind: &str) -> AppResult<Note>;
    fn delete_note(&self, id: &str) -> AppResult<()>;
    fn update_title(&self, id: &str, title: &str) -> AppResult<Note>;
    fn set_pinned(&self, id: &str, pinned: bool) -> AppResult<Note>;
    fn get_note(&self, id: &str) -> AppResult<Note>;
    fn search(&self, query: &str, limit: usize) -> AppResult<Vec<Note>>;
    fn set_note_date(&self, id: &str, date: Option<&str>) -> AppResult<Note>;
    fn list_by_month(&self, year_month: &str) -> AppResult<Vec<Note>>;
    fn list_by_kind(&self, kind: &str) -> AppResult<Vec<Note>>;
    fn set_done(&self, id: &str, done: bool) -> AppResult<Note>;
    fn set_due_at(&self, id: &str, due_at: Option<i64>) -> AppResult<Note>;
}

pub use settings::{Settings, SettingsRepository, SqliteSettingsRepository};
pub use sqlite::SqliteNoteRepository;
