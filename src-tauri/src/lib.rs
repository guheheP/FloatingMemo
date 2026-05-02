mod commands;
mod db;
mod error;
mod paths;

use crate::commands::notes::NoteRepoState;
use crate::db::SqliteNoteRepository;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = paths::db_path().expect("failed to resolve data directory");
    let repo = SqliteNoteRepository::new(&db_path)
        .expect("failed to initialize SQLite note repository");
    let repo_state: NoteRepoState = Arc::new(repo);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(repo_state)
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_default_note,
            commands::notes::save_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
