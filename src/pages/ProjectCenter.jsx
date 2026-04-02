import React from 'react';
import { openPath, revealPath } from '../api/tauri_bridge';
import { daduheWavePlan, getDaduheReviewAssets, getDaduheShellEntryPoints, resolveDaduheShellCaseId } from '../data/daduheShell';
import { getActiveRoleAgent, studioState } from '../data/studioState';
import { hydroPortfolioCatalog, primarySurfaceLabels } from '../data/projectPortfolio';
import { executionSurfaceCatalog } from '../data/workflowSurfaces';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

const statusStyles = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  review: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
  risk: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

export default function ProjectCenter() {
  const activeAgent = getActiveRoleAgent('/projects');
  const { activeProject, activeProjectId, setActiveProjectId } = useStudioWorkspace();
  const shellCaseId = resolveDaduheShellCaseId(activeProject.caseId);
  const { runtimeSnapshot, reload: reloadRuntime } = useStudioRuntime();
  const { checkpoints } = useWorkflowExecution(activeProject.caseId, studioState.artifacts);
  const { summary: caseSummary, loading: caseSummaryLoading, reload: reloadCaseSummary } = useCaseContractSummary(activeProject.caseId);
  const gateLabel = caseSummary.gate_status === 'passed' ? '通过' : caseSummary.gate_status === 'blocked' ? '阻断' : '待更新';
  const gateClassName = caseSummary.gate_status === 'passed'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : caseSummary.gate_status === 'blocked'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  const reviewAssets = getDaduheReviewAssets(shellCaseId);
  const shellEntryPoints = getDaduheShellEntryPoints(shellCaseId);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">工作空间</div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{studioState.workspace.name}</div>
          <div className="mt-1 text-sm text-slate-400">统一承接工程、案例、会话和运行记录</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">当前角色</div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{activeAgent.name}</div>
          <div className="mt-1 text-sm text-slate-400">{activeAgent.summary}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">项目群</div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{hydroPortfolioCatalog.length} 个核心项目</div>
          <div className="mt-1 text-sm text-slate-400">覆盖建模、闭环、控制、验收、调度与契约层</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">大渡河 E2E Gate</div>
          <div className="mt-2 flex items-center gap-3">
            <span className={`rounded-full border px-2 py-1 text-[10px] ${gateClassName}`}>{gateLabel}</span>
            <span className="text-lg font-semibold text-slate-100">
              {caseSummaryLoading ? '读取中...' : `${caseSummary.outcomes_generated}/${caseSummary.total_executed || caseSummary.total}`}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {caseSummaryLoading
              ? '正在读取 contracts 摘要'
              : `证据 ${caseSummary.evidence_bound_count} · schema ${caseSummary.schema_valid_count} · timeout ${caseSummary.timeout}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.6fr,1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40">
          <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">工程与案例</h2>
              <p className="mt-1 text-xs text-slate-500">围绕当前项目阶段、案例与主链任务组织</p>
            </div>
            <button className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300">
              新建工程
            </button>
          </div>
          <div className="divide-y divide-slate-700/40">
            {studioState.projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-slate-100">{project.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {project.id} · {project.caseId} · 阶段 {project.stage}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2 py-1 text-[10px] ${statusStyles[project.status]}`}>
                    {project.status === 'active' ? '进行中' : project.status === 'review' ? '审查中' : '需关注'}
                  </span>
                  <button
                    onClick={() => setActiveProjectId(project.id)}
                    className={`text-xs ${activeProjectId === project.id ? 'text-emerald-300' : 'text-hydro-300'}`}
                  >
                    {activeProjectId === project.id ? '当前案例' : '切换'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">daduhe 运行闭环</h2>
              <div className="mt-2 text-xs text-slate-500">
                当前 phase: {runtimeSnapshot.phase || '未检测到'} · 当前步骤: {runtimeSnapshot.current_step || '无'}
              </div>
            </div>
            <button
              onClick={() => {
                reloadRuntime();
                reloadCaseSummary();
              }}
              className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800/60"
            >
              刷新摘要
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">唯一执行 workflow</div>
              <div className="mt-2 text-xl font-semibold text-slate-100">{caseSummary.total_executed || '--'}</div>
              <div className="mt-1 text-xs text-slate-500">原始记录 {caseSummary.total || '--'} 条</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">Outcome Coverage</div>
              <div className="mt-2 text-xl font-semibold text-slate-100">
                {caseSummary.normalized_outcome_coverage ? `${Math.round(caseSummary.normalized_outcome_coverage * 100)}%` : '--'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                原始口径 {caseSummary.raw_outcome_coverage ? `${Math.round(caseSummary.raw_outcome_coverage * 100)}%` : '--'}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                title: '当前运行焦点',
                detail: caseSummary.current_workflow || runtimeSnapshot.current_focus || '当前没有活动 workflow，进入验收与回放阶段。',
              },
              {
                title: '重复执行提示',
                detail: caseSummary.duplicate_runs.length > 0
                  ? caseSummary.duplicate_runs.map((item) => `${item.workflow} ×${item.count}`).join('，')
                  : '没有检测到重复 workflow 记录。',
              },
              {
                title: '待处理项',
                detail: caseSummary.pending_workflows.length > 0
                  ? caseSummary.pending_workflows.join('，')
                  : '当前没有 pending workflows，可以转入交付/对齐阶段。',
              },
            ].map((run) => (
              <div key={run.title} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-200">{run.title}</div>
                  <span className="text-[10px] text-slate-500">{activeProject.caseId}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-400">{run.detail}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">项目群中控</h2>
            <p className="mt-1 text-xs text-slate-500">把 daduhe 端到端链路拆到真实项目：谁拥有 workflow、谁负责验收、谁是协议面。</p>
          </div>
          <span className="text-xs text-slate-500">HydroDesk 作为统一编排壳</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {hydroPortfolioCatalog.map((project) => (
            <div key={project.id} className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{project.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{project.path}</div>
                </div>
                <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                  {primarySurfaceLabels[project.primarySurface]}
                </span>
              </div>
              <div className="mt-3 text-sm text-slate-300">{project.role}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{project.summary}</div>
              <div className="mt-3 text-xs text-slate-400">目录: {project.directories.join(' · ')}</div>
              <div className="mt-2 text-xs text-slate-400">文件: {project.files.join(' · ')}</div>
              <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">
                {project.daduheFocus}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">验收资产面板</h2>
            <p className="mt-1 text-xs text-slate-500">`md/html/json` 是 daduhe E2E 的真实进度源，HydroDesk 用它们做产品化展示。</p>
          </div>
          <span className="text-xs text-slate-500">固定验收壳 · {shellCaseId}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {reviewAssets.map((artifact) => (
            <div key={artifact.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-100">{artifact.name}</div>
                <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {artifact.category}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{artifact.path}</div>
              <div className="mt-3 text-[10px] text-slate-500">updated_at {artifact.updated_at || 'pinned entry point'}</div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openPath(artifact.path)}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPath(artifact.path)}
                  className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                >
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
            <h2 className="text-sm font-semibold text-slate-200">后续开发任务</h2>
            <p className="mt-1 text-xs text-slate-500">围绕 daduhe 自主运行主链和 HydroDesk 端到端测试壳，按波次推进。</p>
          </div>
          <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
            roadmap / backlog 已对齐到 daduhe shell
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {daduheWavePlan.map((wave) => (
            <div key={wave.title} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-sm font-semibold text-slate-100">{wave.title}</div>
              <div className="mt-3 space-y-2">
                {wave.items.map((item) => (
                  <div key={item} className="text-xs leading-5 text-slate-400">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-4">
          {shellEntryPoints.map((entryPoint) => (
            <div key={entryPoint.path} className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-slate-100">{entryPoint.title}</div>
                <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {entryPoint.kind}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-400">{entryPoint.summary}</div>
              <div className="mt-3 text-[10px] leading-5 text-slate-500">{entryPoint.path}</div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openPath(entryPoint.path)}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPath(entryPoint.path)}
                  className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                >
                  定位
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <h2 className="text-sm font-semibold text-slate-200">执行面分层</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {Object.entries(executionSurfaceCatalog).map(([surfaceId, surface]) => (
            <div key={surfaceId} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-sm font-medium text-slate-100">{surface.label}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{surface.summary}</div>
              <div className="mt-3 text-xs text-slate-400">{surface.whenToUse}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">最近 checkpoints</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{activeProject.caseId}</span>
            <button
              onClick={reloadRuntime}
              className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800/60"
            >
              刷新
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {checkpoints.slice(0, 6).map((checkpoint) => (
            <div key={checkpoint.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">{checkpoint.name}</div>
                {checkpoint.current && (
                  <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                    current
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-500">{checkpoint.path}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
