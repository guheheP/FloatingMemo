mod commands;
mod db;
mod error;
mod hotkey;
mod paths;
mod tray;
mod window;

use crate::commands::notes::NoteRepoState;
use crate::commands::settings::SettingsRepoState;
use crate::db::{SqliteNoteRepository, SqliteSettingsRepository};
use std::sync::Arc;
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = paths::db_path().expect("failed to resolve data directory");
    let backups_dir = paths::backups_dir().expect("failed to resolve backups directory");
    if let Err(e) = db::backup::rotate_and_backup(&db_path, &backups_dir) {
        log::warn!("startup backup failed (non-fatal): {e}");
    }

    let note_repo = SqliteNoteRepository::new(&db_path)
        .expect("failed to initialize SQLite note repository");
    let note_state: NoteRepoState = Arc::new(note_repo);

    let settings_repo = SqliteSettingsRepository::new(&db_path)
        .expect("failed to initialize SQLite settings repository");
    let settings_state: SettingsRepoState = Arc::new(settings_repo);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(hotkey::plugin())
        .manage(note_state)
        .manage(settings_state.clone())
        .setup(move |app| {
            tray::setup(app.handle())?;
            hotkey::register(app.handle())?;
            if let Some(main) = window::main_window(app.handle()) {
                window::apply_mica_effect(&main);
                if let Ok(settings) = settings_state.load() {
                    let _ = main.set_always_on_top(settings.always_on_top);
                }
            }
            #[cfg(debug_assertions)]
            window::show_and_focus(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != window::MAIN_LABEL {
                return;
            }
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                tauri::WindowEvent::Resized(_) => {
                    if window.is_minimized().unwrap_or(false) {
                        let _ = window.unminimize();
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_default_note,
            commands::notes::save_note,
            commands::notes::list_notes,
            commands::notes::get_note,
            commands::notes::create_note,
            commands::notes::delete_note,
            commands::notes::save_note_content,
            commands::notes::update_note_title,
            commands::notes::set_note_pinned,
            commands::notes::search_notes,
            commands::notes::set_note_date,
            commands::notes::list_notes_by_month,
            commands::notes::list_notes_by_kind,
            commands::notes::set_note_done,
            commands::notes::set_note_due_at,
            commands::window::hide_window,
            commands::window::minimize_window,
            commands::window::toggle_always_on_top,
            commands::settings::load_settings,
            commands::settings::set_setting,
            commands::settings::set_string_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
