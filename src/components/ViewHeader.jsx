import { getModeMeta, getRuntimeEnvironmentMeta } from '../config/shellMeta';
import { roleProfiles } from '../data/roleProfiles';

const railStyles = {
  active: 'border-hydro-500/40 bg-hydro-500/15 text-hydro-200',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  upcoming: 'border-slate-700/50 bg-slate-800/60 text-slate-300',
  next: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
  idle: 'border-slate-700/50 bg-slate-900/70 text-slate-500',
};

export default function ViewHeader({
  activeMode,
  activeAccount,
  activeProject,
  activeRole,
  activeStage,
  activeSurfaceMode,
  activeView,
  isTauri,
  navigate,
  shellCaseId,
  workbenchRail,
}) {
  const modeMeta = getModeMeta(activeMode);
  const envMeta = getRuntimeEnvironmentMeta(isTauri);
  const activeRoleProfile = roleProfiles[activeRole] || roleProfiles.designer;

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/70 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-slate-500">HydroMind Studio</div>
          <h1 className="mt-2 text-xl font-semibold text-slate-100">{activeView.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{activeView.subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
              case {shellCaseId}
            </span>
            <span className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-[10px] text-slate-300">
              {activeProject.name}
            </span>
            {workbenchRail.map((stage) => (
              <button
                type="button"
                key={stage.key}
                onClick={() => navigate(stage.route)}
                className={`rounded-full border px-3 py-1 text-[10px] transition-colors ${railStyles[stage.railState] || railStyles.idle}`}
              >
                {stage.title}
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {activeStage
              ? `${activeStage.title} 工位 · ${activeStage.summary}`
              : '总览工位 · 从 Launch / Monitor / Review / Release 进入当前案例自主运行验收主链'}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
              当前账号 · {activeAccount?.label || '设计账号'}
            </span>
            <span
              data-testid="view-header-active-role-label"
              className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1 text-xs text-slate-300"
            >
              角色锁定 · {activeRoleProfile.label}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs ${modeMeta.className}`}>
              模式锁定 · {modeMeta.label}
            </span>
            <button
              type="button"
              onClick={() => navigate('/docs')}
              className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1 text-xs text-slate-300"
            >
              文档中心
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1 text-xs text-slate-300"
            >
              切换账号
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{modeMeta.summary}</span>
            <span>当前工作台由账号画像决定，如需切换模式请切换账号。</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className={`rounded-full border px-3 py-1 ${envMeta.className}`}>{envMeta.label}</span>
            <span>{envMeta.summary}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs ${modeMeta.className}`}>
            {modeMeta.audience}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            {activeMode === 'development' ? `工作面 · ${activeSurfaceMode}` : '业务工作台'}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs ${envMeta.className}`}>
            {envMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
}
