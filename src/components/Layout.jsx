import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import ContextPanel from './ContextPanel';
import ActivityDock from './ActivityDock';
import ViewHeader from './ViewHeader';
import { getStudioView, getSurfaceByPath, getVisibleStudioViews } from '../config/studioViews';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { getCaseWorkbenchRail, resolveShellCaseId } from '../data/case_contract_shell';

/**
 * Desktop layout: custom titlebar + sidebar + main content + status bar
 */
export default function Layout({ children, isTauri }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeMode, activeProject, activeAccount, activeRole, activeSurfaceMode, setActiveSurfaceMode } = useStudioWorkspace();
  const activeView = getStudioView(location.pathname);
  const visibleViews = useMemo(() => getVisibleStudioViews(activeMode, activeAccount), [activeAccount, activeMode]);
  const isViewVisible = visibleViews.some((view) => view.path === activeView.path);
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const workbenchRail = useMemo(() => getCaseWorkbenchRail(shellCaseId, location.pathname), [location.pathname, shellCaseId]);
  const activeStage = workbenchRail.find((stage) => stage.isActive) || null;
  const isAccountGate = location.pathname === '/login';

  useEffect(() => {
    const surface = getSurfaceByPath(location.pathname);
    if (surface && surface.key !== activeSurfaceMode) {
      setActiveSurfaceMode(surface.key);
    }
  }, [activeSurfaceMode, location.pathname, setActiveSurfaceMode]);

  useEffect(() => {
    if (isAccountGate) return;
    if (!isViewVisible) {
      navigate(activeAccount?.defaultRoute || '/workbench', { replace: true });
    }
  }, [activeAccount, isAccountGate, isViewVisible, navigate]);

  if (isAccountGate) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950">
        <TitleBar />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        <StatusBar isTauri={isTauri} />
      </div>
    );
  }

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
                <ViewHeader
                  activeMode={activeMode}
                  activeProject={activeProject}
                  activeAccount={activeAccount}
                  activeRole={activeRole}
                  activeStage={activeStage}
                  activeSurfaceMode={activeSurfaceMode}
                  activeView={activeView}
                  isTauri={isTauri}
                  navigate={navigate}
                  setActiveSurfaceMode={setActiveSurfaceMode}
                  shellCaseId={shellCaseId}
                  workbenchRail={workbenchRail}
                />

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

      <StatusBar isTauri={isTauri} />
    </div>
  );
}
