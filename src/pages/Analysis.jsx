import React, { useState } from 'react';
import { getPendingApprovals, studioState } from '../data/studioState';

const assetTools = [
  {
    id: 'inventory',
    name: '来源清单',
    nameEn: 'Source Inventory',
    description: '围绕 source inventory 查看资料目录、格式、角色和扫描结果',
    icon: '�️',
  },
  {
    id: 'reliability',
    name: '可信度',
    nameEn: 'Reliability',
    description: '查看来源可靠性、冲突和人工复核要求',
    icon: '�️',
  },
  {
    id: 'coverage',
    name: '覆盖检查',
    nameEn: 'Coverage',
    description: '识别缺失资料、待补充字段和可继续推进的阶段',
    icon: '🧭',
  },
  {
    id: 'bundle',
    name: '资产包',
    nameEn: 'Bundle',
    description: '围绕 data pack、packet 和上下文包组织资产视图',
    icon: '�',
  },
  {
    id: 'review',
    name: '人工复核',
    nameEn: 'Review',
    description: '快速进入 review required 项与阻塞清单',
    icon: '📝',
  },
];

export default function Analysis() {
  const [selectedTool, setSelectedTool] = useState(null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">数据与资产</h1>
        <p className="text-sm text-slate-400 mt-1">围绕 source inventory、reliability、缺口和人工复核组织统一资产视图</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">已发现资产</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{studioState.assets.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">待人工复核</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{getPendingApprovals().length}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">重点资料</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">reference_river_network</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">资产工具</h2>
        <div className="grid grid-cols-3 gap-3">
          {assetTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedTool?.id === tool.id
                  ? 'border-hydro-500/50 bg-hydro-600/10 ring-1 ring-hydro-500/30'
                  : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{tool.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-200">{tool.name}</div>
                  <div className="text-[10px] text-slate-500">{tool.nameEn}</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{tool.description}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedTool && (
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedTool.icon}</span>
              <h2 className="text-lg font-semibold text-slate-200">{selectedTool.name}</h2>
            </div>
            <button
              onClick={() => setSelectedTool(null)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              关闭
            </button>
          </div>

          <div className="h-64 flex items-center justify-center bg-slate-800/60 rounded-lg border border-dashed border-slate-700/50">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">{selectedTool.icon}</div>
              <div className="text-sm text-slate-400 mb-1">{selectedTool.name}工作区</div>
              <div className="text-xs text-slate-500">围绕案例资料、可信度与人工复核项组织视图</div>
              <div className="flex items-center gap-2 mt-3 justify-center">
                <button className="px-3 py-1.5 text-xs bg-hydro-600/20 text-hydro-400 rounded-lg hover:bg-hydro-600/30 transition-colors">
                  打开资产
                </button>
                <button className="px-3 py-1.5 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors">
                  扫描资料
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300">已发现资产</h2>
          <button className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
            重新扫描
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-700/30">
              <th className="px-4 py-2 text-left font-medium">资产名称</th>
              <th className="px-4 py-2 text-left font-medium">记录数/规模</th>
              <th className="px-4 py-2 text-left font-medium">大小</th>
              <th className="px-4 py-2 text-left font-medium">更新时间</th>
              <th className="px-4 py-2 text-left font-medium">状态</th>
              <th className="px-4 py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {studioState.assets.map((ds, i) => (
              <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-200">{ds.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{ds.records}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{ds.size}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{ds.updated}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{ds.status}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    查看
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
