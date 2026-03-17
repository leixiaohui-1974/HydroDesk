import React, { useState, useEffect } from 'react';
import { checkOllama, checkHydroMind } from '../api/tauri_bridge';

/**
 * Bottom status bar showing connection status, engine info, memory usage
 */
export default function StatusBar() {
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
      {/* Left section: connection indicators */}
      <div className="flex items-center gap-4">
        {/* HydroMind connection */}
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

        {/* Ollama status */}
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

        {/* Mode indicator */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            status.hydromindConnected ? 'bg-hydro-400' : 'bg-amber-400'
          }`} />
          <span>
            {status.hydromindConnected ? '云端模式' : '离线模式'}
          </span>
        </div>
      </div>

      {/* Right section: info */}
      <div className="flex items-center gap-4">
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
