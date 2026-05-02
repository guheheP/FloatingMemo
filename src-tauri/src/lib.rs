mod commands;
mod db;
mod error;
mod hotkey;
mod paths;
mod tray;
mod window;

use crate::commands::notes::NoteRepoState;
use crate::db::SqliteNoteRepository;
use std::sync::Arc;
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = paths::db_path().expect("failed to resolve data directory");
    let repo = SqliteNoteRepository::new(&db_path)
        .expect("failed to initialize SQLite note repository");
    let repo_state: NoteRepoState = Arc::new(repo);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(hotkey::plugin())
        .manage(repo_state)
        .setup(|app| {
            tray::setup(app.handle())?;
            hotkey::register(app.handle())?;
            if let Some(main) = window::main_window(app.handle()) {
                window::apply_mica_effect(&main);
            }
            #[cfg(debug_assertions)]
            window::show_and_focus(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == window::MAIN_LABEL {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_default_note,
            commands::notes::save_note,
            commands::window::hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
