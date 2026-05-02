use crate::db::{Note, NoteRepository, DEFAULT_NOTE_ID};
use crate::error::AppResult;
use std::sync::Arc;
use tauri::State;

pub type NoteRepoState = Arc<dyn NoteRepository>;

#[tauri::command]
pub fn get_default_note(repo: State<'_, NoteRepoState>) -> AppResult<Note> {
    repo.get_or_create_default()
}

#[tauri::command]
pub fn save_note(content: String, repo: State<'_, NoteRepoState>) -> AppResult<Note> {
    repo.save_content(DEFAULT_NOTE_ID, &content)
}
