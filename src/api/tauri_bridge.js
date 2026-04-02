/**
 * Tauri Bridge - Wrapper for Tauri invoke commands
 *
 * Provides a unified interface that works both in Tauri and browser environments.
 * When running outside Tauri, returns mock/fallback data.
 */

/**
 * Check if running in Tauri environment
 */
export function isTauri() {
  return typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;
}

/**
 * Dynamically import Tauri invoke
 */
async function getInvoke() {
  if (!isTauri()) return null;
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke;
}

/**
 * Invoke a Tauri command with fallback for browser mode
 * @param {string} command - The Tauri command name
 * @param {object} args - Arguments to pass to the command
 * @param {*} fallback - Fallback value for browser mode
 */
export async function invokeCommand(command, args = {}, fallback = null) {
  const invoke = await getInvoke();
  if (!invoke) {
    console.warn(`[TauriBridge] Not in Tauri environment, returning fallback for: ${command}`);
    return fallback;
  }
  try {
    return await invoke(command, args);
  } catch (err) {
    console.error(`[TauriBridge] Command failed: ${command}`, err);
    throw err;
  }
}

/**
 * Greet command - test IPC communication
 */
export async function greet(name) {
  return invokeCommand('greet', { name }, `你好，${name}！（浏览器模式）`);
}

/**
 * Get system information
 */
export async function getSystemInfo() {
  return invokeCommand('get_system_info', {}, {
    os_name: navigator.platform || 'Browser',
    os_version: 'N/A',
    cpu_brand: 'N/A (Browser Mode)',
    cpu_count: navigator.hardwareConcurrency || 0,
    total_memory_mb: 0,
    used_memory_mb: 0,
    hostname: 'browser',
  });
}

/**
 * Check if Ollama is running locally
 */
export async function checkOllama() {
  return invokeCommand('check_ollama', {}, false);
}

/**
 * Check HydroMind backend connectivity
 */
export async function checkHydroMind(baseUrl = 'http://localhost:8000') {
  return invokeCommand('check_hydromind', { baseUrl }, false);
}

export async function getHydrologyWorkflows(fallback = []) {
  return invokeCommand('get_hydrology_workflows', {}, fallback);
}

export async function getRuntimeSnapshot(fallback = null) {
  return invokeCommand('get_runtime_snapshot', {}, fallback);
}

export async function getContextCheckpoints(fallback = []) {
  return invokeCommand('get_context_checkpoints', {}, fallback);
}

export async function getCaseArtifacts(caseId, fallback = []) {
  return invokeCommand('get_case_artifacts', { caseId }, fallback);
}

export async function getCaseContractSummary(caseId, fallback = null) {
  return invokeCommand('get_case_contract_summary', { caseId }, fallback);
}

export async function getCaseWorkflowCatalog(caseId, fallback = []) {
  return invokeCommand('get_case_workflow_catalog', { caseId }, fallback);
}

export async function startHydrologyWorkflow(workflowName, caseId, fallback = null) {
  return invokeCommand('start_hydrology_workflow', { workflowName, caseId }, fallback);
}

export async function getLogTail(logFile, maxLines = 80, fallback = { log_file: logFile, lines: [] }) {
  return invokeCommand('get_log_tail', { logFile, maxLines }, fallback);
}

export async function getExecutionHistory(fallback = []) {
  return invokeCommand('get_execution_history', {}, fallback);
}

export async function stopProcess(pid, fallback = false) {
  return invokeCommand('stop_process', { pid }, fallback);
}

export async function openPath(targetPath, fallback = false) {
  return invokeCommand('open_path', { targetPath }, fallback);
}

export async function revealPath(targetPath, fallback = false) {
  return invokeCommand('reveal_path', { targetPath }, fallback);
}

export async function renamePath(sourcePath, targetPath, fallback = false) {
  return invokeCommand('rename_path', { sourcePath, targetPath }, fallback);
}

export async function deletePath(targetPath, fallback = false) {
  return invokeCommand('delete_path', { targetPath }, fallback);
}

export async function runWorkspaceCommand(command, cwd, fallback = null) {
  return invokeCommand('run_workspace_command', { command, cwd }, fallback);
}

/**
 * Window operations (Tauri only)
 */
export const windowOps = {
  async minimize() {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.minimize();
  },

  async toggleMaximize() {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.toggleMaximize();
  },

  async close() {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.close();
  },

  async startDragging() {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.startDragging();
  },
};
