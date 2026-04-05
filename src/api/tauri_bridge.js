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

/** Agentic IDE：探测 claw 二进制与 agent_loop_gateway（方案 A Hybrid） */
export async function probeHydrodeskAgentBackend(fallback = null) {
  return invokeCommand(
    'probe_hydrodesk_agent_backend',
    {},
    fallback ?? {
      clawBinaryRel: null,
      agentLoopGatewayRel: 'Hydrology/workflows/agent_loop_gateway.py',
      schemeAReady: false,
      integrationNoteZh:
        '浏览器模式：无法探测本机 claw。请使用 Tauri 桌面壳，或在 claudecode/claw-code/rust 下 cargo build -p claw-cli。',
    },
  );
}

/**
 * agent_loop_gateway.py --oneshot：传一行 JSON 请求，返回解析后的 stdout JSON（无 shell 拼接）。
 * @param {Record<string, unknown>} request 如 { op: 'ping' }、{ op: 'list_tools', case_id: 'daduhe' }
 */
export async function agentLoopGatewayOneshot(request, fallback = null) {
  return invokeCommand(
    'agent_loop_gateway_oneshot',
    { request },
    fallback ?? {
      success: false,
      returnCode: -1,
      response: {
        ok: false,
        error: 'browser_mode',
        detail: '仅 Tauri 桌面端可调用 agent_loop_gateway（oneshot）。',
      },
      stderr: '',
      rawStdout: '',
    },
  );
}

/** 启动常驻 agent_loop_gateway 子进程（stdio 多轮）；浏览器模式返回 inactive。 */
export async function agentLoopGatewaySessionStart(fallback = null) {
  return invokeCommand(
    'agent_loop_gateway_session_start',
    {},
    fallback ?? { active: false, pid: null },
  );
}

/** 向常驻网关写入一行 NDJSON（勿含换行）。 */
export async function agentLoopGatewaySessionSend(line, fallback = undefined) {
  return invokeCommand('agent_loop_gateway_session_send', { line }, fallback);
}

export async function agentLoopGatewaySessionStop(fallback = undefined) {
  return invokeCommand('agent_loop_gateway_session_stop', {}, fallback);
}

export async function agentLoopGatewaySessionStatus(fallback = null) {
  return invokeCommand(
    'agent_loop_gateway_session_status',
    {},
    fallback ?? { active: false, pid: null },
  );
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
  if (!isTauri()) {
    console.warn("[HydroDesk] runWorkspaceCommand 仅在 Tauri 桌面环境中可用。请运行 `npm run tauri dev`。");
    return fallback;
  }
  return invokeCommand('run_workspace_command', { command, cwd }, fallback);
}

/** 读取仓库根相对文本文件（禁止路径含 `..`）；非 Tauri 返回 fallback。 */
export async function readWorkspaceTextFile(relPath, fallback = null) {
  return invokeCommand('read_workspace_text_file', { relPath }, fallback);
}

/** 写入仓库根相对文本文件（自动创建父目录）；非 Tauri 返回 fallback。 */
export async function writeWorkspaceTextFile(relPath, content, fallback = null) {
  return invokeCommand('write_workspace_text_file', { relPath, content }, fallback);
}

/** 仓库根相对路径是否存在（禁止 `..`）；非 Tauri 返回 fallback。 */
export async function workspacePathExists(relPath, fallback = false) {
  return invokeCommand('workspace_path_exists', { relPath }, fallback);
}

/** 按顺序返回第一个存在的仓库根相对路径，否则 null；非 Tauri 返回 fallback。 */
export async function resolveFirstExistingWorkspacePath(relPaths, fallback = null) {
  const list = Array.isArray(relPaths) ? relPaths.filter((p) => String(p ?? '').trim()) : [];
  if (list.length === 0) return fallback;
  return invokeCommand('resolve_first_existing_workspace_path', { relPaths: list }, fallback);
}

/** 按顺序读取第一个存在的文本文件；非 Tauri 返回 fallback。 */
export async function readWorkspaceTextFileFirstOf(relPaths, fallback = null) {
  const list = Array.isArray(relPaths) ? relPaths.filter((p) => String(p ?? '').trim()) : [];
  if (list.length === 0) return fallback;
  return invokeCommand('read_workspace_text_file_first_of', { relPaths: list }, fallback);
}

/** 打开第一个存在的候选路径（否则尝试第一个候选，可能报错）。 */
export async function openPathWithAlternates(relPaths, fallback = false) {
  const list = Array.isArray(relPaths) ? relPaths.filter((p) => String(p ?? '').trim()) : [];
  if (list.length === 0) return fallback;
  const resolved = await resolveFirstExistingWorkspacePath(list, null);
  const target = resolved ?? list[0];
  return openPath(target, fallback);
}

/** 在文件管理器中揭示第一个存在的候选路径。 */
export async function revealPathWithAlternates(relPaths, fallback = false) {
  const list = Array.isArray(relPaths) ? relPaths.filter((p) => String(p ?? '').trim()) : [];
  if (list.length === 0) return fallback;
  const resolved = await resolveFirstExistingWorkspacePath(list, null);
  const target = resolved ?? list[0];
  return revealPath(target, fallback);
}

/** Tauri 事件名：与 src-tauri/main.rs emit_all 一致 */
export const TOPOLOGY_LIVE_EVENT = 'hydrodesk-topology-live';

/**
 * 订阅仿真/网关回传的拓扑增量（JSON），用于 ReactFlow setNodes 刷新。
 * 浏览器模式下无事件源；可在控制台模拟：见 HydroDesk/docs/walkthrough.md
 * @returns {Promise<() => void>} unlisten
 */
export async function subscribeTopologyLive(onPayload) {
  if (!isTauri()) {
    return () => {};
  }
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen(TOPOLOGY_LIVE_EVENT, (event) => {
    onPayload(event.payload);
  });
  return unlisten;
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
