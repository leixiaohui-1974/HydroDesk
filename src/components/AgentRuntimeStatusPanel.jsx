import { useCallback, useMemo, useState } from 'react';
import { agentLoopGatewayOneshot, isTauri, openPath } from '../api/tauri_bridge';
import { useAgentLoopGatewaySession } from '../hooks/useAgentLoopGatewaySession';
import {
  getAgentLoopGatewayScriptRelPath,
  getHydrodeskAgenticIdePlatformPlanRelPath,
  getHydrodeskAgenticIdeRoadmapRelPath,
  getMcpServerScriptRelPath,
  getNlMcpGatewayScriptRelPath,
} from '../config/hydrodesk_commands';
import { studioState } from '../data/studioState';

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
}) {
  const roleMeta = studioState.roleAgents?.[activeRole];
  const stackVersion = agentStack?.version != null ? String(agentStack.version) : '—';
  const layerKeys = agentStack?.hydrodesk_layers ? Object.keys(agentStack.hydrodesk_layers) : [];
  const [gwBusy, setGwBusy] = useState(false);
  const [gwError, setGwError] = useState('');
  const [gwLast, setGwLast] = useState(null);
  const [persistLine, setPersistLine] = useState('{"op":"ping"}');
  const gwSession = useAgentLoopGatewaySession();

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

  return (
    <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
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
        </div>
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
          { key: 'L4', label: 'L4 Subagents', ok: Boolean(activeRole && roleMeta) },
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
        {formattedPersistLines.length > 0 ? (
          <div className="mt-2 max-h-40 space-y-2 overflow-auto rounded border border-slate-700/40 bg-slate-950/60 p-2">
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
