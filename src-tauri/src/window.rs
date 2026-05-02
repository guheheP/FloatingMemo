use tauri::{AppHandle, Manager, WebviewWindow};

pub const MAIN_LABEL: &str = "main";

pub fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(MAIN_LABEL)
}

pub fn show_and_focus(app: &AppHandle) {
    if let Some(w) = main_window(app) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

pub fn hide(app: &AppHandle) {
    if let Some(w) = main_window(app) {
        let _ = w.hide();
    }
}

pub fn toggle(app: &AppHandle) {
    if let Some(w) = main_window(app) {
        let visible = w.is_visible().unwrap_or(false);
        let minimized = w.is_minimized().unwrap_or(false);
        let focused = w.is_focused().unwrap_or(false);

        if !visible || minimized {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        } else if focused {
            let _ = w.hide();
        } else {
            let _ = w.set_focus();
        }
    }
}

#[cfg(target_os = "windows")]
pub fn apply_mica_effect(window: &WebviewWindow) {
    use window_vibrancy::apply_mica;
    if let Err(e) = apply_mica(window, None) {
        log::warn!("apply_mica failed (non-fatal): {e}");
    }
}

#[cfg(not(target_os = "windows"))]
pub fn apply_mica_effect(_window: &WebviewWindow) {}
