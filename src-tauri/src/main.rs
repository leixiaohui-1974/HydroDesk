// HydroDesk - 水网桌面端
// Tauri main entry point with custom commands

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Serialize;
use sysinfo::{CpuExt, System, SystemExt};

/// System information returned to the frontend
#[derive(Serialize)]
struct SystemInfo {
    os_name: String,
    os_version: String,
    cpu_brand: String,
    cpu_count: usize,
    total_memory_mb: u64,
    used_memory_mb: u64,
    hostname: String,
}

/// Simple greet command for testing IPC
#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好，{}！欢迎使用 HydroDesk 水网桌面端。", name)
}

/// Get system information (OS, CPU, memory)
#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    SystemInfo {
        os_name: sys.name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: sys.os_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_brand,
        cpu_count: sys.cpus().len(),
        total_memory_mb: sys.total_memory() / 1024 / 1024,
        used_memory_mb: sys.used_memory() / 1024 / 1024,
        hostname: sys.host_name().unwrap_or_else(|| "Unknown".to_string()),
    }
}

/// Check if Ollama is running locally on port 11434
#[tauri::command]
async fn check_ollama() -> bool {
    match reqwest::get("http://localhost:11434/api/version").await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// Check connectivity to HydroMind backend
#[tauri::command]
async fn check_hydromind(base_url: String) -> bool {
    let url = format!("{}/health", base_url);
    match reqwest::get(&url).await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            check_ollama,
            check_hydromind,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HydroDesk");
}
