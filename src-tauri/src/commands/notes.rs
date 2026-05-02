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

#[tauri::command]
pub fn list_notes(repo: State<'_, NoteRepoState>) -> AppResult<Vec<Note>> {
    repo.list_all()
}

#[tauri::command]
pub fn get_note(id: String, repo: State<'_, NoteRepoState>) -> AppResult<Note> {
    repo.get_note(&id)
}

#[tauri::command]
pub fn create_note(
    title: String,
    kind: Option<String>,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    let kind = kind.unwrap_or_else(|| "memo".to_string());
    repo.create_note(&title, &kind)
}

#[tauri::command]
pub fn delete_note(id: String, repo: State<'_, NoteRepoState>) -> AppResult<()> {
    repo.delete_note(&id)
}

#[tauri::command]
pub fn save_note_content(
    id: String,
    content: String,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    repo.save_content(&id, &content)
}

#[tauri::command]
pub fn update_note_title(
    id: String,
    title: String,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    repo.update_title(&id, &title)
}

#[tauri::command]
pub fn set_note_pinned(
    id: String,
    pinned: bool,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    repo.set_pinned(&id, pinned)
}
