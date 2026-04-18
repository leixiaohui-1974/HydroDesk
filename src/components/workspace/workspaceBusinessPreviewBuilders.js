import { buildPreviewSection, tryParsePreviewJson } from './workspacePreviewUtils.js';

export function buildContractBusinessPreview({
  previewContent,
  title,
  description,
  stage,
  status,
  canonicalPath,
  bridgePath,
  triadLabel,
  pipelineReady,
  currentWorkflow,
  relatedAssets = [],
  reviewSignal = null,
  releaseSignal = null,
}) {
  const sections = [
    buildPreviewSection('合同状态', [
      { label: 'stage', value: stage },
      { label: 'status', value: status },
      { label: 'canonical', value: canonicalPath || '—' },
      { label: 'bridge', value: bridgePath || '—' },
    ]),
    buildPreviewSection('Triad / Gate', [
      { label: 'triad', value: triadLabel || '—' },
      { label: 'pipeline', value: pipelineReady ? 'ready' : 'not_ready' },
      { label: 'current_workflow', value: currentWorkflow || '—' },
    ]),
    buildPreviewSection(
      '关联资产',
      relatedAssets.map((asset) => ({
        label: asset.label,
        value: asset.value,
      })),
    ),
    reviewSignal
      ? buildPreviewSection('审查信号', [
          { label: 'evidence', value: reviewSignal.evidence ?? '—' },
          { label: 'schema', value: reviewSignal.schema ?? '—' },
          { label: 'gate', value: reviewSignal.gate || 'pending' },
        ])
      : null,
    releaseSignal
      ? buildPreviewSection('交付信号', [
          { label: 'delivery_pack_id', value: releaseSignal.deliveryPackId || '—' },
          { label: 'delivery_latest_pack', value: releaseSignal.deliveryLatestPack || '—' },
          { label: 'delivery_pointer', value: releaseSignal.deliveryPointer || '—' },
        ])
      : null,
  ].filter(Boolean);

  return {
    kind: 'business',
    title,
    description,
    badges: [stage, status, 'contract'],
    sections,
    rawContent: previewContent,
  };
}

export function buildOutcomeCoverageBusinessPreview({
  previewContent,
  title = 'Outcome Coverage Report 业务预览',
  description,
  badges = [],
  normalizedCoverage = null,
  rawCoverage = null,
  schemaValidCount = null,
  evidenceBoundCount = null,
  status,
  deliveryPackId,
  explanation,
}) {
  const parsed = tryParsePreviewJson(previewContent);
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('Coverage', [
        {
          label: 'normalized',
          value: normalizedCoverage != null ? `${Math.round(normalizedCoverage * 100)}%` : '—',
        },
        {
          label: 'raw',
          value: rawCoverage != null ? `${Math.round(rawCoverage * 100)}%` : '—',
        },
        { label: 'schema_valid', value: schemaValidCount ?? '—' },
        { label: 'evidence_bound', value: evidenceBoundCount ?? '—' },
      ]),
      buildPreviewSection('报告状态', [
        { label: 'status', value: status || parsed?.status || parsed?.summary?.status || '—' },
        { label: 'delivery_pack', value: deliveryPackId || '—' },
      ]),
      explanation
        ? buildPreviewSection('当前解释', [{ label: 'meaning', value: explanation }])
        : null,
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildVerificationBusinessPreview({
  previewContent,
  title = 'Verification Report 业务预览',
  description,
  badges = [],
  status,
  gate,
  pipelineReady,
  triadLabel,
  currentWorkflow,
  outputs,
  explanation,
}) {
  const parsed = tryParsePreviewJson(previewContent);
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('验收状态', [
        { label: 'status', value: status || parsed?.status || parsed?.summary?.status || '—' },
        { label: 'gate', value: gate || 'pending' },
        { label: 'pipeline', value: pipelineReady ? 'ready' : 'not_ready' },
        { label: 'triad', value: triadLabel || '—' },
      ]),
      buildPreviewSection('验证线索', [
        { label: 'current_workflow', value: currentWorkflow || '—' },
        { label: 'outputs', value: outputs || '—' },
        {
          label: 'top_level_keys',
          value: parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 8).join(', ') : '—',
        },
      ]),
      explanation
        ? buildPreviewSection('当前解释', [{ label: 'meaning', value: explanation }])
        : null,
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildLiveDashboardBusinessPreview({
  previewContent,
  title = 'Live Dashboard 业务预览',
  description,
  badges = [],
  path,
  currentWorkflow,
  gate,
  workspaceStage,
  outputs,
  taskTitle,
  explanation,
}) {
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('实时看板', [
        { label: 'path', value: path || '—' },
        { label: 'current_workflow', value: currentWorkflow || '—' },
        { label: 'gate', value: gate || 'pending' },
        { label: 'task', value: taskTitle || '—' },
      ]),
      buildPreviewSection('运行上下文', [
        { label: 'workspace_stage', value: workspaceStage || '—' },
        { label: 'outputs', value: outputs || '—' },
        { label: 'next', value: explanation || '更适合边运行边看当前链路。' },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildControlValidationBusinessPreview({
  previewContent,
  title = '控制验证收口',
  description = 'canonical control/SIL/ODD 收口摘要',
}) {
  const parsed = tryParsePreviewJson(previewContent) || {};
  const summary = parsed.summary || {};
  const control = parsed.control || {};
  const sil = parsed.sil || {};
  const odd = parsed.odd || {};

  return {
    kind: 'business',
    title,
    description,
    badges: ['control-validation', summary.overall_status || 'unknown'],
    sections: [
      buildPreviewSection('总览', [
        { label: 'case_id', value: parsed.case_id || '—' },
        { label: 'overall_status', value: summary.overall_status || '—' },
        { label: 'review_verdict', value: summary.review_verdict || '—' },
        { label: 'generated_at', value: parsed.generated_at || '—' },
      ]),
      buildPreviewSection('控制执行', [
        { label: 'controller_backend', value: control.controller_backend || '—' },
        { label: 'physics_backend', value: control.physics_backend || '—' },
        { label: 'pass_rate', value: control.pass_rate != null ? `${Math.round(control.pass_rate * 100)}%` : '—' },
        { label: 'failed_tests', value: control.failed_tests ?? '—' },
      ]),
      buildPreviewSection('SIL / ODD', [
        { label: 'pass_rate', value: sil.pass_rate != null ? `${Math.round(sil.pass_rate * 100)}%` : '—' },
        { label: 'scenario_count', value: sil.scenario_count ?? '—' },
        { label: 'odd_status', value: odd.status || '—' },
        { label: 'validated_in_simulation', value: odd.validated_in_simulation ? 'yes' : 'no' },
      ]),
      buildPreviewSection('ODD 细节', [
        { label: 'transition_count', value: odd.transition_count ?? '—' },
        { label: 'boundary_condition_count', value: odd.boundary_condition_count ?? '—' },
        { label: 'match_rate', value: odd.match_rate != null ? `${Math.round(odd.match_rate * 100)}%` : '—' },
      ]),
      Array.isArray(summary.blockers) && summary.blockers.length
        ? buildPreviewSection(
            '阻塞项',
            summary.blockers.map((item, index) => ({
              label: `blocker_${index + 1}`,
              value: item,
            })),
          )
        : null,
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildFinalReportBusinessPreview({
  previewContent,
  title = '最终报告对象',
  description = '统一收束 readiness、review/release 结论与关键业务指标的 final report 合同',
  acceptanceScope = '',
  acceptanceSource = '',
}) {
  const parsed = tryParsePreviewJson(previewContent) || {};
  const metrics = parsed.business_metrics || {};
  const review = parsed.review || {};
  const release = parsed.release || {};
  const releaseBoard = parsed.readiness?.release_board || {};
  const promo = parsed.governance?.promotion_semantics || {};
  const assertions = Array.isArray(parsed.assertions) ? parsed.assertions : [];
  const assertionSummary = parsed.assertion_summary || {};
  const acceptanceAssertion = assertions.find((item) => item?.key === 'release_gate_not_blocked') || {};
  const fromProp = String(acceptanceScope || '').trim();
  const fromDoc = typeof parsed.acceptance_scope === 'string' ? parsed.acceptance_scope.trim() : '';
  const resolvedAcceptanceScope = fromProp || fromDoc || 'missing';
  const resolvedAcceptanceSource = acceptanceSource || parsed.acceptance_source || '—';
  const scopeHint =
    resolvedAcceptanceScope === 'case'
      ? '该 final report 仅代表当前 case，不等价于六案例整体完成。'
      : resolvedAcceptanceScope === 'rollout'
        ? '该 final report 对应 rollout 范围，可用于整体发布判断。'
        : '当前尚未声明验收范围。';

  return {
    kind: 'business',
    title,
    description,
    badges: ['final-report', parsed.overall_status || 'unknown'],
    sections: [
      buildPreviewSection('当前案例', [
        { label: 'case_id', value: parsed.case_id || '—' },
        { label: 'review_verdict', value: review.verdict || '—' },
        { label: 'release_status', value: release.status || '—' },
        { label: 'readiness', value: releaseBoard.status || '—' },
      ]),
      buildPreviewSection('推广语义', [
        { label: 'semantic_lane', value: promo.semantic_lane || '—' },
        { label: 'label_zh', value: promo.labels?.zh || '—' },
        { label: 'manifest_observed', value: promo.observed_manifest_status || '—' },
        { label: 'release_board_gate_observed', value: promo.observed_release_board_gate_status || '—' },
        {
          label: 'consistency_notes',
          value:
            Array.isArray(promo.consistency_notes) && promo.consistency_notes.length
              ? JSON.stringify(promo.consistency_notes)
              : '—',
        },
      ]),
      buildPreviewSection('业务指标', [
        {
          label: 'coverage',
          value: metrics.normalized_outcome_coverage != null
            ? `${Math.round(metrics.normalized_outcome_coverage * 100)}%`
            : '—',
        },
        { label: 'outputs_generated', value: metrics.outcomes_generated ?? '—' },
        { label: 'schema_valid_count', value: metrics.schema_valid_count ?? '—' },
        { label: 'evidence_bound_count', value: metrics.evidence_bound_count ?? '—' },
      ]),
      buildPreviewSection('验收语义', [
        { label: 'status', value: parsed.overall_status || 'unknown' },
        { label: 'acceptance_scope', value: resolvedAcceptanceScope },
        { label: 'acceptance_source', value: resolvedAcceptanceSource },
        { label: 'acceptance_contract_source', value: acceptanceAssertion.source || '—' },
        { label: 'assertion_total', value: assertionSummary.total ?? assertions.length },
        { label: 'assertion_passed', value: assertionSummary.passed ?? '—' },
      ]),
      buildPreviewSection(
        '断言',
        assertions.map((item) => ({
          label: item.key || 'assertion',
          value: item.passed ? 'pass' : 'fail',
        })),
      ),
      buildPreviewSection('说明', [{ label: 'scope_note', value: scopeHint }]),
    ],
    rawContent: previewContent,
  };
}

export function buildDocumentNoteBusinessPreview({
  previewContent,
  title,
  description,
  badges = [],
  documentType,
  caseId,
  gate,
  reviewBundle,
  releaseManifest,
  deliveryPack,
  explanation,
  version,
  updatedBy,
}) {
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('文档角色', [
        { label: 'type', value: documentType || 'document' },
        { label: 'case_id', value: caseId || '—' },
        { label: 'gate', value: gate || 'pending' },
        { label: 'version', value: version || '—' },
        { label: 'updated_by', value: updatedBy || '—' },
      ]),
      buildPreviewSection('关联资产', [
        { label: 'review_bundle', value: reviewBundle || '—' },
        { label: 'release_manifest', value: releaseManifest || '—' },
        { label: 'delivery_pack', value: deliveryPack || '—' },
      ]),
      explanation
        ? buildPreviewSection('当前解释', [{ label: 'meaning', value: explanation }])
        : null,
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildManifestBusinessPreview({
  previewContent,
  title = 'Manifest 业务预览',
  description,
  badges = [],
  caseId,
  gate,
  triadLabel,
  pipelineReady,
  currentWorkflow,
  outputs,
  evidence,
  schema,
  workspaceStage,
  recommendation,
}) {
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('案例状态', [
        { label: 'case_id', value: caseId || '—' },
        { label: 'Gate', value: gate || 'pending' },
        { label: 'Triad', value: triadLabel || '—' },
        { label: 'Pipeline', value: pipelineReady ? 'ready' : 'not_ready' },
      ]),
      buildPreviewSection('运行信号', [
        { label: 'current_workflow', value: currentWorkflow || '—' },
        { label: 'outputs', value: outputs || '—' },
        { label: 'evidence', value: evidence ?? '—' },
        { label: 'schema', value: schema ?? '—' },
      ]),
      buildPreviewSection('当前判断', [
        { label: 'workspace_stage', value: workspaceStage || '—' },
        { label: 'next', value: recommendation || '—' },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildCaseDataIntelligenceBusinessPreview({
  previewContent,
  title = '数据智能规划',
  description = '资产画像、真实性风险与工作流规划摘要',
}) {
  const parsed = tryParsePreviewJson(previewContent) || {};
  const planning = parsed.workflow_planning || {};
  const authenticity = parsed.authenticity_summary || {};
  const learning = parsed.learning_strategy || {};
  const categories = parsed.asset_profile?.categories || {};
  return {
    kind: 'business',
    title,
    description,
    badges: ['data-intelligence', parsed.case_id || 'unknown'],
    sections: [
      buildPreviewSection('当前案例', [
        { label: 'case_id', value: parsed.case_id || '—' },
        { label: 'recommended', value: (planning.recommended_path || []).join(' · ') || '—' },
        { label: 'blocked', value: (planning.blocked_path || []).join(' · ') || '—' },
        { label: 'missing', value: (planning.missing_evidence || []).join('、') || '—' },
      ]),
      buildPreviewSection('真实性风险', [
        { label: 'direct_assets', value: authenticity.direct_assets ?? '—' },
        { label: 'review_required_assets', value: authenticity.review_required_assets ?? '—' },
        { label: 'configured_only_assets', value: authenticity.configured_only_assets ?? '—' },
        { label: 'missing_bundle_gaps', value: authenticity.missing_bundle_gaps ?? '—' },
      ]),
      buildPreviewSection('学习策略', [
        { label: 'parameter_learning', value: learning.parameter_learning?.status || '—' },
        { label: 'model_strategy_learning', value: learning.model_strategy_learning?.status || '—' },
        { label: 'model_change_advice', value: learning.model_change_advice?.status || '—' },
      ]),
      buildPreviewSection('资产画像', Object.entries(categories).map(([key, category]) => ({
        label: key,
        value: `${category?.asset_count ?? 0} assets`,
      }))),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildCaseManifestBusinessPreview({
  previewContent,
  title = 'Case Manifest 业务预览',
  description,
  badges = [],
  caseId,
  workspaceStage,
  deliveryPack,
  workflowRun,
  reviewBundle,
  releaseManifest,
  recommendation,
}) {
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('Case Shell', [
        { label: 'case_id', value: caseId || '—' },
        { label: 'workspace_stage', value: workspaceStage || '—' },
        { label: 'delivery_pack', value: deliveryPack || '—' },
      ]),
      buildPreviewSection('合同入口', [
        { label: 'workflow_run', value: workflowRun || '—' },
        { label: 'review_bundle', value: reviewBundle || '—' },
        { label: 'release_manifest', value: releaseManifest || '—' },
      ]),
      buildPreviewSection('当前建议', [
        { label: 'recommendation', value: recommendation || '—' },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildRuntimeLogBusinessPreview({
  previewContent,
  title = 'Runtime Log 业务预览',
  description,
  badges = [],
  caseId,
  task,
  resumePrompt,
  lineCount,
}) {
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('运行上下文', [
        { label: 'case_id', value: caseId || '—' },
        { label: 'task', value: task || '—' },
        { label: 'resume_prompt', value: resumePrompt || '—' },
        { label: 'lines', value: lineCount ?? '—' },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildRuntimeRunBusinessPreview({
  previewContent,
  title = 'Execution Run 业务预览',
  description,
  badges = [],
  workflow,
  caseId,
  pid,
  status,
  startedAt,
  logFile,
}) {
  return {
    kind: 'business',
    title,
    description,
    badges,
    sections: [
      buildPreviewSection('执行信息', [
        { label: 'workflow', value: workflow || '—' },
        { label: 'case_id', value: caseId || '—' },
        { label: 'pid', value: pid || '—' },
        { label: 'status', value: status || '—' },
        { label: 'started_at', value: startedAt || '—' },
        { label: 'log_file', value: logFile || '—' },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}
