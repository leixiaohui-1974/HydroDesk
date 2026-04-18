import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openPath, readWorkspaceTextFile, revealPath } from '../api/tauri_bridge';
import WorkspacePreviewPanel from '../components/workspace/WorkspacePreviewPanel';
import { buildPreviewSection, tryParsePreviewJson } from '../components/workspace/workspacePreviewUtils';
import useWorkspacePreviewLoader from '../components/workspace/useWorkspacePreviewLoader';
import {
  buildWorkspaceBusinessPreviewByKind,
  getWorkspaceAssetPreviewKind,
} from '../components/workspace/workspaceAssetPreviewRegistry';
import { getPendingApprovals, getRunningTasks, studioState } from '../data/studioState';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import ScadaReplayMonitorBlock from '../components/ScadaReplayMonitorBlock';

const StationCard = ({ station, onClick, isSelected }) => {
  const statusStyles = {
    normal: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    error: 'border-red-500/30 bg-red-500/5 animate-pulse',
  };
  const statusLabels = { normal: '正常', warning: '警告', error: '异常' };
  const statusDots = { normal: 'bg-green-400', warning: 'bg-amber-400', error: 'bg-red-400' };

  return (
    <button
      onClick={() => onClick(station)}
      className={`text-left p-3 rounded-xl border transition-all ${
        isSelected ? 'ring-1 ring-hydro-500' : ''
      } ${statusStyles[station.status]} hover:brightness-110`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-200">{station.name}</div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDots[station.status]}`} />
          <span className="text-[10px] text-slate-500">{statusLabels[station.status]}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-slate-500">流量</div>
          <div className="text-sm font-semibold text-slate-300">{station.flow}</div>
          <div className="text-[10px] text-slate-600">m³/s</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">水位</div>
          <div className="text-sm font-semibold text-slate-300">{station.level}</div>
          <div className="text-[10px] text-slate-600">m</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">压力</div>
          <div className="text-sm font-semibold text-slate-300">{station.pressure}</div>
          <div className="text-[10px] text-slate-600">MPa</div>
        </div>
      </div>
    </button>
  );
};

function MonitorActionButton({ children, className = '', ...props }) {
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

function MonitorActionGroup({ title, summary, defaultOpen = false, children }) {
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

function buildMonitorBusinessPreview({ asset, previewContent, activeProject, runtimeSnapshot, logTail }) {
  if (!asset) return null;
  const assetKind = getWorkspaceAssetPreviewKind({
    path: asset.path,
    previewType: asset.previewType,
    kind: asset.kind,
  });

  if (assetKind === 'runtime_log') {
    return buildWorkspaceBusinessPreviewByKind('runtime_log', {
      previewContent,
      description: '当前运行日志更适合被看作 live runtime trace，而不是普通文本文件。',
      badges: ['runtime-log', activeProject.caseId],
      caseId: activeProject.caseId,
      task: runtimeSnapshot.task_title,
      resumePrompt: runtimeSnapshot.resume_prompt,
      lineCount: logTail.lines.length,
    });
  }

  if (assetKind === 'runtime_run') {
    return buildWorkspaceBusinessPreviewByKind('runtime_run', {
      previewContent,
      description: '当前执行记录可作为运行中的 workflow 会话看待，用来定位 log、pid 和状态变化。',
      badges: ['execution-history', asset.run.status || 'unknown'],
      workflow: asset.run.workflow,
      caseId: asset.run.case_id,
      pid: asset.run.pid,
      status: asset.run.status,
      startedAt: asset.run.started_at,
      logFile: asset.run.log_file,
    });
  }

  if (assetKind === 'outcome_coverage') {
    return buildWorkspaceBusinessPreviewByKind('outcome_coverage', {
      previewContent,
      description: '在值守视角下，这份报告更适合判断当前 runtime 的 outcome 覆盖与可信度。',
      badges: ['coverage', activeProject.caseId],
      status: tryParsePreviewJson(previewContent)?.status,
    });
  }

  if (assetKind === 'verification') {
    return buildWorkspaceBusinessPreviewByKind('verification', {
      previewContent,
      description: '在值守视角下，这份报告更适合判断当前链路是否达到阶段验收门槛。',
      badges: ['verification', activeProject.caseId],
    });
  }

  if (assetKind === 'live_dashboard') {
    return buildWorkspaceBusinessPreviewByKind('live_dashboard', {
      previewContent,
      description: '运行中心里这类资产更适合被看作实时观测面与回看面板。',
      badges: ['live-dashboard', activeProject.caseId],
      path: asset.path,
      taskTitle: runtimeSnapshot.task_title,
      workspaceStage: 'runtime',
    });
  }

  return {
    title: asset.label,
    description: '当前运行资产预览',
    badges: [asset.kind || 'asset'],
    sections: [
      buildPreviewSection('资产信息', [
        { label: 'path', value: asset.path || '—' },
        { label: 'case_id', value: activeProject.caseId },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

function inferMonitorFocusTargetsFromAction(actionKey = '', currentKind = '') {
  const key = String(actionKey || '').trim();
  if (!key) return [];

  if (key === 'runtime-refresh') {
    if (currentKind === 'live_dashboard') {
      return [{ kind: 'live_dashboard' }, { kind: 'outcome_coverage' }, { kind: 'verification' }];
    }
    if (currentKind === 'runtime_run') {
      return [{ kind: 'runtime_run' }, { kind: 'runtime_log' }];
    }
    if (currentKind === 'runtime_log') {
      return [{ kind: 'runtime_log' }, { kind: 'live_dashboard' }];
    }
    if (currentKind === 'outcome_coverage' || currentKind === 'verification') {
      return [{ kind: currentKind }, { kind: 'live_dashboard' }];
    }
  }

  return currentKind ? [{ kind: currentKind }] : [];
}

export default function Monitor() {
  const navigate = useNavigate();
  const { activeProject } = useStudioWorkspace();
  const [selectedStation, setSelectedStation] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedRuntimeAssetKey, setSelectedRuntimeAssetKey] = useState('');
  const [highlightedRuntimeAssetKey, setHighlightedRuntimeAssetKey] = useState('');
  const [runtimePreviewRefreshNonce, setRuntimePreviewRefreshNonce] = useState(0);
  const [pendingRuntimeFocusTargets, setPendingRuntimeFocusTargets] = useState([]);
  const [runtimePreviewStatusNote, setRuntimePreviewStatusNote] = useState('');
  const runningTasks = getRunningTasks();
  const { runtimeSnapshot, reload: reloadRuntime } = useStudioRuntime();
  const { logTail, checkpoints, artifacts, executionHistory, reload } = useWorkflowExecution(activeProject.caseId, studioState.artifacts);
  const currentLogFile = logTail.log_file || runtimeSnapshot.log_file;
  const runtimeWorkspaceAssets = useMemo(
    () => [
      ...(currentLogFile
        ? [
            {
              key: 'runtime-log',
              label: '当前日志',
              note: '当前运行日志尾部与 runtime trace',
              path: currentLogFile,
              kind: 'log',
            },
          ]
        : []),
      ...artifacts.slice(0, 6).map((artifact) => ({
        key: `artifact:${artifact.path}`,
        label: artifact.name,
        note: artifact.type || artifact.category || 'artifact',
        path: artifact.path,
        kind: 'artifact',
      })),
      ...executionHistory.slice(0, 5).map((run) => ({
        key: `run:${run.id || run.workflow || run.pid}`,
        label: run.workflow || 'workflow',
        note: `${run.status || 'unknown'} · pid ${run.pid || '—'}`,
        path: run.log_file || '',
        kind: 'run',
        run,
      })),
    ],
    [artifacts, currentLogFile, executionHistory],
  );
  const selectedRuntimeAsset = useMemo(
    () => runtimeWorkspaceAssets.find((asset) => asset.key === selectedRuntimeAssetKey) || null,
    [runtimeWorkspaceAssets, selectedRuntimeAssetKey],
  );
  const selectedRuntimeAssetKind = useMemo(
    () =>
      getWorkspaceAssetPreviewKind({
        path: selectedRuntimeAsset?.path,
        previewType: selectedRuntimeAsset?.previewType,
        kind: selectedRuntimeAsset?.kind,
      }),
    [selectedRuntimeAsset?.kind, selectedRuntimeAsset?.path, selectedRuntimeAsset?.previewType],
  );
  const handleRefresh = useCallback(async () => {
    await Promise.all([reloadRuntime(), reload()]);
  }, [reload, reloadRuntime]);
  const monitorPrimaryActions = [
    {
      key: 'refresh',
      label: '刷新值守状态',
      onClick: handleRefresh,
      className: 'border-hydro-500/35 bg-hydro-500/15 text-hydro-200 hover:bg-hydro-500/20',
    },
  ];
  const monitorRangeActions = ['1h', '6h', '24h', '7d'].map((range) => ({
    key: range,
    label: range,
    onClick: () => setTimeRange(range),
    className:
      timeRange === range
        ? 'border-hydro-500/35 bg-hydro-500/15 text-hydro-200'
        : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
  }));
  const monitorContextActions = [
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

  useEffect(() => {
    if (!runtimeWorkspaceAssets.some((asset) => asset.key === selectedRuntimeAssetKey)) {
      setSelectedRuntimeAssetKey(runtimeWorkspaceAssets[0]?.key || '');
    }
  }, [runtimeWorkspaceAssets, selectedRuntimeAssetKey]);

  useEffect(() => {
    if (!highlightedRuntimeAssetKey) return undefined;
    const timer = window.setTimeout(() => setHighlightedRuntimeAssetKey(''), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightedRuntimeAssetKey]);
  const loadRuntimePreview = useCallback(async (selectedAsset) => {
    if (!selectedAsset) return null;

    let previewContent = '当前资产暂无可读取内容。';
    if (selectedAsset.kind === 'log') {
      previewContent = logTail.lines.length > 0 ? logTail.lines.join('\n') : '当前没有可显示的实时日志。';
    } else if (selectedAsset.kind === 'run') {
      previewContent = JSON.stringify(selectedAsset.run || {}, null, 2);
    } else if (selectedAsset.path) {
      const text = await readWorkspaceTextFile(selectedAsset.path, null);
      previewContent = text ?? `当前资产 ${selectedAsset.path} 暂不可文本读取，请直接打开文件。`;
    }

    return buildMonitorBusinessPreview({
      asset: selectedAsset,
      previewContent,
      activeProject,
      runtimeSnapshot,
      logTail,
    });
  }, [activeProject, logTail, runtimeSnapshot]);
  const {
    preview: selectedRuntimeAssetPreview,
    loading: selectedRuntimeAssetPreviewLoading,
    error: selectedRuntimeAssetPreviewError,
  } = useWorkspacePreviewLoader({
    selectedItem: selectedRuntimeAsset,
    loadPreview: loadRuntimePreview,
    deps: [runtimePreviewRefreshNonce],
  });
  const refreshRuntimePreviewAfterAction = useCallback(async (actionKey, label) => {
    setRuntimePreviewStatusNote(`已执行${label}，正在刷新值守状态。`);
    await handleRefresh();
    setPendingRuntimeFocusTargets(inferMonitorFocusTargetsFromAction(actionKey, selectedRuntimeAssetKind));
    setRuntimePreviewRefreshNonce((value) => value + 1);
  }, [handleRefresh, selectedRuntimeAssetKind]);
  const runRuntimePreviewAction = useCallback(async (actionKey, label, runner, options = {}) => {
    await Promise.resolve(runner());
    if (options.refresh !== false) {
      await refreshRuntimePreviewAfterAction(actionKey, label);
    } else {
      setRuntimePreviewStatusNote(`已执行${label}。`);
    }
  }, [refreshRuntimePreviewAfterAction]);

  useEffect(() => {
    if (!Array.isArray(pendingRuntimeFocusTargets) || pendingRuntimeFocusTargets.length === 0) return;
    if (!Array.isArray(runtimeWorkspaceAssets) || runtimeWorkspaceAssets.length === 0) return;

    const matchedAsset = runtimeWorkspaceAssets.find((asset) => {
      const kind = getWorkspaceAssetPreviewKind({
        path: asset.path,
        previewType: asset.previewType,
        kind: asset.kind,
      });
      return pendingRuntimeFocusTargets.some((target) => target.kind === kind);
    });

    if (matchedAsset?.key) {
      setSelectedRuntimeAssetKey(matchedAsset.key);
      setHighlightedRuntimeAssetKey(matchedAsset.key);
      setRuntimePreviewStatusNote(`已切换到 ${matchedAsset.label}。`);
    } else {
      setRuntimePreviewStatusNote('已刷新值守状态；当前保留原选择。');
    }
    setPendingRuntimeFocusTargets([]);
  }, [pendingRuntimeFocusTargets, runtimeWorkspaceAssets]);

  const runtimePreviewActions = useMemo(() => {
    if (!selectedRuntimeAssetKind) return [];

    const refreshAction = {
      key: 'runtime-refresh',
      label: '刷新值守状态',
      disabled: false,
      onClick: () => void runRuntimePreviewAction('runtime-refresh', '刷新值守状态', handleRefresh),
      className: 'border-hydro-500/35 bg-hydro-500/15 text-hydro-200',
    };
    const openSelectedAction = {
      key: 'runtime-open-selected',
      label: '打开文件',
      disabled: !selectedRuntimeAsset?.path,
      onClick: () => void runRuntimePreviewAction('runtime-open-selected', '打开文件', () => selectedRuntimeAsset?.path && openPath(selectedRuntimeAsset.path), { refresh: false }),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
    const revealSelectedAction = {
      key: 'runtime-reveal-selected',
      label: '定位文件',
      disabled: !selectedRuntimeAsset?.path,
      onClick: () => void runRuntimePreviewAction('runtime-reveal-selected', '定位文件', () => selectedRuntimeAsset?.path && revealPath(selectedRuntimeAsset.path), { refresh: false }),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    };
    const gotoReviewAction = {
      key: 'runtime-goto-review',
      label: '转到审查交付',
      disabled: false,
      onClick: () => void runRuntimePreviewAction('runtime-goto-review', '转到审查交付', () => navigate('/review'), { refresh: false }),
      className: 'border-indigo-500/35 bg-indigo-500/15 text-indigo-200',
    };
    const gotoSimulationAction = {
      key: 'runtime-goto-simulation',
      label: '转到模拟',
      disabled: false,
      onClick: () => void runRuntimePreviewAction('runtime-goto-simulation', '转到模拟', () => navigate('/simulation'), { refresh: false }),
      className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
    };
    const openCurrentLogAction = {
      key: 'runtime-open-log',
      label: '打开当前日志',
      disabled: !currentLogFile,
      onClick: () => void runRuntimePreviewAction('runtime-open-log', '打开当前日志', () => currentLogFile && openPath(currentLogFile), { refresh: false }),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };

    if (selectedRuntimeAssetKind === 'runtime_log') {
      return [refreshAction, openCurrentLogAction, revealSelectedAction];
    }

    if (selectedRuntimeAssetKind === 'runtime_run') {
      return [refreshAction, openSelectedAction, gotoSimulationAction];
    }

    if (selectedRuntimeAssetKind === 'outcome_coverage' || selectedRuntimeAssetKind === 'verification') {
      return [refreshAction, gotoReviewAction, openSelectedAction];
    }

    if (selectedRuntimeAssetKind === 'live_dashboard') {
      return [refreshAction, gotoSimulationAction, openSelectedAction];
    }

    return [refreshAction, openSelectedAction, revealSelectedAction];
  }, [
    currentLogFile,
    handleRefresh,
    navigate,
    runRuntimePreviewAction,
    selectedRuntimeAsset?.path,
    selectedRuntimeAssetKind,
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">运行中心</h1>
          <p className="text-sm text-slate-400 mt-1">实时值守、告警、执行日志与回放入口 · 当前案例 {activeProject.caseId}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/docs#page-monitor')}
            className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300"
          >
            查看本页说明
          </button>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            Operator Surface
          </span>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            case {activeProject.caseId}
          </span>
        </div>
      </div>

      <section className="border-b border-slate-700/50 bg-slate-900/30 px-6 py-4 shrink-0">
        <div className="grid gap-3 xl:grid-cols-3">
          <MonitorActionGroup
            title="值守主操作"
            summary="只保留值守视角的高频动作，先刷新状态，再进入日志与告警处理。"
            defaultOpen
          >
            {monitorPrimaryActions.map((action) => (
              <MonitorActionButton key={action.key} onClick={action.onClick} className={action.className}>
                {action.label}
              </MonitorActionButton>
            ))}
          </MonitorActionGroup>
          <MonitorActionGroup
            title="观察窗口"
            summary="控制趋势图时间尺度，但不让它与主刷新动作抢夺第一屏注意力。"
            defaultOpen
          >
            {monitorRangeActions.map((action) => (
              <MonitorActionButton key={action.key} onClick={action.onClick} className={action.className}>
                {action.label}
              </MonitorActionButton>
            ))}
          </MonitorActionGroup>
          <MonitorActionGroup
            title="当前日志与上下文"
            summary="保留当前日志的打开与定位入口，帮助值守人员快速落到本地证据。"
          >
            {monitorContextActions.map((action) => (
              <MonitorActionButton
                key={action.key}
                disabled={action.disabled}
                onClick={action.onClick}
                className={action.className}
              >
                {action.label}
              </MonitorActionButton>
            ))}
          </MonitorActionGroup>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 border-b border-slate-700/50 bg-slate-900/30 px-6 py-4 shrink-0">
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-500">运行中任务</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{runningTasks.length}</div>
          <div className="text-xs text-slate-500">统一主壳直接查看执行状态</div>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-500">待人工确认与最新 workflow</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{getPendingApprovals().length}</div>
          <div className="text-xs text-slate-500">控制断面与 review 结论</div>
          <div className="mt-3 border-t border-slate-700/30 pt-3 text-sm font-semibold text-slate-100">
            {runningTasks[0]?.workflow || runtimeSnapshot.task_title || 'run_watershed_delineation'}
          </div>
          <div className="text-xs text-slate-500">{runtimeSnapshot.resume_prompt || '事件流和回放围绕同一任务组织'}</div>
        </div>
      </div>

      <section className="border-b border-slate-700/50 bg-slate-900/25 px-6 py-4 shrink-0">
        <WorkspacePreviewPanel
          eyebrow="Runtime Workspace"
          title="运行资产预览"
          description="把当前日志、真实产物和执行记录统一收进一个 preview workspace，先理解运行资产的业务角色，再决定是否打开原文件。"
          badge={`${runtimeWorkspaceAssets.length} assets`}
          selectorItems={runtimeWorkspaceAssets.map((asset) => ({
            key: asset.key,
            label: asset.label,
            selected: selectedRuntimeAssetKey === asset.key,
          }))}
          highlightedSelectorKey={highlightedRuntimeAssetKey}
          onSelectItem={(key) => {
            setHighlightedRuntimeAssetKey('');
            setSelectedRuntimeAssetKey(key);
          }}
          loading={selectedRuntimeAssetPreviewLoading}
          loadingText="正在读取当前运行资产..."
          error={selectedRuntimeAssetPreviewError}
          preview={selectedRuntimeAssetPreview}
          emptyText="请选择当前运行资产查看预览。"
          wrapperClassName="mx-0"
        />
        {runtimePreviewActions.length > 0 ? (
          <div className="mt-3 rounded-xl border border-hydro-500/20 bg-hydro-500/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-hydro-300/80">Context Actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {runtimePreviewActions.map((action) => (
                <MonitorActionButton
                  key={action.key}
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={action.className || 'border-hydro-500/35 bg-hydro-500/15 text-hydro-200'}
                >
                  {action.label}
                </MonitorActionButton>
              ))}
            </div>
          </div>
        ) : null}
        {runtimePreviewStatusNote ? (
          <div className="mt-2 text-[11px] text-hydro-200/90">{runtimePreviewStatusNote}</div>
        ) : null}
      </section>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <details className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-200">运行摘要</div>
                  <div className="mt-1 text-xs text-slate-500">展开查看当前日志文件、checkpoints 和最新产物入口。</div>
                </div>
                <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">展开</span>
              </div>
            </summary>
            <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-4">
              <div className="text-xs text-slate-500">当前日志文件</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{logTail.log_file || runtimeSnapshot.log_file || '未检测到'}</div>
              {currentLogFile && (
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => openPath(currentLogFile)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    打开
                  </button>
                  <button onClick={() => revealPath(currentLogFile)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                    定位
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-4">
              <div className="text-xs text-slate-500">真实 checkpoints</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{checkpoints.length}</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-4">
              <div className="text-xs text-slate-500">真实 artifacts</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{artifacts.length}</div>
              {artifacts[0]?.path && (
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => openPath(artifacts[0].path)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    打开最新产物
                  </button>
                  <button onClick={() => revealPath(artifacts[0].path)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                    定位目录
                  </button>
                </div>
              )}
            </div>
            </div>
          </details>

          <ScadaReplayMonitorBlock caseId={activeProject.caseId} />

          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              监测站点 ({studioState.stations.length})
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {studioState.stations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  onClick={setSelectedStation}
                  isSelected={selectedStation?.id === station.id}
                />
              ))}
            </div>
          </div>

          <details className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
            <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">
                趋势图 {selectedStation ? `- ${selectedStation.name}` : ''}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">时间范围: {timeRange}</span>
                <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
                  范围切换已收纳到值守动作中心
                </span>
              </div>
            </div>
            </summary>
            <div className="h-64 flex items-center justify-center bg-slate-800/60 rounded-lg border border-slate-700/30">
              {selectedStation ? (
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2">{selectedStation.name} - 流量趋势</div>
                  {/* Simulated chart bars */}
                  <div className="flex items-end gap-1 h-32 px-8">
                    {Array.from({ length: 24 }, (_, i) => {
                      const height = 30 + Math.random() * 70;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-hydro-500/40 hover:bg-hydro-500/60 rounded-t transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${i}:00 - ${(selectedStation.flow * (0.8 + Math.random() * 0.4)).toFixed(1)} m³/s`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between px-8 mt-1">
                    <span className="text-[10px] text-slate-600">00:00</span>
                    <span className="text-[10px] text-slate-600">06:00</span>
                    <span className="text-[10px] text-slate-600">12:00</span>
                    <span className="text-[10px] text-slate-600">18:00</span>
                    <span className="text-[10px] text-slate-600">24:00</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">请选择一个站点查看趋势图</div>
              )}
            </div>
          </details>

          <details className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
            <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">运行日志尾部</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{logTail.lines.length} lines</span>
                {currentLogFile && (
                  <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
                    主入口已收纳到值守动作中心
                  </span>
                )}
              </div>
            </div>
            </summary>
            <div className="rounded-lg border border-slate-700/40 bg-slate-950/70 p-4 font-mono text-xs leading-6 text-slate-300">
              {logTail.lines.length > 0 ? (
                <pre className="whitespace-pre-wrap break-words">{logTail.lines.join('\n')}</pre>
              ) : (
                <div className="text-slate-500">当前没有可显示的实时日志。</div>
              )}
            </div>
          </details>

          <details className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
            <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">真实执行历史</h2>
              <span className="text-xs text-slate-500">{executionHistory.length} 条</span>
            </div>
            </summary>
            <div className="space-y-3">
              {executionHistory.slice(0, 5).map((run) => (
                <div key={run.id} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-200">{run.workflow}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        case {run.case_id} · pid {run.pid} · {run.status}
                      </div>
                    </div>
                    {run.log_file && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => openPath(run.log_file)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                          日志
                        </button>
                        <button onClick={() => revealPath(run.log_file)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                          定位
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {executionHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700/50 px-4 py-6 text-sm text-slate-500">
                  还没有真实执行历史，启动新的 workflow 后会在这里显示。
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="w-64 border-l border-slate-700/50 overflow-y-auto bg-slate-800/20">
          <div className="p-3 border-b border-slate-700/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              告警信息 ({studioState.alerts.length})
            </h2>
          </div>
          <div className="p-2 space-y-2">
            {studioState.alerts.slice(0, 3).map((alert) => {
              const levelColors = {
                error: 'border-l-red-500 bg-red-500/5',
                warning: 'border-l-amber-500 bg-amber-500/5',
                info: 'border-l-blue-500 bg-blue-500/5',
              };
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-r-lg border-l-2 ${levelColors[alert.level]}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-300">{alert.station}</span>
                    <span className="text-[10px] text-slate-500">{alert.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                </div>
              );
            })}
            {studioState.alerts.length > 3 ? (
              <details className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-3">
                <summary className="cursor-pointer list-none text-[11px] text-slate-300">
                  展开更多告警（{studioState.alerts.length - 3}）
                </summary>
                <div className="mt-3 space-y-2">
                  {studioState.alerts.slice(3).map((alert) => {
                    const levelColors = {
                      error: 'border-l-red-500 bg-red-500/5',
                      warning: 'border-l-amber-500 bg-amber-500/5',
                      info: 'border-l-blue-500 bg-blue-500/5',
                    };
                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-r-lg border-l-2 ${levelColors[alert.level]}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-300">{alert.station}</span>
                          <span className="text-[10px] text-slate-500">{alert.time}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
