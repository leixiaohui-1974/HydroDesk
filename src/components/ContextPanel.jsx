import { useMemo } from 'react';
import { getActiveRoleAgent, getPendingApprovals, studioState } from '../data/studioState';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { getCaseWorkbenchRail, resolveShellCaseId } from '../data/case_contract_shell';
import { formatCaseLabel } from '../data/caseShellPresets';

const railPillStyles = {
  active: 'border-hydro-500/40 bg-hydro-500/15 text-hydro-200',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  upcoming: 'border-slate-700/50 bg-slate-800/70 text-slate-300',
  next: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
  idle: 'border-slate-700/50 bg-slate-900/60 text-slate-500',
};

export default function ContextPanel({ view }) {
  const { activeProject, activeRole, activeMode, activeSurfaceMode } = useStudioWorkspace();
  const primaryAgent = getActiveRoleAgent(view.path, activeRole);
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const workbenchRail = useMemo(() => getCaseWorkbenchRail(shellCaseId, view.path), [shellCaseId, view.path]);
  const activeStage = workbenchRail.find((stage) => stage.isActive) || null;
  const nextStage = activeStage
    ? workbenchRail.find((stage) => stage.railState === 'upcoming')
    : workbenchRail.find((stage) => stage.railState === 'next') || workbenchRail[0];
  const contextMetrics = [
    { label: '当前工程', value: activeProject.name },
    { label: '当前案例', value: activeProject.caseId },
    { label: '活跃任务', value: String(studioState.tasks.length) },
    { label: '待确认', value: String(getPendingApprovals().length) },
    { label: '当前模式', value: activeMode === 'development' ? '开发模式' : '发布模式' },
    { label: '当前工作面', value: activeMode === 'development' ? activeSurfaceMode : 'delivery' },
  ];
  const modeActions =
    activeMode === 'development'
      ? activeSurfaceMode === 'terminal'
        ? ['切换终端会话', '打开 ClaudeCode 工作区', '执行本地命令']
        : activeSurfaceMode === 'agent'
          ? ['发起 AI 对话', '解释当前 outcome gate', '生成下一步动作']
          : ['插入 evidence', '记录签发备注', '整理 Release 结论']
      : ['打开角色工作台', '查看成果页', '跟踪运行与告警'];
  const focusItems = activeStage ? activeStage.notes : view.focus;
  const recommendedActions = activeStage
    ? [
        `检查 ${activeStage.evidenceLabel}`,
        activeStage.title === 'Launch' ? '绑定日志 / 恢复提示' : `完成 ${activeStage.title} 当前收口`,
        nextStage ? `准备 ${nextStage.title}` : '准备最终签发',
      ]
    : [...view.actions, ...modeActions];

  return (
    <aside className="w-80 border-l border-slate-700/50 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="p-4 space-y-4">
        <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">{formatCaseLabel(shellCaseId)} 主链</div>
              <div className="mt-1 text-sm text-slate-200">Launch / Monitor / Review / Release</div>
            </div>
            <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300">
              {shellCaseId}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {workbenchRail.map((stage) => (
              <span
                key={stage.key}
                className={`rounded-full border px-2 py-1 text-[10px] ${railPillStyles[stage.railState] || railPillStyles.idle}`}
              >
                {stage.title}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs leading-5 text-slate-500">
            {activeStage
              ? `当前聚焦 ${activeStage.title}，锚点 ${activeStage.evidenceLabel}${nextStage ? `；下一工位 ${nextStage.title}` : ''}`
              : '当前是总览 / 支撑视图，可随时回到四段式主链工位。'}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">当前视图</div>
          <h2 className="text-base font-semibold text-slate-100">{view.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{view.subtitle}</p>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium text-slate-200">{primaryAgent.name}</div>
              <div className="text-xs text-slate-500">{primaryAgent.role}</div>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
              自动装配
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-400">{primaryAgent.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {primaryAgent.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-hydro-500/20 bg-hydro-500/10 px-2 py-1 text-[11px] text-hydro-300"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-sm font-medium text-slate-200 mb-3">关注焦点</div>
          <div className="space-y-2">
            {focusItems.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/60 px-3 py-2"
              >
                <span className="text-sm text-slate-300">{item}</span>
                <span className="text-[10px] text-slate-500">已激活</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-sm font-medium text-slate-200 mb-3">上下文摘要</div>
          <div className="space-y-3">
            {contextMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{metric.label}</span>
                <span className="text-sm text-slate-300">{metric.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-sm font-medium text-slate-200 mb-3">推荐动作</div>
          <div className="space-y-2">
            {recommendedActions.map((action) => (
              <button
                key={action}
                className="w-full rounded-lg border border-slate-700/50 bg-slate-800/70 px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:border-hydro-500/40 hover:text-hydro-300"
              >
                {action}
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
