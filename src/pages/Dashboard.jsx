import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkHydroMind, checkOllama, getSystemInfo, openPath, revealPath } from '../api/tauri_bridge';
import { getActiveRoleAgent, getPendingApprovals, getRunningTasks, studioState } from '../data/studioState';
import { getDaduheWorkbenchStages, resolveDaduheShellCaseId } from '../data/daduheShell';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

const badgeStyles = {
  running: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  live: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  ready: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
  attention: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  pending: 'border-slate-700/50 bg-slate-900/60 text-slate-300',
};

function StageCard({ stage }) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{stage.title}</div>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">{stage.headline}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] ${badgeStyles[stage.tone] || badgeStyles.pending}`}>
          {stage.statusLabel}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">{stage.summary}</p>

      <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
        <div className="text-xs text-slate-500">当前锚点</div>
        <div className="mt-1 text-sm text-slate-200">{stage.evidenceLabel}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{stage.evidencePath || '等待运行或契约落盘后绑定'}</div>
      </div>

      <div className="mt-4 space-y-2">
        {stage.notes.map((note) => (
          <div key={note} className="flex gap-2 text-xs leading-5 text-slate-400">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-hydro-400" />
            <span>{note}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          to={stage.route}
          className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
        >
          打开 {stage.title}
        </Link>
        {stage.evidencePath && (
          <>
            <button
              onClick={() => openPath(stage.evidencePath)}
              className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
            >
              打开锚点
            </button>
            <button
              onClick={() => revealPath(stage.evidencePath)}
              className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
            >
              定位锚点
            </button>
          </>
        )}
        {stage.secondaryPath && (
          <button
            onClick={() => openPath(stage.secondaryPath)}
            className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
          >
            打开 {stage.secondaryLabel}
          </button>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { activeProject } = useStudioWorkspace();
  const shellCaseId = resolveDaduheShellCaseId(activeProject.caseId);
  const [sysInfo, setSysInfo] = useState(null);
  const [services, setServices] = useState({
    hydromind: 'checking',
    ollama: 'checking',
  });
  const pendingApprovals = getPendingApprovals();
  const runningTasks = getRunningTasks();
  const activeAgent = getActiveRoleAgent('/workbench');
  const { runtimeSnapshot } = useStudioRuntime();
  const { summary: caseSummary } = useCaseContractSummary(shellCaseId);
  const { artifacts, executionHistory, launchResult, logTail } = useWorkflowExecution(shellCaseId, studioState.artifacts);
  const currentLogFile = logTail.log_file || launchResult?.log_file || runtimeSnapshot.log_file;

  useEffect(() => {
    getSystemInfo().then(setSysInfo).catch(() => null);

    Promise.allSettled([checkHydroMind(), checkOllama()]).then(([hydromind, ollama]) => {
      setServices({
        hydromind: hydromind.status === 'fulfilled' && hydromind.value ? 'online' : 'offline',
        ollama: ollama.status === 'fulfilled' && ollama.value ? 'online' : 'offline',
      });
    });
  }, []);

  const stageCards = useMemo(() => {
    const baseStages = getDaduheWorkbenchStages(shellCaseId);

    return baseStages.map((stage) => {
      if (stage.key === 'launch') {
        return {
          ...stage,
          headline: launchResult?.workflow || caseSummary.current_workflow || 'Pinned autonomy workflows',
          statusLabel: launchResult?.status === 'running' ? '运行中' : launchResult?.status ? `最近 ${launchResult.status}` : '待启动',
          tone: launchResult?.status === 'running' ? 'running' : launchResult ? 'ready' : 'pending',
        };
      }

      if (stage.key === 'monitor') {
        return {
          ...stage,
          headline: currentLogFile || runtimeSnapshot.resume_prompt || 'Live dashboard / log tail',
          statusLabel: currentLogFile ? '已绑定日志' : executionHistory.length > 0 ? '有历史记录' : '待绑定',
          tone: currentLogFile ? 'live' : executionHistory.length > 0 ? 'ready' : 'pending',
        };
      }

      if (stage.key === 'review') {
        return {
          ...stage,
          headline: `gate ${caseSummary.gate_status || 'unknown'} · pending ${pendingApprovals.length}`,
          statusLabel: caseSummary.gate_status === 'passed' ? '可审查' : pendingApprovals.length > 0 ? '需人工确认' : '待补齐',
          tone: caseSummary.gate_status === 'passed' ? 'ready' : pendingApprovals.length > 0 ? 'attention' : 'pending',
        };
      }

      return {
        ...stage,
        headline: caseSummary.closure_check_passed ? 'Release gate ready' : 'Release gate pending',
        statusLabel: caseSummary.closure_check_passed ? '可签发' : '待收口',
        tone: caseSummary.closure_check_passed ? 'live' : 'pending',
      };
    });
  }, [caseSummary, currentLogFile, executionHistory.length, launchResult, pendingApprovals.length, runtimeSnapshot.resume_prompt, shellCaseId]);

  const statCards = [
    {
      title: '当前案例',
      value: activeProject.name,
      subtitle: `case ${shellCaseId} · ${activeProject.stage}`,
    },
    {
      title: '当前链路',
      value: runtimeSnapshot.task_title || caseSummary.current_workflow || '未检测到主链',
      subtitle: runtimeSnapshot.current_step || '下一步：优先从 Launch 进入主链',
    },
    {
      title: '审查 gate',
      value: caseSummary.gate_status || 'unknown',
      subtitle: `${caseSummary.evidence_bound_count}/${caseSummary.schema_valid_count} evidence/schema`,
    },
    {
      title: 'Release 状态',
      value: caseSummary.closure_check_passed ? 'ready' : 'pending',
      subtitle: `${caseSummary.pending_workflows.length} 个 pending workflow`,
    },
  ];

  const releaseChecklist = [
    `HydroMind ${services.hydromind === 'online' ? '在线' : '离线'}`,
    `Ollama ${services.ollama === 'online' ? '可用' : '不可用'}`,
    `${runningTasks.length} 个运行中任务`,
    `${pendingApprovals.length} 个待人工确认`,
  ];

  return (
    <div className="p-6 space-y-6">
      <section className="rounded-3xl border border-hydro-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-hydro-900/30 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
              daduhe pinned workbench · Launch / Monitor / Review / Release
            </div>
            <h1 className="mt-4 text-3xl font-bold text-slate-100">把 HydroDesk 收口成大渡河自主运行验收工作台</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              统一从工作台进入 daduhe 主链：先 Launch workflow，再 Monitor live dashboard / log tail，随后 Review gate 与人工确认，最后从
              ReleaseManifest 和路线图完成交付收口。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {releaseChecklist.map((item) => (
                <span key={item} className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="w-80 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">当前主智能体</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">{activeAgent.name}</div>
            <div className="mt-1 text-sm text-slate-400">{activeAgent.summary}</div>
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <div>主机：{sysInfo?.hostname || '--'}</div>
              <div>CPU：{sysInfo?.cpu_count || '--'} 核</div>
              <div>backend：{runtimeSnapshot.backend || 'agent-teams-local'}</div>
              <div>resume：{runtimeSnapshot.resume_prompt || '无'}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">{card.title}</div>
              <div className="mt-2 text-lg font-semibold text-slate-100">{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.subtitle}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-4 gap-4">
        {stageCards.map((stage) => (
          <StageCard key={stage.key} stage={stage} />
        ))}
      </div>

      <div className="grid grid-cols-[1.25fr,1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">当前 daduhe 链路</h2>
              <p className="mt-1 text-sm text-slate-400">把当前 workflow、日志、产物和下一步动作固定成同一块工位信息。</p>
            </div>
            <Link
              to="/simulation"
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
            >
              去 Launch
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-500">最新 workflow</div>
              <div className="mt-2 text-sm font-semibold text-slate-100">{launchResult?.workflow || runtimeSnapshot.task_title || '尚未启动 pinned workflow'}</div>
              <div className="mt-1 text-xs text-slate-500">{launchResult ? `pid ${launchResult.pid} · ${launchResult.status}` : '建议先进入 Launch 触发主链'}</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-500">当前日志</div>
              <div className="mt-2 text-sm font-semibold text-slate-100">{currentLogFile || '未绑定'}</div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                {currentLogFile ? (
                  <>
                    <button onClick={() => openPath(currentLogFile)} className="text-hydro-400 hover:text-hydro-300 transition-colors">
                      打开
                    </button>
                    <button onClick={() => revealPath(currentLogFile)} className="text-slate-400 hover:text-slate-300 transition-colors">
                      定位
                    </button>
                  </>
                ) : (
                  <span className="text-slate-500">启动 workflow 后自动绑定</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {studioState.tasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{task.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{task.detail}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] ${
                    task.status === 'running'
                      ? 'border border-blue-500/30 bg-blue-500/10 text-blue-300'
                      : task.status === 'pending-approval'
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : 'border border-slate-700/50 bg-slate-900/60 text-slate-300'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">workflow: {task.workflow} · backend: {task.backend}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Review / Release 收口</h2>
              <p className="mt-1 text-sm text-slate-400">把 gate、真实产物和 release 前置动作固定在同一视图，不再回退到项目中心找入口。</p>
            </div>
            <Link
              to="/review"
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
            >
              去 Review
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-700/40 bg-slate-950/50 p-4">
            <div className="text-xs text-slate-500">验收摘要</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-3">
                <div className="text-xs text-slate-500">closure</div>
                <div className="mt-1 text-slate-100">{caseSummary.closure_check_passed ? 'passed' : 'pending'}</div>
              </div>
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-3">
                <div className="text-xs text-slate-500">outcomes</div>
                <div className="mt-1 text-slate-100">{caseSummary.outcomes_generated}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {artifacts.slice(0, 4).map((artifact) => (
              <div key={`${artifact.name}-${artifact.path || artifact.updated}`} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="text-sm text-slate-200">{artifact.name}</div>
                <div className="mt-1 text-xs text-slate-500">{artifact.type || artifact.category || 'artifact'} · 更新于 {artifact.updated || artifact.updated_at || 'unknown'}</div>
                {artifact.path ? (
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <button onClick={() => openPath(artifact.path)} className="text-hydro-400 hover:text-hydro-300 transition-colors">
                      打开
                    </button>
                    <button onClick={() => revealPath(artifact.path)} className="text-slate-400 hover:text-slate-300 transition-colors">
                      定位
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">等待真实 artifacts 落盘后提供定位。</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
