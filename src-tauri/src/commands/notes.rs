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

#[tauri::command]
pub fn search_notes(
    query: String,
    limit: Option<usize>,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Vec<Note>> {
    let limit = limit.unwrap_or(50).clamp(1, 200);
    repo.search(&query, limit)
}

#[tauri::command]
pub fn set_note_date(
    id: String,
    date: Option<String>,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    repo.set_note_date(&id, date.as_deref())
}

#[tauri::command]
pub fn list_notes_by_month(
    year_month: String,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Vec<Note>> {
    repo.list_by_month(&year_month)
}

#[tauri::command]
pub fn list_notes_by_kind(
    kind: String,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Vec<Note>> {
    repo.list_by_kind(&kind)
}

#[tauri::command]
pub fn set_note_done(
    id: String,
    done: bool,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    repo.set_done(&id, done)
}

#[tauri::command]
pub fn set_note_due_at(
    id: String,
    due_at: Option<i64>,
    repo: State<'_, NoteRepoState>,
) -> AppResult<Note> {
    repo.set_due_at(&id, due_at)
}
