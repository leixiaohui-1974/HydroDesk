import React, { useState } from 'react';

const categories = [
  { id: 'all', label: '全部', count: 156 },
  { id: 'standard', label: '规范标准', count: 42 },
  { id: 'operation', label: '运行管理', count: 38 },
  { id: 'emergency', label: '应急预案', count: 24 },
  { id: 'maintenance', label: '维护手册', count: 31 },
  { id: 'research', label: '研究报告', count: 21 },
];

const mockDocuments = [
  {
    id: 'kb-001',
    title: '南水北调中线工程运行管理规程',
    category: 'operation',
    summary: '涵盖渠道运行、闸站管理、调度规则、安全管理等核心内容，为中线工程日常运行提供规范指导。',
    tags: ['运行规程', '调度', '安全管理'],
    updated: '2025-12-01',
    cached: true,
  },
  {
    id: 'kb-002',
    title: '供水工程水力学计算手册',
    category: 'standard',
    summary: '包含管道水力计算、渠道水力计算、水锤分析、泵站水力设计等工程计算方法与公式。',
    tags: ['水力学', '计算手册', '管道'],
    updated: '2025-10-15',
    cached: true,
  },
  {
    id: 'kb-003',
    title: '突发水污染事件应急处置方案',
    category: 'emergency',
    summary: '针对水源地污染、管网污染等突发事件的分级响应、处置流程、资源调配方案。',
    tags: ['应急', '水污染', '处置方案'],
    updated: '2026-01-20',
    cached: false,
  },
  {
    id: 'kb-004',
    title: 'EPANET 2.2 用户手册（中文版）',
    category: 'standard',
    summary: 'EPANET 水力学和水质分析软件的完整用户指南，包含建模方法、参数设置和结果分析。',
    tags: ['EPANET', '建模', '水质分析'],
    updated: '2025-08-10',
    cached: true,
  },
  {
    id: 'kb-005',
    title: '智能水网调度优化算法研究报告',
    category: 'research',
    summary: '基于强化学习和多目标优化的水网调度算法研究，包含模型训练、评估和实际应用案例。',
    tags: ['AI', '优化调度', '强化学习'],
    updated: '2026-02-28',
    cached: false,
  },
];

export default function Knowledge() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const filteredDocs = mockDocuments.filter((doc) => {
    const matchCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.includes(searchQuery));
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex h-full">
      {/* Left: category sidebar */}
      <div className="w-48 border-r border-slate-700/50 bg-slate-800/20 shrink-0">
        <div className="p-3 border-b border-slate-700/50">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">知识分类</h2>
        </div>
        <div className="p-2 space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-hydro-600/20 text-hydro-400'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-xs text-slate-500">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center: document list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="搜索知识库... (支持标题、内容、标签)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:border-hydro-500 focus:outline-none"
              />
            </div>
            <button className="px-4 py-2 bg-hydro-600/20 text-hydro-400 text-sm rounded-lg hover:bg-hydro-600/30 transition-colors">
              AI 问答
            </button>
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              未找到匹配的文档
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedDoc?.id === doc.id
                    ? 'border-hydro-500/50 bg-hydro-600/10'
                    : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-200 pr-4">{doc.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.cached && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                        已缓存
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{doc.updated}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{doc.summary}</p>
                <div className="flex items-center gap-1.5">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: document preview */}
      {selectedDoc && (
        <div className="w-80 border-l border-slate-700/50 bg-slate-800/20 overflow-y-auto shrink-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">文档详情</h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                关闭
              </button>
            </div>
            <h3 className="text-base font-medium text-slate-200 mb-2">{selectedDoc.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{selectedDoc.summary}</p>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">分类</div>
                <div className="text-slate-300">
                  {categories.find((c) => c.id === selectedDoc.category)?.label}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">标签</div>
                <div className="flex flex-wrap gap-1">
                  {selectedDoc.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">更新时间</div>
                <div className="text-slate-300">{selectedDoc.updated}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">离线缓存</div>
                <div className={selectedDoc.cached ? 'text-green-400' : 'text-slate-500'}>
                  {selectedDoc.cached ? '已缓存到本地' : '未缓存'}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button className="w-full px-3 py-2 text-xs bg-hydro-600/20 text-hydro-400 rounded-lg hover:bg-hydro-600/30 transition-colors">
                打开文档
              </button>
              <button className="w-full px-3 py-2 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors">
                AI 摘要
              </button>
              {!selectedDoc.cached && (
                <button className="w-full px-3 py-2 text-xs bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors">
                  缓存到本地
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
