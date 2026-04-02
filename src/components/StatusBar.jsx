import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { checkOllama, checkHydroMind } from '../api/tauri_bridge';
import { developerSurfaces, getStudioView } from '../config/studioViews';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

/**
 * Bottom status bar showing connection status, engine info, memory usage
 */
export default function StatusBar() {
  const location = useLocation();
  const activeView = getStudioView(location.pathname);
  const { activeMode, activeSurfaceMode } = useStudioWorkspace();
  const activeSurface = developerSurfaces.find((surface) => surface.key === activeSurfaceMode) || developerSurfaces[0];
  const [status, setStatus] = useState({
    hydromindConnected: false,
    ollamaAvailable: false,
    lastChecked: null,
    checking: false,
  });

  const checkConnections = async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    try {
      const [hydromind, ollama] = await Promise.allSettled([
        checkHydroMind(),
        checkOllama(),
      ]);
      setStatus({
        hydromindConnected: hydromind.status === 'fulfilled' && hydromind.value,
        ollamaAvailable: ollama.status === 'fulfilled' && ollama.value,
        lastChecked: new Date(),
        checking: false,
      });
    } catch {
      setStatus((prev) => ({ ...prev, checking: false }));
    }
  };

  useEffect(() => {
    checkConnections();
    const interval = setInterval(checkConnections, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-slate-950 border-t border-slate-700/50 text-[11px] text-slate-500 select-none shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status.hydromindConnected ? 'bg-green-400' : 'bg-red-400'
            } ${status.checking ? 'animate-pulse' : ''}`}
          />
          <span>
            HydroMind: {status.hydromindConnected ? '已连接' : '未连接'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status.ollamaAvailable ? 'bg-green-400' : 'bg-slate-600'
            }`}
          />
          <span>
            Ollama: {status.ollamaAvailable ? '可用' : '不可用'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            status.hydromindConnected ? 'bg-hydro-400' : 'bg-amber-400'
          }`} />
          <span>
            {status.hydromindConnected ? '云端模式' : '离线模式'}
          </span>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span>当前视图: {activeView.label}</span>
        </div>
        <div className="hidden items-center gap-1.5 md:flex">
          <span className={`w-1.5 h-1.5 rounded-full ${activeMode === 'development' ? 'bg-hydro-400' : 'bg-emerald-400'}`} />
          <span>{activeMode === 'development' ? '开发模式' : '发布模式'}</span>
        </div>
        {activeMode === 'development' && (
          <div className="hidden items-center gap-1.5 md:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{activeSurface.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:inline">主壳: HydroMind Studio</span>
        <button
          onClick={checkConnections}
          className="hover:text-slate-300 transition-colors"
          disabled={status.checking}
        >
          {status.checking ? '检查中...' : '刷新状态'}
        </button>
        <span>上次检查: {formatTime(status.lastChecked)}</span>
      </div>
    </div>
  );
}
