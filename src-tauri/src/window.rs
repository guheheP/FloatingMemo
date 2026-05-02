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
        match w.is_visible() {
            Ok(true) => {
                if matches!(w.is_focused(), Ok(true)) {
                    let _ = w.hide();
                } else {
                    let _ = w.set_focus();
                }
            }
            _ => {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
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
