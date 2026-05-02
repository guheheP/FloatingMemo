use crate::db::settings::{KEY_ALWAYS_ON_TOP, KEY_AUTOSTART};
use crate::db::{Settings, SettingsRepository};
use crate::error::AppResult;
use crate::window;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::ManagerExt;

pub type SettingsRepoState = Arc<dyn SettingsRepository>;

#[tauri::command]
pub fn load_settings(repo: State<'_, SettingsRepoState>) -> AppResult<Settings> {
    repo.load()
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: bool,
    app: AppHandle,
    repo: State<'_, SettingsRepoState>,
) -> AppResult<Settings> {
    repo.set_bool(&key, value)?;
    apply_side_effect(&app, &key, value);
    repo.load()
}

#[tauri::command]
pub fn set_string_setting(
    key: String,
    value: String,
    repo: State<'_, SettingsRepoState>,
) -> AppResult<Settings> {
    repo.set_string(&key, &value)?;
    repo.load()
}

fn apply_side_effect(app: &AppHandle, key: &str, value: bool) {
    match key {
        KEY_ALWAYS_ON_TOP => {
            if let Some(w) = app.get_webview_window(window::MAIN_LABEL) {
                let _ = w.set_always_on_top(value);
            }
        }
        KEY_AUTOSTART => {
            let mgr = app.autolaunch();
            let result = if value {
                mgr.enable()
            } else {
                mgr.disable()
            };
            if let Err(e) = result {
                log::warn!("autostart toggle failed: {e}");
            }
        }
        _ => {}
    }
}
