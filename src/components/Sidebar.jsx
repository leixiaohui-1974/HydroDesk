import { NavLink } from 'react-router-dom';
import { developerSurfaces, getOrderedVisibleStudioViews } from '../config/studioViews';
import { resolveShellCaseId } from '../data/case_contract_shell';
import { caseWorkbenchTitle } from '../data/caseShellPresets';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

const iconMap = {
  workbench: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="7" height="7" rx="1" />
      <rect x="14" y="4" width="7" height="7" rx="1" />
      <rect x="3" y="15" width="18" height="5" rx="1" />
    </svg>
  ),
  projects: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h18M6 4h4l2 2h6a1 1 0 011 1v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a1 1 0 011-1h2z" />
    </svg>
  ),
  analysis: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h18v16H3z" />
      <path d="M7 8h10M7 12h7M7 16h5" />
    </svg>
  ),
  modeling: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.5 7.5l7 0M7.5 8.2l3.2 6M16.5 8.2l-3.2 6" />
    </svg>
  ),
  simulation: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h10" />
      <path d="M16 15l4 3-4 3v-6z" />
    </svg>
  ),
  review: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4h10l3 3v13H7z" />
      <path d="M14 4v4h4M10 12h6M10 16h4" />
    </svg>
  ),
  docs: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4h9l3 3v13H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M15 4v4h4" />
      <path d="M8 11h8M8 15h8M8 19h5" />
    </svg>
  ),
  monitor: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M7 20h10M12 16v4M6 11l3-3 3 3 3-4 3 3" />
    </svg>
  ),
  extensions: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <rect x="8" y="8" width="8" height="8" rx="2" />
    </svg>
  ),
  ide: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h18v14H3z" />
      <path d="M7 9l-2 3 2 3M11 15l2-6M17 9l2 3-2 3" />
    </svg>
  ),
  agent: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" />
      <path d="M9.5 11.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5S13.4 14 12 14s-2.5-1.1-2.5-2.5z" />
      <path d="M8 18c1-1.6 2.3-2.4 4-2.4s3 .8 4 2.4" />
    </svg>
  ),
  knowledge: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5h10a3 3 0 013 3v11H8a3 3 0 01-3-3V5z" />
      <path d="M8 8h7M8 12h7M8 16h4" />
      <path d="M18 7l2-2M20 10h-3" />
    </svg>
  ),
  notebook: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4h10a2 2 0 012 2v14H8a2 2 0 01-2-2V4z" />
      <path d="M8 7h8M8 11h8M8 15h5M6 4v14" />
    </svg>
  ),
  settings: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

export default function Sidebar({ collapsed = false }) {
  const { activeAccount, activeMode, activeSurfaceMode, activeProject } = useStudioWorkspace();
  const shellCaseId = resolveShellCaseId(activeProject?.caseId);
  const studioViews = getOrderedVisibleStudioViews(activeMode, activeAccount);
  const workflowViews = studioViews
    .filter((item) => item.group === 'core' && item.lane === 'workflow');
  const supportViews = studioViews.filter((item) => item.group === 'core' && item.lane !== 'workflow');
  const advancedViews = studioViews.filter((item) => item.group === 'advanced');
  const systemViews = studioViews.filter((item) => item.group === 'system');
  const activeSurface = developerSurfaces.find((surface) => surface.key === activeSurfaceMode) || developerSurfaces[0];

  const renderNavItem = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        `mx-1.5 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
          isActive
            ? 'border-hydro-500/30 bg-hydro-600/20 text-hydro-400'
            : 'border-transparent text-slate-400 hover:border-slate-700/50 hover:bg-slate-700/40 hover:text-slate-200'
        }`
      }
      title={item.label}
    >
      <span className="shrink-0">{iconMap[item.iconKey] || iconMap.settings}</span>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{item.label}</div>
        </div>
      )}
    </NavLink>
  );

  const renderSection = (title, items) => (
    <div className="space-y-0.5">
      {!collapsed && items.length > 0 ? (
        <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.24em] text-slate-600">
          {title}
        </div>
      ) : null}
      {items.map(renderNavItem)}
    </div>
  );

  return (
    <aside
      className={`flex flex-col bg-slate-800/50 border-r border-slate-700/50 transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-48'
      }`}
    >
      {!collapsed && (
        <div className="border-b border-slate-700/50 px-4 py-4">
          <div className="text-sm font-semibold text-slate-100">{caseWorkbenchTitle(shellCaseId)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {activeMode === 'development'
              ? `${activeAccount?.label || '开发账号'} · 开发模式 · ${activeSurface.label} 工作面`
              : `${activeAccount?.label || '业务账号'} · 发布模式 · 案例 ${shellCaseId || '—'}`}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        {renderSection('主链工位', workflowViews)}
        {renderSection(workflowViews.length > 0 ? '支撑视图' : '工作台', supportViews)}
        {renderSection('高级', advancedViews)}
        {renderSection('系统', systemViews)}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-slate-700/50 text-[10px] text-slate-500">
          {activeMode === 'development'
            ? `已裁剪为研发导航 · 默认面 ${activeSurface.label}`
            : '已裁剪为业务导航'}
        </div>
      )}
    </aside>
  );
}
