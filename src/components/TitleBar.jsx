import React, { useState, useEffect } from 'react';
import { windowOps, isTauri as checkTauri } from '../api/tauri_bridge';

/**
 * Custom window titlebar for Tauri
 * Provides drag region, app title, and window control buttons.
 * In browser mode, renders a simpler header bar.
 */
export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const tauriMode = checkTauri();

  useEffect(() => {
    if (!tauriMode) return;

    // Listen for maximize/unmaximize events
    let unlisten;
    (async () => {
      const { appWindow } = await import('@tauri-apps/api/window');
      const isMax = await appWindow.isMaximized();
      setIsMaximized(isMax);

      const unlistenResize = await appWindow.onResized(async () => {
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      });
      unlisten = unlistenResize;
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [tauriMode]);

  const handleMinimize = () => windowOps.minimize();
  const handleMaximize = () => windowOps.toggleMaximize();
  const handleClose = () => windowOps.close();
  const handleDrag = (e) => {
    if (e.buttons === 1) windowOps.startDragging();
  };

  return (
    <div className="flex items-center h-9 bg-slate-950 border-b border-slate-700/50 select-none shrink-0">
      {/* App icon and title - drag region */}
      <div
        className="flex items-center flex-1 h-full px-3 cursor-default"
        onMouseDown={handleDrag}
        data-tauri-drag-region
      >
        <svg
          className="w-4 h-4 mr-2 text-hydro-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-xs font-medium text-slate-300">
          HydroDesk - 水网桌面端
        </span>
        {!tauriMode && (
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Browser Mode
          </span>
        )}
      </div>

      {/* Window control buttons */}
      {tauriMode && (
        <div className="flex items-center h-full">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="flex items-center justify-center w-11 h-full hover:bg-slate-700/50 transition-colors"
            aria-label="最小化"
          >
            <svg className="w-3 h-3 text-slate-400" viewBox="0 0 12 12">
              <rect y="5" width="12" height="1.5" fill="currentColor" />
            </svg>
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={handleMaximize}
            className="flex items-center justify-center w-11 h-full hover:bg-slate-700/50 transition-colors"
            aria-label={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? (
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 12 12">
                <rect x="2" y="0" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <rect x="0" y="2" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 12 12">
                <rect x="0.5" y="0.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-11 h-full hover:bg-red-600 transition-colors group"
            aria-label="关闭"
          >
            <svg className="w-3 h-3 text-slate-400 group-hover:text-white" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
