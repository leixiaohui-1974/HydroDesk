import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isTauri, openPath, revealPath, runWorkspaceCommand } from '../api/tauri_bridge';
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
import {
  buildRunCasePipelinePreflightCommand,
  parseSingleObjectJsonStdout,
} from '../config/hydrodesk_commands';
import AutoModelingLoopPanel from '../components/AutoModelingLoopPanel';

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

function SimulationActionButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function SimulationActionGroup({ title, summary, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="rounded-xl border border-slate-700/50 bg-slate-950/35">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-slate-200">{title}</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-500">{summary}</div>
          </div>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
            展开
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-800/70 px-4 py-3">
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </details>
  );
}

export default function Simulation() {
  const { activeProject } = useStudioWorkspace();
  const [searchParams] = useSearchParams();
  const routeCaseId = String(searchParams.get('case_id') ?? '').trim();
  const effectiveCaseId = routeCaseId || activeProject.caseId;
  const shellCaseId = resolveShellCaseId(effectiveCaseId);
  const [selectedEngine, setSelectedEngine] = useState('local');
  const [pipelinePreflight, setPipelinePreflight] = useState(null);
  const [pipelinePreflightLoading, setPipelinePreflightLoading] = useState(false);
  const [pipelinePreflightError, setPipelinePreflightError] = useState('');
  const [launchContext, setLaunchContext] = useState(null);
  const { workflows, runtimeSnapshot, loading, reload: reloadRuntime } = useStudioRuntime();
  const { summary: caseSummary } = useCaseContractSummary(shellCaseId);
  const { catalog: workflowCatalog } = useCaseWorkflowCatalog(shellCaseId);
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
    shellCaseId,
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
  const preflightSuggestedWorkflows = useMemo(
    () => pipelinePreflight?.modeling_hints?.suggested_workflows || [],
    [pipelinePreflight]
  );
  const selectedWorkflowSuggested = useMemo(
    () => !!selectedWorkflow && preflightSuggestedWorkflows.includes(selectedWorkflow),
    [preflightSuggestedWorkflows, selectedWorkflow]
  );

  function confirmWorkflowLaunch(workflowName) {
    if (!pipelinePreflight || !workflowName || typeof window === 'undefined') {
      return true;
    }
    const warnings = [];
    if ((pipelinePreflight.missing_inputs || []).length > 0) {
      warnings.push(`入口缺口: ${(pipelinePreflight.missing_inputs || []).join(', ')}`);
    }
    if (preflightSuggestedWorkflows.length > 0 && !preflightSuggestedWorkflows.includes(workflowName)) {
      warnings.push(`Graphify 建议工作流: ${preflightSuggestedWorkflows.join(', ')}`);
    }
    if (warnings.length === 0) {
      return true;
    }
    return window.confirm(
      [`当前启动前导提示:`, ...warnings, `仍然启动 ${workflowName} ?`].join('\n')
    );
  }

  useEffect(() => {
    if (!selectedWorkflow && preferredWorkflow) {
      setSelectedWorkflow(preferredWorkflow);
    }
  }, [preferredWorkflow, selectedWorkflow]);

  useEffect(() => {
    if (!shellCaseId || !isTauri) {
      setPipelinePreflight(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setPipelinePreflightLoading(true);
      setPipelinePreflightError('');
      try {
        const cmd = buildRunCasePipelinePreflightCommand(shellCaseId, 'simulation');
        const result = await runWorkspaceCommand(cmd, '.', null);
        const payload = parseSingleObjectJsonStdout(result?.stdout);
        if (!cancelled) {
          if (payload?.case_id === shellCaseId) {
            setPipelinePreflight(payload);
          } else {
            setPipelinePreflight(null);
            setPipelinePreflightError('未能解析 case pipeline preflight JSON');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setPipelinePreflight(null);
          setPipelinePreflightError(error?.message || String(error));
        }
      } finally {
        if (!cancelled) setPipelinePreflightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shellCaseId, isTauri]);

  async function handleStartWorkflow() {
    if (!selectedWorkflow) {
      return;
    }
    if (!confirmWorkflowLaunch(selectedWorkflow)) {
      return;
    }
    setLaunchContext({
      workflow: selectedWorkflow,
      preflightOk: pipelinePreflight?.ok ?? null,
      missingInputs: pipelinePreflight?.missing_inputs || [],
      suggestedWorkflows: preflightSuggestedWorkflows,
      selectedWorkflowSuggested,
      entrySources: pipelinePreflight?.modeling_hints?.entry_sources || {},
    });
    await startWorkflow(selectedWorkflow);
  }

  async function handleStartPinnedWorkflow(workflowName) {
    setSelectedWorkflow(workflowName);
    if (!confirmWorkflowLaunch(workflowName)) {
      return;
    }
    setLaunchContext({
      workflow: workflowName,
      preflightOk: pipelinePreflight?.ok ?? null,
      missingInputs: pipelinePreflight?.missing_inputs || [],
      suggestedWorkflows: preflightSuggestedWorkflows,
      selectedWorkflowSuggested: preflightSuggestedWorkflows.includes(workflowName),
      entrySources: pipelinePreflight?.modeling_hints?.entry_sources || {},
    });
    await startWorkflow(workflowName);
  }

  async function handleRefresh() {
    await Promise.all([reloadRuntime(), reload()]);
  }

  const currentLogFile = logTail.log_file || launchResult?.log_file || runtimeSnapshot.log_file;
  const simulationPrimaryActions = [
    {
      key: 'start',
      label: starting ? '启动中...' : '启动工作流',
      disabled: !selectedWorkflow || starting,
      onClick: handleStartWorkflow,
      className: 'border-hydro-500/35 bg-hydro-600 text-white hover:bg-hydro-700',
    },
    {
      key: 'stop',
      label: '停止流程',
      disabled: !launchResult?.pid || launchResult?.status === 'stopped',
      onClick: async () => {
        await stopWorkflow();
      },
      className: 'border-red-500/30 text-red-300 hover:bg-red-500/10',
    },
    {
      key: 'refresh',
      label: '手动刷新',
      disabled: false,
      onClick: handleRefresh,
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
  ];
  const simulationDiagnosticActions = [
    {
      key: 'preflight',
      label: pipelinePreflightLoading ? '刷新 preflight 中…' : '刷新 preflight',
      disabled: !shellCaseId || pipelinePreflightLoading || !isTauri,
      onClick: async () => {
        setPipelinePreflightLoading(true);
        setPipelinePreflightError('');
        try {
          const cmd = buildRunCasePipelinePreflightCommand(shellCaseId, 'simulation');
          const result = await runWorkspaceCommand(cmd, '.', null);
          const payload = parseSingleObjectJsonStdout(result?.stdout);
          if (payload?.case_id === shellCaseId) {
            setPipelinePreflight(payload);
          } else {
            setPipelinePreflight(null);
            setPipelinePreflightError('未能解析 case pipeline preflight JSON');
          }
        } catch (error) {
          setPipelinePreflight(null);
          setPipelinePreflightError(error?.message || String(error));
        } finally {
          setPipelinePreflightLoading(false);
        }
      },
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    },
  ];
  const simulationContextActions = [
    {
      key: 'open-log',
      label: '打开当前日志',
      disabled: !currentLogFile,
      onClick: () => openPath(currentLogFile),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
    {
      key: 'reveal-log',
      label: '定位当前日志',
      disabled: !currentLogFile,
      onClick: () => revealPath(currentLogFile),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
  ];

  return (
    <div data-testid="simulation-page" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Launch · 主链启动台</h1>
          <p className="text-sm text-slate-400 mt-1">
            统一选择当前案例（{shellCaseId || '未选案例'}）pinned 主链 workflow、运行后端与执行策略，把 WorkflowRun 固定为主链入口
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-hydro-500/25 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
            Launch Workspace
          </span>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            case {shellCaseId || '—'}
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">启动动作中心</h2>
            <p className="mt-1 text-sm text-slate-400">
              第一屏只保留启动、诊断和日志类高频动作；执行面细节与证据仍保留在下方各结果区。
            </p>
          </div>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            功能全保留 · 入口重组
          </span>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <SimulationActionGroup
            title="主操作"
            summary="围绕当前选中 workflow 的启动、停止与刷新。"
            defaultOpen
          >
            {simulationPrimaryActions.map((action) => (
              <SimulationActionButton
                key={action.key}
                disabled={action.disabled}
                onClick={action.onClick}
                className={action.className}
              >
                {action.label}
              </SimulationActionButton>
            ))}
          </SimulationActionGroup>
          <SimulationActionGroup
            title="启动前诊断"
            summary="preflight 是启动前唯一必须看的前导检查，主入口集中在这里。"
            defaultOpen
          >
            {simulationDiagnosticActions.map((action) => (
              <SimulationActionButton
                key={action.key}
                disabled={action.disabled}
                onClick={action.onClick}
                className={action.className}
              >
                {action.label}
              </SimulationActionButton>
            ))}
          </SimulationActionGroup>
          <SimulationActionGroup
            title="当前日志与上下文"
            summary="保留日志打开/定位等上下文入口，不把结果阅读能力从页面上拿掉。"
          >
            {simulationContextActions.map((action) => (
              <SimulationActionButton
                key={action.key}
                disabled={action.disabled}
                onClick={action.onClick}
                className={action.className}
              >
                {action.label}
              </SimulationActionButton>
            ))}
          </SimulationActionGroup>
        </div>
      </section>

      {pipelinePreflight ? (
        <div
          className={`rounded-xl border px-4 py-3 text-xs leading-6 ${
            (pipelinePreflight.missing_inputs || []).length > 0
              ? 'border-amber-500/25 bg-amber-500/5 text-amber-100/90'
              : 'border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90'
          }`}
        >
          <span className="font-semibold">
            启动前提示：
          </span>{' '}
          {pipelinePreflight.missing_inputs?.length > 0
            ? `当前入口仍缺 ${pipelinePreflight.missing_inputs.join(', ')}。`
            : '当前入口对象已满足 simulation preflight。'}
          {' '}Graphify 建议工作流：
          <span className="font-mono text-slate-100">
            {' '}
            {preflightSuggestedWorkflows.join(', ') || '—'}
          </span>
          。当前选中：
          <span className="font-mono text-slate-100"> {selectedWorkflow || '—'}</span>
          {selectedWorkflow
            ? selectedWorkflowSuggested
              ? '（命中建议）'
              : '（未命中建议，仍可手动启动）'
            : ''}
        </div>
      ) : null}

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
        <div data-testid="simulation-case-gate" className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
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

      <AutoModelingLoopPanel caseId={shellCaseId} />

      <div data-testid="simulation-pipeline-preflight" className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Pipeline Preflight</div>
            <div className="mt-1 text-xs text-slate-500">
              simulation phase 的只读前导输出；用于在启动工作流前查看入口缺口与 Graphify 建模建议。
            </div>
          </div>
          <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
            主刷新入口已收纳到启动动作中心
          </span>
        </div>
        {pipelinePreflightError ? (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {pipelinePreflightError}
          </div>
        ) : null}
        {pipelinePreflight ? (
          <div className="mt-3 space-y-2 text-[11px] text-slate-400">
            <div>
              ok <span className="font-mono text-slate-200">{String(Boolean(pipelinePreflight.ok))}</span>
              {' '}· phase <span className="font-mono text-slate-200">{pipelinePreflight.phase || '—'}</span>
            </div>
            <div>
              missing_inputs:{' '}
              <span className="font-mono text-slate-200">
                {(pipelinePreflight.missing_inputs || []).join(', ') || 'none'}
              </span>
            </div>
            <div>
              entry_sources: manifest {pipelinePreflight.modeling_hints?.entry_sources?.case_manifest || '—'} · source_bundle{' '}
              {pipelinePreflight.modeling_hints?.entry_sources?.source_bundle || '—'} · outlets{' '}
              {pipelinePreflight.modeling_hints?.entry_sources?.outlets || '—'} · simulation{' '}
              {pipelinePreflight.modeling_hints?.entry_sources?.simulation_config || '—'}
            </div>
            <div>
              suggested_workflows:{' '}
              <span className="font-mono text-slate-200">
                {(pipelinePreflight.modeling_hints?.suggested_workflows || []).join(', ') || '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-slate-500">
            当前案例尚未加载 preflight；可点击“刷新 preflight”读取建模入口前导输出。
          </div>
        )}
      </div>

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
                    {preflightSuggestedWorkflows.length > 0 ? (
                      <div className="mt-3 text-[11px] text-slate-500">
                        Graphify 建议匹配：
                        <span
                          className={`ml-2 rounded-full border px-2 py-1 text-[10px] ${
                            preflightSuggestedWorkflows.includes(card.workflow)
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-700/50 bg-slate-900/50 text-slate-400'
                          }`}
                        >
                          {preflightSuggestedWorkflows.includes(card.workflow) ? 'recommended' : 'not suggested'}
                        </span>
                      </div>
                    ) : null}
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
        <div data-testid="simulation-launch-result" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-sm font-semibold text-emerald-300">已触发真实 workflow 启动</div>
          <div className="mt-2 text-sm text-slate-200">
            {launchResult.workflow} · case {launchResult.case_id} · backend {launchResult.backend}
          </div>
          <div className="mt-1 text-xs text-slate-400">日志文件: {launchResult.log_file} · pid: {launchResult.pid} · status: {launchResult.status}</div>
          {launchContext ? (
            <div className="mt-3 space-y-1 text-[11px] text-slate-300">
              <div>
                启动时 preflight: <span className="font-mono">{String(Boolean(launchContext.preflightOk))}</span>
                {' '}· missing_inputs:{' '}
                <span className="font-mono">{launchContext.missingInputs.join(', ') || 'none'}</span>
              </div>
              <div>
                启动时建议工作流:{' '}
                <span className="font-mono">{launchContext.suggestedWorkflows.join(', ') || '—'}</span>
                {' '}· 当前 workflow {launchContext.selectedWorkflowSuggested ? '命中建议' : '未命中建议'}
              </div>
              <div>
                entry_sources: manifest {launchContext.entrySources.case_manifest || '—'} · source_bundle{' '}
                {launchContext.entrySources.source_bundle || '—'} · outlets {launchContext.entrySources.outlets || '—'}
              </div>
            </div>
          ) : null}
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


      </div>

      <div className="grid grid-cols-[1.2fr,1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">真实 artifacts</h2>
              <p className="mt-1 text-xs text-slate-500">
                当前案例 {shellCaseId} · {executionLoading ? '读取中...' : '来自 cases/contracts 等真实目录'}
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
