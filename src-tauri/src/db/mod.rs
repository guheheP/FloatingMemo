pub mod sqlite;

use crate::error::AppResult;
use serde::{Deserialize, Serialize};

pub const DEFAULT_NOTE_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub pinned: bool,
    pub tags: Vec<String>,
}

impl Note {
    pub fn new_default() -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id: DEFAULT_NOTE_ID.to_string(),
            content: String::new(),
            created_at: now,
            updated_at: now,
            pinned: false,
            tags: Vec::new(),
        }
    }
}

pub trait NoteRepository: Send + Sync {
    fn get_or_create_default(&self) -> AppResult<Note>;
    fn save_content(&self, id: &str, content: &str) -> AppResult<Note>;
    fn list_all(&self) -> AppResult<Vec<Note>>;
}

pub use sqlite::SqliteNoteRepository;
