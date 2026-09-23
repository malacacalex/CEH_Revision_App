use tauri_plugin_dialog::DialogExt;

/// Saves a text file (progress backup, review export) where the user chooses.
/// Webviews cannot download blobs reliably, so the web app calls this instead. Returns false if cancelled.
#[tauri::command]
async fn save_text_file(app: tauri::AppHandle, filename: String, contents: String) -> Result<bool, String> {
    let Some(path) = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("JSON", &["json"])
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_text_file])
        .run(tauri::generate_context!())
        .expect("error while running ShieldUp");
}
