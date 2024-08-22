// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use dirs;
use reqwest;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use tauri::{command, Manager, SystemTrayEvent, SystemTrayMenuItem};
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu};

#[command]
async fn download_and_set_wallpaper(url: String, file_name: String) -> Result<(), String> {
    let mut image_path = dirs::home_dir().unwrap_or(PathBuf::from("."));
    let file_name_with_extension = format!("{}.jpg", file_name);
    image_path.push(file_name_with_extension);

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    let mut file = File::create(&image_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;

    change_wallpaper(image_path.to_str().unwrap().to_string())
}

fn change_wallpaper(image_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
            .args(&[
                "-command",
                &format!("Set-ItemProperty -path 'HKCU:\\Control Panel\\Desktop\\' -name Wallpaper -value '{}'", image_path),
            ])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        Command::new("rundll32")
            .args(&["user32.dll,UpdatePerUserSystemParameters"])
            .output()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "System Events"
                set desktopCount to count of desktops
                repeat with desktopNumber from 1 to desktopCount
                    tell desktop desktopNumber
                        set picture to POSIX file "{}"
                    end tell
                end repeat
            end tell"#,
            image_path
        );

        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
    }

    Ok(())
}

fn main() {
    let show = CustomMenuItem::new("show".to_string(), "打开面板");
    let next = CustomMenuItem::new("next".to_string(), "下一张");
    let previous= CustomMenuItem::new("previous".to_string(), "上一张");
    let quit = CustomMenuItem::new("quit".to_string(), "退出");

    

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(next)
        .add_item(previous)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);
    tauri::Builder::default()
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![download_and_set_wallpaper])
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "next" => {
                    app.emit_all("next_wallpaper", {}).unwrap();
                }
                "previous" => {
                    app.emit_all("previous_wallpaper", {}).unwrap();
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            app.listen_global("tauri://activate", move |_event| {
                window.show().unwrap();
                window.set_focus().unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}