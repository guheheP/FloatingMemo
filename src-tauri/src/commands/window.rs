use crate::db::settings::KEY_ALWAYS_ON_TOP;
use crate::db::SettingsRepository;
use crate::error::AppResult;
use crate::window;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    window::hide(&app);
}

#[tauri::command]
pub fn minimize_window(app: AppHandle) {
    if let Some(w) = window::main_window(&app) {
        let _ = w.minimize();
    }
}

#[tauri::command]
pub fn toggle_always_on_top(
    app: AppHandle,
    repo: State<'_, Arc<dyn SettingsRepository>>,
) -> AppResult<bool> {
    let current = repo.load()?.always_on_top;
    let next = !current;
    if let Some(w) = app.get_webview_window(window::MAIN_LABEL) {
        let _ = w.set_always_on_top(next);
    }
    repo.set_bool(KEY_ALWAYS_ON_TOP, next)?;
    Ok(next)
}
