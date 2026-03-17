import React, { useState, useEffect } from 'react';
import { getSystemInfo, checkOllama, checkHydroMind } from '../api/tauri_bridge';

const StatCard = ({ title, value, subtitle, color = 'hydro' }) => (
  <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
    <div className="text-xs text-slate-500 mb-1">{title}</div>
    <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
    {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
  </div>
);

const EngineCard = ({ name, role, status }) => (
  <div className="flex items-center gap-3 bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
    <div className={`w-2 h-2 rounded-full ${
      status === 'online' ? 'bg-green-400' : status === 'offline' ? 'bg-red-400' : 'bg-amber-400'
    }`} />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-200 truncate">{name}</div>
      <div className="text-xs text-slate-500">{role}</div>
    </div>
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
      status === 'online'
        ? 'bg-green-500/20 text-green-400'
        : status === 'offline'
        ? 'bg-red-500/20 text-red-400'
        : 'bg-amber-500/20 text-amber-400'
    }`}>
      {status === 'online' ? '在线' : status === 'offline' ? '离线' : '检查中'}
    </span>
  </div>
);

export default function Dashboard() {
  const [sysInfo, setSysInfo] = useState(null);
  const [services, setServices] = useState({
    hydromind: 'checking',
    ollama: 'checking',
  });

  useEffect(() => {
    getSystemInfo().then(setSysInfo).catch(console.error);

    Promise.allSettled([checkHydroMind(), checkOllama()]).then(([hm, ol]) => {
      setServices({
        hydromind: hm.status === 'fulfilled' && hm.value ? 'online' : 'offline',
        ollama: ol.status === 'fulfilled' && ol.value ? 'online' : 'offline',
      });
    });
  }, []);

  const engines = [
    { name: 'HydroOS', role: '魏家好 - 操作系统内核', status: services.hydromind },
    { name: 'HydroAlgo', role: '黄志峰 - 智能算法库', status: services.hydromind },
    { name: 'HydroFlow', role: '王孝群 - 水力学模型', status: services.hydromind },
    { name: 'HydroQuality', role: '施垚 - 水质冰期模型', status: services.hydromind },
    { name: 'Ollama (Local)', role: '本地LLM推理', status: services.ollama },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">系统概览</h1>
        <p className="text-sm text-slate-400 mt-1">HydroDesk 水网桌面端 - 系统运行状态总览</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="系统状态" value={services.hydromind === 'online' ? '在线' : '离线'} subtitle="HydroMind 连接" />
        <StatCard title="引擎数量" value="5" subtitle="MCP 注册引擎" />
        <StatCard title="CPU 核心" value={sysInfo?.cpu_count || '--'} subtitle={sysInfo?.cpu_brand || '加载中...'} />
        <StatCard
          title="内存使用"
          value={sysInfo ? `${Math.round((sysInfo.used_memory_mb / sysInfo.total_memory_mb) * 100)}%` : '--'}
          subtitle={sysInfo ? `${sysInfo.used_memory_mb} / ${sysInfo.total_memory_mb} MB` : '加载中...'}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Engine status */}
        <div className="col-span-2 bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">引擎状态</h2>
          <div className="space-y-2">
            {engines.map((engine) => (
              <EngineCard key={engine.name} {...engine} />
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">系统信息</h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">操作系统</div>
              <div className="text-slate-300">{sysInfo?.os_name || '--'} {sysInfo?.os_version || ''}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">处理器</div>
              <div className="text-slate-300 text-xs">{sysInfo?.cpu_brand || '--'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">主机名</div>
              <div className="text-slate-300">{sysInfo?.hostname || '--'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">内存总量</div>
              <div className="text-slate-300">{sysInfo ? `${sysInfo.total_memory_mb} MB` : '--'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">运行模式</div>
              <div className="text-slate-300">
                {services.hydromind === 'online' ? '云端 + 本地' : '离线模式'}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <h3 className="text-xs text-slate-500 mb-2">快捷操作</h3>
            <div className="space-y-1.5">
              <button className="w-full text-left text-xs px-3 py-2 rounded-lg bg-hydro-600/20 text-hydro-400 hover:bg-hydro-600/30 transition-colors">
                新建模型
              </button>
              <button className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 transition-colors">
                打开最近项目
              </button>
              <button className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 transition-colors">
                导入 EPANET 模型
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
