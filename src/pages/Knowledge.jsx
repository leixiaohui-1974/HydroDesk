import React, { useEffect, useMemo, useState } from 'react';
import { isTauri, openPath, readWorkspaceTextFile, revealPath, runWorkspaceCommand } from '../api/tauri_bridge';
import { buildRunGraphifyCaseSidecarCommand, buildRunSourceSyncCommand } from '../config/hydrodesk_commands';
import { getActiveProject } from '../data/studioState';
import { parseGraphifyReportSummary } from '../utils/graphifyReport';

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
  const [graphifyMeta, setGraphifyMeta] = useState(null);
  const [graphifyReportSummary, setGraphifyReportSummary] = useState(null);
  const [graphifyPilotError, setGraphifyPilotError] = useState('');
  const [graphifyPilotLoading, setGraphifyPilotLoading] = useState(false);
  const [sourceSyncSummary, setSourceSyncSummary] = useState(null);
  const [sourceSyncError, setSourceSyncError] = useState('');
  const [sourceSyncLoading, setSourceSyncLoading] = useState(false);
  const activeProject = getActiveProject();
  const graphifyPilot = useMemo(() => {
    const cid = String(activeProject?.caseId || '').trim();
    if (!cid) return null;
    return {
      caseId: cid,
      inputDir: `.graphify/pilots/case-${cid}/input`,
      outputDir: `.graphify/pilots/case-${cid}/graphify-out`,
      graphReport: `.graphify/pilots/case-${cid}/graphify-out/GRAPH_REPORT.md`,
      graphJson: `.graphify/pilots/case-${cid}/graphify-out/graph.json`,
    };
  }, [activeProject]);
  const sourceSyncContracts = useMemo(() => {
    const cid = String(activeProject?.caseId || '').trim();
    if (!cid) return null;
    return {
      caseId: cid,
      primarySummary: `cases/${cid}/contracts/source_summary.latest.json`,
      legacySummary: `cases/${cid}/contracts/wxq_source_summary.latest.json`,
      primaryRegistry: `cases/${cid}/contracts/source_registry.latest.json`,
      legacyRegistry: `cases/${cid}/contracts/wxq_source_registry.latest.json`,
    };
  }, [activeProject]);

  const filteredDocs = mockDocuments.filter((doc) => {
    const matchCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.includes(searchQuery));
    return matchCategory && matchSearch;
  });

  useEffect(() => {
    if (!sourceSyncContracts || !isTauri()) {
      setSourceSyncSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      for (const rel of [sourceSyncContracts.primarySummary, sourceSyncContracts.legacySummary]) {
        try {
          const text = await readWorkspaceTextFile(rel, null);
          if (!text) continue;
          const payload = JSON.parse(text);
          if (!cancelled) {
            setSourceSyncSummary({ sourceRel: rel, payload });
          }
          return;
        } catch {
          // ignore and continue probing
        }
      }
      if (!cancelled) setSourceSyncSummary(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceSyncContracts]);

  useEffect(() => {
    if (!graphifyPilot || !isTauri()) {
      setGraphifyMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const candidates = [
        `cases/${graphifyPilot.caseId}/contracts/knowledge_mining.latest.json`,
        `cases/${graphifyPilot.caseId}/contracts/deep_asset_recording.latest.json`,
        `cases/${graphifyPilot.caseId}/knowledge_registry.json`,
      ];
      for (const rel of candidates) {
        try {
          const text = await readWorkspaceTextFile(rel, null);
          if (!text) continue;
          const payload = JSON.parse(text);
          const sidecar = payload?.graphify_sidecar || payload?._meta?.graphify_sidecar || null;
          if (sidecar) {
            if (!cancelled) {
              setGraphifyMeta({ sourceRel: rel, sidecar });
            }
            return;
          }
        } catch {
          // ignore and continue probing the next knowledge artifact
        }
      }
      if (!cancelled) setGraphifyMeta(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [graphifyPilot]);

  useEffect(() => {
    if (!graphifyPilot || !isTauri()) {
      setGraphifyReportSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const text = await readWorkspaceTextFile(graphifyPilot.graphReport, null);
        if (!cancelled) {
          setGraphifyReportSummary(parseGraphifyReportSummary(text));
        }
      } catch {
        if (!cancelled) setGraphifyReportSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graphifyPilot]);

  async function prepareGraphifyPilot() {
    if (!graphifyPilot || !isTauri()) return;
    setGraphifyPilotLoading(true);
    setGraphifyPilotError('');
    try {
      const cmd = buildRunGraphifyCaseSidecarCommand(graphifyPilot.caseId);
      await runWorkspaceCommand(cmd, '.', null);
    } catch (error) {
      setGraphifyPilotError(error?.message || String(error));
    } finally {
      setGraphifyPilotLoading(false);
    }
  }

  async function runSourceSync() {
    if (!sourceSyncContracts || !isTauri()) return;
    setSourceSyncLoading(true);
    setSourceSyncError('');
    try {
      const cmd = buildRunSourceSyncCommand(sourceSyncContracts.caseId);
      await runWorkspaceCommand(cmd, '.', null);
      for (const rel of [sourceSyncContracts.primarySummary, sourceSyncContracts.legacySummary]) {
        try {
          const text = await readWorkspaceTextFile(rel, null);
          if (!text) continue;
          const payload = JSON.parse(text);
          setSourceSyncSummary({ sourceRel: rel, payload });
          break;
        } catch {
          // ignore and continue probing
        }
      }
    } catch (error) {
      setSourceSyncError(error?.message || String(error));
    } finally {
      setSourceSyncLoading(false);
    }
  }

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
          {graphifyPilot && (
            <div className="mt-4 space-y-4">
            <div
              data-testid="knowledge-graphify-panel"
              className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/15 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-fuchsia-200">Graphify Sidecar</div>
                  <div className="mt-1 text-xs text-slate-400">
                    当前案例 {graphifyPilot.caseId} 的知识图试点入口。用于辅助知识挖掘，不替代 contracts 真相。
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void prepareGraphifyPilot()}
                    disabled={!isTauri() || graphifyPilotLoading}
                    data-testid="knowledge-graphify-run"
                    className="px-3 py-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 text-xs text-fuchsia-200 disabled:opacity-50"
                  >
                    {graphifyPilotLoading ? '准备中…' : '准备 Pilot'}
                  </button>
                  <button
                    onClick={() => openPath(graphifyPilot.inputDir)}
                    className="px-3 py-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 text-xs text-fuchsia-200"
                  >
                    打开输入目录
                  </button>
                  <button
                    onClick={() => revealPath(graphifyPilot.outputDir)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300"
                  >
                    定位输出目录
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                <div>input: <span className="font-mono">{graphifyPilot.inputDir}</span></div>
                <div>graph report: <span className="font-mono">{graphifyPilot.graphReport}</span></div>
                <div>graph json: <span className="font-mono">{graphifyPilot.graphJson}</span></div>
                <div>
                  structural graph status:{' '}
                  <span className="font-mono">
                    {graphifyMeta?.sidecar?.status === 'present' || graphifyPilot ? 'ready-or-probed' : 'unknown'}
                  </span>
                </div>
                {graphifyPilotError ? (
                  <div className="text-rose-300">error: <span className="font-mono">{graphifyPilotError}</span></div>
                ) : null}
                {graphifyReportSummary ? (
                  <div className="pt-2 space-y-1">
                    {graphifyReportSummary.summaryBullets.slice(0, 2).map((line) => (
                      <div key={line}>summary: <span className="font-mono">{line}</span></div>
                    ))}
                    {graphifyMeta?.sidecar?.graph_run_summary?.delta ? (
                      <div>
                        delta:{' '}
                        <span className="font-mono">
                          files {graphifyMeta.sidecar.graph_run_summary.delta.file_count >= 0 ? '+' : ''}
                          {graphifyMeta.sidecar.graph_run_summary.delta.file_count} · nodes{' '}
                          {graphifyMeta.sidecar.graph_run_summary.delta.node_count >= 0 ? '+' : ''}
                          {graphifyMeta.sidecar.graph_run_summary.delta.node_count} · edges{' '}
                          {graphifyMeta.sidecar.graph_run_summary.delta.edge_count >= 0 ? '+' : ''}
                          {graphifyMeta.sidecar.graph_run_summary.delta.edge_count}
                        </span>
                      </div>
                    ) : null}
                    {graphifyReportSummary.godNodes.length > 0 ? (
                      <div>
                        god nodes:{' '}
                        <span className="font-mono">
                          {graphifyReportSummary.godNodes.slice(0, 3).join(' · ')}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {graphifyMeta?.sidecar ? (
                  <>
                    <div>
                      sidecar status: <span className="font-mono">{graphifyMeta.sidecar.status || 'unknown'}</span>
                    </div>
                    <div>
                      sidecar source: <span className="font-mono">{graphifyMeta.sourceRel}</span>
                    </div>
                    {graphifyMeta.sidecar.concept_candidate_count != null ? (
                      <div>
                        concept candidates:{' '}
                        <span className="font-mono">{graphifyMeta.sidecar.concept_candidate_count}</span>
                      </div>
                    ) : null}
                    {graphifyMeta.sidecar.relation_candidate_count != null ? (
                      <div>
                        relation candidates:{' '}
                        <span className="font-mono">{graphifyMeta.sidecar.relation_candidate_count}</span>
                      </div>
                    ) : null}
                    {graphifyMeta.sidecar.db_sidecar_summary ? (
                      <div>
                        db sidecar:{' '}
                        <span className="font-mono">
                          sqlite {graphifyMeta.sidecar.db_sidecar_summary.sqlite_count || 0} · dumps{' '}
                          {graphifyMeta.sidecar.db_sidecar_summary.dump_count || 0}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => openPath(graphifyPilot.graphReport)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300"
                      >
                        打开 Graph Report
                      </button>
                      <button
                        onClick={() => openPath(graphifyPilot.graphJson)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300"
                      >
                        打开 graph.json
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    sidecar status: <span className="font-mono">未接入知识 workflow 输出</span>
                  </div>
                )}
              </div>
            </div>
            <div
              data-testid="knowledge-source-sync-panel"
              className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-cyan-200">Source Sync</div>
                  <div className="mt-1 text-xs text-slate-400">
                    当前案例 {sourceSyncContracts?.caseId} 的原始资料收口入口。用于生成 `source_registry/source_summary`，
                    再投影到共享 wiki。
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void runSourceSync()}
                    disabled={!isTauri() || sourceSyncLoading}
                    data-testid="knowledge-source-sync-run"
                    className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-200 disabled:opacity-50"
                  >
                    {sourceSyncLoading ? '同步中…' : '运行 Source Sync'}
                  </button>
                  {sourceSyncContracts ? (
                    <>
                      <button
                        onClick={() => openPath(sourceSyncContracts.primarySummary)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300"
                      >
                        打开 source_summary
                      </button>
                      <button
                        onClick={() => openPath(sourceSyncContracts.primaryRegistry)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300"
                      >
                        打开 source_registry
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                <div>summary: <span className="font-mono">{sourceSyncContracts?.primarySummary}</span></div>
                <div>registry: <span className="font-mono">{sourceSyncContracts?.primaryRegistry}</span></div>
                {sourceSyncError ? (
                  <div className="text-rose-300">error: <span className="font-mono">{sourceSyncError}</span></div>
                ) : null}
                {sourceSyncSummary?.payload ? (
                  <>
                    <div>
                      source summary: <span className="font-mono">{sourceSyncSummary.sourceRel}</span>
                    </div>
                    <div>
                      raw root: <span className="font-mono">{sourceSyncSummary.payload.raw_root || 'missing'}</span>
                    </div>
                    <div>
                      total files: <span className="font-mono">{sourceSyncSummary.payload.total_files ?? 0}</span>
                    </div>
                    <div>
                      graphify: <span className="font-mono">{sourceSyncSummary.payload.graphify_sidecar?.status || 'missing'}</span>
                    </div>
                    <div>
                      top types:{' '}
                      <span className="font-mono">
                        {Object.entries(sourceSyncSummary.payload.type_counts || {})
                          .slice(0, 4)
                          .map(([key, value]) => `${key} ${value}`)
                          .join(' · ') || 'none'}
                      </span>
                    </div>
                    <div>
                      top categories:{' '}
                      <span className="font-mono">
                        {Object.entries(sourceSyncSummary.payload.category_counts || {})
                          .slice(0, 4)
                          .map(([key, value]) => `${key} ${value}`)
                          .join(' · ') || 'none'}
                      </span>
                    </div>
                    {Array.isArray(sourceSyncSummary.payload.topology_models) && sourceSyncSummary.payload.topology_models.length > 0 ? (
                      <div>
                        topology:{' '}
                        <span className="font-mono">
                          {sourceSyncSummary.payload.topology_models
                            .slice(0, 2)
                            .map((item) => item.path)
                            .join(' · ')}
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div>
                    source status: <span className="font-mono">尚未生成 source_summary contract</span>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}
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
