import { ChevronDown, ChevronRight, Activity, Box, CheckCircle, ChevronLeft, CircleSlash, Clipboard, Code, Cpu, Database, Download, ExternalLink, FileText, GitMerge, Layers, Layout, Network, Play, Plus, RefreshCw, Save, Shield, Terminal, ToggleRight, X } from 'lucide-react';
import { ProjectCenterActionButton, ProjectCenterActionGroup, ProjectCenterActionMenu, ProjectCenterAnalysisSection, ProjectCenterCatalogSection } from './ProjectCenterPageSections';
import { primarySurfaceLabels, hydroPortfolioCatalog } from '../../data/projectPortfolio';
import { executionSurfaceCatalog } from '../../data/workflowSurfaces';
import { getTriadStatusMeta } from '../../config/uiMeta';

export function ProjectCenterProjectedWorksurfaceSection({ summary, workspaceIntelligence, workspaceProjectionCards, text }) {
  return (
    <section className="rounded-2xl border border-hydro-500/20 bg-hydro-950/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-hydro-300/80">Projected Worksurface</div>
                <h3 className="mt-1 text-sm font-semibold text-slate-100">
                  {workspaceIntelligence.headline} · 自动投影的当前重点
                </h3>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  工作面会根据目录信号优先突出最相关的内容，而不是把所有分析块都一股脑堆在第一屏。
                </p>
              </div>
              <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-200">
                {workspaceIntelligence.stage}
              </span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {workspaceProjectionCards.map((card) => (
                <div key={card.key} className="rounded-2xl border border-zinc-800/40 bg-zinc-950/55 p-4">
                  <div className="text-xs font-semibold text-slate-100">{card.title}</div>
                  <div className="mt-2 text-[11px] leading-5 text-zinc-300">{card.summary}</div>
                  <div className="mt-3 text-[10px] leading-5 text-zinc-500">{card.body}</div>
                </div>
              ))}
            </div>
          </section>
  );
}

export function ProjectCenterAdvancedActionsSection({ qualityRubric, qualityRubricError, qualityCoverage, qualityCoverageError, qualityBatch, qualityBatchError, rolloutBaseline, rolloutBaselineError, knowledgeLintBatch, knowledgeLintCase, knowledgeLintError, feasibility, feasibilityError, modelStrategy, modelStrategyError, modelStrategyBatch, modelStrategyBatchError, dataIntelligence, setDataIntelligence, dataIntelligenceError, setDataIntelligenceError, dataIntelligenceBatch, dataIntelligenceBatchError, readiness, readinessError, modelingHints, modelingHintsError, modelingHintsLoading, pipelinePreflight, pipelinePreflightError, pipelinePreflightLoading, sourcebundleImport, sourcebundleImportError, sourcebundleImportLoading, graphifyPilot, graphifyPilotError, graphifyPilotLoading, graphifyReportSummary, sourceSyncSummary, sourceSyncError, sourceSyncLoading, isTauri, cases, loading, refresh, summary, loadQualityCoverage, loadWorkflowFeasibility, loadModelStrategy, loadCaseDataIntelligence, loadPlatformReadiness, loadModelingHints, loadPipelinePreflight, runSourcebundleImport, loadGraphifyPilot, loadSourceSyncSummary, shellCaseId, pipelineTruthClassName, canSeeAdvancedPlatformTools, entries, payload, rows, text, ok, currentModelStrategyMeta, modelStrategyBatchEntries, dataIntelligenceBatchRollupEntries, dataIntelligenceHeadlineStats, dataIntelligenceShortcutSpecs, dataIntelligenceRelatedStatusEntries, projectCenterCaseFileActions, projectCenterBatchDiagnosticActions, projectCenterAdvancedActions, openPath, revealPath, projectCenterFeasibilityTierLabels, projectCenterModelStrategyEvidenceLabels, projectCenterSignalLabels, getModelStrategyMeta, ProjectCenterActionButton, ProjectCenterActionGroup }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            {canSeeAdvancedPlatformTools ? (
              <details className="mt-4 rounded-xl border border-zinc-800/40 bg-zinc-950/25 p-3">
                <summary className="cursor-pointer list-none text-[11px] text-zinc-300">
                  展开更多平台分析与工具
                </summary>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <ProjectCenterActionGroup
                title="当前案例文件与编辑"
                summary="当前 case 的 manifest、Hydrology YAML、contracts 与内联编辑器入口。"
              >
                {projectCenterCaseFileActions.map((action) => (
                  <ProjectCenterActionButton
                    key={action.key}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={action.className}
                  >
                    {action.label}
                  </ProjectCenterActionButton>
                ))}
              </ProjectCenterActionGroup>
              <ProjectCenterActionGroup
                title="批量诊断与 cohort 管理"
                summary="面向默认 6-case cohort 的批量检查，同时保持对新增 case 的通用支持。"
              >
                {projectCenterBatchDiagnosticActions.map((action) => (
                  <ProjectCenterActionButton
                    key={action.key}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={action.className}
                  >
                    {action.label}
                  </ProjectCenterActionButton>
                ))}
              </ProjectCenterActionGroup>
              <ProjectCenterActionGroup
                title="高级工具与配置入口"
                summary="低频但必要的工程配置、平台方案和脚手架源码入口，保留但不占第一屏主操作位。"
              >
                {projectCenterAdvancedActions.map((action) => (
                  <ProjectCenterActionButton
                    key={action.key}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={action.className}
                  >
                    {action.label}
                  </ProjectCenterActionButton>
                ))}
              </ProjectCenterActionGroup>
            </div>
            {qualityRubricError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {qualityRubricError}
              </div>
            )}
            {qualityRubric?.platform?.display_name_zh && (
              <div className="mt-3 text-xs text-zinc-500">
                已加载 · {qualityRubric.platform.display_name_zh} · config {qualityRubric.config_path || '—'} · v
                {qualityRubric.version ?? '—'}
              </div>
            )}
            <details className="mt-4 rounded-xl border border-zinc-800/40 bg-zinc-950/30 p-3">
              <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开质量维度与覆盖明细</summary>
              {Array.isArray(qualityRubric?.quality_loop?.dimensions) && qualityRubric.quality_loop.dimensions.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {qualityRubric.quality_loop.dimensions.map((dim) => (
                    <div
                      key={dim.key || dim.display_zh}
                      className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 px-3 py-2.5"
                    >
                      <div className="text-[11px] font-medium text-zinc-200">{dim.display_zh || dim.key}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-600">{dim.key}</div>
                      {Array.isArray(dim.metric_hints) && dim.metric_hints.length > 0 && (
                        <div className="mt-1.5 text-[10px] leading-4 text-zinc-500">
                          指标：{dim.metric_hints.join(' · ')}
                        </div>
                      )}
                      {Array.isArray(dim.artifact_hints) && dim.artifact_hints.length > 0 && (
                        <div className="mt-1 text-[10px] leading-4 text-zinc-500">
                          产物线索：{dim.artifact_hints.join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {qualityCoverageError && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {qualityCoverageError}
                </div>
              )}
              {qualityCoverage?.summary && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span>
                    产物覆盖（有 artifact_hints 的维度）：{qualityCoverage.summary.dimensions_satisfied}/
                    {qualityCoverage.summary.dimensions_total} ·
                    {Math.round((qualityCoverage.summary.ratio || 0) * 100)}%
                  </span>
                  <span className="text-slate-600">
                    contracts 文件数 {qualityCoverage.contracts_file_count ?? '—'} · {qualityCoverage.contracts_dir}
                  </span>
                  {qualityCoverage.error === 'contracts_directory_missing' && (
                    <span className="text-amber-400">contracts 目录不存在</span>
                  )}
                </div>
              )}
              {Array.isArray(qualityCoverage?.dimension_checks) && qualityCoverage.dimension_checks.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {qualityCoverage.dimension_checks.map((row) => (
                    <div
                      key={row.key || row.display_zh}
                      className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-medium text-zinc-200">{row.display_zh || row.key}</div>
                        {row.skipped ? (
                          <span className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-500">
                            无 hints
                          </span>
                        ) : row.satisfied ? (
                          <span className="shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">
                            已命中
                          </span>
                        ) : (
                          <span className="shrink-0 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-300">
                            未命中
                          </span>
                        )}
                      </div>
                      {!row.skipped && Array.isArray(row.matched_paths) && row.matched_paths.length > 0 && (
                        <div className="mt-1.5 text-[10px] leading-4 text-zinc-500">
                          匹配：{row.matched_paths.slice(0, 4).join(' · ')}
                          {row.matched_paths.length > 4 ? ' …' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </details>
            {qualityBatchError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {qualityBatchError}
              </div>
            )}
            {rolloutBaselineError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {rolloutBaselineError}
              </div>
            )}
            {knowledgeLintError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {knowledgeLintError}
              </div>
            )}
            {knowledgeLintBatch?.rollup && (
              <div className="mt-4 rounded-xl border border-indigo-500/25 bg-zinc-950/40 p-4">
                <div className="text-[11px] font-medium text-indigo-200">知识壳层 lint 汇总（Markdown 相对链接 + 必填路径）</div>
                <div className="mt-2 text-[10px] text-zinc-500">
                  {knowledgeLintBatch.config_path} · 案例 {knowledgeLintBatch.rollup.case_count} · 通过{' '}
                  {knowledgeLintBatch.rollup.cases_ok} · 断链（相对）{knowledgeLintBatch.rollup.broken_relative_links ?? 0}
                  {knowledgeLintBatch.ok === false ? (
                    <span className="ml-2 text-rose-400">· 存在失败项</span>
                  ) : (
                    <span className="ml-2 text-emerald-500/80">· 全通过</span>
                  )}
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-left text-[10px] text-zinc-400">
                    <thead>
                      <tr className="border-b border-zinc-800/60 text-zinc-500">
                        <th className="py-1.5 pr-3 font-medium">case_id</th>
                        <th className="py-1.5 pr-3 font-medium">ok</th>
                        <th className="py-1.5 pr-3 font-medium">相对断链</th>
                        <th className="py-1.5 pr-3 font-medium">raw 目录</th>
                        <th className="py-1.5 font-medium">errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(knowledgeLintBatch.cases || []).map((row) => (
                        <tr key={row.case_id} className="border-b border-slate-800/80">
                          <td className="py-1.5 pr-3 text-zinc-200">{row.case_id}</td>
                          <td className="py-1.5 pr-3">{row.ok ? 'yes' : 'no'}</td>
                          <td className="py-1.5 pr-3">{row.broken_relative_link_count ?? 0}</td>
                          <td className="py-1.5 pr-3">{row.raw_dir_exists ? '有' : '无'}</td>
                          <td className="py-1.5 text-amber-200/80">
                            {(row.errors || []).length ? (row.errors || []).join(', ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {knowledgeLintCase?.case_id && (
              <div className="mt-3 rounded-xl border border-indigo-500/20 bg-zinc-950/35 p-3">
                <div className="text-[11px] font-medium text-indigo-200/90">知识壳层 lint · 当前案例</div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  {knowledgeLintCase.case_id} · ok {knowledgeLintCase.ok ? 'yes' : 'no'} · 相对断链{' '}
                  {knowledgeLintCase.broken_relative_link_count ?? 0} · raw{' '}
                  {knowledgeLintCase.raw_dir_exists ? '有' : '无'}
                </div>
                {Array.isArray(knowledgeLintCase.errors) && knowledgeLintCase.errors.length > 0 && (
                  <div className="mt-1 text-[10px] text-amber-200/90">{knowledgeLintCase.errors.join(' · ')}</div>
                )}
              </div>
            )}
            {qualityBatch?.rollup && (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-zinc-950/40 p-4">
                <div className="text-[11px] font-medium text-cyan-200">配置内全案例产物覆盖汇总</div>
                <div className="mt-2 text-[10px] text-zinc-500">
                  {qualityBatch.config_path} · 案例数 {qualityBatch.rollup.case_count} · 有 contracts 目录{' '}
                  {qualityBatch.rollup.cases_with_contracts_dir} · 平均命中率{' '}
                  {Math.round((qualityBatch.rollup.mean_ratio || 0) * 100)}% · 最低{' '}
                  {Math.round((qualityBatch.rollup.min_ratio || 0) * 100)}%
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-left text-[10px] text-zinc-400">
                    <thead>
                      <tr className="border-b border-zinc-800/60 text-zinc-500">
                        <th className="py-1.5 pr-3 font-medium">case_id</th>
                        <th className="py-1.5 pr-3 font-medium">命中比</th>
                        <th className="py-1.5 pr-3 font-medium">维度</th>
                        <th className="py-1.5 pr-3 font-medium">导入链</th>
                        <th className="py-1.5 font-medium">contracts 文件数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(qualityBatch.rollup.per_case || []).map((row) => (
                        <tr key={row.case_id} className="border-b border-slate-800/80">
                          <td className="py-1.5 pr-3 text-zinc-200">{row.case_id}</td>
                          <td className="py-1.5 pr-3">
                            {row.error ? (
                              <span className="text-amber-400">无目录</span>
                            ) : (
                              `${Math.round((row.ratio || 0) * 100)}%`
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            {row.error ? '—' : `${row.dimensions_satisfied}/${row.dimensions_total}`}
                          </td>
                          <td className="py-1.5 pr-3">
                            {row.error ? (
                              '—'
                            ) : row.source_import_session_present ? (
                              <span className="text-teal-300">
                                {row.source_import_mode || 'ready'}
                                {row.source_imported_at ? ` · ${String(row.source_imported_at).slice(0, 10)}` : ''}
                              </span>
                            ) : (
                              <span className="text-zinc-500">missing</span>
                            )}
                          </td>
                          <td className="py-1.5">{row.contracts_file_count ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {rolloutBaseline?.import_chain_rollup && (
              <div className="mt-4 rounded-xl border border-teal-500/20 bg-zinc-950/40 p-4">
                <div className="text-[11px] font-medium text-teal-200">六案例 readiness / release 聚合</div>
                <div className="mt-2 text-[10px] text-zinc-500">
                  {rolloutBaseline.loop_config_path} · 已收口 {rolloutBaseline.import_chain_rollup.imported_case_count}/
                  {rolloutBaseline.import_chain_rollup.case_count} · 缺失 {rolloutBaseline.import_chain_rollup.missing_case_count} · 覆盖率{' '}
                  {Math.round((rolloutBaseline.import_chain_rollup.coverage_ratio || 0) * 100)}%
                </div>
                <div className="mt-2 text-[10px]">
                  <span
                    className={`rounded border px-2 py-0.5 ${
                      rolloutBaseline.import_chain_rollup.ready
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    import_chain {rolloutBaseline.import_chain_rollup.status || 'pending'}
                  </span>
                  <span className="ml-2 text-zinc-400">
                    {rolloutBaseline.import_chain_rollup.reason || '—'}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-zinc-400">
                  latest_imported_at {rolloutBaseline.import_chain_rollup.latest_imported_at || '—'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  {(rolloutBaseline.import_chain_rollup.ready_case_ids || []).map((caseId) => (
                    <span
                      key={`ready-${caseId}`}
                      className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300"
                    >
                      {caseId}
                    </span>
                  ))}
                  {(rolloutBaseline.import_chain_rollup.missing_case_ids || []).map((caseId) => (
                    <span
                      key={`missing-${caseId}`}
                      className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-zinc-400"
                    >
                      {caseId}
                    </span>
                  ))}
                </div>
                {rolloutBaseline.readiness_release_board?.rollup && (
                  <div className="mt-4 rounded-lg border border-teal-500/15 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-medium text-zinc-100">Release Gate 汇总</div>
                        <div className="mt-1 text-[10px] text-zinc-500">
                          schema {rolloutBaseline.readiness_release_board.schema_version || '—'} · 仅依赖现有 contracts 聚合
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        non-blocked {rolloutBaseline.readiness_release_board.rollup.non_blocked_count || 0}/
                        {rolloutBaseline.readiness_release_board.rollup.total_cases || 0}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                        release-ready {rolloutBaseline.readiness_release_board.rollup.release_ready_count || 0}
                      </span>
                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                        needs-review {rolloutBaseline.readiness_release_board.rollup.needs_review_count || 0}
                      </span>
                      <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-200">
                        blocked {rolloutBaseline.readiness_release_board.rollup.blocked_count || 0}
                      </span>
                    </div>
                    {rolloutBaseline.final_report_rollup ? (
                      <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-950/20 p-3">
                        <div className="text-[11px] font-medium text-cyan-100">Final Report / 推广状态真相</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                            final report {rolloutBaseline.final_report_rollup.counts.finalReportPresent}/
                            {rolloutBaseline.final_report_rollup.counts.total}
                          </span>
                          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                            推广 release-ready {rolloutBaseline.final_report_rollup.counts.promotionReleaseReady}
                          </span>
                          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                            推广 needs-review {rolloutBaseline.final_report_rollup.counts.promotionNeedsReview}
                          </span>
                          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-200">
                            推广 blocked {rolloutBaseline.final_report_rollup.counts.promotionBlocked}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] text-zinc-400">
                          {rolloutBaseline.final_report_rollup.completion.summary}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 lg:grid-cols-3">
                      {(rolloutBaseline.readiness_release_board.cases || []).map((row) => {
                        const gate = row.release_gate || {};
                        const dimensions = row.dimensions || {};
                        return (
                          <button
                            key={`release-gate-${row.case_id}`}
                            type="button"
                            onClick={() => {
                              setShellCaseId(row.case_id);
                              setShellMode('case');
                            }}
                            className={`rounded-lg border px-3 py-3 text-left transition hover:border-teal-500/30 ${
                              row.case_id === shellCaseId
                                ? 'border-teal-500/35 bg-teal-500/10'
                                : 'border-zinc-800/60 bg-zinc-950/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-zinc-100">{row.case_id}</span>
                              <span className={`rounded border px-2 py-0.5 text-[10px] ${getReleaseGateClassName(gate.status)}`}>
                                {gate.status || 'unknown'}
                              </span>
                            </div>
                            <div className="mt-2 text-[10px] text-zinc-300">
                              blockers {gate.blockers?.length || 0} · review {gate.review_items?.length || 0}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[10px] text-zinc-500">
                              {gate.summary || '—'}
                            </div>
                            <div className="mt-2 text-[10px] text-zinc-400">
                              autonomy {dimensions.autonomy_quality?.status || '—'} · e2e {dimensions.e2e_gate?.status || '—'} · wnal{' '}
                              {dimensions.wnal?.status || '—'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {dataIntelligenceBatchError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {dataIntelligenceBatchError}
              </div>
            )}
            {dataIntelligenceBatch?.profiles?.length > 0 && (
              <div className="mt-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-fuchsia-200">六案例数据智能规划分布</div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      汇总推荐主链、风险与缺数，不替代单案例细读。
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {dataIntelligenceBatch.case_ids?.length || 0} cases
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  {dataIntelligenceBatchRollupEntries.map(([key, count]) => (
                    <span
                      key={`intelligence-rollup-${key}`}
                      className="rounded border border-fuchsia-500/25 bg-fuchsia-950/30 px-2 py-0.5 text-fuchsia-200"
                    >
                      {key} {count}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {(dataIntelligenceBatch.profiles || []).map((profile) => {
                    const planning = profile.workflow_planning || {};
                    return (
                      <button
                        key={`intelligence-${profile.case_id}`}
                        type="button"
                        onClick={() => {
                          const nextState = buildSelectedDataIntelligenceState(profile);
                          if (!nextState) return;
                          setShellCaseId(nextState.shellCaseId);
                          setShellMode(nextState.shellMode);
                          setDataIntelligence(nextState.dataIntelligence);
                          setDataIntelligenceError(nextState.dataIntelligenceError);
                        }}
                        className={`rounded-lg border px-3 py-3 text-left transition ${
                          profile.case_id === shellCaseId
                            ? 'border-fuchsia-500/35 bg-fuchsia-500/10'
                            : 'border-zinc-800/50 bg-zinc-950/40 hover:border-fuchsia-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-zinc-100">{profile.case_id}</span>
                          <span className="text-[10px] text-zinc-500">
                            risk {profile.authenticity_summary?.review_required_assets || 0}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] text-zinc-400">
                          推荐 {(planning.recommended_path || []).join(' · ') || '—'}
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500">
                          缺数 {(planning.missing_evidence || []).slice(0, 3).join('、') || '—'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {modelStrategyBatchError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {modelStrategyBatchError}
              </div>
            )}
            {modelStrategyBatch?.rollup && (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-cyan-200">六案例模型判型分布</div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      基于主闭环 YAML 当前证据的产品判型，不代表案例永久本质分类。
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {modelStrategyBatch.case_ids?.length || 0} cases · schema {modelStrategyBatch.schema_version || '—'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {modelStrategyBatchEntries.map(([key, count]) => {
                    const meta = getModelStrategyMeta(key);
                    return (
                      <span key={key} className={`rounded border px-2 py-0.5 ${meta.className}`}>
                        {meta.label} {count}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {modelStrategyBatchEntries.map(([key]) => {
                    const meta = getModelStrategyMeta(key);
                    const rows = (modelStrategyBatch.cases || []).filter((row) => row.strategy_key === key);
                    return (
                      <div
                        key={`group-${key}`}
                        className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded border px-2 py-0.5 text-[10px] ${meta.className}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-zinc-500">{key}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          {rows.map((row) => (
                            <span
                              key={`strategy-${key}-${row.case_id}`}
                              className={`rounded border px-2 py-0.5 ${
                                row.case_id === shellCaseId
                                  ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-300'
                              }`}
                            >
                              {row.case_id}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {modelStrategyError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {modelStrategyError}
              </div>
            )}
            {dataIntelligenceError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {dataIntelligenceError}
              </div>
            )}
            {dataIntelligence?.case_id && (
              <div className="mt-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-fuchsia-200">当前案例数据智能规划</div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      上位汇总视图：资产画像、真实性风险、主链推荐、缺数与改模建议。
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    case {dataIntelligence.case_id || shellCaseId || '—'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => openPath(`cases/${dataIntelligence.case_id}/contracts/case_data_intelligence.latest.json`)}
                    className="rounded border border-fuchsia-500/20 bg-fuchsia-950/30 px-2 py-1 text-fuchsia-200"
                  >
                    打开 latest JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => revealPath(`cases/${dataIntelligence.case_id}/contracts/case_data_intelligence.latest.json`)}
                    className="rounded border border-zinc-700 px-2 py-1 text-zinc-300"
                  >
                    定位数据智能结果
                  </button>
                  <button
                    type="button"
                    onClick={() => revealPath(`cases/${dataIntelligence.case_id}`)}
                    className="rounded border border-zinc-700 px-2 py-1 text-zinc-300"
                  >
                    定位案例目录
                  </button>
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="rounded-lg border border-fuchsia-500/15 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">结果卡直达动作</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                      {dataIntelligenceShortcutSpecs.map((action) => {
                        const styleByTone = {
                          primary: 'border-fuchsia-500/30 bg-fuchsia-950/35 text-fuchsia-200',
                          accent: 'border-amber-500/30 bg-amber-950/25 text-amber-200',
                          success: 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200',
                          neutral: 'border-zinc-700 bg-zinc-900/70 text-zinc-200',
                        };
                        const handlerByKey = {
                          'refresh-data-intelligence': () => loadCaseDataIntelligence(),
                          'refresh-model-strategy': () => loadModelStrategy(),
                          'refresh-readiness': () => loadPlatformReadiness(),
                          'refresh-quality-coverage': () => loadQualityCoverage(),
                          'refresh-feasibility': () => loadWorkflowFeasibility(),
                        };
                        const handleClick = handlerByKey[action.key];
                        if (!handleClick) return null;
                        return (
                          <button
                            key={action.key}
                            type="button"
                            disabled={action.disabled}
                            onClick={() => void handleClick()}
                            className={`rounded border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              styleByTone[action.tone] || styleByTone.neutral
                            }`}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">关联状态</div>
                    <div className="mt-2 grid gap-2 text-[10px]">
                      {dataIntelligenceRelatedStatusEntries.map((item) => {
                        const toneClassName = {
                          ready: 'border-emerald-500/25 bg-emerald-950/20 text-emerald-200',
                          loading: 'border-sky-500/25 bg-sky-950/20 text-sky-200',
                          error: 'border-rose-500/25 bg-rose-950/20 text-rose-200',
                          idle: 'border-zinc-700 bg-zinc-900/70 text-zinc-300',
                        };
                        return (
                          <div
                            key={item.key}
                            className={`rounded border px-2 py-1.5 ${toneClassName[item.tone] || toneClassName.idle}`}
                          >
                            <div className="text-zinc-100">{item.label}</div>
                            <div className="mt-1 truncate text-[10px] opacity-90" title={item.detail}>
                              {item.detail}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                  {dataIntelligenceHeadlineStats.map((item) => (
                    <div
                      key={`data-intelligence-headline-${item.key}`}
                      className="rounded-lg border border-fuchsia-500/15 bg-zinc-950/50 px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-100">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {Object.entries(dataIntelligence.asset_profile?.categories || {}).map(([key, category]) => (
                    <div key={key} className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-600">
                        {getDataIntelligenceCategoryLabel(key)}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-zinc-100">
                        {category.asset_count ?? 0}
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {category.available ? '已识别资产' : '当前未识别'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">工作流规划</div>
                    <div className="mt-2 space-y-2 text-[11px] text-zinc-300">
                      <div>推荐 {(dataIntelligence.workflow_planning?.recommended_path || []).join(' · ') || '—'}</div>
                      <div>风险 {(dataIntelligence.workflow_planning?.risky_path || []).join(' · ') || '—'}</div>
                      <div>阻断 {(dataIntelligence.workflow_planning?.blocked_path || []).join(' · ') || '—'}</div>
                      <div>缺数 {(dataIntelligence.workflow_planning?.missing_evidence || []).join('、') || '—'}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">真实性风险</div>
                    <div className="mt-2 space-y-2 text-[11px] text-zinc-300">
                      <div>direct {dataIntelligence.authenticity_summary?.direct_assets ?? 0}</div>
                      <div>review {dataIntelligence.authenticity_summary?.review_required_assets ?? 0}</div>
                      <div>config-only {dataIntelligence.authenticity_summary?.configured_only_assets ?? 0}</div>
                      <div>bundle gaps {dataIntelligence.authenticity_summary?.missing_bundle_gaps ?? 0}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">建议补挖数据</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                      {(dataIntelligence.workflow_planning?.suggested_data_mining_tasks || []).length > 0 ? (
                        (dataIntelligence.workflow_planning?.suggested_data_mining_tasks || []).map((item) => (
                          <span key={item} className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-zinc-300">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-500">当前无新增补挖建议</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">改模建议 / 学习分层</div>
                    <div className="mt-2 space-y-2 text-[11px] text-zinc-300">
                      <div>参数学习 {dataIntelligence.learning_strategy?.parameter_learning?.status || '—'}</div>
                      <div>策略学习 {dataIntelligence.learning_strategy?.model_strategy_learning?.status || '—'}</div>
                      <div>改模建议 {dataIntelligence.learning_strategy?.model_change_advice?.status || '—'}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                      {(dataIntelligence.workflow_planning?.model_change_advice || []).length > 0 ? (
                        (dataIntelligence.workflow_planning?.model_change_advice || []).map((item, index) => (
                          <span
                            key={`advice-${index}-${item.advice_type}`}
                            className="rounded border border-fuchsia-500/20 bg-fuchsia-950/30 px-2 py-0.5 text-fuchsia-200"
                          >
                            {item.advice_type} · {item.priority || '—'}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-500">当前无新增改模建议</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {modelStrategy?.strategy_key && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-amber-200">当前案例模型判型</div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      输出的是“当前证据支持的模型”，不是对案例未来能力上限的永久归类。
                    </div>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-[10px] ${currentModelStrategyMeta.className}`}>
                    {currentModelStrategyMeta.label}
                  </span>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-100">
                  {modelStrategy.display_name || '—'}
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  case {modelStrategy.case_id || shellCaseId || '—'} · strategy_key {modelStrategy.strategy_key || '—'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span
                    className={`rounded border px-2 py-0.5 ${
                      modelStrategy.should_build_watershed_model
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-900/80 text-zinc-400'
                    }`}
                  >
                    流域划分 {modelStrategy.should_build_watershed_model ? '应建' : '暂不建'}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 ${
                      modelStrategy.should_build_hydrology_model
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-900/80 text-zinc-400'
                    }`}
                  >
                    水文模型 {modelStrategy.should_build_hydrology_model ? '应建' : '暂不建'}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 ${
                      modelStrategy.should_build_control_model
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-900/80 text-zinc-400'
                    }`}
                  >
                    控制/运行模型 {modelStrategy.should_build_control_model ? '应建' : '暂不建'}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-zinc-400">
                  {modelStrategy.rationale || '—'}
                </p>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-600">证据真相</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {Object.entries(projectCenterModelStrategyEvidenceLabels).map(([key, label]) => (
                      <span
                        key={key}
                        className={`rounded border px-2 py-0.5 ${
                          modelStrategy.evidence?.[key]
                            ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                            : 'border-zinc-800 bg-zinc-900/80 text-zinc-500'
                        }`}
                      >
                        {label} {modelStrategy.evidence?.[key] ? 'yes' : 'no'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">当前不该强行宣称</div>
                    <div className="mt-2 text-[11px] text-zinc-300">
                      {(modelStrategy.blocked_capabilities || []).length > 0
                        ? (modelStrategy.blocked_capabilities || []).join(' · ')
                        : '当前主链真相已满足，不存在阻断项。'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">升级提示</div>
                    <div className="mt-2 text-[11px] text-zinc-300">
                      {(modelStrategy.blocked_capabilities || []).length > 0
                        ? `若后续补齐 ${modelStrategy.blocked_capabilities.join('、')}，可把当前案例升级到更完整的流域水文主链判型。`
                        : '当前案例已具备流域水文主链所需的核心真相，可继续做更完整 workflow。'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {readinessError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {readinessError}
              </div>
            )}
            {readiness?.summary && (
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-4">
                <div className="text-[11px] font-medium text-emerald-200">
                  平台就绪度摘要（主闭环 × 产物 × 工作流矩阵）
                </div>
                <div className="mt-2 text-[10px] text-zinc-500">
                  {readiness.platform_rubric?.platform?.display_name_zh || '—'} ·{' '}
                  {readiness.generated_at || '—'}
                </div>
                {readiness.platform_rubric?.platform?.essence_zh && (
                  <p className="mt-2 text-[11px] leading-5 text-zinc-400 line-clamp-4">
                    {readiness.platform_rubric.platform.essence_zh}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-300">
                  <span>
                    质量维度产物命中{' '}
                    {readiness.summary.artifact_dimensions_satisfied ?? '—'}/
                    {readiness.summary.artifact_dimensions_total ?? '—'}（
                    {Math.round((readiness.summary.artifact_ratio || 0) * 100)}%）
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    工作流 data_ok {readiness.summary.workflow_data_ok ?? '—'} · data_gap{' '}
                    {readiness.summary.workflow_data_gap ?? '—'}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    case 配置信号 {readiness.summary.case_config_signal ? '有' : '无'}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    manifest {readiness.summary.entry_case_manifest_source || '—'} · source_bundle{' '}
                    {readiness.summary.entry_source_bundle_source || '—'}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    outlets {readiness.summary.entry_outlets_source || '—'} · simulation{' '}
                    {readiness.summary.entry_simulation_config_source || '—'}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    import session {readiness.summary.entry_source_import_session_source || 'missing'} · mode{' '}
                    {readiness.summary.source_import_mode || '—'}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    主链真相{' '}
                    <span className={`rounded border px-2 py-0.5 ${pipelineTruthClassName}`}>
                      {readiness.summary.pipeline_contract_ready ? 'ready' : 'not_ready'}
                    </span>
                    {' · '}minimal {readiness.summary.pipeline_minimal_contract_ready ? 'yes' : 'no'}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    Graphify {readiness.summary.graphify_sidecar_status || 'missing'} · auto-model hints{' '}
                    {readiness.summary.graphify_supports_auto_modeling_hints ? 'yes' : 'no'}
                  </span>
                </div>
                {(readiness.summary.source_imported_at || readiness.summary.source_import_session_path) ? (
                  <div className="mt-2 text-[10px] text-teal-200/80">
                    import_session {readiness.summary.source_imported_at || '—'} ·{' '}
                    <span className="font-mono break-all text-teal-100/70">
                      {readiness.summary.source_import_session_path || '—'}
                    </span>
                  </div>
                ) : null}
                {readiness.summary.graphify_modeling_signal_counts &&
                Object.keys(readiness.summary.graphify_modeling_signal_counts).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-fuchsia-200/90">
                    {Object.entries(readiness.summary.graphify_modeling_signal_counts).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded border border-fuchsia-500/20 bg-fuchsia-950/20 px-2 py-0.5"
                      >
                        {key}:{value}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 text-[10px] text-slate-600">
                  新案例仅增 YAML + 数据目录即可纳入同一套门禁；只有 pipeline truth ready 时，才应视作真实主链闭环。
                </div>
              </div>
            )}
            <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-950/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-sky-200">Graphify 建模建议</div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    基于入口来源与 Graphify 建模信号推导的确定性建议层，不直接触发 workflow。
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!shellCaseId || modelingHintsLoading}
                  onClick={() => void loadModelingHints(shellCaseId)}
                  className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 disabled:opacity-50"
                >
                  {modelingHintsLoading ? '加载中…' : '刷新建议'}
                </button>
              </div>
              {modelingHintsError ? (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {modelingHintsError}
                </div>
              ) : null}
              {modelingHints?.hints ? (
                <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
                  <div>
                    suggested_workflows:{' '}
                    <span className="font-mono text-zinc-200">
                      {(modelingHints.hints.suggested_workflows || []).join(', ') || '—'}
                    </span>
                  </div>
                  <div>
                    entry_sources: manifest {modelingHints.hints.entry_sources?.case_manifest || '—'} · source_bundle{' '}
                    {modelingHints.hints.entry_sources?.source_bundle || '—'} · outlets{' '}
                    {modelingHints.hints.entry_sources?.outlets || '—'} · import_session{' '}
                    {modelingHints.hints.entry_sources?.import_session || '—'}
                  </div>
                  {modelingHints.hints.source_import_session?.present ? (
                    <div>
                      source_import_session: {modelingHints.hints.source_import_session.source_mode || '—'} · records{' '}
                      <span className="font-mono text-zinc-200">
                        {modelingHints.hints.source_import_session.record_count ?? '—'}
                      </span>
                      {' '}· imported_at{' '}
                      <span className="font-mono text-zinc-200">
                        {modelingHints.hints.source_import_session.imported_at || '—'}
                      </span>
                    </div>
                  ) : null}
                  {modelingHints.hints.graphify_modeling_signal_counts ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(modelingHints.hints.graphify_modeling_signal_counts).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded border border-sky-500/20 bg-sky-950/20 px-2 py-0.5 text-[10px] text-sky-200"
                        >
                          {key}:{value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-zinc-500">
                  当前案例尚未加载建模 hints；可点击“刷新建议”生成结构化建模提示。
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-cyan-200">Case Pipeline Preflight</div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    `run_case_pipeline --phase simulation --dry-run` 的非阻断前导输出；用于看入口缺口与建模建议是否对齐。
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!shellCaseId || pipelinePreflightLoading}
                  onClick={() => void loadPipelinePreflight(shellCaseId)}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-50"
                >
                  {pipelinePreflightLoading ? '加载中…' : '刷新预检'}
                </button>
              </div>
              {pipelinePreflightError ? (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {pipelinePreflightError}
                </div>
              ) : null}
              {pipelinePreflight ? (
                <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
                  <div>
                    phase: <span className="font-mono text-zinc-200">{pipelinePreflight.phase || '—'}</span>
                    {' '}· ok:{' '}
                    <span className="font-mono text-zinc-200">{String(Boolean(pipelinePreflight.ok))}</span>
                  </div>
                  <div>
                    missing_inputs:{' '}
                    <span className="font-mono text-zinc-200">
                      {(pipelinePreflight.missing_inputs || []).join(', ') || 'none'}
                    </span>
                  </div>
                  <div>
                    entry_sources: manifest {pipelinePreflight.modeling_hints?.entry_sources?.case_manifest || '—'} · source_bundle{' '}
                    {pipelinePreflight.modeling_hints?.entry_sources?.source_bundle || '—'} · outlets{' '}
                    {pipelinePreflight.modeling_hints?.entry_sources?.outlets || '—'} · simulation{' '}
                    {pipelinePreflight.modeling_hints?.entry_sources?.simulation_config || '—'}
                  </div>
                  <div>
                    suggested_workflows:{' '}
                    <span className="font-mono text-zinc-200">
                      {(pipelinePreflight.modeling_hints?.suggested_workflows || []).join(', ') || '—'}
                    </span>
                  </div>
                  <div>
                    planned_commands:{' '}
                    <span className="font-mono text-zinc-200">
                      {Array.isArray(pipelinePreflight.planned_commands) ? pipelinePreflight.planned_commands.length : 0}
                    </span>
                  </div>
                  {pipelinePreflight.source_import_session ? (
                    <div>
                      import_session: {pipelinePreflight.source_import_session.source || 'missing'} · mode{' '}
                      {pipelinePreflight.source_import_session.source_mode || '—'} · records{' '}
                      <span className="font-mono text-zinc-200">
                        {pipelinePreflight.source_import_session.record_count ?? '—'}
                      </span>
                    </div>
                  ) : null}
                  {pipelinePreflight.source_import_session?.path ? (
                    <div>
                      import_session_path:{' '}
                      <span className="font-mono text-zinc-500 break-all">
                        {pipelinePreflight.source_import_session.path}
                      </span>
                    </div>
                  ) : null}
                  {pipelinePreflight.source_import_session?.imported_at ? (
                    <div>
                      imported_at:{' '}
                      <span className="font-mono text-zinc-200">
                        {pipelinePreflight.source_import_session.imported_at}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-zinc-500">
                  当前案例尚未加载 case pipeline preflight；可点击“刷新预检”读取建模入口前导输出。
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-teal-500/20 bg-teal-950/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-teal-200">SourceBundle Import</div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    `P1` 最小导入链入口：把现有 source bundle / outlets 收口到 case-local contracts，并同步 manifest latest 槽位。
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!shellCaseId || sourcebundleImportLoading}
                  onClick={() => void runSourcebundleImport(shellCaseId)}
                  className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-200 disabled:opacity-50"
                >
                  {sourcebundleImportLoading ? '导入中…' : '导入 SourceBundle'}
                </button>
              </div>
              {sourcebundleImportError ? (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {sourcebundleImportError}
                </div>
              ) : null}
              {sourcebundleImport ? (
                <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
                  <div>
                    source_mode:{' '}
                    <span className="font-mono text-zinc-200">{sourcebundleImport.source_mode || '—'}</span>
                  </div>
                  <div>
                    record_count:{' '}
                    <span className="font-mono text-zinc-200">{sourcebundleImport.record_count ?? '—'}</span>
                  </div>
                  <div>
                    source_bundle_contract:{' '}
                    <span className="font-mono text-zinc-500 break-all">{sourcebundleImport.source_bundle_contract || '—'}</span>
                  </div>
                  {sourcebundleImport.source_bundle_input ? (
                    <div>
                      source_bundle_input:{' '}
                      <span className="font-mono text-zinc-500 break-all">{sourcebundleImport.source_bundle_input}</span>
                    </div>
                  ) : null}
                  <div>
                    import_session_contract:{' '}
                    <span className="font-mono text-zinc-500 break-all">{sourcebundleImport.import_session_contract || '—'}</span>
                  </div>
                  <div>
                    outlets_contract:{' '}
                    <span className="font-mono text-zinc-500 break-all">{sourcebundleImport.outlets_contract || '—'}</span>
                  </div>
                  {sourcebundleImport.outlets_input ? (
                    <div>
                      outlets_input:{' '}
                      <span className="font-mono text-zinc-500 break-all">{sourcebundleImport.outlets_input}</span>
                    </div>
                  ) : null}
                  {sourcebundleImport.imported_at ? (
                    <div>
                      imported_at:{' '}
                      <span className="font-mono text-zinc-200">{sourcebundleImport.imported_at}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-zinc-500">
                  当前案例尚未执行 SourceBundle import；也可通过 case pipeline preflight 的 sourcebundle_import 字段观察自动导入结果。
                </div>
              )}
            </div>
            <div
              data-testid="project-center-graphify-panel"
              className="mt-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/15 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-fuchsia-200">Graphify Case Sidecar</div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    只读知识图试点层；用于知识挖掘增强，不写 contracts 真相。
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!shellCaseId || !isTauri() || graphifyPilotLoading}
                    onClick={() => void loadGraphifyPilot(shellCaseId, { prepare: true })}
                    data-testid="project-center-graphify-run"
                    className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-200 disabled:opacity-50"
                  >
                    {graphifyPilotLoading ? '准备中…' : '准备 Pilot'}
                  </button>
                  {graphifyPilot?.input_dir ? (
                    <button
                      type="button"
                      onClick={() => openPath(graphifyPilot.input_dir)}
                      className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      打开输入目录
                    </button>
                  ) : null}
                  {graphifyPilot?.output_dir ? (
                    <button
                      type="button"
                      onClick={() => revealPath(graphifyPilot.output_dir)}
                      className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      定位输出目录
                    </button>
                  ) : null}
                </div>
              </div>
              {graphifyPilotError ? (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {graphifyPilotError}
                </div>
              ) : null}
              {graphifyPilot ? (
                <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
                  <div>case_id: <span className="font-mono text-zinc-200">{graphifyPilot.case_id}</span></div>
                  <div>输入目录: <span className="font-mono text-zinc-500">{graphifyPilot.input_dir}</span></div>
                  <div>输出目录: <span className="font-mono text-zinc-500">{graphifyPilot.output_dir}</span></div>
                  <div>graph_report: <span className="font-mono text-zinc-500">{graphifyPilot.graph_report_rel}</span></div>
                  <div>graph_json: <span className="font-mono text-zinc-500">{graphifyPilot.graph_json_rel}</span></div>
                  <div>
                    structural graph:{' '}
                    <span className="font-mono text-zinc-200">
                      {graphifyPilot.structural_graph_ready ? 'ready' : 'missing'}
                    </span>
                  </div>
                  {graphifyReportSummary ? (
                    <>
                      {graphifyReportSummary.summaryBullets.slice(0, 2).map((line) => (
                        <div key={line}>
                          summary: <span className="font-mono text-zinc-500">{line}</span>
                        </div>
                      ))}
                      {graphifyPilot?.graph_run_summary?.delta ? (
                        <div>
                          delta:{' '}
                          <span className="font-mono text-zinc-500">
                            files {graphifyPilot.graph_run_summary.delta.file_count >= 0 ? '+' : ''}
                            {graphifyPilot.graph_run_summary.delta.file_count} · nodes{' '}
                            {graphifyPilot.graph_run_summary.delta.node_count >= 0 ? '+' : ''}
                            {graphifyPilot.graph_run_summary.delta.node_count} · edges{' '}
                            {graphifyPilot.graph_run_summary.delta.edge_count >= 0 ? '+' : ''}
                            {graphifyPilot.graph_run_summary.delta.edge_count}
                          </span>
                        </div>
                      ) : null}
                      {graphifyReportSummary.godNodes.length > 0 ? (
                        <div>
                          god nodes:{' '}
                          <span className="font-mono text-zinc-500">
                            {graphifyReportSummary.godNodes.slice(0, 3).join(' · ')}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {graphifyPilot?.db_sidecar_summary ? (
                    <div>
                      db sidecar:{' '}
                      <span className="font-mono text-zinc-500">
                        sqlite {graphifyPilot.db_sidecar_summary.sqlite_count || 0} · dumps{' '}
                        {graphifyPilot.db_sidecar_summary.dump_count || 0}
                      </span>
                    </div>
                  ) : null}
                  {Array.isArray(graphifyPilot.command) ? (
                    <div className="break-all">command: <span className="font-mono text-zinc-500">{graphifyPilot.command.join(' ')}</span></div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-zinc-500">
                  当前案例尚未准备 Graphify pilot；可点击“准备 Pilot”生成 case-sidecar 输入目录。
                </div>
              )}
            </div>
            <div
              data-testid="project-center-source-sync-panel"
              className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-cyan-200">Source Sync</div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    原始资料收口层；生成 `source_registry/source_summary`，并投影到共享 wiki。
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!shellCaseId || !isTauri() || sourceSyncLoading}
                    onClick={() => void loadSourceSyncSummary(shellCaseId, { runSync: true })}
                    data-testid="project-center-source-sync-run"
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-50"
                  >
                    {sourceSyncLoading ? '同步中…' : '运行 Source Sync'}
                  </button>
                  {sourceSyncSummary?.summary_rel ? (
                    <button
                      type="button"
                      onClick={() => openPath(sourceSyncSummary.summary_rel)}
                      className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      打开 source_summary
                    </button>
                  ) : null}
                  {sourceSyncSummary?.registry_rel ? (
                    <button
                      type="button"
                      onClick={() => openPath(sourceSyncSummary.registry_rel)}
                      className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      打开 source_registry
                    </button>
                  ) : null}
                </div>
              </div>
              {sourceSyncError ? (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {sourceSyncError}
                </div>
              ) : null}
              {sourceSyncSummary?.payload ? (
                <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
                  <div>case_id: <span className="font-mono text-zinc-200">{sourceSyncSummary.case_id}</span></div>
                  <div>summary: <span className="font-mono text-zinc-500">{sourceSyncSummary.source_rel}</span></div>
                  <div>raw_root: <span className="font-mono text-zinc-500">{sourceSyncSummary.payload.raw_root || 'missing'}</span></div>
                  <div>
                    total_files:{' '}
                    <span className="font-mono text-zinc-200">{sourceSyncSummary.payload.total_files ?? 0}</span>
                  </div>
                  <div>
                    graphify:{' '}
                    <span className="font-mono text-zinc-200">
                      {sourceSyncSummary.payload.graphify_sidecar?.status || 'missing'}
                    </span>
                  </div>
                  <div>
                    top types:{' '}
                    <span className="font-mono text-zinc-500">
                      {Object.entries(sourceSyncSummary.payload.type_counts || {})
                        .slice(0, 4)
                        .map(([key, value]) => `${key} ${value}`)
                        .join(' · ') || 'none'}
                    </span>
                  </div>
                  <div>
                    top categories:{' '}
                    <span className="font-mono text-zinc-500">
                      {Object.entries(sourceSyncSummary.payload.category_counts || {})
                        .slice(0, 4)
                        .map(([key, value]) => `${key} ${value}`)
                        .join(' · ') || 'none'}
                    </span>
                  </div>
                  {Array.isArray(sourceSyncSummary.payload.topology_models) && sourceSyncSummary.payload.topology_models.length > 0 ? (
                    <div>
                      topology:{' '}
                      <span className="font-mono text-zinc-500">
                        {sourceSyncSummary.payload.topology_models
                          .slice(0, 2)
                          .map((item) => item.path)
                          .join(' · ')}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-zinc-500">
                  当前案例尚未生成 `source_summary.latest.json`；可点击“运行 Source Sync”生成。
                </div>
              )}
            </div>
            {feasibilityError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {feasibilityError}
              </div>
            )}
            {feasibility?.methodology_note_zh && (
              <div className="mt-4 rounded-xl border border-teal-500/20 bg-zinc-950/50 p-4">
                <div className="text-[11px] font-medium text-teal-200">方法论（求交，非单一路径）</div>
                <p className="mt-2 text-[11px] leading-5 text-zinc-400">{feasibility.methodology_note_zh}</p>
                {feasibility.rules_path && (
                  <div className="mt-2 text-[10px] text-slate-600">规则文件 {feasibility.rules_path}</div>
                )}
                {feasibility.source_import_session?.present ? (
                  <div className="mt-2 text-[10px] text-teal-200/80">
                    import_session {feasibility.source_import_session.source_mode || '—'} · records{' '}
                    {feasibility.source_import_session.record_count ?? '—'} · {feasibility.source_import_session.imported_at || '—'}
                  </div>
                ) : null}
                {feasibility.signals && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(feasibility.signals).map(([k, v]) => (
                      <span
                        key={k}
                        className={`rounded border px-2 py-0.5 text-[10px] ${
                          v
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-900/80 text-zinc-500'
                        }`}
                      >
                        {projectCenterSignalLabels[k] || k}:{v ? '有' : '无'}
                      </span>
                    ))}
                  </div>
                )}
                {Array.isArray(feasibility.workflows) && feasibility.workflows.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left text-[10px] text-zinc-400">
                      <thead>
                        <tr className="border-b border-zinc-800/60 text-zinc-500">
                          <th className="py-1.5 pr-2 font-medium">workflow</th>
                          <th className="py-1.5 pr-2 font-medium">就绪层级</th>
                          <th className="py-1.5 pr-2 font-medium">命中信号</th>
                          <th className="py-1.5 font-medium">说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feasibility.workflows.map((row) => (
                          <tr key={row.key} className="border-b border-slate-800/80">
                            <td className="py-1.5 pr-2 align-top font-mono text-zinc-200">{row.key}</td>
                            <td className="py-1.5 pr-2 align-top text-zinc-300">
                              {projectCenterFeasibilityTierLabels[row.tier] || row.tier}
                            </td>
                            <td className="py-1.5 pr-2 align-top text-zinc-500">
                              {Array.isArray(row.matched_signals) && row.matched_signals.length > 0
                                ? row.matched_signals.map((s) => projectCenterSignalLabels[s] || s).join(' · ')
                                : '—'}
                            </td>
                            <td className="py-1.5 align-top text-zinc-500">
                              <span className="line-clamp-2" title={row.description}>
                                {row.rule_note_zh || row.description}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
              </details>
            ) : (
              <div className="mt-4 rounded-xl border border-zinc-800/40 bg-zinc-950/25 p-3 text-[11px] text-zinc-400">
                当前角色默认隐藏平台分析、批量诊断与高级工具；如需进入完整平台视图，请切换到“设计”或“科研”角色工作台。
              </div>
            )}
          </section>
  );
}

export function ProjectCenterCaseListSection({ projectCenterInfoTab, setProjectCenterInfoTab, setShowCaseScaffold, activeProject, activeProjectId, setActiveProjectId, openCaseEditor, runDeriveCase, runArchiveCase, text, projectCenterStatusMeta, cases, loading: projectsLoading, refresh }) {
  const refreshCaseRegistry = refresh || (() => {});
  const dynamicProjects = cases || [];
  const showCasePanel = projectCenterInfoTab === 'case';
  const showCatalogPanel = projectCenterInfoTab === 'catalog';
  return (
    <section data-testid="project-center-case-list" className="rounded-2xl border border-zinc-800/50 bg-slate-800/40">
              <div className="flex items-center justify-between border-b border-zinc-800/50 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">工程与案例</h2>
                  <p className="mt-1 text-xs text-zinc-500">围绕当前项目阶段、案例与主链任务组织</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshCaseRegistry()}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-slate-800/50"
                  >
                    刷新案例列表
                  </button>
                  <button
                    type="button"
                    data-testid="registry-case-scaffold-open"
                    onClick={() => setShowCaseScaffold(true)}
                    className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                  >
                    新建案例骨架
                  </button>
                </div>
              </div>
              <div className="flex gap-2 border-b border-zinc-800/40 px-5 py-3">
                {[
                  { key: 'case', label: '当前案例' },
                  { key: 'catalog', label: '全部案例' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    data-testid={`project-center-info-tab-${tab.key}`}
                    id={`project-center-info-tab-${tab.key}`}
                    aria-controls={`project-center-info-panel-${tab.key}`}
                    aria-selected={projectCenterInfoTab === tab.key}
                    aria-pressed={projectCenterInfoTab === tab.key}
                    onClick={() => setProjectCenterInfoTab(tab.key)}
                    className={`rounded-full border px-3 py-1 text-[11px] ${
                      projectCenterInfoTab === tab.key
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
                        : 'border-zinc-800/50 bg-zinc-900/50 text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                id="project-center-info-panel-case"
                role="tabpanel"
                aria-labelledby="project-center-info-tab-case"
                aria-hidden={!showCasePanel}
                hidden={!showCasePanel}
                data-testid="project-center-info-panel-case"
                className="px-5 py-4"
              >
                  <div
                    data-testid="case-row"
                    data-case-id={activeProject.caseId}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-900/40 px-4 py-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-100">{activeProject.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {activeProject.id} · {activeProject.caseId} · 当前工作案例
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
                        当前案例
                      </span>
                      <button
                        type="button"
                        onClick={() => openCaseEditor(activeProject.caseId)}
                        className="text-xs text-zinc-500 underline decoration-slate-600 decoration-dotted hover:text-fuchsia-300"
                      >
                        内编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => runDeriveCase(activeProject.caseId)}
                        className="text-xs text-zinc-500 underline decoration-slate-600 decoration-dotted hover:text-amber-300"
                      >
                        派生
                      </button>
                      <button
                        type="button"
                        onClick={() => runArchiveCase(activeProject.caseId)}
                        className="text-xs text-zinc-500 underline decoration-slate-600 decoration-dotted hover:text-rose-300"
                        >
                          归档
                        </button>
                    </div>
                  </div>
              </div>
              <div
                id="project-center-info-panel-catalog"
                role="tabpanel"
                aria-labelledby="project-center-info-tab-catalog"
                aria-hidden={!showCatalogPanel}
                hidden={!showCatalogPanel}
                data-testid="project-center-info-panel-catalog"
                className="divide-y divide-slate-700/40"
              >
                  {projectsLoading ? (
                    <div className="px-5 py-4 text-sm text-zinc-500">正在动态扫描工程目录...</div>
                  ) : dynamicProjects.map((project) => (
                    <div
                      key={project.id}
                      data-testid="case-row"
                      data-case-id={project.caseId}
                      className="flex items-center justify-between px-5 py-4"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-100">{project.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {project.id} · {project.caseId} · 阶段 {project.stage}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] ${
                            projectCenterStatusMeta[project.status]?.className || projectCenterStatusMeta.active.className
                          }`}
                        >
                          {projectCenterStatusMeta[project.status]?.label || projectCenterStatusMeta.active.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveProjectId(project.id)}
                          className={`text-xs ${activeProjectId === project.id ? 'text-emerald-300' : 'text-hydro-300'}`}
                        >
                          {activeProjectId === project.id ? '当前案例' : '切换'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProjectId(project.id);
                            openCaseEditor(project.caseId);
                          }}
                          className="text-xs text-zinc-500 underline decoration-slate-600 decoration-dotted hover:text-fuchsia-300"
                        >
                          内编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => runDeriveCase(project.caseId)}
                          className="text-xs text-zinc-500 underline decoration-slate-600 decoration-dotted hover:text-amber-300"
                        >
                          派生
                        </button>
                        <button
                          type="button"
                          onClick={() => runArchiveCase(project.caseId)}
                          className="text-xs text-zinc-500 underline decoration-slate-600 decoration-dotted hover:text-rose-300"
                        >
                          归档
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
  );
}

export function ProjectCenterGlobalCaseManagerSection({ actionBusy, actionResult, actionError, scadaScenarioId, setScadaScenarioId, scadaQueryStart, setScadaQueryStart, scadaQueryEnd, setScadaQueryEnd, scadaSqlitePath, setScadaSqlitePath, isTauri, cases, activeProject, runtimeSnapshot, summary, parsedActionPayload, actionCommands, runScadaReplayCommand, bootstrapTriadMinimalCommand, runCaseAction, shellCaseId, gateLabel, gateClassName, text, openPath, revealPath, ProjectCenterActionMenu, caseSummaryLoading: caseSummaryLoadingProp, reloadCaseSummary: reloadCaseSummaryProp }) {
  const caseSummary = summary;
  const caseSummaryLoading = caseSummaryLoadingProp || false;
  const reloadCaseSummary = reloadCaseSummaryProp || (() => {});
  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">{shellCaseId || '当前案例'} 运行闭环</h2>
                  <div className="mt-2 text-xs text-zinc-500">
                    当前 phase: {runtimeSnapshot.phase || '未检测到'} · 当前步骤: {runtimeSnapshot.current_step || '无'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${gateClassName}`}>{gateLabel}</span>
                    <span className="rounded-full border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-300">
                      outputs {caseSummary.outcomes_generated}/{caseSummary.total_executed || caseSummary.total || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={actionBusy}
                    onClick={() => runCaseAction(actionCommands.runFast)}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 disabled:opacity-50"
                  >
                    Run Fast
                  </button>
                  <ProjectCenterActionMenu
                    label="更多动作"
                    items={[
                      {
                        key: 'run-full-review',
                        label: 'Run Full Review',
                        disabled: actionBusy,
                        onClick: () => runCaseAction(actionCommands.runFullReview),
                        className: 'border-zinc-700 bg-zinc-800 text-zinc-100',
                      },
                      {
                        key: 'delivery-pack',
                        label: 'Delivery Docs Pack',
                        disabled: actionBusy,
                        onClick: () => runCaseAction(actionCommands.generateDeliveryDocsPack),
                        className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
                        title: 'contracts/delivery_pack/<UTC>/ + delivery_pack.latest.json',
                      },
                    ]}
                  />
                </div>
              </div>
              <details className="mt-3 rounded-lg border border-zinc-800/40 bg-zinc-950/40">
                <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-zinc-300">
                  更多运行动作与交付细节
                </summary>
                <div className="border-t border-slate-800/70 px-3 py-3">
                  <div className="mb-3 flex flex-wrap gap-2">
                <button
                  disabled={actionBusy}
                  onClick={() => runCaseAction(actionCommands.refreshDashboard)}
                  className="rounded-lg border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-200 disabled:opacity-50"
                >
                  Refresh Dashboard
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => runCaseAction(actionCommands.buildReleasePack)}
                  className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-300 disabled:opacity-50"
                >
                  Build Release Pack
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => runCaseAction(actionCommands.retryFailed)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 disabled:opacity-50"
                >
                  Retry Failed
                </button>
                <button
                  onClick={() => {
                    reloadRuntime();
                    reloadCaseSummary();
                  }}
                  className="rounded-lg border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-300 hover:bg-slate-800/60"
                >
                  刷新摘要
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => runCaseAction(actionCommands.generateDeliveryDocsPackStrict)}
                  className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-2 py-1 text-[10px] text-emerald-200/80 disabled:opacity-50"
                  title="须签发 Gate 与 knowledge_lint 通过"
                >
                  Delivery Pack（严格）
                </button>
                <button
                  disabled={actionBusy || !bootstrapTriadMinimalCommand}
                  onClick={() => runCaseAction(bootstrapTriadMinimalCommand)}
                  className="rounded-lg border border-zinc-700/50 bg-slate-800/60 px-2 py-1 text-[10px] text-zinc-300 disabled:opacity-50"
                  title="双缺时写入最小 workflow_run / review_bundle / release_manifest 占位（带 _auto_generated）"
                >
                  补最小 triad 占位
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => runCaseAction(runScadaReplayCommand)}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300 disabled:opacity-50"
                >
                  Run SCADA Replay
                </button>
                  </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                <span className="text-slate-600">交付文档包</span>
                {caseSummaryLoading ? (
                  <span className="text-slate-600">摘要读取中…</span>
                ) : caseSummary.delivery_pack_pointer_rel ? (
                  <>
                    <span className="font-mono text-zinc-400">{caseSummary.delivery_pack_id || '—'}</span>
                    <span
                      className={
                        caseSummary.delivery_pack_eligible_at_last_pack
                          ? 'text-emerald-400/90'
                          : 'text-amber-400/90'
                      }
                    >
                      {caseSummary.delivery_pack_eligible_at_last_pack ? 'pack 时 eligible' : 'pack 时未 eligible'}
                    </span>
                    {caseSummary.delivery_latest_pack_rel ? (
                      <button
                        type="button"
                        disabled={!isTauri()}
                        onClick={() => openPath(caseSummary.delivery_latest_pack_rel)}
                        className="rounded border border-hydro-500/30 bg-hydro-500/10 px-2 py-0.5 text-hydro-300 disabled:opacity-50"
                      >
                        打开最新包
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={!isTauri()}
                      onClick={() => openPath(caseSummary.delivery_pack_pointer_rel)}
                      className="rounded border border-zinc-800/50 px-2 py-0.5 text-zinc-300 disabled:opacity-50"
                    >
                      指针 JSON
                    </button>
                    {caseSummary.delivery_latest_pack_rel ? (
                      <button
                        type="button"
                        disabled={!isTauri()}
                        onClick={() => revealPath(caseSummary.delivery_latest_pack_rel)}
                        className="rounded border border-zinc-800/50 px-2 py-0.5 text-zinc-300 disabled:opacity-50"
                      >
                        定位最新包
                      </button>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-600">尚无指针；点上方「Delivery Docs Pack」生成</span>
                )}
              </div>
                </div>
              </details>
              <details className="mt-3 rounded-lg border border-cyan-500/20 bg-zinc-950/40">
                <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-cyan-200">SCADA 回放参数与实时面板</summary>
                <div className="border-t border-slate-800/70 p-3">
              <div className="rounded-lg border border-cyan-500/20 bg-zinc-950/40 p-3">
                <div className="text-[10px] text-zinc-500">
                  SCADA 回放参数：scenario-id 留空则由 Hydrology 配置解析（defaults + 案例 scada_replay）；起止时间与 sqlite 留空同上
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                    <span className="text-zinc-500">scenario-id</span>
                    <input
                      value={scadaScenarioId}
                      onChange={(e) => setScadaScenarioId(e.target.value)}
                      className="rounded border border-zinc-800/60 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-200"
                      placeholder="留空=配置默认（如 replay_baseline）"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                    <span className="text-zinc-500">sqlite 路径（相对仓库根，可选）</span>
                    <input
                      value={scadaSqlitePath}
                      onChange={(e) => setScadaSqlitePath(e.target.value)}
                      className="rounded border border-zinc-800/60 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-200"
                      placeholder={shellCaseId ? `cases/${shellCaseId}/${shellCaseId}_hydromind.sqlite3` : 'cases/<case_id>/<case_id>_hydromind.sqlite3'}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                    <span className="text-zinc-500">query-start（可选）</span>
                    <input
                      value={scadaQueryStart}
                      onChange={(e) => setScadaQueryStart(e.target.value)}
                      className="rounded border border-zinc-800/60 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-200"
                      placeholder="2021-07-10 00:00:00"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                    <span className="text-zinc-500">query-end（可选）</span>
                    <input
                      value={scadaQueryEnd}
                      onChange={(e) => setScadaQueryEnd(e.target.value)}
                      className="rounded border border-zinc-800/60 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-200"
                      placeholder="2021-07-13 00:00:00"
                    />
                  </label>
                </div>
              </div>
                </div>
              </details>
              {actionError && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {actionError}
                </div>
              )}
              {actionResult && (
                <details className="mt-3 rounded-lg border border-zinc-800/40 bg-zinc-950/60">
                  <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-zinc-300">
                    查看最近一次动作回执
                  </summary>
                  <div className="border-t border-slate-800/70 px-3 py-3 text-[11px] leading-5 text-zinc-400">
                    <div>command: {actionResult.command}</div>
                    <div>status: {actionResult.status} · success: {String(actionResult.success)}</div>
                    <div className="mt-1 whitespace-pre-wrap">stdout: {(actionResult.stdout || '').slice(0, 260)}</div>
                    <div className="mt-1 whitespace-pre-wrap">stderr: {(actionResult.stderr || '').slice(0, 160)}</div>
                  </div>
                </details>
              )}
              <details className="mt-4 rounded-lg border border-zinc-800/40 bg-zinc-950/40">
                <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-zinc-300">运行统计与待处理项</summary>
                <div className="border-t border-slate-800/70 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                  <div className="text-xs text-zinc-500">唯一执行 workflow</div>
                  <div className="mt-2 text-xl font-semibold text-slate-100">{caseSummary.total_executed || '--'}</div>
                  <div className="mt-1 text-xs text-zinc-500">原始记录 {caseSummary.total || '--'} 条</div>
                </div>
                <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                  <div className="text-xs text-zinc-500">Outcome Coverage</div>
                  <div className="mt-2 text-xl font-semibold text-slate-100">
                    {caseSummary.normalized_outcome_coverage ? `${Math.round(caseSummary.normalized_outcome_coverage * 100)}%` : '--'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    原始口径 {caseSummary.raw_outcome_coverage ? `${Math.round(caseSummary.raw_outcome_coverage * 100)}%` : '--'}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-zinc-200">SCADA Replay 实时面板</div>
                  <span className="text-[10px] text-zinc-500">
                    {parsedActionPayload?.action === 'run-scada-replay' ? 'latest run loaded' : '等待回放任务'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  run_id: {parsedActionPayload?.run_id || '--'} · scenario: {parsedActionPayload?.scenario_id || '--'} · messages:{' '}
                  {parsedActionPayload?.messages_emitted ?? '--'}
                  {parsedActionPayload?.cli_override ? ' · CLI 覆盖' : ''}
                </div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                  window: {parsedActionPayload?.query_start || '—'} → {parsedActionPayload?.query_end || '—'}
                  <br />
                  sqlite: {parsedActionPayload?.sqlite_path || '—'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => openPath(`cases/${shellCaseId}/contracts/scada_replay.latest.json`)}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300"
                  >
                    打开回放摘要
                  </button>
                  <button
                    onClick={() => openPath(`cases/${shellCaseId}/contracts/scada_replay.stream.ndjson`)}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300"
                  >
                    打开实时消息流
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  {
                    title: '当前运行焦点',
                    detail: caseSummary.current_workflow || runtimeSnapshot.current_focus || '当前没有活动 workflow，进入验收与回放阶段。',
                  },
                  {
                    title: '重复执行提示',
                    detail: caseSummary.duplicate_runs.length > 0
                      ? caseSummary.duplicate_runs.map((item) => `${item.workflow} ×${item.count}`).join('，')
                      : '没有检测到重复 workflow 记录。',
                  },
                  {
                    title: '待处理项',
                    detail: caseSummary.pending_workflows.length > 0
                      ? caseSummary.pending_workflows.join('，')
                      : '当前没有 pending workflows，可以转入交付/对齐阶段。',
                  },
                ].map((run) => (
                  <div key={run.title} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-zinc-200">{run.title}</div>
                      <span className="text-[10px] text-zinc-500">{activeProject.caseId}</span>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-zinc-400">{run.detail}</div>
                  </div>
                ))}
              </div>
                </div>
              </details>
            </section>
  );
}
