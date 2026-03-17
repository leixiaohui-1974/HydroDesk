import React, { useState } from 'react';

const mockSimulations = [
  { id: 'sim-001', name: '南水北调中线稳态分析', type: '稳态模拟', status: 'completed', duration: '2m 34s', created: '2026-03-15 14:30' },
  { id: 'sim-002', name: '应急调水方案A', type: '瞬态模拟', status: 'running', duration: '--', created: '2026-03-17 09:15' },
  { id: 'sim-003', name: '水质扩散测试', type: '水质模拟', status: 'queued', duration: '--', created: '2026-03-17 10:00' },
];

const SimulationRow = ({ sim }) => {
  const statusColors = {
    completed: 'bg-green-500/20 text-green-400',
    running: 'bg-blue-500/20 text-blue-400',
    queued: 'bg-amber-500/20 text-amber-400',
    failed: 'bg-red-500/20 text-red-400',
  };
  const statusLabels = {
    completed: '已完成',
    running: '运行中',
    queued: '排队中',
    failed: '失败',
  };

  return (
    <tr className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm text-slate-200">{sim.name}</div>
        <div className="text-xs text-slate-500">{sim.id}</div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{sim.type}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[sim.status]}`}>
          {statusLabels[sim.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{sim.duration}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{sim.created}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">查看</button>
          {sim.status === 'completed' && (
            <button className="text-xs text-slate-400 hover:text-slate-300 transition-colors">结果</button>
          )}
          {sim.status === 'running' && (
            <button className="text-xs text-red-400 hover:text-red-300 transition-colors">停止</button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default function Simulation() {
  const [simulations] = useState(mockSimulations);
  const [selectedEngine, setSelectedEngine] = useState('local');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">仿真模拟</h1>
          <p className="text-sm text-slate-400 mt-1">本地或通过 MCP 引擎运行水力学/水质模拟</p>
        </div>
        <button className="px-4 py-2 bg-hydro-600 text-white text-sm rounded-lg hover:bg-hydro-700 transition-colors">
          新建仿真
        </button>
      </div>

      {/* Engine selection */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">计算引擎</h2>
        <div className="flex gap-3">
          {[
            { id: 'local', label: '本地计算', desc: '使用本地 CPU 执行仿真' },
            { id: 'hydroflow', label: 'HydroFlow (MCP)', desc: '王孝群 - 水力学引擎' },
            { id: 'hydroquality', label: 'HydroQuality (MCP)', desc: '施垚 - 水质模型引擎' },
          ].map((engine) => (
            <button
              key={engine.id}
              onClick={() => setSelectedEngine(engine.id)}
              className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                selectedEngine === engine.id
                  ? 'border-hydro-500/50 bg-hydro-600/10'
                  : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/30'
              }`}
            >
              <div className={`text-sm font-medium ${
                selectedEngine === engine.id ? 'text-hydro-400' : 'text-slate-300'
              }`}>
                {engine.label}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{engine.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Simulation config */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">模拟类型</h3>
          <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-hydro-500 focus:outline-none">
            <option>稳态模拟 (Steady State)</option>
            <option>延时模拟 (Extended Period)</option>
            <option>瞬态模拟 (Transient)</option>
            <option>水质模拟 (Water Quality)</option>
          </select>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">时间参数</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16">时长</label>
              <input
                type="number"
                defaultValue="24"
                className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500">小时</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16">步长</label>
              <input
                type="number"
                defaultValue="1"
                className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:border-hydro-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500">小时</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">输入模型</h3>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors text-left">
              从建模页面选择...
            </button>
            <button className="w-full px-3 py-2 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors text-left">
              导入 .inp 文件...
            </button>
          </div>
        </div>
      </div>

      {/* Simulation history */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300">仿真历史</h2>
          <span className="text-xs text-slate-500">{simulations.length} 项仿真任务</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-700/30">
              <th className="px-4 py-2 text-left font-medium">名称</th>
              <th className="px-4 py-2 text-left font-medium">类型</th>
              <th className="px-4 py-2 text-left font-medium">状态</th>
              <th className="px-4 py-2 text-left font-medium">耗时</th>
              <th className="px-4 py-2 text-left font-medium">创建时间</th>
              <th className="px-4 py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {simulations.map((sim) => (
              <SimulationRow key={sim.id} sim={sim} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
