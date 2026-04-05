import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { openPath, revealPath } from '../api/tauri_bridge';
import { getCaseReviewAssets, getCaseShellEntryPoints, resolveShellCaseId } from '../data/case_contract_shell';
import {
  AUTONOMY_PINNED_WORKFLOW_CARDS,
  caseAutonomyChainSectionTitle,
  caseGatePanelLabel,
  formatFullSpatialHydroEvidenceCaseListText,
  hasFullSpatialHydroEvidenceCase,
} from '../data/caseShellPresets';
import { studioState } from '../data/studioState';
import { getWorkflowSurface } from '../data/workflowSurfaces';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useCaseWorkflowCatalog } from '../hooks/useCaseWorkflowCatalog';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

const SimulationRow = ({ sim, onOpenLog, onRevealLog, onStop }) => {
  const statusColors = {
    completed: 'bg-green-500/20 text-green-400',
    finished: 'bg-emerald-500/20 text-emerald-400',
    running: 'bg-blue-500/20 text-blue-400',
    queued: 'bg-amber-500/20 text-amber-400',
    failed: 'bg-red-500/20 text-red-400',
    stopped: 'bg-slate-700/60 text-slate-300',
  };
  const statusLabels = {
    completed: '已完成',
    finished: '已结束',
    running: '运行中',
    queued: '排队中',
    failed: '失败',
    stopped: '已停止',
  };

  return (
    <tr className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm text-slate-200">{sim.workflow || sim.name}</div>
        <div className="text-xs text-slate-500">{sim.id}</div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        <div>{sim.case_id || '--'}</div>
        <div className="text-xs text-slate-500">pid {sim.pid || '--'}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[sim.status] || 'bg-slate-700/60 text-slate-300'}`}>
          {statusLabels[sim.status] || sim.status || '未知'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{sim.backend || sim.type || '--'}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{sim.started_at || sim.created || '--'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {sim.log_file && (
            <button onClick={() => onOpenLog(sim.log_file)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
              日志
            </button>
          )}
          {sim.log_file && (
            <button onClick={() => onRevealLog(sim.log_file)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
              定位
            </button>
          )}
          {sim.status === 'running' && (
            <button onClick={() => onStop(sim.pid)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
              停止
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const inspectionAssetNames = new Set(['Live Dashboard HTML', 'Live Dashboard Markdown', 'Verification Report']);
const reviewAssetNames = new Set(['Outcome Coverage Report', 'Autonomy Roadmap', 'HydroDesk Fusion Backlog']);

export default function Simulation() {
  const { activeProject } = useStudioWorkspace();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const [selectedEngine, setSelectedEngine] = useState('local');
  const { workflows, runtimeSnapshot, loading, reload: reloadRuntime } = useStudioRuntime();
  const { summary: caseSummary } = useCaseContractSummary(activeProject.caseId);
  const { catalog: workflowCatalog } = useCaseWorkflowCatalog(activeProject.caseId);
  const {
    artifacts,
    checkpoints,
    executionHistory,
    launchResult,
    logTail,
    loading: executionLoading,
    starting,
    reload,
    startWorkflow,
    stopWorkflow,
  } = useWorkflowExecution(
    activeProject.caseId,
    studioState.artifacts
  );
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const shellAssets = useMemo(() => getCaseReviewAssets(shellCaseId), [shellCaseId]);
  const shellEntryPoints = useMemo(() => getCaseShellEntryPoints(shellCaseId), [shellCaseId]);
  const workflowOptions = useMemo(
    () => workflows.map((workflow) => ({ value: workflow.name, label: `${workflow.name} · ${workflow.description}` })),
    [workflows]
  );
  const preferredWorkflow = useMemo(() => {
    const preferred = workflowOptions.find(({ value }) =>
      AUTONOMY_PINNED_WORKFLOW_CARDS.some((card) => card.workflow === value)
    );
    return preferred?.value || workflowOptions[0]?.value || '';
  }, [workflowOptions]);
  const selectedSurface = useMemo(() => getWorkflowSurface(selectedWorkflow), [selectedWorkflow]);
  const selectedManifest = useMemo(
    () => workflowCatalog.find((workflow) => workflow.name === selectedWorkflow) || null,
    [workflowCatalog, selectedWorkflow]
  );
  const pinnedWorkflows = useMemo(
    () =>
      AUTONOMY_PINNED_WORKFLOW_CARDS
        .map((card) => {
          const manifest = workflowCatalog.find((workflow) => workflow.name === card.workflow) || null;
          return {
            ...card,
            available: workflows.some((workflow) => workflow.name === card.workflow),
            manifest,
            surface: getWorkflowSurface(card.workflow),
          };
        })
        .filter((card) => card.available),
    [workflowCatalog, workflows]
  );
  const inspectionAssets = useMemo(
    () => shellAssets.filter((asset) => inspectionAssetNames.has(asset.name)),
    [shellAssets]
  );
  const reviewAssets = useMemo(
    () => shellAssets.filter((asset) => reviewAssetNames.has(asset.name)),
    [shellAssets]
  );
  const reviewEntryPoints = useMemo(
    () => shellEntryPoints.filter((entryPoint) => ['roadmap', 'backlog', 'command'].includes(entryPoint.kind)).slice(0, 3),
    [shellEntryPoints]
  );
  const activeAutonomyRun = useMemo(() => {
    const recentRuns = [launchResult, ...executionHistory].filter(Boolean);
    return recentRuns.find((run) => AUTONOMY_PINNED_WORKFLOW_CARDS.some((card) => card.workflow === run.workflow)) || null;
  }, [executionHistory, launchResult]);

  useEffect(() => {
    if (!selectedWorkflow && preferredWorkflow) {
      setSelectedWorkflow(preferredWorkflow);
    }
  }, [preferredWorkflow, selectedWorkflow]);

  async function handleStartWorkflow() {
    if (!selectedWorkflow) {
      return;
    }
    await startWorkflow(selectedWorkflow);
  }

  async function handleStartPinnedWorkflow(workflowName) {
    setSelectedWorkflow(workflowName);
    await startWorkflow(workflowName);
  }

  async function handleRefresh() {
    await Promise.all([reloadRuntime(), reload()]);
  }

  const currentLogFile = logTail.log_file || launchResult?.log_file || runtimeSnapshot.log_file;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Launch · 主链启动台</h1>
          <p className="text-sm text-slate-400 mt-1">
            统一选择当前案例（{shellCaseId || '未选案例'}）pinned 主链 workflow、运行后端与执行策略，把 WorkflowRun 固定为主链入口
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg border border-slate-700/50 text-slate-300 text-sm hover:bg-slate-800/60 transition-colors"
          >
            手动刷新
          </button>
          <button
            onClick={async () => {
              await stopWorkflow();
            }}
            disabled={!launchResult?.pid || launchResult?.status === 'stopped'}
            className="px-4 py-2 rounded-lg border border-red-500/30 text-red-300 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            停止流程
          </button>
          <button
            onClick={handleStartWorkflow}
            disabled={!selectedWorkflow || starting}
            className="px-4 py-2 bg-hydro-600 text-white text-sm rounded-lg hover:bg-hydro-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? '启动中...' : '启动工作流'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">执行后端</h2>
        <div className="flex gap-3">
          {[
            { id: 'local', label: 'agent-teams-local', desc: '统一主壳默认执行后端' },
            { id: 'hydroflow', label: 'deer-flow-local', desc: '共享 runtime backend 预留位' },
            { id: 'hydroquality', label: 'hm + workflow', desc: '确定性 workflow 与 contract 固化链路' },
          ].map((engine) => (
            <button
              key={engine.id}
              onClick={() => setSelectedEngine(engine.id)}
              className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                selectedEngine === engine.id
                  ? 'border-hydro-500/50 bg-hydro-600/10'
                  : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/30'
              }`}
            >
              <div className={`text-sm font-medium ${
                selectedEngine === engine.id ? 'text-hydro-400' : 'text-slate-300'
              }`}>
                {engine.label}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{engine.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">真实 workflow</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{workflows.length}</div>
          <div className="mt-1 text-xs text-slate-500">{loading ? '读取中...' : '来自 Hydrology/workflows 注册表'}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">当前 phase</div>
          <div className="mt-2 text-base font-semibold text-slate-100">{runtimeSnapshot.phase || '未检测到'}</div>
          <div className="mt-1 text-xs text-slate-500">{runtimeSnapshot.status || '无运行状态'}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">当前任务</div>
          <div className="mt-2 text-base font-semibold text-slate-100">{runtimeSnapshot.task_title || '暂无任务'}</div>
          <div className="mt-1 text-xs text-slate-500">{runtimeSnapshot.current_step || '无步骤信息'}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">恢复命令</div>
          <div className="mt-2 text-sm font-semibold text-slate-100">{runtimeSnapshot.resume_prompt || '无'}</div>
          <div className="mt-1 text-xs text-slate-500">{runtimeSnapshot.backend || '无后端信息'}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">{caseGatePanelLabel(shellCaseId)}</div>
          <div className="mt-2 text-base font-semibold text-slate-100">
            {caseSummary.gate_status === 'passed' ? 'passed' : caseSummary.gate_status || 'unknown'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {caseSummary.evidence_bound_count}/{caseSummary.schema_valid_count} evidence/schema · timeout {caseSummary.timeout}
          </div>
        </div>
      </div>

      {!hasFullSpatialHydroEvidenceCase(shellCaseId) ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-6 text-amber-100/90">
          <span className="font-semibold text-amber-200">数据深度提示：</span>
          案例 <span className="font-mono text-amber-100">{shellCaseId || '—'}</span> 在 rollout 中
          <strong className="text-amber-50">
            {' '}
            未配备与全链空间水文参考案例（<span className="font-mono text-amber-100/95">{formatFullSpatialHydroEvidenceCaseListText()}</span>
            ）同级的流域划分 + 水文模拟{' '}
          </strong>
          全链产物；主链仍以 E2E 壳层、contracts 与 manifest 为主。建模页的探源—断面—水文证据树亦仅对上述配置案例开放。
        </div>
      ) : null}

      <section className="rounded-2xl border border-hydro-500/20 bg-hydro-500/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{caseAutonomyChainSectionTitle(shellCaseId)}</h2>
            <p className="mt-1 text-xs text-slate-400">
              把启动、巡检、审查三步收敛到工作流执行页，避免在项目中心 / 监控 / 审查页之间来回找入口。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/projects"
              className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
            >
              项目壳
            </Link>
            <Link
              to="/monitor"
              className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
            >
              运行中心
            </Link>
            <Link
              to="/review"
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
            >
              审查交付
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">1. Launch</div>
              <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                case {shellCaseId}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-400">
              当前焦点：{caseSummary.current_workflow || runtimeSnapshot.current_focus || '优先从主链启动，再补自治评估。'}
            </div>
            <div className="mt-4 space-y-3">
              {pinnedWorkflows.length > 0 ? (
                pinnedWorkflows.map((card) => (
                  <div
                    key={card.workflow}
                    data-testid={`pinned-workflow-${card.workflow}`}
                    className={`rounded-xl border p-4 ${
                      selectedWorkflow === card.workflow
                        ? 'border-hydro-500/40 bg-hydro-500/10'
                        : 'border-slate-700/40 bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{card.label}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{card.workflow} · {card.surface.ownerAgent}</div>
                      </div>
                      <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                        {selectedWorkflow === card.workflow ? 'selected' : 'pinned'}
                      </span>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-400">{card.summary}</div>
                    <div className="mt-3 text-[11px] leading-5 text-slate-500">
                      {card.manifest?.business_goal || card.surface.rationale}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleStartPinnedWorkflow(card.workflow)}
                        disabled={starting}
                        className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {starting && selectedWorkflow === card.workflow ? '启动中...' : '直接启动'}
                      </button>
                      <button
                        onClick={() => setSelectedWorkflow(card.workflow)}
                        className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                      >
                        仅选中
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4 text-xs leading-5 text-slate-500">
                  当前 workflow 注册表里还没有本案例 pinned 主链（autonomy_autorun / autonomy_assess），请通过下方通用 selector 启动其它工作流。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">2. Inspect</div>
              <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                live / logs
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-400">
              最近链路：{activeAutonomyRun?.workflow || runtimeSnapshot.task_title || '尚未触发 pinned autonomy workflow'}
            </div>
            <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/60 p-4">
              <div className="text-xs text-slate-500">当前日志 / 恢复入口</div>
              <div className="mt-2 text-sm text-slate-200">{currentLogFile || '等待 workflow 启动后自动绑定'}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {runtimeSnapshot.resume_prompt || '继续当前任务'} · {runtimeSnapshot.backend || 'agent-teams-local'}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {currentLogFile && (
                  <>
                    <button
                      onClick={() => openPath(currentLogFile)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
                    >
                      打开日志
                    </button>
                    <button
                      onClick={() => revealPath(currentLogFile)}
                      className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                    >
                      定位日志
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {inspectionAssets.map((asset) => (
                <div key={asset.path} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                  <div className="text-sm text-slate-200">{asset.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{asset.note}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openPath(asset.path)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
                    >
                      打开
                    </button>
                    <button
                      onClick={() => revealPath(asset.path)}
                      className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                    >
                      定位
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">3. Review</div>
              <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                gate / backlog
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-400">
              gate {caseSummary.gate_status || 'unknown'} · closure {caseSummary.closure_check_passed ? 'passed' : 'pending'} · pending{' '}
              {caseSummary.pending_workflows.length}
            </div>
            <div className="mt-4 space-y-3">
              {reviewAssets.map((asset) => (
                <div key={asset.path} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                  <div className="text-sm text-slate-200">{asset.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{asset.note}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openPath(asset.path)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
                    >
                      打开
                    </button>
                    <button
                      onClick={() => revealPath(asset.path)}
                      className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                    >
                      定位
                    </button>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-200">路线图 / backlog 命令</div>
                <div className="mt-3 space-y-2">
                  {reviewEntryPoints.map((entryPoint) => (
                    <button
                      key={entryPoint.path}
                      onClick={() => openPath(entryPoint.path)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-700/50 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                    >
                      <span>{entryPoint.title}</span>
                      <span className="text-[10px] text-slate-500">{entryPoint.kind}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {launchResult && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-sm font-semibold text-emerald-300">已触发真实 workflow 启动</div>
          <div className="mt-2 text-sm text-slate-200">
            {launchResult.workflow} · case {launchResult.case_id} · backend {launchResult.backend}
          </div>
          <div className="mt-1 text-xs text-slate-400">日志文件: {launchResult.log_file} · pid: {launchResult.pid} · status: {launchResult.status}</div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => openPath(launchResult.log_file)} className="text-xs text-emerald-200 hover:text-white transition-colors">
              打开日志
            </button>
            <button onClick={() => revealPath(launchResult.log_file)} className="text-xs text-slate-200 hover:text-white transition-colors">
              定位日志
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">工作流类型</h3>
          <select
            data-testid="workflow-registry-select"
            value={selectedWorkflow}
            onChange={(event) => setSelectedWorkflow(event.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
          >
            {workflowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">执行策略</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16">模式</label>
              <select className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:border-hydro-500 focus:outline-none">
                <option>strict</option>
                <option>fast</option>
                <option>research</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16">确认</label>
              <select className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:border-hydro-500 focus:outline-none">
                <option>自动暂停于 review required</option>
                <option>仅记录，不自动暂停</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">模型算法</h3>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors text-left">
              选择默认模型包...
            </button>
            <button className="w-full px-3 py-2 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors text-left">
              切换 workflow strategy...
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.15fr,1fr] gap-4">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">执行面建议</h2>
              <p className="mt-1 text-xs text-slate-500">决定一个 workflow 在 HydroDesk 里主要走 Product、Agent、Skill 还是 MCP 哪一层。</p>
            </div>
            <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
              {selectedSurface.primarySurfaceInfo.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">Owner Project</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{selectedSurface.ownerProject}</div>
              <div className="mt-1 text-xs text-slate-500">{selectedSurface.ownerAgent}</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">Primary Surface</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{selectedSurface.primarySurfaceInfo.label}</div>
              <div className="mt-1 text-xs text-slate-500">{selectedSurface.primarySurfaceInfo.summary}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-500">Decision Rationale</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{selectedSurface.rationale}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">模板与业务目标</div>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {selectedManifest?.template_name || selectedManifest?.template_id || '等待 manifest'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {selectedManifest?.category || 'general'} · {selectedManifest?.business_goal || '暂无模板业务目标'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selectedManifest?.required_dimensions || []).map((dimension) => (
                  <span key={dimension} className="rounded-full border border-slate-700/50 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-300">
                    {dimension}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">算法与指标包</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedManifest?.algorithm_tags || []).map((tag) => (
                  <span key={tag} className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selectedManifest?.metric_keys || []).map((metric) => (
                  <span key={metric} className="rounded-full border border-slate-700/50 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-300">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { title: 'GIS', items: selectedManifest?.gis_assets || [] },
              { title: '拓扑/水系', items: selectedManifest?.topology_assets || [] },
              { title: '图表/报告', items: [...(selectedManifest?.charts_assets || []), ...(selectedManifest?.conclusion_assets || [])].slice(0, 6) },
            ].map((group) => (
              <div key={group.title} className="rounded-xl border border-slate-700/40 bg-slate-950/60 p-4">
                <div className="text-sm font-medium text-slate-100">{group.title}</div>
                <div className="mt-3 space-y-2">
                  {group.items.length > 0 ? group.items.slice(0, 4).map((item) => (
                    <div key={`${group.title}-${item.path}`} className="text-xs leading-5 text-slate-400">
                      {item.path}
                    </div>
                  )) : (
                    <div className="text-xs text-slate-500">当前 workflow 还没有该类已绑定产物。</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {selectedSurface.supportSurfaceInfo.map((surface) => (
              <div key={surface.id} className="rounded-xl border border-slate-700/40 bg-slate-950/60 p-4">
                <div className="text-sm font-medium text-slate-100">{surface.label}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{surface.whenToUse}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200">大渡河验收闭环</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">执行统计</div>
              <div className="mt-2 text-sm text-slate-200">
                passed {caseSummary.passed} · timeout {caseSummary.timeout} · pending {caseSummary.pending}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                unique executed {caseSummary.total_executed} · outcomes {caseSummary.outcomes_generated}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">当前关注</div>
              <div className="mt-2 text-sm text-slate-200">
                {caseSummary.current_workflow || '当前没有活动 workflow，优先做 release/report 对齐。'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                gate {caseSummary.gate_status} · closure {caseSummary.closure_check_passed ? 'passed' : 'pending'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">关键产物</div>
              <div className="mt-2 space-y-2">
                {caseSummary.key_artifacts.slice(0, 4).map((artifact) => (
                  <div key={artifact.path} className="text-xs text-slate-400">
                    {artifact.category} · {artifact.path}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[1.2fr,1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">真实 artifacts</h2>
              <p className="mt-1 text-xs text-slate-500">
                当前案例 {activeProject.caseId} · {executionLoading ? '读取中...' : '来自 cases/contracts 等真实目录'}
              </p>
            </div>
            <span className="text-xs text-slate-500">{artifacts.length} 项</span>
          </div>
          <div className="mt-4 space-y-3">
            {artifacts.slice(0, 6).map((artifact) => (
              <div key={`${artifact.path}-${artifact.updated_at}`} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="text-sm text-slate-200">{artifact.name}</div>
                <div className="mt-1 text-xs text-slate-500">{artifact.category} · {artifact.path}</div>
                <div className="mt-2 text-[11px] text-slate-500">updated: {artifact.updated_at || 'unknown'}</div>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => openPath(artifact.path)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    打开
                  </button>
                  <button onClick={() => revealPath(artifact.path)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                    定位
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">真实 checkpoints</h2>
              <p className="mt-1 text-xs text-slate-500">来自 .team/context_packets 与 session state</p>
            </div>
            <span className="text-xs text-slate-500">{checkpoints.length} 项</span>
          </div>
          <div className="mt-4 space-y-3">
            {checkpoints.slice(0, 5).map((checkpoint) => (
              <div key={checkpoint.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-200">{checkpoint.name}</div>
                  {checkpoint.current && (
                    <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                      current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">{checkpoint.path}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">启动后日志跟踪</h2>
            <p className="mt-1 text-xs text-slate-500">{currentLogFile || '尚未检测到日志文件'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{logTail.lines.length} lines</span>
            {currentLogFile && (
              <>
                <button onClick={() => openPath(currentLogFile)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                  打开日志
                </button>
                <button onClick={() => revealPath(currentLogFile)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                  定位目录
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/70 p-4 font-mono text-xs leading-6 text-slate-300">
          {logTail.lines.length > 0 ? (
            <pre className="whitespace-pre-wrap break-words">{logTail.lines.join('\n')}</pre>
          ) : (
            <div className="text-slate-500">启动真实 workflow 后，这里会自动刷新最新日志输出。</div>
          )}
        </div>
      </section>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">工作流历史</h2>
            <div className="mt-1 text-xs text-slate-500">来自 .team/execution_results 的真实运行记录</div>
          </div>
          <span className="text-xs text-slate-500">{executionHistory.length} 条执行记录</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-700/30">
              <th className="px-4 py-2 text-left font-medium">名称</th>
              <th className="px-4 py-2 text-left font-medium">案例 / PID</th>
              <th className="px-4 py-2 text-left font-medium">状态</th>
              <th className="px-4 py-2 text-left font-medium">后端</th>
              <th className="px-4 py-2 text-left font-medium">启动时间</th>
              <th className="px-4 py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {executionHistory.length > 0 ? (
              executionHistory.map((sim) => (
                <SimulationRow
                  key={sim.id}
                  sim={sim}
                  onOpenLog={(logFile) => openPath(logFile)}
                  onRevealLog={(logFile) => revealPath(logFile)}
                  onStop={stopWorkflow}
                />
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                  暂无真实执行记录，启动 workflow 后会在这里持续累积。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
