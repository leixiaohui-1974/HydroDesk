import {
  ReviewActionButton,
  ReviewActionGroup,
  ReviewActionMenu,
} from './ReviewSharedCards';
import { getModelStrategyMeta } from '../../config/uiMeta';

export function ReviewHeroSection({
  activeProject,
  heroStats,
  navigate,
  primaryAgent,
  roleTemplate,
}) {
  return (
    <section className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/95 to-hydro-900/30 p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
            当前角色 · {roleTemplate.label}
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-100">审查交付工作台</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">面向当前案例的审查、签发与交付。</p>
          <details className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/35 px-3 py-2 text-xs text-slate-300">
            <summary className="cursor-pointer list-none">阅读偏好</summary>
            <div className="mt-2 text-[11px] text-slate-400">{roleTemplate.readingHabits.join(' -> ')}</div>
          </details>
        </div>
        <div className="w-56 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-3">
          <button
            type="button"
            onClick={() => navigate('/docs#page-review')}
            className="mb-3 rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300"
          >
            查看本页说明
          </button>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">当前主智能体</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{primaryAgent.name}</div>
            </div>
            <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300">
              {activeProject.caseId}
            </span>
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-400 line-clamp-2">{activeProject.name}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4">
        <div className="grid grid-cols-4 gap-4">
          {heroStats.map((item) => (
            <div key={item.label}>
              <div className="text-xl font-semibold text-slate-100">{item.value ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">先处理待确认，再下钻交付物。</div>
      </div>
    </section>
  );
}

export function ReviewActionCenter({
  reviewAdvancedActions,
  reviewBatchActions,
  reviewDiagnosticActions,
  reviewPrimaryActions,
}) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">审查动作中心</h2>
          <p className="mt-1 text-sm text-slate-400">主签发动作优先，其余入口已菜单化。</p>
        </div>
        <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
          已菜单化
        </span>
      </div>
      <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-950/35 p-4">
        <ReviewActionGroup
          title="签发与交付"
          summary="围绕 triad、knowledge lint 与 delivery pack 的高频审查动作。"
          defaultOpen
        >
          {reviewPrimaryActions.slice(0, 2).map((action) => (
            <ReviewActionButton
              key={action.key}
              disabled={action.disabled}
              onClick={action.onClick}
              className={action.className}
            >
              {action.label}
            </ReviewActionButton>
          ))}
          <ReviewActionMenu label="更多签发动作" items={reviewPrimaryActions.slice(2)} />
        </ReviewActionGroup>
        <div className="mt-3 flex flex-wrap gap-2">
          <ReviewActionMenu label="当前案例诊断" items={reviewDiagnosticActions} />
          <ReviewActionMenu label="批量审查" items={reviewBatchActions} />
          <ReviewActionMenu label="高级入口" items={reviewAdvancedActions} />
        </div>
      </div>
    </section>
  );
}

export function ReviewWorkSection({
  backlogSections,
  caseContractSummary,
  caseContractSummaryLoading,
  contractSummaryBatch,
  contractSummaryBatchError,
  currentModelStrategyMeta,
  isTauri,
  knowledgeLintError,
  knowledgeLintLast,
  modelCapabilityItems,
  modelStrategy,
  modelStrategyBatch,
  modelStrategyBatchEntries,
  modelStrategyBatchError,
  modelStrategyError,
  openPath,
  pipelinePreflight,
  pipelinePreflightError,
  pipelineTruthClassName,
  shellCaseId,
  triadBootstrapError,
  triadBootstrapStdout,
  triadMeta,
  reviewBadgeStyles,
  reviewChecks,
}) {
  return (
    <section className="space-y-4">
      <details className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">统一签发 Gate（P2）</div>
              <div className="mt-1 text-xs text-slate-500">Triad、verification、closure、coverage 的统一签发摘要。</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
                triad / lint 操作已收纳到上方动作中心
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  caseContractSummary.release_gate_eligible
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                }`}
              >
                {caseContractSummaryLoading ? '加载中…' : caseContractSummary.release_gate_eligible ? '可签发' : '不可签发'}
              </span>
            </div>
          </div>
        </summary>
        {triadBootstrapError ? <p className="mt-2 text-[11px] text-rose-300/90">{triadBootstrapError}</p> : null}
        {triadBootstrapStdout ? (
          <pre className="mt-2 max-h-24 overflow-auto rounded border border-slate-800/80 bg-slate-950/80 p-2 font-mono text-[10px] text-slate-500">
            {triadBootstrapStdout}
          </pre>
        ) : null}
        {knowledgeLintError ? <p className="mt-2 text-[11px] text-rose-300/90">{knowledgeLintError}</p> : null}
        {knowledgeLintLast ? (
          <p className="mt-2 text-[11px] text-slate-500">
            知识壳 lint（当前案例）：{knowledgeLintLast.ok ? '通过' : '未通过'} · 相对断链 {knowledgeLintLast.broken_relative_link_count} · raw 目录
            {knowledgeLintLast.raw_dir_exists ? '有' : '无'}
            {knowledgeLintLast.errors?.length > 0 ? ` · ${knowledgeLintLast.errors.join(' · ')}` : ''}
          </p>
        ) : null}
        <div className="mt-3 grid gap-2 text-[11px] text-slate-500 md:grid-cols-3">
          <div>
            <span className="text-slate-600">Triad</span>{' '}
            <span className="font-mono text-slate-300">{caseContractSummary.triad_count ?? 0}/3</span>
            <span className={`ml-2 rounded-full border px-2 py-1 text-[10px] ${triadMeta.className}`}>{triadMeta.label}</span>
          </div>
          <div>
            <span className="text-slate-600">coverage gate</span>{' '}
            <span className="font-mono text-slate-300">{caseContractSummary.gate_status || 'unknown'}</span>
          </div>
          <div>
            <span className="text-slate-600">closure</span>{' '}
            <span className="font-mono text-slate-300">{caseContractSummary.closure_check_passed ? 'ok' : 'fail/缺报告'}</span>
          </div>
          <div>
            <span className="text-slate-600">pipeline truth</span>{' '}
            <span className={`rounded-full border px-2 py-1 text-[10px] ${pipelineTruthClassName}`}>
              {caseContractSummary.pipeline_contract_ready ? 'ready' : 'not_ready'}
            </span>
          </div>
          <div>
            <span className="text-slate-600">canonical/bridge</span>{' '}
            <span className="font-mono text-slate-300">
              {caseContractSummary.triad_canonical_count ?? 0}/{caseContractSummary.triad_bridge_fallback_count ?? 0}
            </span>
          </div>
        </div>
        <div className="mt-2 space-y-1 font-mono text-[10px] leading-5 text-slate-600 break-all">
          <div>triad_real: {caseContractSummary.triad_real_count ?? 0} · triad_placeholder: {caseContractSummary.triad_placeholder_count ?? 0}</div>
          <div>
            triad_canonical: {caseContractSummary.triad_canonical_count ?? 0} · triad_bridge_fallback: {caseContractSummary.triad_bridge_fallback_count ?? 0}
          </div>
          <div>
            pipeline_minimal_contract_ready: {caseContractSummary.pipeline_minimal_contract_ready ? 'true' : 'false'} · pipeline_contract_ready:{' '}
            {caseContractSummary.pipeline_contract_ready ? 'true' : 'false'}
          </div>
          <div>workflow_run: {caseContractSummary.triad_workflow_run_rel || '—'}</div>
          <div>review_bundle: {caseContractSummary.triad_review_bundle_rel || '—'}</div>
          <div>release_manifest: {caseContractSummary.triad_release_manifest_rel || '—'}</div>
        </div>
        {(caseContractSummary.release_gate_blockers || []).length > 0 ? (
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-amber-200/90">
            {caseContractSummary.release_gate_blockers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : !caseContractSummaryLoading ? (
          <p className="mt-3 text-xs text-emerald-200/80">当前规则下阻断项为空（仍建议人工复核 Notebook / Memo）。</p>
        ) : null}
      </details>

      <details className="rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">更多审查项</div>
              <div className="mt-1 text-xs text-slate-500">模型判型、批量分布、bridge backlog 与 preflight 统一后置。</div>
            </div>
            <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
              {modelStrategyBatch?.case_ids?.length || 0} cases
            </span>
          </div>
        </summary>
        <details className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">当前案例模型判型</div>
                <div className="mt-1 text-xs text-slate-500">查看当前案例应建模型与阻断项。</div>
              </div>
              {modelStrategy?.strategy_key ? (
                <span className={`rounded-full border px-3 py-1 text-[10px] ${currentModelStrategyMeta.className}`}>
                  {currentModelStrategyMeta.label}
                </span>
              ) : null}
            </div>
          </summary>
          {modelStrategyError ? <p className="mt-2 text-[11px] text-rose-300/90">{modelStrategyError}</p> : null}
          {modelStrategy ? (
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">{modelStrategy.display_name || '—'}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  case <span className="font-mono text-slate-400">{modelStrategy.case_id || shellCaseId}</span>
                  {' · '}strategy_key <span className="font-mono text-slate-400">{modelStrategy.strategy_key || '—'}</span>
                </div>
              </div>
              <p className="text-[11px] leading-5 text-slate-400">{modelStrategy.rationale || '—'}</p>
              <div className="grid gap-3 md:grid-cols-3">
                {modelCapabilityItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className={`mt-2 text-sm font-semibold ${item.ok ? 'text-emerald-300' : 'text-slate-300'}`}>
                      {item.ok ? '当前应建' : '当前暂不建'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500">当前案例尚未加载模型判型摘要。</p>
          )}
        </details>

        <details className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-950/10 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">六案例模型判型分布</div>
                <div className="mt-1 text-xs text-slate-500">查看六案例全局判型分布。</div>
              </div>
              <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
                {modelStrategyBatch?.case_ids?.length || 0} cases
              </span>
            </div>
          </summary>
          {modelStrategyBatchError ? <p className="mt-2 text-[11px] text-rose-300/90">{modelStrategyBatchError}</p> : null}
          {modelStrategyBatch ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {modelStrategyBatchEntries.map(([key, count]) => {
                  const meta = getModelStrategyMeta(key);
                  return (
                    <span key={key} className={`rounded-full border px-3 py-1 ${meta.className}`}>
                      {meta.label} {count}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500">当前尚未加载六案例模型判型分布。</p>
          )}
        </details>

        <details className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Bridge Migration Backlog</div>
                <div className="mt-1 text-xs text-slate-500">查看 canonical/bridge 差异与 backlog case。</div>
              </div>
              <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">backlog 已后置</span>
            </div>
          </summary>
          {contractSummaryBatchError ? <p className="mt-2 text-[11px] text-rose-300/90">{contractSummaryBatchError}</p> : null}
          {contractSummaryBatch ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-slate-700/50 px-3 py-1 text-slate-300">total {contractSummaryBatch.counts.total}</span>
                <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-amber-200">
                  bridge fallback {contractSummaryBatch.counts.bridgeFallback}
                </span>
                <span className="rounded-full border border-rose-500/35 bg-rose-500/10 px-3 py-1 text-rose-200">
                  pipeline blocked {contractSummaryBatch.counts.pipelineBlocked}
                </span>
                <span className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                  final report {contractSummaryBatch.counts.finalReportPresent}/{contractSummaryBatch.counts.total}
                </span>
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  推广 release-ready {contractSummaryBatch.counts.promotionReleaseReady}
                </span>
                <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-amber-200">
                  推广 needs-review {contractSummaryBatch.counts.promotionNeedsReview}
                </span>
                <span className="rounded-full border border-rose-500/35 bg-rose-500/10 px-3 py-1 text-rose-200">
                  推广 blocked {contractSummaryBatch.counts.promotionBlocked}
                </span>
              </div>
              {contractSummaryBatch.truthRollup?.completion?.summary ? (
                <div className="rounded-xl border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-[11px] text-slate-400">
                  {contractSummaryBatch.truthRollup.completion.summary}
                  {' '}case-scope {contractSummaryBatch.counts.caseScopedAcceptance}
                  {' · '}rollout-scope {contractSummaryBatch.counts.rolloutScopedAcceptance}
                </div>
              ) : null}
              {backlogSections.map((section) => (
                <div key={section.key} className="rounded-xl border border-slate-700/40 bg-slate-950/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{section.title}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{section.note}</div>
                    </div>
                    <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
                      {section.rows.length} cases
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500">当前尚未加载六案例 canonical migration backlog。</p>
          )}
        </details>

        <details className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Case Pipeline Preflight</div>
                <div className="mt-1 text-xs text-slate-500">查看入口缺口与建模建议。</div>
              </div>
              <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">preflight 已后置</span>
            </div>
          </summary>
          {pipelinePreflightError ? <p className="mt-2 text-[11px] text-rose-300/90">{pipelinePreflightError}</p> : null}
          {pipelinePreflight ? (
            <div className="mt-3 space-y-2 text-[11px] text-slate-400">
              <div>
                phase <span className="font-mono text-slate-300">{pipelinePreflight.phase || '—'}</span>
                {' '}· ok <span className="font-mono text-slate-300">{String(Boolean(pipelinePreflight.ok))}</span>
              </div>
              <div>
                missing_inputs:{' '}
                <span className="font-mono text-slate-300">{(pipelinePreflight.missing_inputs || []).join(', ') || 'none'}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500">当前案例尚未加载 preflight。</p>
          )}
        </details>
      </details>

      <details className="rounded-2xl border border-slate-700/40 bg-slate-900/30 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">审查检查项</summary>
        <div className="mt-4 space-y-3">
          {reviewChecks.map((check) => (
            <div key={check.name} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-100">{check.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{check.note}</div>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] ${reviewBadgeStyles[check.status]}`}>
                  {check.status === 'passed' ? '通过' : check.status === 'warning' ? '警告' : '待确认'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
