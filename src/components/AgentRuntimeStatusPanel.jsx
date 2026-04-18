import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { agentLoopGatewayOneshot, isTauri, openPath, writeWorkspaceTextFile } from '../api/tauri_bridge';
import { useAgentLoopGatewaySession } from '../hooks/useAgentLoopGatewaySession';
import {
  getAgentLoopGatewayScriptRelPath,
  getAgentRegistryYamlRelPath,
  getHydrodeskAgenticIdePlatformPlanRelPath,
  getHydrodeskAgenticIdeRoadmapRelPath,
  getMcpServerScriptRelPath,
  getNlMcpGatewayScriptRelPath,
  getPluginRegistryYamlRelPath,
  getSkillRegistryYamlRelPath,
} from '../config/hydrodesk_commands';
import { studioState } from '../data/studioState';
import { parseGatewayNdjsonLine } from '../utils/gatewayTrace';

const MODE_LABELS = {
  development: '开发',
  delivery: '交付',
  research: '科研',
};

const SURFACE_LABELS = {
  agent: 'Agent',
  terminal: 'Terminal',
  notebook: 'Notebook',
  project: '项目',
  review: '审查',
  monitor: '运行',
  workbench: '工作台',
};

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRuntimeProofPaths(caseId) {
  return {
    json: `cases/${caseId}/contracts/agent_runtime_happy_path.latest.json`,
    markdown: `cases/${caseId}/contracts/agent_runtime_happy_path.latest.md`,
  };
}

function buildRuntimeProofMarkdown(caseId, summary, steps, trace, stderrLines) {
  return `# Agent Runtime Happy Path Proof

- case: ${caseId}
- summary: ${summary}
- generated_at: ${new Date().toISOString()}

## Steps

${steps.map((step) => `- ${step.label}: ${step.status}${step.detail ? ` · ${step.detail}` : ''}`).join('\n')}

## Recent Trace

${trace.length > 0 ? trace.map((item) => `- ${item.label}${item.detail ? ` · ${item.detail}` : ''}`).join('\n') : '- none'}

## Recent Stderr

${stderrLines.length > 0 ? stderrLines.map((line) => `- ${line}`).join('\n') : '- none'}
`;
}

/**
 * 平台方案 P0：统一展示当前 case / 角色 / 工作面与 claw·gateway·MCP 脚本分工（不探测进程，仅路径与 Tauri 探测结果）。
 */
export default function AgentRuntimeStatusPanel({
  caseId,
  activeRole,
  activeMode,
  activeSurfaceMode,
  activeProjectName,
  agentBackendProbe,
  agentStack,
  agentStackError,
  agentStackSource,
  onReloadStack,
  onRefreshBackendProbe,
  skillRegistrySummary,
  skillRegistryError,
  skillRegistryLoading,
  onReloadSkillRegistry,
  pluginRegistrySummary,
  pluginRegistryError,
  pluginRegistryLoading,
  onReloadPluginRegistry,
  agentRegistryCount,
  agentRegistryError,
  agentRegistryLoading,
  onReloadAgentRegistry,
  gwSession: providedGwSession,
}) {
  const roleMeta = studioState.roleAgents?.[activeRole];
  const stackVersion = agentStack?.version != null ? String(agentStack.version) : '—';
  const layerKeys = agentStack?.hydrodesk_layers ? Object.keys(agentStack.hydrodesk_layers) : [];
  const [gwBusy, setGwBusy] = useState(false);
  const [gwError, setGwError] = useState('');
  const [gwLast, setGwLast] = useState(null);
  const [persistLine, setPersistLine] = useState('{"op":"ping"}');
  const [happyPathRunning, setHappyPathRunning] = useState(false);
  const [happyPathSteps, setHappyPathSteps] = useState([]);
  const [happyPathProof, setHappyPathProof] = useState(null);
  
  // Use provided session from parent if available, otherwise create a local one
  const localGwSession = useAgentLoopGatewaySession();
  const gwSession = providedGwSession || localGwSession;
  
  const latestLinesRef = useRef([]);
  const latestStderrRef = useRef([]);
  const latestSessionActiveRef = useRef(false);

  useEffect(() => {
    latestLinesRef.current = gwSession.lines;
    latestStderrRef.current = gwSession.stderrLines;
    latestSessionActiveRef.current = gwSession.sessionActive;
  }, [gwSession.lines, gwSession.stderrLines, gwSession.sessionActive]);

  const formattedPersistLines = useMemo(
    () =>
      gwSession.lines.map((raw) => {
        try {
          return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          return raw;
        }
      }),
    [gwSession.lines],
  );

  const gatewayTrace = useMemo(() => {
    const out = [];
    gwSession.lines.forEach((raw) => {
      const item = parseGatewayNdjsonLine(raw);
      if (item) out.push(item);
    });
    return out.slice(-24);
  }, [gwSession.lines]);

  const gatewayModeLabel = gwSession.sessionActive
    ? '常驻 session'
    : gwBusy
      ? 'oneshot 请求中…'
      : '空闲（可用 oneshot 或启动 session）';

  const sendInvokeTool = useCallback(
    (tool) => {
      if (!caseId || !gwSession.sessionActive) return;
      void gwSession.sendLine(JSON.stringify({ op: 'invoke_tool', tool, case_id: caseId }));
    },
    [caseId, gwSession.sessionActive, gwSession.sendLine],
  );

  const runGateway = useCallback(
    async (request) => {
      setGwBusy(true);
      setGwError('');
      try {
        const res = await agentLoopGatewayOneshot(request);
        const body = res?.response ?? null;
        if (!res?.success && !body?.ok) {
          const hint = res?.stderr || res?.rawStdout || body?.detail || body?.error || '网关调用失败';
          setGwError(String(hint).slice(0, 400));
        }
        setGwLast({ request, result: res });
      } catch (e) {
        setGwError(e?.message || String(e));
        setGwLast(null);
      } finally {
        setGwBusy(false);
      }
    },
    [],
  );

  const gwResponse = gwLast?.result?.response;
  const gwToolsPreview =
    gwResponse?.ok && Array.isArray(gwResponse.tools)
      ? gwResponse.tools.map((t) => t.name || t.tool || JSON.stringify(t)).join(', ')
      : null;
  const happyPathSummary = useMemo(() => {
    if (happyPathSteps.length === 0) return '未执行';
    if (happyPathRunning) return '执行中';
    return happyPathSteps.every((step) => step.status === 'passed') ? '通过' : '未通过';
  }, [happyPathRunning, happyPathSteps]);
  const happyPathProofPaths = useMemo(
    () => (caseId ? getRuntimeProofPaths(caseId) : null),
    [caseId],
  );

  const waitForSessionActive = useCallback(async (timeoutMs = 4000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await gwSession.refreshStatus();
      if (latestSessionActiveRef.current) return true;
      await sleep(200);
    }
    return false;
  }, [gwSession]);

  const waitForGatewayReply = useCallback(async (matcher, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = [...latestLinesRef.current]
        .reverse()
        .map((raw) => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })
        .find((row) => row && matcher(row));
      if (hit) return hit;
      await sleep(200);
    }
    return null;
  }, []);

  const runHappyPath = useCallback(async () => {
    const nextSteps = [];
    const pushStep = (label, status, detail = '') => {
      nextSteps.push({ label, status, detail });
      setHappyPathSteps([...nextSteps]);
    };

    setHappyPathRunning(true);
    setHappyPathSteps([]);
    gwSession.clearLog();
    gwSession.setError('');

    try {
      if (!gwSession.isTauriDesktop) {
        pushStep('环境检查', 'failed', '仅桌面端可执行 A-01 Runtime Happy Path');
        return;
      }

      if (!latestSessionActiveRef.current) {
        pushStep('启动 session', 'running', '请求启动 agent_loop_gateway 常驻会话');
        await gwSession.start();
        const ready = await waitForSessionActive();
        const readyPid = gwSession.pid ?? (latestSessionActiveRef.current ? 'active' : '—');
        nextSteps[nextSteps.length - 1] = {
          label: '启动 session',
          status: ready ? 'passed' : 'failed',
          detail: ready ? `session pid ${readyPid}` : '超时未进入 active',
        };
        setHappyPathSteps([...nextSteps]);
        if (!ready) return;
      } else {
        pushStep('启动 session', 'passed', `已复用现有 session · pid ${gwSession.pid ?? '—'}`);
      }

      pushStep('Ping', 'running', '发送 {"op":"ping"}');
      void gwSession.sendPing();
      const pong = await waitForGatewayReply((row) => row?.pong === true);
      nextSteps[nextSteps.length - 1] = {
        label: 'Ping',
        status: pong ? 'passed' : 'failed',
        detail: pong ? '收到 pong' : latestStderrRef.current.at(-1) || '未在超时内收到 pong',
      };
      setHappyPathSteps([...nextSteps]);
      if (!pong) return;

      pushStep('List Tools', 'running', `发送 list_tools(case=${caseId || '—'})`);
      gwSession.sendListTools(caseId);
      const toolsReply = await waitForGatewayReply(
        (row) => Array.isArray(row?.tools) && (caseId ? row?.policy?.filter_mode || row?.ok !== false : true),
      );
      nextSteps[nextSteps.length - 1] = {
        label: 'List Tools',
        status: toolsReply ? 'passed' : 'failed',
        detail: toolsReply
          ? `tools=${toolsReply.tools.length}${toolsReply.policy?.filter_mode ? ` · policy=${toolsReply.policy.filter_mode}` : ''}`
          : latestStderrRef.current.at(-1) || '未在超时内收到 tools 列表',
      };
      setHappyPathSteps([...nextSteps]);
    } finally {
      setHappyPathRunning(false);
    }
  }, [caseId, gwSession, waitForGatewayReply, waitForSessionActive]);

  const saveHappyPathProof = useCallback(async () => {
    if (!caseId || !happyPathProofPaths) {
      setGwError('缺少 case_id，无法写入 Runtime proof');
      return;
    }
    if (!gwSession.isTauriDesktop) {
      setGwError('仅桌面端可写入 Runtime proof');
      return;
    }
    const payload = {
      case_id: caseId,
      summary: happyPathSummary,
      generated_at: new Date().toISOString(),
      steps: happyPathSteps,
      recent_trace: gatewayTrace.slice(-8),
      recent_stderr: latestStderrRef.current.slice(-8),
      _auto_generated: true,
    };
    try {
      await writeWorkspaceTextFile(happyPathProofPaths.json, JSON.stringify(payload, null, 2));
      await writeWorkspaceTextFile(
        happyPathProofPaths.markdown,
        buildRuntimeProofMarkdown(
          caseId,
          happyPathSummary,
          happyPathSteps,
          gatewayTrace.slice(-8),
          latestStderrRef.current.slice(-8),
        ),
      );
      setHappyPathProof({
        savedAt: payload.generated_at,
        jsonPath: happyPathProofPaths.json,
        markdownPath: happyPathProofPaths.markdown,
      });
      setGwError('');
    } catch (e) {
      setGwError(e?.message || String(e));
    }
  }, [caseId, gatewayTrace, gwSession.isTauriDesktop, happyPathProofPaths, happyPathSteps, happyPathSummary]);

  return (
    <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4" data-testid="agent-runtime-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-200">Agent Runtime 状态</div>
          <div className="mt-1 text-[11px] leading-5 text-slate-500">
            对齐平台五层架构的 Phase 1 入口：会话上下文 + 工具链路径 + 方案 A（claw）/ gateway 探测。
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void openPath(getHydrodeskAgenticIdePlatformPlanRelPath())}
            className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-2.5 py-1 text-[11px] text-hydro-300"
          >
            平台方案
          </button>
          <button
            type="button"
            onClick={() => void openPath(getHydrodeskAgenticIdeRoadmapRelPath())}
            className="rounded-lg border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-300"
          >
            路线图
          </button>
          {onReloadStack ? (
            <button
              type="button"
              onClick={() => void onReloadStack()}
              className="rounded-lg border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-300"
            >
              重载栈配置
            </button>
          ) : null}
          {onRefreshBackendProbe ? (
            <button
              type="button"
              onClick={() => void onRefreshBackendProbe()}
              className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] text-fuchsia-200"
            >
              重探测后端
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="mt-3 rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/20 p-3"
        data-testid="agent-runtime-unified-state"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-fuchsia-300/90">统一运行态 · P0 A-01</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
          <span className="rounded-lg border border-slate-600/50 bg-slate-950/50 px-2 py-1">
            网关模式：<span className="text-fuchsia-200/90">{gatewayModeLabel}</span>
          </span>
          <span className="rounded-lg border border-slate-600/50 bg-slate-950/50 px-2 py-1">
            后端：<span className="text-slate-200">
              {agentBackendProbe?.schemeAReady ? 'claw 已就绪' : 'gateway / 脚本路径'}
            </span>
          </span>
          <span className="rounded-lg border border-slate-600/50 bg-slate-950/50 px-2 py-1">
            session pid：<span className="font-mono text-slate-200">{gwSession.sessionActive ? gwSession.pid ?? '—' : '—'}</span>
          </span>
          <span className="rounded-lg border border-slate-600/50 bg-slate-950/50 px-2 py-1">
            oneshot：{gwBusy ? '进行中' : gwLast ? '已有最近结果' : '未调用'}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3" data-testid="agent-runtime-happy-path">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">A-01 Runtime Happy Path</div>
            <div className="mt-1 text-[10px] leading-5 text-slate-500">
              固定验收流：启动常驻 session {'->'} ping {'->'} list_tools（当前 case），用于快速确认桌面壳 runtime 可用。
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-[10px] ${
                happyPathSummary === '通过'
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                  : happyPathSummary === '未通过'
                    ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
                    : 'border-slate-600/50 bg-slate-950/50 text-slate-300'
              }`}
            >
              {happyPathSummary}
            </span>
            <button
              type="button"
              disabled={happyPathRunning || !gwSession.isTauriDesktop}
              onClick={() => void runHappyPath()}
              className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200 disabled:opacity-40"
            >
              {happyPathRunning ? '执行中…' : '运行 A-01'}
            </button>
            <button
              type="button"
              disabled={happyPathRunning || happyPathSteps.length === 0 || !gwSession.isTauriDesktop}
              onClick={() => void saveHappyPathProof()}
              className="rounded border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-200 disabled:opacity-40"
            >
              写入 Proof
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { key: 'start', title: '1. 启动 session' },
            { key: 'ping', title: '2. Ping' },
            { key: 'tools', title: '3. List Tools' },
          ].map((item, index) => {
            const step = happyPathSteps[index];
            const className =
              step?.status === 'passed'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : step?.status === 'failed'
                  ? 'border-rose-500/30 bg-rose-500/10'
                  : step?.status === 'running'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-slate-700/40 bg-slate-950/40';
            return (
              <div key={item.key} className={`rounded-lg border p-3 ${className}`}>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{item.title}</div>
                <div className="mt-2 text-xs text-slate-200">
                  {step?.status === 'passed'
                    ? '通过'
                    : step?.status === 'failed'
                      ? '失败'
                      : step?.status === 'running'
                        ? '进行中'
                        : '待执行'}
                </div>
                <div className="mt-1 text-[10px] leading-5 text-slate-500">{step?.detail || '—'}</div>
              </div>
            );
          })}
        </div>
        {gatewayTrace.length > 0 ? (
          <div className="mt-3 text-[10px] text-slate-500">
            最近轨迹：<span className="text-slate-300">{gatewayTrace.slice(-3).map((item) => item.label).join(' · ')}</span>
          </div>
        ) : null}
        {happyPathProof ? (
          <div className="mt-3 rounded-lg border border-sky-500/25 bg-sky-950/20 p-3 text-[10px] text-slate-300">
            <div>
              已留证 · {happyPathProof.savedAt}
            </div>
            <div className="mt-1 break-all text-slate-500">{happyPathProof.jsonPath}</div>
            <div className="mt-1 break-all text-slate-500">{happyPathProof.markdownPath}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openPath(happyPathProof.jsonPath)}
                className="rounded border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-200"
              >
                打开 JSON
              </button>
              <button
                type="button"
                onClick={() => void openPath(happyPathProof.markdownPath)}
                className="rounded border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-200"
              >
                打开 Markdown
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">case</div>
          <div className="mt-0.5 font-mono text-slate-200">{caseId || '—'}</div>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">角色</div>
          <div className="mt-0.5 text-slate-200">{roleMeta?.name || activeRole || '—'}</div>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">模式</div>
          <div className="mt-0.5 text-slate-200">{MODE_LABELS[activeMode] || activeMode || '—'}</div>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">工作面</div>
          <div className="mt-0.5 text-slate-200">{SURFACE_LABELS[activeSurfaceMode] || activeSurfaceMode || '—'}</div>
        </div>
      </div>
      {activeProjectName ? (
        <div className="mt-2 truncate text-[10px] text-slate-600" title={activeProjectName}>
          项目：{activeProjectName}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { key: 'L0', label: 'L0 IDE 壳', ok: true },
          { key: 'L1', label: 'L1 MCP', ok: true },
          { key: 'L2', label: 'L2 Skills', ok: layerKeys.includes('skills') },
          { key: 'L3', label: 'L3 Plugins', ok: layerKeys.includes('plugins') },
          {
            key: 'L4',
            label: 'L4 Subagents',
            ok: Boolean((agentRegistryCount != null && agentRegistryCount > 0) || (activeRole && roleMeta)),
          },
        ].map((row) => (
          <span
            key={row.key}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              row.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200/90' : 'border-slate-600/50 text-slate-500'
            }`}
          >
            {row.label}
          </span>
        ))}
        <span className="rounded-full border border-slate-700/50 px-2 py-0.5 text-[10px] text-slate-500">
          stack v{stackVersion} · {agentStackSource === 'file' ? 'JSON' : '默认'}
        </span>
      </div>
      {agentStackError ? (
        <div className="mt-2 text-[11px] text-amber-300/90">栈配置：{agentStackError}</div>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-600/35 bg-slate-900/40 p-3" data-testid="agent-runtime-mounts">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">挂载与注册（只读）</div>
          <div className="flex flex-wrap gap-1">
            {onReloadSkillRegistry ? (
              <button
                type="button"
                onClick={() => void onReloadSkillRegistry()}
                disabled={skillRegistryLoading}
                className="rounded border border-slate-600/50 px-2 py-0.5 text-[10px] text-slate-400 disabled:opacity-40"
              >
                {skillRegistryLoading ? 'Skills…' : '刷新 Skills'}
              </button>
            ) : null}
            {onReloadPluginRegistry ? (
              <button
                type="button"
                onClick={() => void onReloadPluginRegistry()}
                disabled={pluginRegistryLoading}
                className="rounded border border-slate-600/50 px-2 py-0.5 text-[10px] text-slate-400 disabled:opacity-40"
              >
                {pluginRegistryLoading ? 'Plugins…' : '刷新 Plugins'}
              </button>
            ) : null}
            {onReloadAgentRegistry ? (
              <button
                type="button"
                onClick={() => void onReloadAgentRegistry()}
                disabled={agentRegistryLoading}
                className="rounded border border-slate-600/50 px-2 py-0.5 text-[10px] text-slate-400 disabled:opacity-40"
              >
                {agentRegistryLoading ? 'Agents…' : '刷新 Agents'}
              </button>
            ) : null}
          </div>
        </div>
        <ul className="mt-2 space-y-1.5 font-mono text-[10px] leading-5 text-slate-400 break-all">
          <li>
            <span className="text-slate-600">Skills YAML</span> · {getSkillRegistryYamlRelPath()} ·{' '}
            {skillRegistryError ? (
              <span className="text-rose-300/90">{skillRegistryError}</span>
            ) : skillRegistrySummary ? (
              <span className="text-slate-300">
                v{skillRegistrySummary.version} · {skillRegistrySummary.skillCount} 条注册
              </span>
            ) : (
              <span>—</span>
            )}
          </li>
          <li>
            <span className="text-slate-600">Agents YAML</span> · {getAgentRegistryYamlRelPath()} ·{' '}
            {agentRegistryError ? (
              <span className="text-rose-300/90">{agentRegistryError}</span>
            ) : agentRegistryCount != null ? (
              <span className="text-slate-300">{agentRegistryCount} 个 Agent 条目</span>
            ) : (
              <span>—</span>
            )}
          </li>
          <li>
            <span className="text-slate-600">Plugins YAML</span> · {getPluginRegistryYamlRelPath()} ·{' '}
            {pluginRegistryError ? (
              <span className="text-rose-300/90">{pluginRegistryError}</span>
            ) : pluginRegistrySummary ? (
              <span className="text-slate-300">
                v{pluginRegistrySummary.version} · {pluginRegistrySummary.pluginCount} 条注册 · enabled{' '}
                {pluginRegistrySummary.enabledCount}
              </span>
            ) : (
              <span>—</span>
            )}
          </li>
        </ul>
      </div>

      {agentBackendProbe ? (
        <div
          className={`mt-3 rounded-xl border p-3 text-[11px] leading-5 ${
            agentBackendProbe.schemeAReady
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200/90'
              : 'border-slate-600/50 bg-slate-900/40 text-slate-400'
          }`}
        >
          <div className="font-semibold text-slate-200">
            后端探测（Hybrid）{agentBackendProbe.schemeAReady ? ' · claw 已就绪' : ' · gateway 主路径'}
          </div>
          <div className="mt-1 text-slate-500">{agentBackendProbe.integrationNoteZh}</div>
          {agentBackendProbe.clawBinaryRel ? (
            <div className="mt-1 font-mono text-[10px] text-slate-500 break-all">claw: {agentBackendProbe.clawBinaryRel}</div>
          ) : null}
          <div className="mt-1 font-mono text-[10px] text-slate-500 break-all">
            gateway: {agentBackendProbe.agentLoopGatewayRel}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 text-[11px] text-slate-500">
          正在探测本机 claw / agent_loop_gateway…
        </div>
      )}

      <div className="mt-3 rounded-xl border border-slate-700/30 bg-slate-900/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">工具链路径（相对仓库根）</div>
        <ul className="mt-2 space-y-1 font-mono text-[10px] text-slate-500 break-all">
          <li>MCP：{getMcpServerScriptRelPath()}</li>
          <li>NL 网关（OmniBar 等）：{getNlMcpGatewayScriptRelPath()}</li>
          <li>Agent Loop 网关：{getAgentLoopGatewayScriptRelPath()}</li>
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-500/80">
            Agent Loop 网关（Tauri oneshot）
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!isTauri() || gwBusy}
              onClick={() => void runGateway({ op: 'ping' })}
              className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200 disabled:opacity-40"
            >
              {gwBusy ? '…' : 'Ping'}
            </button>
            <button
              type="button"
              disabled={!isTauri() || gwBusy || !caseId}
              onClick={() => void runGateway({ op: 'list_tools', case_id: caseId })}
              className="rounded border border-cyan-500/35 px-2 py-1 text-[10px] text-cyan-100/90 disabled:opacity-40"
            >
              列出工具（当前 case）
            </button>
            <button
              type="button"
              disabled={!isTauri() || gwBusy}
              onClick={() => void runGateway({ op: 'list_tools' })}
              className="rounded border border-slate-600/50 px-2 py-1 text-[10px] text-slate-400 disabled:opacity-40"
            >
              列出工具（全量）
            </button>
          </div>
        </div>
        {!isTauri() ? (
          <p className="mt-2 text-[10px] text-slate-500">浏览器模式不执行网关；请用桌面壳验证 oneshot。</p>
        ) : null}
        {gwError ? <p className="mt-2 text-[10px] text-rose-300/90">{gwError}</p> : null}
        {gwResponse?.ok === true && gwResponse?.pong ? (
          <p className="mt-2 text-[10px] text-emerald-300/90">pong · workspace 已连通</p>
        ) : null}
        {gwToolsPreview ? (
          <p className="mt-2 text-[10px] leading-5 text-slate-400">
            工具（经 manifest 过滤）：<span className="text-slate-300">{gwToolsPreview}</span>
          </p>
        ) : null}
        {gwLast?.result?.response && gwLast.result.response.ok === false ? (
          <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-amber-200/80">
            {JSON.stringify(gwLast.result.response, null, 2)}
          </pre>
        ) : null}
        {gwLast?.request ? (
          <p className="mt-2 text-[10px] leading-5 text-slate-500">
            最近 oneshot：<span className="font-mono text-slate-400">{JSON.stringify(gwLast.request)}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-violet-500/25 bg-violet-950/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">常驻 stdio 会话</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!gwSession.isTauriDesktop || gwSession.busy || gwSession.sessionActive}
              onClick={() => void gwSession.start()}
              className="rounded border border-violet-500/35 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-100 disabled:opacity-40"
            >
              启动常驻网关
            </button>
            <button
              type="button"
              disabled={!gwSession.isTauriDesktop || gwSession.busy || !gwSession.sessionActive}
              onClick={() => void gwSession.stop()}
              className="rounded border border-slate-600/50 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-40"
            >
              停止
            </button>
            <button
              type="button"
              disabled={!gwSession.sessionActive}
              onClick={() => void gwSession.sendPing()}
              className="rounded border border-violet-500/25 px-2 py-1 text-[10px] text-violet-200/90 disabled:opacity-40"
            >
              Ping
            </button>
            <button
              type="button"
              disabled={!gwSession.sessionActive || !caseId}
              onClick={() => gwSession.sendListTools(caseId)}
              className="rounded border border-violet-500/25 px-2 py-1 text-[10px] text-violet-200/90 disabled:opacity-40"
            >
              list_tools（当前 case）
            </button>
            <button
              type="button"
              disabled={!gwSession.sessionActive}
              onClick={() => gwSession.sendListTools()}
              className="rounded border border-slate-600/50 px-2 py-1 text-[10px] text-slate-400 disabled:opacity-40"
            >
              list_tools 全量
            </button>
            <button
              type="button"
              onClick={() => gwSession.clearLog()}
              className="rounded border border-slate-600/50 px-2 py-1 text-[10px] text-slate-500"
            >
              清空日志
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-violet-500/70">invoke_tool</span>
          <button
            type="button"
            disabled={!gwSession.sessionActive || !caseId}
            onClick={() => sendInvokeTool('case_knowledge_lint')}
            className="rounded border border-violet-400/30 px-2 py-1 text-[10px] text-violet-100/90 disabled:opacity-40"
            title="需 manifest.workflow_targets 允许或工具无标签限制"
          >
            知识壳 Lint
          </button>
          <button
            type="button"
            disabled={!gwSession.sessionActive || !caseId}
            onClick={() => sendInvokeTool('bootstrap_case_triad_minimal')}
            className="rounded border border-violet-400/30 px-2 py-1 text-[10px] text-violet-100/90 disabled:opacity-40"
          >
            Triad 最小占位
          </button>
          <button
            type="button"
            disabled={!gwSession.sessionActive || !caseId}
            onClick={() => sendInvokeTool('delivery_docs_pack_dry_run')}
            className="rounded border border-slate-600/50 px-2 py-1 text-[10px] text-slate-400 disabled:opacity-40"
            title="需案例声明 acceptance_review / release_publish 等 target"
          >
            交付包 dry-run
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">
          子进程运行 <code className="text-slate-600">agent_loop_gateway.py</code> 主循环；stdout 每行 NDJSON 经 Tauri 事件推送。与 oneshot 互不替代：常驻适合多轮工具调用。退出 HydroDesk 时 Rust 在{' '}
          <code className="text-slate-600">RunEvent::Exit</code> 中 kill/wait 网关，避免遗留 Python 进程。
        </p>
        <div className="mt-2 text-[10px] text-slate-400">
          状态：{gwSession.sessionActive ? `运行中 · pid ${gwSession.pid ?? '—'}` : '未启动'}
        </div>
        {gwSession.error ? <p className="mt-1 text-[10px] text-rose-300/90">{gwSession.error}</p> : null}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-[10px] text-slate-500">
            自定义一行 JSON
            <input
              value={persistLine}
              onChange={(e) => setPersistLine(e.target.value)}
              spellCheck={false}
              className="mt-1 w-full rounded border border-slate-700/50 bg-slate-950/80 px-2 py-1.5 font-mono text-[10px] text-slate-200"
            />
          </label>
          <button
            type="button"
            disabled={!gwSession.sessionActive || !persistLine.trim()}
            onClick={() => void gwSession.sendLine(persistLine)}
            className="shrink-0 rounded border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-[10px] text-violet-100 disabled:opacity-40"
          >
            发送
          </button>
        </div>
        {gwSession.stderrLines.length > 0 ? (
          <pre className="mt-2 max-h-20 overflow-auto whitespace-pre-wrap break-all rounded border border-amber-500/20 bg-slate-950/60 p-2 font-mono text-[10px] text-amber-200/70">
            {gwSession.stderrLines.join('\n')}
          </pre>
        ) : null}
        {gatewayTrace.length > 0 ? (
          <div className="mt-2 max-h-36 overflow-auto rounded border border-violet-500/20 bg-slate-950/70 p-2">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-violet-400/80">工具调用轨迹（stdout 摘要）</div>
            <ul className="mt-1 space-y-1 text-[10px] leading-snug">
              {gatewayTrace.map((t, i) => (
                <li
                  key={i}
                  className={`flex flex-wrap gap-x-2 border-b border-slate-800/60 pb-1 last:border-0 ${
                    t.ok === false ? 'text-rose-200/90' : 'text-slate-300'
                  }`}
                >
                  <span className="shrink-0 font-mono text-[9px] text-slate-500">{t.kind}</span>
                  <span>{t.label}</span>
                  {t.detail ? <span className="text-slate-500">{t.detail}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {formattedPersistLines.length > 0 ? (
          <div className="mt-2 max-h-56 space-y-2 overflow-auto rounded border border-slate-700/40 bg-slate-950/60 p-2">
            {formattedPersistLines.map((block, i) => (
              <pre key={i} className="whitespace-pre-wrap break-all font-mono text-[10px] text-slate-400">
                {block}
              </pre>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
