import { isPlaywrightBrowserFixtureEnabled } from '../config/playwrightEnvGate';

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

function getPlaywrightBrowserFixture() {
  if (isTauri() || typeof window === 'undefined') {
    return null;
  }
  const explicitFixture = window.__HYDRODESK_PLAYWRIGHT_FIXTURE__ ?? null;
  if (explicitFixture) {
    return explicitFixture;
  }
  if (!isPlaywrightBrowserFixtureEnabled()) {
    return null;
  }
  return explicitFixture;
}

export function hasPlaywrightBrowserFixture() {
  return Boolean(getPlaywrightBrowserFixture());
}

function buildAcceptanceMeta(fixture, request = {}) {
  const acceptanceLane = String(fixture?.acceptanceLane ?? '').trim() || 'fixture-pass';
  const acceptanceSource = acceptanceLane === 'real-runtime-pass' ? 'real-runtime' : 'fixture';
  const acceptanceEvidence =
    fixture?.acceptanceEvidence && typeof fixture.acceptanceEvidence === 'object'
      ? { ...fixture.acceptanceEvidence }
      : {};
  const requestCaseId = String(request?.caseId ?? request?.case_id ?? '').trim();
  if (!acceptanceEvidence.case_id && requestCaseId) {
    acceptanceEvidence.case_id = requestCaseId;
  }
  if (!acceptanceEvidence.lane) {
    acceptanceEvidence.lane = acceptanceLane;
  }
  return {
    acceptance_lane: acceptanceLane,
    acceptance_source: acceptanceSource,
    acceptance_evidence: Object.keys(acceptanceEvidence).length > 0 ? acceptanceEvidence : null,
  };
}

function annotateAcceptanceResult(result, fixture, request = {}) {
  if (!result || Array.isArray(result) || typeof result !== 'object') {
    return result;
  }
  if (Object.prototype.hasOwnProperty.call(result, 'acceptance_lane')) {
    return result;
  }
  return {
    ...result,
    ...buildAcceptanceMeta(fixture, request),
  };
}

function getFixtureGatewayState(fixture) {
  if (!fixture || typeof window === 'undefined') {
    return null;
  }
  if (!window.__HYDRODESK_PLAYWRIGHT_GATEWAY_STATE__) {
    window.__HYDRODESK_PLAYWRIGHT_GATEWAY_STATE__ = {
      active: false,
      pid: fixture.gatewaySessionPid ?? 9401,
    };
  }
  return window.__HYDRODESK_PLAYWRIGHT_GATEWAY_STATE__;
}

function getFixtureGatewayReply(fixture, request = {}) {
  const op = String(request?.op ?? '').trim();
  const caseId = String(request?.case_id ?? fixture?.defaultCaseId ?? '').trim();
  const fallbackTools = Array.isArray(fixture?.gatewayTools) ? fixture.gatewayTools : [];
  const caseTools =
    (caseId && Array.isArray(fixture?.gatewayToolsByCase?.[caseId]) && fixture.gatewayToolsByCase[caseId]) ||
    fallbackTools;
  const casePolicy =
    (caseId && fixture?.gatewayPolicyByCase?.[caseId]) ||
    fixture?.gatewayPolicy || {
      filter_mode: caseId ? 'case_manifest' : 'full_catalog',
    };

  switch (op) {
    case 'ping':
      return annotateAcceptanceResult({
        ok: true,
        pong: true,
        case_id: caseId || undefined,
        transport: 'playwright_fixture',
      }, fixture, { case_id: caseId });
    case 'list_tools':
      return annotateAcceptanceResult({
        ok: true,
        case_id: caseId || undefined,
        tools: caseTools,
        policy: casePolicy,
      }, fixture, { case_id: caseId });
    case 'invoke_tool': {
      const tool = String(request?.tool ?? '').trim();
      const result =
        (caseId && fixture?.gatewayInvokeToolByCase?.[caseId]?.[tool]) ||
        fixture?.gatewayInvokeToolResults?.[tool] || {
          returncode: 0,
          stdout: `${tool || 'tool'} fixture completed${caseId ? ` for ${caseId}` : ''}`,
          stderr: '',
        };
      return annotateAcceptanceResult({
        ok: true,
        case_id: caseId || undefined,
        tool,
        result,
      }, fixture, { case_id: caseId });
    }
    default:
      return annotateAcceptanceResult({
        ok: false,
        error: 'unsupported_fixture_op',
        detail: `Playwright fixture does not implement op=${op || 'unknown'}`,
      }, fixture, { case_id: caseId });
  }
}

function tokenizeWorkspaceCommand(command) {
  return String(command ?? '')
    .match(/'[^']*'|[^\s]+/g)
    ?.map((token) => token.replace(/^'|'$/g, '')) ?? [];
}

function getCliArgValue(tokens, flag) {
  const index = tokens.findIndex((token) => token === flag);
  if (index < 0 || index + 1 >= tokens.length) {
    return '';
  }
  return tokens[index + 1] ?? '';
}

function getFixtureCommandResult(command, args, fallback) {
  const fixture = getPlaywrightBrowserFixture();
  if (!fixture) {
    return undefined;
  }

  switch (command) {
    case 'get_case_contract_summary':
      return annotateAcceptanceResult(fixture.caseContractSummaryById?.[args?.caseId] ?? fallback, fixture, {
        caseId: args?.caseId,
      });
    case 'read_workspace_text_file':
      return fixture.workspaceTexts?.[args?.relPath] ?? fallback;
    case 'read_workspace_text_file_first_of': {
      const relPaths = Array.isArray(args?.relPaths) ? args.relPaths : [];
      for (const relPath of relPaths) {
        if (fixture.workspaceTexts && Object.prototype.hasOwnProperty.call(fixture.workspaceTexts, relPath)) {
          return fixture.workspaceTexts[relPath];
        }
      }
      return fallback;
    }
    case 'resolve_first_existing_workspace_path': {
      const relPaths = Array.isArray(args?.relPaths) ? args.relPaths : [];
      for (const relPath of relPaths) {
        if (fixture.workspaceTexts && Object.prototype.hasOwnProperty.call(fixture.workspaceTexts, relPath)) {
          return relPath;
        }
      }
      return fallback;
    }
    case 'run_workspace_command': {
      const commandTokens = tokenizeWorkspaceCommand(args?.command);
      const caseId = getCliArgValue(commandTokens, '--case-id');
      const phase = getCliArgValue(commandTokens, '--phase');
      if (commandTokens.some((token) => token.includes('run_auto_learning_loop.py'))) {
        const result = fixture.autoModelingRunByCase?.[caseId];
        return result
          ? annotateAcceptanceResult({
              command: args?.command ?? '',
              status: result.status ?? 0,
              stdout: result.stdout ?? '',
              stderr: result.stderr ?? '',
              success: Boolean(result.success),
            }, fixture, { caseId })
          : fallback;
      }
      if (phase === 'simulation' && fixture.preflightByCase?.[caseId]) {
        return annotateAcceptanceResult({
          command: args?.command ?? '',
          status: 0,
          stdout: JSON.stringify(fixture.preflightByCase[caseId]),
          stderr: '',
          success: true,
        }, fixture, { caseId });
      }
      return fallback;
    }
    case 'agent_loop_gateway_oneshot': {
      const response = getFixtureGatewayReply(fixture, args?.request);
      return annotateAcceptanceResult({
        success: response?.ok !== false,
        returnCode: response?.ok === false ? 1 : 0,
        response,
        stderr: '',
        rawStdout: JSON.stringify(response),
      }, fixture, args?.request);
    }
    case 'agent_loop_gateway_session_start': {
      const state = getFixtureGatewayState(fixture);
      state.active = true;
      return annotateAcceptanceResult({
        active: true,
        pid: state.pid,
      }, fixture, { case_id: fixture?.defaultCaseId });
    }
    case 'agent_loop_gateway_session_send': {
      const state = getFixtureGatewayState(fixture);
      let request = null;
      try {
        request = JSON.parse(String(args?.line ?? ''));
      } catch {
        return {
          active: Boolean(state?.active),
          pid: state?.pid ?? null,
          stderr: 'invalid_json_line',
        };
      }
      const response = getFixtureGatewayReply(fixture, request);
      return annotateAcceptanceResult({
        active: Boolean(state?.active),
        pid: state?.pid ?? null,
        line: JSON.stringify(response),
        stderr: '',
      }, fixture, request);
    }
    case 'agent_loop_gateway_session_stop': {
      const state = getFixtureGatewayState(fixture);
      state.active = false;
      return annotateAcceptanceResult({
        active: false,
        pid: null,
      }, fixture, { case_id: fixture?.defaultCaseId });
    }
    case 'agent_loop_gateway_session_status': {
      const state = getFixtureGatewayState(fixture);
      return annotateAcceptanceResult({
        active: Boolean(state?.active),
        pid: state?.active ? state.pid : null,
      }, fixture, { case_id: fixture?.defaultCaseId });
    }
    case 'start_hydrology_workflow':
      return annotateAcceptanceResult(
        fixture.workflowLaunchByCase?.[args?.caseId]?.[args?.workflowName] ?? fallback,
        fixture,
        { caseId: args?.caseId },
      );
    case 'get_case_artifacts':
      return fixture.caseArtifactsById?.[args?.caseId] ?? fallback;
    case 'get_execution_history':
      return fixture.executionHistory ?? fallback;
    case 'get_context_checkpoints':
      return fixture.contextCheckpoints ?? fallback;
    case 'get_log_tail':
      return fixture.logTailByFile?.[args?.logFile] ?? fallback;
    case 'stop_process':
      return fixture.stopProcessResult ?? false;
    case 'get_hydrology_workflows':
      return fixture.hydrologyWorkflows ?? fallback;
    case 'get_runtime_snapshot':
      return fixture.runtimeSnapshot ?? fallback;
    default:
      return undefined;
  }
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
export async function invokeCommand(command, args = {}, fallback = null, timeoutMs = 0) {
  const fixtureResult = getFixtureCommandResult(command, args, fallback);
  if (fixtureResult !== undefined) {
    return fixtureResult;
  }

  const invoke = await getInvoke();
  if (!invoke) {
    console.warn(`[TauriBridge] Not in Tauri environment, returning fallback for: ${command}`);
    return fallback;
  }
  
  if (timeoutMs > 0) {
    return Promise.race([
      invoke(command, args).catch((err) => {
        console.error(`[TauriBridge] Command failed: ${command}`, err);
        throw err;
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tauri command ${command} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
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
 * @param {Record<string, unknown>} request 如 { op: 'ping' }、{ op: 'list_tools', case_id: '<case_id>' }
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
    10000 // 10s timeout for start
  );
}

/** 向常驻网关写入一行 NDJSON（勿含换行）。 */
export async function agentLoopGatewaySessionSend(line, fallback = undefined) {
  return invokeCommand('agent_loop_gateway_session_send', { line }, fallback, 5000); // 5s timeout for send
}

export async function agentLoopGatewaySessionStop(fallback = undefined) {
  return invokeCommand('agent_loop_gateway_session_stop', {}, fallback, 5000); // 5s timeout
}

export async function agentLoopGatewaySessionStatus(fallback = null) {
  return invokeCommand(
    'agent_loop_gateway_session_status',
    {},
    fallback ?? { active: false, pid: null },
    2000 // 2s timeout
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

export async function caseManagerOpenDirectory(dirPath, fallback = []) {
  return invokeCommand('case_manager_open_directory', { dirPath }, fallback);
}

export async function createCase(caseId, displayName, projectType = null, fallback = false) {
  return invokeCommand('create_case', { caseId, displayName, projectType }, fallback);
}

export async function deriveCase(sourceCaseId, newCaseId, displayName, fallback = false) {
  return invokeCommand('derive_case', { sourceCaseId, newCaseId, displayName }, fallback);
}

export async function archiveCase(caseId, fallback = false) {
  return invokeCommand('archive_case', { caseId }, fallback);
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
