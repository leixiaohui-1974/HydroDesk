import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  checkHydroMind,
  checkOllama,
  getSystemInfo,
  openPath,
  revealPath,
} from '../api/tauri_bridge';
import { getActiveRoleAgent, getPendingApprovals, getRunningTasks, studioState } from '../data/studioState';
import { getCaseWorkbenchStages, resolveShellCaseId } from '../data/case_contract_shell';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useCaseRunReviewReleaseContracts } from '../hooks/useCaseRunReviewReleaseContracts';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import OmniBar from '../components/OmniBar';
import NLReportRenderer from '../components/NLReportRenderer';

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
            {stage.evidenceBridgePath ? (
              <button
                onClick={() => openPath(stage.evidenceBridgePath)}
                className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                打开 Bridge
              </button>
            ) : null}
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
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
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
  const contractChain = useCaseRunReviewReleaseContracts(shellCaseId);
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
    const baseStages = getCaseWorkbenchStages(shellCaseId, contractChain);

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
  }, [caseSummary, contractChain, currentLogFile, executionHistory.length, launchResult, pendingApprovals.length, runtimeSnapshot.resume_prompt, shellCaseId]);

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

  const [activeReport, setActiveReport] = useState(null);

  const handleDashboardReport = (parsedReport) => {
    setActiveReport(parsedReport.report || parsedReport);
  };

  return (
    <div className="flex flex-col items-center justify-start h-full p-8 overflow-y-auto space-y-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      
      {/* Central Search/Command Component (cc-desktop style) */}
      <section className="w-full max-w-4xl mt-12 text-center">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-hydro-300 to-emerald-300 tracking-tight">
          HydroMind OS
        </h1>
        <p className="mt-4 mb-8 text-sm text-slate-400">
          极简协作调度中枢 · 当前系统状态：{services.hydromind === 'online' ? '在线协作' : '离线推理'} · 当前角色：{activeAgent.name}
        </p>
        
        <OmniBar onReportGenerated={handleDashboardReport} />
        
        {!activeReport && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
             <span className="text-xs text-slate-500 py-1.5 px-3">常用指令：</span>
             <button onClick={() => {}} className="text-xs text-hydro-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-slate-800 rounded-full px-4 py-1.5 transition-all">生成 {activeProject.caseId} 规划设计方案包</button>
             <button onClick={() => {}} className="text-xs text-hydro-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-slate-800 rounded-full px-4 py-1.5 transition-all">运行调度安全校核</button>
             <button onClick={() => {}} className="text-xs text-amber-400 hover:text-amber-300 border border-slate-700 hover:border-amber-500/50 bg-slate-900/50 hover:bg-slate-800 rounded-full px-4 py-1.5 transition-all">为学员拆解上次分析过程</button>
          </div>
        )}
      </section>

      {/* Dynamic Report Renderer */}
      {activeReport && (
        <section className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-500">
           <NLReportRenderer report={activeReport} />
        </section>
      )}

      {/* Legacy Fast Access Indicators (Subdued) */}
      <section className="w-full max-w-5xl mt-auto pt-10 border-t border-slate-800/50 grid grid-cols-4 gap-4 opacity-70 hover:opacity-100 transition-opacity">
          {statCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4">
              <div className="text-[10px] uppercase text-slate-500">{card.title}</div>
              <div className="mt-1 text-base font-semibold text-slate-200">{card.value}</div>
              <div className="mt-1 text-[10px] text-slate-500 truncate">{card.subtitle}</div>
            </div>
          ))}
      </section>
    </div>
  );
}
