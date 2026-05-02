use crate::window;
use tauri::AppHandle;

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    window::hide(&app);
}
