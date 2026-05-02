use tauri::AppHandle;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

use crate::window;

pub fn toggle_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space)
}

pub fn plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let target = toggle_shortcut();
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, shortcut, event| {
            if shortcut == &target && event.state() == ShortcutState::Pressed {
                window::toggle(app);
            }
        })
        .build()
}

pub fn register(app: &AppHandle) -> tauri::Result<()> {
    if let Err(e) = app.global_shortcut().register(toggle_shortcut()) {
        log::warn!("failed to register global shortcut Ctrl+Shift+Space (likely conflict): {e}");
    }
    Ok(())
}
