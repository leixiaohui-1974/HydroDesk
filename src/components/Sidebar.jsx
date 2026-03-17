import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  {
    path: '/dashboard',
    label: '系统概览',
    labelEn: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/modeling',
    label: '模型构建',
    labelEn: 'Modeling',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="5" r="3" />
        <circle cx="5" cy="19" r="3" />
        <circle cx="19" cy="19" r="3" />
        <path d="M12 8v3m-4.5 3L10 11m4 0l2.5 3" />
      </svg>
    ),
  },
  {
    path: '/simulation',
    label: '仿真模拟',
    labelEn: 'Simulation',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
  {
    path: '/monitor',
    label: '实时监控',
    labelEn: 'Monitor',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8m-4-4v4" />
        <path d="M6 10l3-3 3 3 3-3 3 3" />
      </svg>
    ),
  },
  {
    path: '/analysis',
    label: '数据分析',
    labelEn: 'Analysis',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-6 4 4 5-8" />
      </svg>
    ),
  },
  {
    path: '/knowledge',
    label: '知识库',
    labelEn: 'Knowledge',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <path d="M8 7h8m-8 4h6" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: '系统设置',
    labelEn: 'Settings',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

/**
 * Navigation sidebar with icon + label for each route
 */
export default function Sidebar({ collapsed = false }) {
  return (
    <aside
      className={`flex flex-col bg-slate-800/50 border-r border-slate-700/50 transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-48'
      }`}
    >
      {/* Navigation items */}
      <nav className="flex-1 py-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-hydro-600/20 text-hydro-400 border border-hydro-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent'
              }`
            }
            title={item.label}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{item.label}</span>
                <span className="text-[10px] text-slate-500 truncate">{item.labelEn}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version info at bottom */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-700/50">
          <div className="text-[10px] text-slate-500 text-center">
            HydroDesk v0.1.0
          </div>
        </div>
      )}
    </aside>
  );
}
