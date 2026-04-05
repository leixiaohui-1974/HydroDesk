#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::Manager;
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::RunEvent;

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

#[derive(Serialize, Default)]
struct WorkflowSummary {
    name: String,
    description: String,
    required_args: Vec<String>,
    kind: String,
}

#[derive(Serialize, Default)]
struct RuntimeSnapshot {
    current_focus: String,
    phase: String,
    status: String,
    last_activity: String,
    blockers: Vec<String>,
    task_title: String,
    current_step: String,
    next_action: String,
    resume_prompt: String,
    packet_path: String,
    mode: String,
    backend: String,
    log_file: String,
    session_id: String,
    started_at: String,
    running: bool,
}

#[derive(Serialize, Default)]
struct CheckpointSummary {
    name: String,
    path: String,
    source: String,
    current: bool,
}

#[derive(Serialize, Default, Clone)]
struct ArtifactSummary {
    name: String,
    path: String,
    category: String,
    updated_at: String,
}

#[derive(Serialize, Default)]
struct DuplicateRunSummary {
    workflow: String,
    count: u64,
}

#[derive(Serialize, Default)]
struct CaseContractSummary {
    case_id: String,
    case_root: String,
    total: u64,
    passed: u64,
    failed: u64,
    timeout: u64,
    pending: u64,
    current_workflow: String,
    outcomes_generated: u64,
    raw_outcome_coverage: f64,
    total_executed: u64,
    normalized_outcome_coverage: f64,
    schema_valid_count: u64,
    evidence_bound_count: u64,
    gate_status: String,
    verification_generated_at: String,
    closure_check_passed: bool,
    duplicate_runs: Vec<DuplicateRunSummary>,
    pending_workflows: Vec<String>,
    key_artifacts: Vec<ArtifactSummary>,
    /// 首个存在的 `workflow_run.json` / `.contract.json` 相对路径
    triad_workflow_run_rel: String,
    triad_review_bundle_rel: String,
    triad_release_manifest_rel: String,
    /// 0–3
    triad_count: u8,
    release_gate_eligible: bool,
    release_gate_blockers: Vec<String>,
    /// `contracts/delivery_pack.latest.json` 存在时的仓库相对路径
    delivery_pack_pointer_rel: String,
    /// 指针文件内 `latest_pack_rel`
    delivery_latest_pack_rel: String,
    delivery_pack_id: String,
    delivery_pack_updated_at: String,
    /// 指针文件内 `eligible_at_pack_time`
    delivery_pack_eligible_at_last_pack: bool,
}

#[derive(Serialize, Default, Clone)]
struct OutcomeTemplateSummary {
    template_id: String,
    name: String,
    category: String,
    business_goal: String,
    required_dimensions: Vec<String>,
}

#[derive(Serialize, Default, Clone)]
struct WorkflowCatalogEntry {
    name: String,
    description: String,
    kind: String,
    template_id: String,
    template_name: String,
    category: String,
    business_goal: String,
    required_dimensions: Vec<String>,
    algorithm_tags: Vec<String>,
    metric_keys: Vec<String>,
    outcome_path: String,
    contract_path: String,
    evidence_path: String,
    topology_assets: Vec<ArtifactSummary>,
    gis_assets: Vec<ArtifactSummary>,
    charts_assets: Vec<ArtifactSummary>,
    table_assets: Vec<ArtifactSummary>,
    conclusion_assets: Vec<ArtifactSummary>,
    recommendation_assets: Vec<ArtifactSummary>,
}

#[derive(Default)]
struct WorkflowTemplateMapping {
    default_template: String,
    algorithm_metric_packs: HashMap<String, Vec<String>>,
    artifact_slot_mapping: HashMap<String, Vec<String>>,
    workflows: HashMap<String, WorkflowTemplateBinding>,
}

#[derive(Default, Clone)]
struct WorkflowTemplateBinding {
    template_id: String,
    category: String,
    algorithm_tags: Vec<String>,
}

#[derive(Serialize, Default)]
struct WorkflowLaunchResult {
    workflow: String,
    case_id: String,
    backend: String,
    log_file: String,
    command: Vec<String>,
    status: String,
    pid: u32,
}

#[derive(Serialize, Deserialize, Default, Clone)]
struct WorkflowRunRecord {
    id: String,
    workflow: String,
    case_id: String,
    backend: String,
    log_file: String,
    command: Vec<String>,
    status: String,
    pid: u32,
    started_at: String,
    finished_at: String,
    launched_at: u64,
}

#[derive(Serialize, Default)]
struct LogTail {
    log_file: String,
    lines: Vec<String>,
}

#[derive(Serialize, Default)]
struct WorkspaceCommandResult {
    command: String,
    cwd: String,
    status: i32,
    stdout: String,
    stderr: String,
    success: bool,
}

#[derive(Deserialize, Default)]
struct SessionStateFile {
    task_title: Option<String>,
    current_step: Option<String>,
    next_action: Option<String>,
    resume_prompt: Option<String>,
    gsd_state: Option<GsdStateFile>,
}

#[derive(Deserialize, Default)]
struct GsdStateFile {
    packet_path: Option<String>,
    mode: Option<String>,
    current_phase: Option<String>,
}

#[derive(Deserialize, Default)]
struct LongrunStateFile {
    started_at: Option<String>,
    backend: Option<String>,
    log_file: Option<String>,
    session_id: Option<String>,
}

fn repo_root() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .unwrap_or(manifest_dir)
}

fn read_text(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok()
}

fn read_json_value(path: &Path) -> Option<serde_json::Value> {
    read_text(path).and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
}

fn quoted_parts(line: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in line.chars() {
        if ch == '"' {
            if in_quotes {
                parts.push(current.clone());
                current.clear();
            }
            in_quotes = !in_quotes;
            continue;
        }
        if in_quotes {
            current.push(ch);
        }
    }

    parts
}

fn parse_yaml_list_inline(value: &str) -> Vec<String> {
    value
        .trim()
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split(',')
        .map(|item| item.trim().trim_matches('"').trim_matches('\''))
        .filter(|item| !item.is_empty())
        .map(|item| item.to_string())
        .collect()
}

fn parse_workflow_registry(content: &str) -> Vec<WorkflowSummary> {
    let mut workflows = Vec::new();
    let mut in_registry = false;
    let mut current: Option<WorkflowSummary> = None;

    for line in content.lines() {
        let trimmed = line.trim();

        if !in_registry {
            if trimmed.starts_with("WORKFLOW_REGISTRY") && trimmed.contains('{') {
                in_registry = true;
            }
            continue;
        }

        if trimmed == "}" {
            if let Some(workflow) = current.take() {
                workflows.push(workflow);
            }
            break;
        }

        if current.is_none() {
            if trimmed.starts_with('"') && trimmed.ends_with("{") {
                let parts = quoted_parts(trimmed);
                if let Some(name) = parts.first() {
                    current = Some(WorkflowSummary {
                        name: name.to_string(),
                        description: String::new(),
                        required_args: Vec::new(),
                        kind: "python".to_string(),
                    });
                }
            }
            continue;
        }

        if let Some(workflow) = current.as_mut() {
            if trimmed.starts_with("\"description\":") {
                let parts = quoted_parts(trimmed);
                if parts.len() > 1 {
                    workflow.description = parts[1].to_string();
                }
            } else if trimmed.starts_with("\"required_args\":") {
                let parts = quoted_parts(trimmed);
                if parts.len() > 1 {
                    workflow.required_args = parts.into_iter().skip(1).collect();
                }
            } else if trimmed.starts_with("\"external_script\":") {
                workflow.kind = "external".to_string();
            } else if trimmed.starts_with("},") {
                workflows.push(current.take().unwrap_or_default());
            }
        }
    }

    workflows
}

fn parse_blockers(content: &str) -> Vec<String> {
    let mut blockers = Vec::new();
    let mut in_blockers = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "## Blockers" {
            in_blockers = true;
            continue;
        }
        if in_blockers && trimmed.starts_with("## ") {
            break;
        }
        if in_blockers && trimmed.starts_with("- ") {
            blockers.push(trimmed.trim_start_matches("- ").to_string());
        }
    }

    blockers
}

fn extract_markdown_value(content: &str, prefix: &str) -> String {
    content
        .lines()
        .find_map(|line| line.trim().strip_prefix(prefix).map(str::trim))
        .unwrap_or_default()
        .to_string()
}

fn discover_case_dir(case_id: &str) -> Option<PathBuf> {
    let root = repo_root();
    let candidates = [
        root.join("Hydrology/cases").join(case_id),
        root.join("cases").join(case_id),
    ];

    candidates.into_iter().find(|path| path.exists())
}

fn system_time_string(path: &Path) -> String {
    fs::metadata(path)
        .ok()
        .and_then(|meta| meta.modified().ok())
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_default()
}

fn parse_workflow_template_mapping(content: &str) -> WorkflowTemplateMapping {
    let mut mapping = WorkflowTemplateMapping::default();
    let mut section = String::new();
    let mut current_pack = String::new();
    let mut current_slot = String::new();
    let mut current_workflow = String::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        if !line.starts_with(' ') {
            section = trimmed.trim_end_matches(':').to_string();
            current_pack.clear();
            current_slot.clear();
            current_workflow.clear();
            if let Some(value) = trimmed.strip_prefix("default_template:") {
                mapping.default_template = value.trim().trim_matches('"').to_string();
            }
            continue;
        }

        match section.as_str() {
            "algorithm_metric_packs" => {
                if line.starts_with("  ") && !line.starts_with("    ") && trimmed.ends_with(':') {
                    current_pack = trimmed.trim_end_matches(':').to_string();
                    mapping.algorithm_metric_packs.entry(current_pack.clone()).or_default();
                } else if line.starts_with("    - ") && !current_pack.is_empty() {
                    mapping
                        .algorithm_metric_packs
                        .entry(current_pack.clone())
                        .or_default()
                        .push(trimmed.trim_start_matches("- ").to_string());
                }
            }
            "artifact_slot_mapping" => {
                if line.starts_with("  ") && !line.starts_with("    ") && trimmed.ends_with(':') {
                    current_slot = trimmed.trim_end_matches(':').to_string();
                    mapping.artifact_slot_mapping.entry(current_slot.clone()).or_default();
                } else if line.starts_with("    - ") && !current_slot.is_empty() {
                    mapping
                        .artifact_slot_mapping
                        .entry(current_slot.clone())
                        .or_default()
                        .push(trimmed.trim_start_matches("- ").to_string());
                }
            }
            "workflows" => {
                if line.starts_with("  ") && !line.starts_with("    ") && trimmed.ends_with(':') {
                    current_workflow = trimmed.trim_end_matches(':').to_string();
                    mapping.workflows.entry(current_workflow.clone()).or_default();
                } else if line.starts_with("    ") && !current_workflow.is_empty() {
                    let entry = mapping.workflows.entry(current_workflow.clone()).or_default();
                    if let Some(value) = trimmed.strip_prefix("template_id:") {
                        entry.template_id = value.trim().trim_matches('"').to_string();
                    } else if let Some(value) = trimmed.strip_prefix("category:") {
                        entry.category = value.trim().trim_matches('"').to_string();
                    } else if let Some(value) = trimmed.strip_prefix("algorithm_tags:") {
                        entry.algorithm_tags = parse_yaml_list_inline(value);
                    }
                }
            }
            _ => {}
        }
    }

    mapping
}

fn parse_outcome_templates(content: &str) -> HashMap<String, OutcomeTemplateSummary> {
    let mut templates = HashMap::new();
    let mut current_template = String::new();
    let mut in_required_dimensions = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if trimmed == "templates:" || trimmed.starts_with("schema_version:") {
            continue;
        }
        if line.starts_with("  ") && !line.starts_with("    ") && trimmed.ends_with(':') {
            current_template = trimmed.trim_end_matches(':').to_string();
            templates.insert(
                current_template.clone(),
                OutcomeTemplateSummary {
                    template_id: current_template.clone(),
                    ..OutcomeTemplateSummary::default()
                },
            );
            in_required_dimensions = false;
            continue;
        }
        if current_template.is_empty() {
            continue;
        }

        if let Some(template) = templates.get_mut(&current_template) {
            if line.starts_with("    ") {
                if let Some(value) = trimmed.strip_prefix("name:") {
                    template.name = value.trim().trim_matches('"').to_string();
                    in_required_dimensions = false;
                } else if let Some(value) = trimmed.strip_prefix("category:") {
                    template.category = value.trim().trim_matches('"').to_string();
                    in_required_dimensions = false;
                } else if let Some(value) = trimmed.strip_prefix("business_goal:") {
                    template.business_goal = value.trim().trim_matches('"').to_string();
                    in_required_dimensions = false;
                } else if trimmed == "required_dimensions:" {
                    in_required_dimensions = true;
                } else if in_required_dimensions && line.starts_with("      - ") {
                    template.required_dimensions.push(trimmed.trim_start_matches("- ").to_string());
                }
            }
        }
    }

    templates
}

fn classify_artifact_slot(path: &str, mapping: &HashMap<String, Vec<String>>) -> Option<String> {
    let normalized = path.to_lowercase();
    for (slot, keywords) in mapping {
        if keywords.iter().any(|keyword| normalized.contains(&keyword.to_lowercase())) {
            return Some(slot.clone());
        }
    }
    None
}

fn collect_outcome_slot_assets(
    outcome: &serde_json::Value,
    slot: &str,
    artifact_slot_mapping: &HashMap<String, Vec<String>>,
) -> Vec<ArtifactSummary> {
    let mut assets = Vec::new();

    if let Some(items) = outcome
        .get("slots")
        .and_then(|value| value.get(slot))
        .and_then(|value| value.as_array())
    {
        for item in items.iter().take(6) {
            if let Some(path_str) = item.get("path").and_then(|value| value.as_str()) {
                let resolved = resolve_repo_relative(path_str);
                assets.push(ArtifactSummary {
                    name: resolved
                        .file_name()
                        .and_then(|value| value.to_str())
                        .unwrap_or(path_str)
                        .to_string(),
                    path: path_str.to_string(),
                    category: slot.to_string(),
                    updated_at: if resolved.exists() {
                        system_time_string(&resolved)
                    } else {
                        String::new()
                    },
                });
            }
        }
    }

    if !assets.is_empty() {
        return assets;
    }

    if let Some(items) = outcome.get("artifacts").and_then(|value| value.as_array()) {
        for item in items.iter().take(12) {
            if let Some(path_str) = item.get("path").and_then(|value| value.as_str()) {
                if classify_artifact_slot(path_str, artifact_slot_mapping).as_deref() == Some(slot) {
                    let resolved = resolve_repo_relative(path_str);
                    assets.push(ArtifactSummary {
                        name: resolved
                            .file_name()
                            .and_then(|value| value.to_str())
                            .unwrap_or(path_str)
                            .to_string(),
                        path: path_str.to_string(),
                        category: slot.to_string(),
                        updated_at: if resolved.exists() {
                            system_time_string(&resolved)
                        } else {
                            String::new()
                        },
                    });
                }
            }
        }
    }

    assets
}

fn repo_relative_string(path: &Path) -> String {
    path.strip_prefix(repo_root())
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|_| path.to_string_lossy().to_string())
}

/// Run/Review/Release triad：优先 `{base}.json`，否则 `{base}.contract.json`。
fn resolve_contract_triad_member_rel(contracts_dir: &Path, base: &str) -> String {
    let json_path = contracts_dir.join(format!("{}.json", base));
    if json_path.is_file() {
        return repo_relative_string(&json_path);
    }
    let contract_path = contracts_dir.join(format!("{}.contract.json", base));
    if contract_path.is_file() {
        return repo_relative_string(&contract_path);
    }
    String::new()
}

fn resolve_repo_relative(path: &str) -> PathBuf {
    let candidate = PathBuf::from(path);
    if candidate.is_absolute() {
        candidate
    } else {
        repo_root().join(candidate)
    }
}

/// 仓库根相对路径，禁止 `..` 与绝对路径，供内联编辑等写入前校验。
fn workspace_safe_relative_path(rel: &str) -> Result<PathBuf, String> {
    let trimmed = rel.trim();
    if trimmed.is_empty() {
        return Err("路径不能为空".to_string());
    }
    if Path::new(trimmed).is_absolute() {
        return Err("不允许使用绝对路径".to_string());
    }
    let normalized = PathBuf::from(trimmed);
    for comp in normalized.components() {
        use std::path::Component;
        match comp {
            Component::ParentDir => return Err("路径中不允许 '..'".to_string()),
            Component::RootDir | Component::Prefix(_) => return Err("无效路径".to_string()),
            _ => {}
        }
    }
    Ok(repo_root().join(normalized))
}

fn artifact_summary_from_path(path: &Path, category: &str) -> ArtifactSummary {
    ArtifactSummary {
        name: path.file_name().and_then(|value| value.to_str()).unwrap_or_default().to_string(),
        path: repo_relative_string(path),
        category: category.to_string(),
        updated_at: system_time_string(path),
    }
}

fn execution_history_path() -> PathBuf {
    repo_root().join(".team/execution_results/hydrodesk-runs.json")
}

fn read_execution_history() -> Vec<WorkflowRunRecord> {
    let path = execution_history_path();
    read_text(&path)
        .and_then(|content| serde_json::from_str::<Vec<WorkflowRunRecord>>(&content).ok())
        .unwrap_or_default()
}

fn write_execution_history(history: &[WorkflowRunRecord]) -> Result<(), String> {
    let path = execution_history_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let content = serde_json::to_string_pretty(history).map_err(|err| err.to_string())?;
    fs::write(path, content).map_err(|err| err.to_string())
}

fn is_process_running(pid: u32) -> bool {
    Command::new("kill")
        .arg("-0")
        .arg(pid.to_string())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn record_workflow_run(record: WorkflowRunRecord) -> Result<(), String> {
    let mut history = read_execution_history();
    history.push(record);
    history.sort_by(|a, b| b.launched_at.cmp(&a.launched_at));
    write_execution_history(&history)
}

fn update_workflow_run_status(pid: u32, status: &str) -> Result<(), String> {
    let mut history = read_execution_history();
    let finished_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_default();
    for record in history.iter_mut() {
        if record.pid == pid {
            record.status = status.to_string();
            if record.finished_at.is_empty() {
                record.finished_at = finished_at.clone();
            }
        }
    }
    write_execution_history(&history)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好，{}！欢迎使用 HydroDesk 水网桌面端。", name)
}

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
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_brand,
        cpu_count: sys.cpus().len(),
        total_memory_mb: sys.total_memory() / 1024 / 1024,
        used_memory_mb: sys.used_memory() / 1024 / 1024,
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
    }
}

#[tauri::command]
async fn check_ollama() -> bool {
    match reqwest::get("http://localhost:11434/api/version").await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

#[tauri::command]
async fn check_hydromind(base_url: String) -> bool {
    let url = format!("{}/health", base_url);
    match reqwest::get(&url).await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

#[tauri::command]
fn get_hydrology_workflows() -> Result<Vec<WorkflowSummary>, String> {
    let path = repo_root().join("Hydrology/workflows/__init__.py");
    let content = read_text(&path).ok_or_else(|| format!("无法读取 workflow 注册表: {}", path.display()))?;
    Ok(parse_workflow_registry(&content))
}

#[tauri::command]
fn get_runtime_snapshot() -> Result<RuntimeSnapshot, String> {
    let root = repo_root();
    let state_path = root.join(".planning/STATE.md");
    let session_path = root.join(".team/.session_state.json");
    let longrun_path = root.join(".team/longrun/current.json");

    let state_content = read_text(&state_path).unwrap_or_default();
    let session_content = read_text(&session_path).unwrap_or_default();
    let longrun_content = read_text(&longrun_path).unwrap_or_default();

    let session_state: SessionStateFile = serde_json::from_str(&session_content).unwrap_or_default();
    let longrun_state: LongrunStateFile = serde_json::from_str(&longrun_content).unwrap_or_default();
    let gsd_state = session_state.gsd_state.unwrap_or_default();

    let snapshot = RuntimeSnapshot {
        current_focus: extract_markdown_value(&state_content, "**Current focus:** "),
        phase: extract_markdown_value(&state_content, "Phase: "),
        status: extract_markdown_value(&state_content, "Status: "),
        last_activity: extract_markdown_value(&state_content, "Last activity: "),
        blockers: parse_blockers(&state_content),
        task_title: session_state.task_title.unwrap_or_default(),
        current_step: session_state.current_step.unwrap_or_else(|| gsd_state.current_phase.unwrap_or_default()),
        next_action: session_state.next_action.unwrap_or_default(),
        resume_prompt: session_state.resume_prompt.unwrap_or_default(),
        packet_path: gsd_state.packet_path.unwrap_or_default(),
        mode: gsd_state.mode.unwrap_or_default(),
        backend: longrun_state.backend.unwrap_or_default(),
        log_file: longrun_state.log_file.unwrap_or_default(),
        session_id: longrun_state.session_id.unwrap_or_default(),
        started_at: longrun_state.started_at.unwrap_or_default(),
        running: !longrun_content.is_empty(),
    };

    Ok(snapshot)
}

#[tauri::command]
fn get_context_checkpoints() -> Result<Vec<CheckpointSummary>, String> {
    let root = repo_root();
    let session_path = root.join(".team/.session_state.json");
    let session_content = read_text(&session_path).unwrap_or_default();
    let session_state: SessionStateFile = serde_json::from_str(&session_content).unwrap_or_default();
    let packet_path = session_state
        .gsd_state
        .and_then(|state| state.packet_path)
        .unwrap_or_default();

    let checkpoints_dir = root.join(".team/context_packets");
    let mut checkpoints = Vec::new();

    if checkpoints_dir.exists() {
        let entries = fs::read_dir(&checkpoints_dir).map_err(|err| err.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
                continue;
            }
            let relative = path
                .strip_prefix(&root)
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_else(|_| path.to_string_lossy().to_string());
            checkpoints.push(CheckpointSummary {
                name: path.file_name().and_then(|value| value.to_str()).unwrap_or_default().to_string(),
                path: relative.clone(),
                source: ".team/context_packets".to_string(),
                current: !packet_path.is_empty() && packet_path.ends_with(relative.as_str()),
            });
        }
    }

    checkpoints.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(checkpoints)
}

#[tauri::command]
fn get_case_artifacts(case_id: String) -> Result<Vec<ArtifactSummary>, String> {
    let case_dir = discover_case_dir(&case_id)
        .ok_or_else(|| format!("未找到案例目录: {}", case_id))?;
    let mut artifacts = Vec::new();

    for (subdir, category) in [("contracts", "contract"), ("models", "model"), ("reports", "report")] {
        let target = case_dir.join(subdir);
        if !target.exists() {
            continue;
        }
        let entries = fs::read_dir(&target).map_err(|err| err.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                continue;
            }
            let relative = path
                .strip_prefix(repo_root())
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_else(|_| path.to_string_lossy().to_string());
            artifacts.push(ArtifactSummary {
                name: path.file_name().and_then(|value| value.to_str()).unwrap_or_default().to_string(),
                path: relative,
                category: category.to_string(),
                updated_at: system_time_string(&path),
            });
        }
    }

    artifacts.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(artifacts)
}

#[tauri::command]
fn get_case_contract_summary(case_id: String) -> Result<CaseContractSummary, String> {
    let case_dir = discover_case_dir(&case_id)
        .ok_or_else(|| format!("未找到案例目录: {}", case_id))?;
    let contracts_dir = case_dir.join("contracts");
    if !contracts_dir.exists() {
        return Err(format!("未找到 contracts 目录: {}", contracts_dir.display()));
    }

    let progress_path = contracts_dir.join("e2e_live_progress.latest.json");
    let coverage_path = contracts_dir.join("outcome_coverage_report.latest.json");
    let verification_path = contracts_dir.join("e2e_outcome_verification_report.json");

    let progress = read_json_value(&progress_path).unwrap_or_default();
    let coverage = read_json_value(&coverage_path).unwrap_or_default();
    let verification = read_json_value(&verification_path).unwrap_or_default();

    let mut duplicate_runs = Vec::new();
    if let Some(items) = coverage
        .get("duplicate_runs")
        .and_then(|value| value.as_object())
    {
        for (workflow, count) in items {
            duplicate_runs.push(DuplicateRunSummary {
                workflow: workflow.clone(),
                count: count.as_u64().unwrap_or_default(),
            });
        }
        duplicate_runs.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.workflow.cmp(&b.workflow)));
    }

    let mut pending_workflows = Vec::new();
    if let Some(items) = verification
        .pointer("/stage2_execution_integrity/pending_workflows")
        .and_then(|value| value.as_array())
    {
        for item in items {
            if let Some(workflow) = item.get("workflow_key").and_then(|value| value.as_str()) {
                pending_workflows.push(workflow.to_string());
            } else if let Some(workflow) = item.as_str() {
                pending_workflows.push(workflow.to_string());
            }
        }
    }

    let key_artifact_paths = [
        ("dashboard-md", contracts_dir.join("E2E_LIVE_DASHBOARD.md")),
        ("dashboard-html", contracts_dir.join("E2E_LIVE_DASHBOARD.html")),
        ("coverage-report", contracts_dir.join("outcome_coverage_report.latest.json")),
        ("verification-report-md", contracts_dir.join("e2e_outcome_verification_report.md")),
        ("verification-report-json", contracts_dir.join("e2e_outcome_verification_report.json")),
        ("baseline", contracts_dir.join("e2e_verification_baseline.json")),
        ("delivery-pack-pointer", contracts_dir.join("delivery_pack.latest.json")),
    ];
    let mut key_artifacts = Vec::new();
    for (category, path) in key_artifact_paths {
        if path.exists() {
            key_artifacts.push(artifact_summary_from_path(&path, category));
        }
    }
    let outcomes_dir = contracts_dir.join("outcomes");
    if outcomes_dir.exists() {
        key_artifacts.push(artifact_summary_from_path(&outcomes_dir, "outcomes-dir"));
    }
    key_artifacts.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    let gate_status_str = coverage
        .get("gate_status")
        .and_then(|value| value.as_str())
        .unwrap_or("unknown")
        .to_string();
    let closure_check_passed = verification
        .pointer("/stage2_execution_integrity/closure_check_passed")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let verification_exists = verification_path.is_file();

    let tri_wr = resolve_contract_triad_member_rel(&contracts_dir, "workflow_run");
    let tri_rb = resolve_contract_triad_member_rel(&contracts_dir, "review_bundle");
    let tri_rm = resolve_contract_triad_member_rel(&contracts_dir, "release_manifest");
    let mut triad_count: u8 = 0;
    if !tri_wr.is_empty() {
        triad_count += 1;
    }
    if !tri_rb.is_empty() {
        triad_count += 1;
    }
    if !tri_rm.is_empty() {
        triad_count += 1;
    }

    let mut release_gate_blockers: Vec<String> = Vec::new();
    if tri_wr.is_empty() {
        release_gate_blockers.push("缺少 workflow_run（.json / .contract.json）".to_string());
    }
    if tri_rb.is_empty() {
        release_gate_blockers.push("缺少 review_bundle（.json / .contract.json）".to_string());
    }
    if tri_rm.is_empty() {
        release_gate_blockers.push("缺少 release_manifest（.json / .contract.json）".to_string());
    }
    if verification_exists && !closure_check_passed {
        release_gate_blockers.push("e2e_outcome_verification_report：closure_check_passed 为 false".to_string());
    }
    if !pending_workflows.is_empty() {
        release_gate_blockers.push(format!(
            "verification pending_workflows 非空（{} 项）",
            pending_workflows.len()
        ));
    }
    if gate_status_str == "blocked" {
        release_gate_blockers.push("outcome_coverage_report gate_status=blocked".to_string());
    }
    let release_gate_eligible = release_gate_blockers.is_empty();

    let delivery_pointer_path = contracts_dir.join("delivery_pack.latest.json");
    let mut delivery_pack_pointer_rel = String::new();
    let mut delivery_latest_pack_rel = String::new();
    let mut delivery_pack_id = String::new();
    let mut delivery_pack_updated_at = String::new();
    let mut delivery_pack_eligible_at_last_pack = false;
    if delivery_pointer_path.is_file() {
        delivery_pack_pointer_rel = repo_relative_string(&delivery_pointer_path);
        if let Some(ptr) = read_json_value(&delivery_pointer_path) {
            delivery_latest_pack_rel = ptr
                .get("latest_pack_rel")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string();
            delivery_pack_id = ptr
                .get("pack_id")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string();
            delivery_pack_updated_at = ptr
                .get("updated_at")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string();
            delivery_pack_eligible_at_last_pack = ptr
                .get("eligible_at_pack_time")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
        }
    }

    Ok(CaseContractSummary {
        case_id: case_id.clone(),
        case_root: repo_relative_string(&case_dir),
        total: progress.pointer("/summary/total").and_then(|value| value.as_u64()).unwrap_or_default(),
        passed: progress.pointer("/summary/passed").and_then(|value| value.as_u64()).unwrap_or_default(),
        failed: progress.pointer("/summary/failed").and_then(|value| value.as_u64()).unwrap_or_default(),
        timeout: progress.pointer("/summary/timeout").and_then(|value| value.as_u64()).unwrap_or_default(),
        pending: progress.pointer("/summary/pending").and_then(|value| value.as_u64()).unwrap_or_default(),
        current_workflow: progress
            .pointer("/current/workflow_key")
            .or_else(|| verification.pointer("/stage2_execution_integrity/current_workflow"))
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        outcomes_generated: progress
            .pointer("/summary/outcomes_generated")
            .and_then(|value| value.as_u64())
            .unwrap_or_else(|| coverage.get("outcomes_generated").and_then(|value| value.as_u64()).unwrap_or_default()),
        raw_outcome_coverage: progress
            .pointer("/summary/outcome_coverage")
            .and_then(|value| value.as_f64())
            .unwrap_or_default(),
        total_executed: coverage.get("total_executed").and_then(|value| value.as_u64()).unwrap_or_default(),
        normalized_outcome_coverage: coverage.get("outcome_coverage").and_then(|value| value.as_f64()).unwrap_or_default(),
        schema_valid_count: coverage.get("schema_valid_count").and_then(|value| value.as_u64()).unwrap_or_default(),
        evidence_bound_count: coverage.get("evidence_bound_count").and_then(|value| value.as_u64()).unwrap_or_default(),
        gate_status: gate_status_str,
        verification_generated_at: verification.get("generated_at").and_then(|value| value.as_str()).unwrap_or_default().to_string(),
        closure_check_passed,
        duplicate_runs,
        pending_workflows,
        key_artifacts,
        triad_workflow_run_rel: tri_wr,
        triad_review_bundle_rel: tri_rb,
        triad_release_manifest_rel: tri_rm,
        triad_count,
        release_gate_eligible,
        release_gate_blockers,
        delivery_pack_pointer_rel,
        delivery_latest_pack_rel,
        delivery_pack_id,
        delivery_pack_updated_at,
        delivery_pack_eligible_at_last_pack,
    })
}

#[tauri::command]
fn get_case_workflow_catalog(case_id: String) -> Result<Vec<WorkflowCatalogEntry>, String> {
    let root = repo_root();
    let hydrology_root = root.join("Hydrology");
    let workflows_path = hydrology_root.join("workflows/__init__.py");
    let mapping_path = hydrology_root.join("configs/workflow_template_mapping.yaml");
    let templates_path = hydrology_root.join("configs/outcome_templates.yaml");
    let case_dir = discover_case_dir(&case_id)
        .ok_or_else(|| format!("未找到案例目录: {}", case_id))?;
    let outcomes_dir = case_dir.join("contracts/outcomes");

    let workflow_registry = parse_workflow_registry(
        &read_text(&workflows_path).ok_or_else(|| format!("无法读取 workflow 注册表: {}", workflows_path.display()))?,
    );
    let template_mapping = parse_workflow_template_mapping(
        &read_text(&mapping_path).ok_or_else(|| format!("无法读取模板映射: {}", mapping_path.display()))?,
    );
    let templates = parse_outcome_templates(
        &read_text(&templates_path).ok_or_else(|| format!("无法读取模板定义: {}", templates_path.display()))?,
    );

    let mut outcome_by_workflow: HashMap<String, serde_json::Value> = HashMap::new();
    if outcomes_dir.exists() {
        for entry in fs::read_dir(&outcomes_dir).map_err(|err| err.to_string())?.flatten() {
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            if let Some(stem) = path.file_stem().and_then(|value| value.to_str()) {
                let workflow_name = stem.trim_end_matches(".latest").to_string();
                if let Some(value) = read_json_value(&path) {
                    outcome_by_workflow.insert(workflow_name, value);
                }
            }
        }
    }

    let mut catalog = Vec::new();
    for workflow in workflow_registry {
        let binding = template_mapping
            .workflows
            .get(&workflow.name)
            .cloned()
            .unwrap_or_else(|| WorkflowTemplateBinding {
                template_id: template_mapping.default_template.clone(),
                category: "general".to_string(),
                algorithm_tags: vec!["default".to_string()],
            });
        let template = templates
            .get(&binding.template_id)
            .cloned()
            .or_else(|| templates.get(&template_mapping.default_template).cloned())
            .unwrap_or_default();
        let outcome = outcome_by_workflow.get(&workflow.name);
        let mut metric_keys = Vec::new();
        for tag in &binding.algorithm_tags {
            if let Some(items) = template_mapping.algorithm_metric_packs.get(tag) {
                for item in items {
                    if !metric_keys.contains(item) {
                        metric_keys.push(item.clone());
                    }
                }
            }
        }
        if metric_keys.is_empty() {
            if let Some(items) = template_mapping.algorithm_metric_packs.get("default") {
                metric_keys = items.clone();
            }
        }

        catalog.push(WorkflowCatalogEntry {
            name: workflow.name.clone(),
            description: workflow.description.clone(),
            kind: workflow.kind.clone(),
            template_id: binding.template_id.clone(),
            template_name: template.name.clone(),
            category: binding.category.clone(),
            business_goal: template.business_goal.clone(),
            required_dimensions: template.required_dimensions.clone(),
            algorithm_tags: binding.algorithm_tags.clone(),
            metric_keys,
            outcome_path: outcome
                .and_then(|value| value.get("contract_path"))
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string(),
            contract_path: outcome
                .and_then(|value| value.get("contract_path"))
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string(),
            evidence_path: outcome
                .and_then(|value| value.get("evidence_path"))
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string(),
            topology_assets: outcome
                .map(|value| collect_outcome_slot_assets(value, "topology", &template_mapping.artifact_slot_mapping))
                .unwrap_or_default(),
            gis_assets: outcome
                .map(|value| collect_outcome_slot_assets(value, "gis", &template_mapping.artifact_slot_mapping))
                .unwrap_or_default(),
            charts_assets: outcome
                .map(|value| collect_outcome_slot_assets(value, "charts", &template_mapping.artifact_slot_mapping))
                .unwrap_or_default(),
            table_assets: outcome
                .map(|value| collect_outcome_slot_assets(value, "tables", &template_mapping.artifact_slot_mapping))
                .unwrap_or_default(),
            conclusion_assets: outcome
                .map(|value| collect_outcome_slot_assets(value, "conclusions", &template_mapping.artifact_slot_mapping))
                .unwrap_or_default(),
            recommendation_assets: outcome
                .map(|value| collect_outcome_slot_assets(value, "recommendations", &template_mapping.artifact_slot_mapping))
                .unwrap_or_default(),
        });
    }

    Ok(catalog)
}

#[tauri::command]
fn start_hydrology_workflow(workflow_name: String, case_id: String) -> Result<WorkflowLaunchResult, String> {
    let root = repo_root();
    let hydrology_root = root.join("Hydrology");
    if !hydrology_root.exists() {
        return Err("未找到 Hydrology 项目目录".to_string());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    let logs_dir = root.join(".team/execution_results");
    fs::create_dir_all(&logs_dir).map_err(|err| err.to_string())?;
    let log_path = logs_dir.join(format!("hydrodesk-{}-{}-{}.log", workflow_name, case_id, timestamp));
    let log_file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|err| err.to_string())?;
    let log_file_err = log_file.try_clone().map_err(|err| err.to_string())?;

    let command = vec![
        "python3".to_string(),
        "-m".to_string(),
        "workflows".to_string(),
        "run".to_string(),
        workflow_name.clone(),
        "--case-id".to_string(),
        case_id.clone(),
    ];

    let child = Command::new("python3")
        .arg("-m")
        .arg("workflows")
        .arg("run")
        .arg(&workflow_name)
        .arg("--case-id")
        .arg(&case_id)
        .current_dir(&hydrology_root)
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_file_err))
        .spawn()
        .map_err(|err| err.to_string())?;

    let relative_log_path = log_path
        .strip_prefix(&root)
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|_| log_path.to_string_lossy().to_string());

    let result = WorkflowLaunchResult {
        workflow: workflow_name,
        case_id: case_id.clone(),
        backend: "hydrology-cli".to_string(),
        log_file: relative_log_path.clone(),
        command: command.clone(),
        status: "running".to_string(),
        pid: child.id(),
    };

    record_workflow_run(WorkflowRunRecord {
        id: format!("run-{}-{}", timestamp, result.pid),
        workflow: result.workflow.clone(),
        case_id,
        backend: result.backend.clone(),
        log_file: relative_log_path,
        command,
        status: result.status.clone(),
        pid: result.pid,
        started_at: timestamp.to_string(),
        finished_at: String::new(),
        launched_at: timestamp,
    })?;

    Ok(result)
}

#[tauri::command]
fn get_log_tail(log_file: String, max_lines: Option<usize>) -> Result<LogTail, String> {
    let path = resolve_repo_relative(&log_file);
    let content = read_text(&path).ok_or_else(|| format!("无法读取日志文件: {}", path.display()))?;
    let line_count = max_lines.unwrap_or(80);
    let lines = content
        .lines()
        .rev()
        .take(line_count)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|line| line.to_string())
        .collect::<Vec<_>>();

    Ok(LogTail { log_file, lines })
}

#[tauri::command]
fn stop_process(pid: u32) -> Result<bool, String> {
    let status = Command::new("kill")
        .arg("-TERM")
        .arg(pid.to_string())
        .status()
        .map_err(|err| err.to_string())?;
    let stopped = status.success();
    if stopped {
        update_workflow_run_status(pid, "stopped")?;
    }
    Ok(stopped)
}

#[tauri::command]
fn get_execution_history() -> Result<Vec<WorkflowRunRecord>, String> {
    let mut history = read_execution_history();
    let mut changed = false;

    for record in history.iter_mut() {
        if record.status == "running" && !is_process_running(record.pid) {
            record.status = "finished".to_string();
            if record.finished_at.is_empty() {
                record.finished_at = system_time_string(&resolve_repo_relative(&record.log_file));
            }
            changed = true;
        }
    }

    history.sort_by(|a, b| b.launched_at.cmp(&a.launched_at));

    if changed {
        write_execution_history(&history)?;
    }

    Ok(history)
}

#[tauri::command]
fn workspace_path_exists(rel_path: String) -> Result<bool, String> {
    let path = workspace_safe_relative_path(&rel_path)?;
    Ok(path.exists())
}

#[tauri::command]
fn resolve_first_existing_workspace_path(rel_paths: Vec<String>) -> Result<Option<String>, String> {
    for rel in rel_paths {
        let trimmed = rel.trim();
        if trimmed.is_empty() {
            continue;
        }
        let path = workspace_safe_relative_path(trimmed)?;
        if path.exists() {
            return Ok(Some(trimmed.to_string()));
        }
    }
    Ok(None)
}

#[tauri::command]
fn read_workspace_text_file_first_of(rel_paths: Vec<String>) -> Result<String, String> {
    for rel in rel_paths {
        let trimmed = rel.trim();
        if trimmed.is_empty() {
            continue;
        }
        let path = workspace_safe_relative_path(trimmed)?;
        if path.is_file() {
            return fs::read_to_string(&path).map_err(|err| err.to_string());
        }
    }
    Err("未找到任何可读文件".to_string())
}

#[tauri::command]
fn read_workspace_text_file(rel_path: String) -> Result<String, String> {
    let path = workspace_safe_relative_path(&rel_path)?;
    if !path.exists() {
        return Err(format!("文件不存在: {}", rel_path));
    }
    if !path.is_file() {
        return Err("路径不是普通文件".to_string());
    }
    fs::read_to_string(&path).map_err(|err| err.to_string())
}

#[tauri::command]
fn write_workspace_text_file(rel_path: String, content: String) -> Result<(), String> {
    let path = workspace_safe_relative_path(&rel_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    fs::write(&path, content.as_bytes()).map_err(|err| err.to_string())
}

#[tauri::command]
fn open_path(target_path: String) -> Result<bool, String> {
    let path = resolve_repo_relative(&target_path);
    if !path.exists() {
        return Err(format!("路径不存在: {}", path.display()));
    }
    let status = Command::new("open")
        .arg(&path)
        .status()
        .map_err(|err| err.to_string())?;
    Ok(status.success())
}

#[tauri::command]
fn reveal_path(target_path: String) -> Result<bool, String> {
    let path = resolve_repo_relative(&target_path);
    if !path.exists() {
        return Err(format!("路径不存在: {}", path.display()));
    }
    let status = Command::new("open")
        .arg("-R")
        .arg(&path)
        .status()
        .map_err(|err| err.to_string())?;
    Ok(status.success())
}

#[tauri::command]
fn rename_path(source_path: String, target_path: String) -> Result<bool, String> {
    let source = resolve_repo_relative(&source_path);
    let target = resolve_repo_relative(&target_path);
    if !source.exists() {
        return Err(format!("源路径不存在: {}", source.display()));
    }
    if target.exists() {
        return Err(format!("目标路径已存在: {}", target.display()));
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    fs::rename(source, target).map_err(|err| err.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_path(target_path: String) -> Result<bool, String> {
    let path = resolve_repo_relative(&target_path);
    if !path.exists() {
        return Err(format!("路径不存在: {}", path.display()));
    }
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|err| err.to_string())?;
    } else {
        fs::remove_file(path).map_err(|err| err.to_string())?;
    }
    Ok(true)
}

/// 阻断常见命令替换注入（`...` 与 `$(...)`）。IDE / rg / python3 单条命令仍可执行。
fn assert_workspace_command_safety(command: &str) -> Result<(), String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("命令不能为空".to_string());
    }
    if trimmed.as_bytes().contains(&0) {
        return Err("命令包含非法空字节".to_string());
    }
    if trimmed.contains('`') || trimmed.contains("$(") {
        return Err("禁止命令替换：命令中不得包含反引号或 $( 片段".to_string());
    }
    Ok(())
}

fn extract_topology_live_payload(text: &str) -> Option<serde_json::Value> {
    const START: &str = "<<<HYDRODESK_TOPOLOGY_JSON\n";
    const END: &str = "\n>>>HYDRODESK_TOPOLOGY_JSON";
    let start_idx = text.find(START)?;
    let rest = &text[start_idx + START.len()..];
    let end_rel = rest.find(END)?;
    let json_str = rest[..end_rel].trim();
    serde_json::from_str(json_str).ok()
}

#[tauri::command]
fn run_workspace_command(
    app: tauri::AppHandle,
    command: String,
    cwd: Option<String>,
) -> Result<WorkspaceCommandResult, String> {
    let cwd_path = cwd
        .map(|value| resolve_repo_relative(&value))
        .unwrap_or_else(repo_root);
    if !cwd_path.exists() {
        return Err(format!("工作目录不存在: {}", cwd_path.display()));
    }

    assert_workspace_command_safety(&command)?;

    let output = Command::new("sh")
        .arg("-lc")
        .arg(&command)
        .current_dir(&cwd_path)
        .output()
        .map_err(|err| err.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let topology_payload = extract_topology_live_payload(&stderr)
        .or_else(|| extract_topology_live_payload(&stdout));
    if let Some(payload) = topology_payload {
        let _ = app.emit_all("hydrodesk-topology-live", payload);
    }

    Ok(WorkspaceCommandResult {
        command,
        cwd: cwd_path.to_string_lossy().to_string(),
        status: output.status.code().unwrap_or(-1),
        stdout,
        stderr,
        success: output.status.success(),
    })
}

/// Phase 1 Hybrid：探测本仓 claw-code 构建产物与 agent_loop_gateway，供 Agent 工作面展示「方案 A 就绪」状态。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HydrodeskAgentBackendProbe {
    claw_binary_rel: Option<String>,
    agent_loop_gateway_rel: String,
    scheme_a_ready: bool,
    integration_note_zh: String,
}

#[tauri::command]
fn probe_hydrodesk_agent_backend() -> Result<HydrodeskAgentBackendProbe, String> {
    let root = repo_root();
    let claw_bin = if cfg!(target_os = "windows") {
        "claw.exe"
    } else {
        "claw"
    };
    let claw_candidates = [
        root
            .join("claudecode/claw-code/rust/target/release")
            .join(claw_bin),
        root.join("claudecode/claw-code/rust/target/debug").join(claw_bin),
    ];
    let mut claw_binary_rel: Option<String> = None;
    for path in claw_candidates {
        if path.is_file() {
            claw_binary_rel = Some(repo_relative_string(&path));
            break;
        }
    }
    let gateway_path = root.join("Hydrology/workflows/agent_loop_gateway.py");
    let agent_loop_gateway_rel = if gateway_path.is_file() {
        repo_relative_string(&gateway_path)
    } else {
        "Hydrology/workflows/agent_loop_gateway.py".to_string()
    };
    let scheme_a_ready = claw_binary_rel.is_some();
    let integration_note_zh = if scheme_a_ready {
        "已检测到本地构建的 claw 可执行文件。当前上游 CLI 以 prompt/REPL 为主；IDE 全双工建议 Hybrid：会话内用 agent_loop_gateway 管道保障工具环，按需按轮调用 claw 承担强推理（需配置 API/OAuth）。"
            .to_string()
    } else {
        "未检测到 claw 二进制。请在 claudecode/claw-code/rust 下执行 cargo build -p claw-cli，或使用 agent_loop_gateway 作为 Phase 1 工具后端。"
            .to_string()
    };
    Ok(HydrodeskAgentBackendProbe {
        claw_binary_rel,
        agent_loop_gateway_rel,
        scheme_a_ready,
        integration_note_zh,
    })
}

/// agent_loop_gateway.py --oneshot：无 shell 拼接，由 Rust 传 JSON 参数（Phase 1 工具环）。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentLoopGatewayOneshotResult {
    success: bool,
    return_code: i32,
    /// 解析成功的 stdout 首行 JSON；失败时为 null
    response: Option<serde_json::Value>,
    stderr: String,
    raw_stdout: String,
}

#[tauri::command]
fn agent_loop_gateway_oneshot(request: serde_json::Value) -> Result<AgentLoopGatewayOneshotResult, String> {
    let root = repo_root();
    let gateway = root.join("Hydrology/workflows/agent_loop_gateway.py");
    if !gateway.is_file() {
        return Err(format!(
            "未找到网关脚本: {}",
            gateway.display()
        ));
    }
    let line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    let output = Command::new("python3")
        .arg(gateway.as_os_str())
        .arg("--oneshot")
        .arg(&line)
        .current_dir(&root)
        .output()
        .map_err(|e| format!("执行 python3 失败: {e}"))?;
    let raw_stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let response: Option<serde_json::Value> = if raw_stdout.is_empty() {
        None
    } else {
        serde_json::from_str(&raw_stdout).ok()
    };
    Ok(AgentLoopGatewayOneshotResult {
        success: output.status.success(),
        return_code: output.status.code().unwrap_or(-1),
        response,
        stderr,
        raw_stdout,
    })
}

/// 常驻 agent_loop_gateway 子进程（stdio 多轮 NDJSON）；与 --oneshot 互补。
struct GatewaySessionInner {
    child: Child,
    stdin: ChildStdin,
}

type SharedGatewaySession = Arc<Mutex<Option<GatewaySessionInner>>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentLoopGatewaySessionStatus {
    active: bool,
    pid: Option<u32>,
}

fn spawn_gateway_stdout_reader(app: tauri::AppHandle, session: SharedGatewaySession, stdout: std::process::ChildStdout) {
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(l) => {
                    let _ = app.emit_all("agent-loop-gateway-line", l);
                }
                Err(_) => break,
            }
        }
        let mut guard = match session.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        if let Some(mut inner) = guard.take() {
            let _ = inner.child.wait();
        }
        let _ = app.emit_all(
            "agent-loop-gateway-session-ended",
            serde_json::json!({ "reason": "stdout_closed" }),
        );
    });
}

fn spawn_gateway_stderr_reader(app: tauri::AppHandle, stderr: std::process::ChildStderr) {
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app.emit_all("agent-loop-gateway-stderr", line);
        }
    });
}

#[tauri::command]
fn agent_loop_gateway_session_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, SharedGatewaySession>,
) -> Result<AgentLoopGatewaySessionStatus, String> {
    let root = repo_root();
    let gateway = root.join("Hydrology/workflows/agent_loop_gateway.py");
    if !gateway.is_file() {
        return Err(format!("未找到网关脚本: {}", gateway.display()));
    }
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Err("agent_loop_gateway 常驻会话已存在，请先停止".into());
    }
    let mut child = Command::new("python3")
        .arg(gateway.as_os_str())
        .current_dir(&root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 python3 失败: {e}"))?;
    let pid = child.id();
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法打开网关 stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法打开网关 stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法打开网关 stderr".to_string())?;
    let session_for_stdout = Arc::clone(&*state);
    spawn_gateway_stdout_reader(app.clone(), session_for_stdout, stdout);
    spawn_gateway_stderr_reader(app, stderr);
    *guard = Some(GatewaySessionInner { child, stdin });
    Ok(AgentLoopGatewaySessionStatus {
        active: true,
        pid: Some(pid),
    })
}

#[tauri::command]
fn agent_loop_gateway_session_send(
    line: String,
    state: tauri::State<'_, SharedGatewaySession>,
) -> Result<(), String> {
    if line.chars().any(|c| c == '\n' || c == '\r') {
        return Err("禁止在单行请求内包含换行".into());
    }
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    let inner = guard
        .as_mut()
        .ok_or_else(|| "未启动常驻会话，请先「启动常驻网关」".to_string())?;
    inner
        .stdin
        .write_all(line.as_bytes())
        .map_err(|e| format!("写入 stdin 失败: {e}"))?;
    inner
        .stdin
        .write_all(b"\n")
        .map_err(|e| format!("写入 stdin 失败: {e}"))?;
    inner
        .stdin
        .flush()
        .map_err(|e| format!("flush stdin 失败: {e}"))?;
    Ok(())
}

fn gateway_session_stop_inner(session: &SharedGatewaySession) {
    if let Ok(mut guard) = session.lock() {
        if let Some(mut inner) = guard.take() {
            let _ = inner.child.kill();
            let _ = inner.child.wait();
        }
    }
}

#[tauri::command]
fn agent_loop_gateway_session_stop(state: tauri::State<'_, SharedGatewaySession>) -> Result<(), String> {
    gateway_session_stop_inner(&*state);
    Ok(())
}

#[tauri::command]
fn agent_loop_gateway_session_status(
    state: tauri::State<'_, SharedGatewaySession>,
) -> Result<AgentLoopGatewaySessionStatus, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    Ok(match guard.as_ref() {
        Some(inner) => AgentLoopGatewaySessionStatus {
            active: true,
            pid: Some(inner.child.id()),
        },
        None => AgentLoopGatewaySessionStatus {
            active: false,
            pid: None,
        },
    })
}

fn main() {
    let gateway_session: SharedGatewaySession = Arc::new(Mutex::new(None));
    tauri::Builder::default()
        .manage(gateway_session)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            check_ollama,
            check_hydromind,
            get_hydrology_workflows,
            get_runtime_snapshot,
            get_context_checkpoints,
            get_case_artifacts,
            get_case_contract_summary,
            get_case_workflow_catalog,
            start_hydrology_workflow,
            get_log_tail,
            get_execution_history,
            stop_process,
            open_path,
            reveal_path,
            rename_path,
            delete_path,
            read_workspace_text_file,
            read_workspace_text_file_first_of,
            write_workspace_text_file,
            workspace_path_exists,
            resolve_first_existing_workspace_path,
            run_workspace_command,
            probe_hydrodesk_agent_backend,
            agent_loop_gateway_oneshot,
            agent_loop_gateway_session_start,
            agent_loop_gateway_session_send,
            agent_loop_gateway_session_stop,
            agent_loop_gateway_session_status,
        ])
        .build(tauri::generate_context!())
        .expect("error while building HydroDesk")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                if let Some(st) = app_handle.try_state::<SharedGatewaySession>() {
                    gateway_session_stop_inner(&*st);
                }
            }
        });
}
