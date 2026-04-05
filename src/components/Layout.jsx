import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import ContextPanel from './ContextPanel';
import ActivityDock from './ActivityDock';
import { developerSurfaces, getStudioView, getSurfaceByPath, getVisibleStudioViews } from '../config/studioViews';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { getCaseWorkbenchRail, resolveShellCaseId } from '../data/case_contract_shell';

const railStyles = {
  active: 'border-hydro-500/40 bg-hydro-500/15 text-hydro-200',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  upcoming: 'border-slate-700/50 bg-slate-800/60 text-slate-300',
  next: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
  idle: 'border-slate-700/50 bg-slate-900/70 text-slate-500',
};

/**
 * Desktop layout: custom titlebar + sidebar + main content + status bar
 */
export default function Layout({ children, isTauri }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeMode, activeProject, activeSurfaceMode, setActiveMode, setActiveSurfaceMode } = useStudioWorkspace();
  const activeView = getStudioView(location.pathname);
  const visibleViews = useMemo(() => getVisibleStudioViews(activeMode), [activeMode]);
  const isViewVisible = visibleViews.some((view) => view.path === activeView.path);
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const workbenchRail = useMemo(() => getCaseWorkbenchRail(shellCaseId, location.pathname), [location.pathname, shellCaseId]);
  const activeStage = workbenchRail.find((stage) => stage.isActive) || null;
  const activeSurface = useMemo(
    () => developerSurfaces.find((surface) => surface.key === activeSurfaceMode) || developerSurfaces[0],
    [activeSurfaceMode]
  );

  useEffect(() => {
    const surface = getSurfaceByPath(location.pathname);
    if (surface && surface.key !== activeSurfaceMode) {
      setActiveSurfaceMode(surface.key);
    }
  }, [activeSurfaceMode, location.pathname, setActiveSurfaceMode]);

  useEffect(() => {
    if (!isViewVisible) {
      navigate('/workbench', { replace: true });
    }
  }, [isViewVisible, navigate]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />

        <div className="flex flex-1 min-w-0 bg-slate-950">
          <main className="flex-1 min-w-0 overflow-hidden bg-slate-900">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="fixed bottom-8 left-1 z-50 flex h-10 w-5 items-center justify-center rounded-r-md bg-slate-700/50 transition-colors hover:bg-slate-600/50"
              aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg
                className={`h-3 w-3 text-slate-400 transition-transform ${
                  sidebarCollapsed ? '' : 'rotate-180'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div className="flex h-full min-w-0">
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
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
                        <button
                          onClick={() => setActiveMode('delivery')}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            activeMode === 'delivery'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          发布模式
                        </button>
                        <button
                          onClick={() => setActiveMode('development')}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            activeMode === 'development'
                              ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                              : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          开发模式
                        </button>
                        <span className="text-xs text-slate-500">
                          {activeMode === 'development'
                            ? '开放 IDE、扩展中心、调试与插件开发能力'
                            : '聚焦角色工作面、成果阅读与业务操作'}
                        </span>
                      </div>
                      {activeMode === 'development' && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {developerSurfaces.map((surface) => (
                            <button
                              key={surface.key}
                              onClick={() => {
                                setActiveSurfaceMode(surface.key);
                                navigate(surface.route);
                              }}
                              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                activeSurfaceMode === surface.key
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                  : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {surface.label}
                            </button>
                          ))}
                          <span className="text-xs text-slate-500">{activeSurface.summary}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                        单一主壳
                      </span>
                      <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
                        多模式视图
                      </span>
                      <span className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                        {activeMode === 'development' ? '开发者工作面' : '业务用户工作面'}
                      </span>
                      {activeMode === 'development' && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                          {activeSurface.label}
                        </span>
                      )}
                      <span className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                        {isTauri ? '桌面壳' : '浏览器预览'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  {children}
                </div>

                <ActivityDock view={activeView} />
              </div>

              <ContextPanel view={activeView} />
            </div>
          </main>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
