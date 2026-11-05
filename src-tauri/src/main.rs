// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Err(_) = Command::new("rundll32").args(["url.dll,FileProtocolHandler", &url]).spawn() {
            // Fallback tramite explorer se rundll32 restituisce errore
            Command::new("explorer")
                .arg(&url)
                .spawn()
                .map_err(|e| format!("Impossibile aprire il browser predefinito: {}", e))?;
        }
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Impossibile aprire il browser predefinito: {}", e))?;
        Ok(())
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Impossibile aprire il browser predefinito: {}", e))?;
        Ok(())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![open_external_url])
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'applicazione Autopia Manager");
}
