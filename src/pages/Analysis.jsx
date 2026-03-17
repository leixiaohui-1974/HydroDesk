import React, { useState } from 'react';

const analysisTools = [
  {
    id: 'time-series',
    name: '时间序列分析',
    nameEn: 'Time Series',
    description: '对水位、流量、水质等时间序列数据进行趋势分析和异常检测',
    icon: '📈',
  },
  {
    id: 'spatial',
    name: '空间分析',
    nameEn: 'Spatial Analysis',
    description: '基于GIS的水网空间数据分析与可视化',
    icon: '🗺️',
  },
  {
    id: 'correlation',
    name: '相关性分析',
    nameEn: 'Correlation',
    description: '分析不同站点、不同指标之间的相关关系',
    icon: '🔗',
  },
  {
    id: 'prediction',
    name: '预测分析',
    nameEn: 'Prediction',
    description: '基于历史数据和AI模型预测未来水文指标',
    icon: '🔮',
  },
  {
    id: 'report',
    name: '报表生成',
    nameEn: 'Reports',
    description: '自动生成日报、周报、月报等运行报告',
    icon: '📊',
  },
  {
    id: 'compare',
    name: '方案对比',
    nameEn: 'Comparison',
    description: '对比不同调度方案的效果和指标差异',
    icon: '⚖️',
  },
];

const mockDatasets = [
  { name: '南水北调中线2025年度数据', records: '8,760,000', size: '2.3 GB', updated: '2026-03-16' },
  { name: '郑州分水口实时数据', records: '525,600', size: '145 MB', updated: '2026-03-17' },
  { name: '水质监测季度报告数据', records: '43,200', size: '12 MB', updated: '2026-03-01' },
];

export default function Analysis() {
  const [selectedTool, setSelectedTool] = useState(null);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">数据分析</h1>
        <p className="text-sm text-slate-400 mt-1">水文数据分析、可视化与报表生成</p>
      </div>

      {/* Analysis tools grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">分析工具</h2>
        <div className="grid grid-cols-3 gap-3">
          {analysisTools.map((tool) => (
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

      {/* Selected tool workspace */}
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

          {/* Workspace placeholder */}
          <div className="h-64 flex items-center justify-center bg-slate-800/60 rounded-lg border border-dashed border-slate-700/50">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">{selectedTool.icon}</div>
              <div className="text-sm text-slate-400 mb-1">{selectedTool.name}工作区</div>
              <div className="text-xs text-slate-500">选择数据源开始分析</div>
              <div className="flex items-center gap-2 mt-3 justify-center">
                <button className="px-3 py-1.5 text-xs bg-hydro-600/20 text-hydro-400 rounded-lg hover:bg-hydro-600/30 transition-colors">
                  选择数据
                </button>
                <button className="px-3 py-1.5 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors">
                  导入文件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Datasets */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300">可用数据集</h2>
          <button className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
            导入数据
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-700/30">
              <th className="px-4 py-2 text-left font-medium">数据集名称</th>
              <th className="px-4 py-2 text-left font-medium">记录数</th>
              <th className="px-4 py-2 text-left font-medium">大小</th>
              <th className="px-4 py-2 text-left font-medium">更新时间</th>
              <th className="px-4 py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {mockDatasets.map((ds, i) => (
              <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-200">{ds.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{ds.records}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{ds.size}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{ds.updated}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    分析
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
