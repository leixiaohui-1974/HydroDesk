import React, { useState } from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

/**
 * Desktop layout: custom titlebar + sidebar + main content + status bar
 */
export default function Layout({ children, isTauri }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Custom titlebar */}
      <TitleBar />

      {/* Main area: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-slate-900">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="fixed bottom-8 left-1 z-50 w-5 h-10 flex items-center justify-center bg-slate-700/50 hover:bg-slate-600/50 rounded-r-md transition-colors"
            aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <svg
              className={`w-3 h-3 text-slate-400 transition-transform ${
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

          {children}
        </main>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
