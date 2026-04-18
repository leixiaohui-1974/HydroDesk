const AUTO_MODELING_CONTRACT_SOURCES = [
  {
    key: 'liveProgress',
    label: 'e2e_live_progress',
    pathsForCase: (caseId) => [`cases/${caseId}/contracts/e2e_live_progress.latest.json`],
  },
  {
    key: 'autorun',
    label: 'autonomy_autorun',
    pathsForCase: (caseId) => [
      `cases/${caseId}/contracts/autonomy_autorun.latest.json`,
      `cases/${caseId}/contracts/autonomy_autorun.contract.json`,
    ],
  },
  {
    key: 'assessment',
    label: 'autonomy_assessment',
    pathsForCase: (caseId) => [
      `cases/${caseId}/contracts/autonomy_assessment.latest.json`,
      `cases/${caseId}/contracts/autonomy_assessment.contract.json`,
    ],
  },
  {
    key: 'pipelineEvaluation',
    label: 'pipeline_evaluation',
    pathsForCase: (caseId) => [
      `cases/${caseId}/contracts/pipeline_evaluation.latest.json`,
      `cases/${caseId}/contracts/outcomes/pipeline.latest.json`,
    ],
  },
  {
    key: 'selfImproving',
    label: 'self_improving_pipeline',
    pathsForCase: (caseId) => [`cases/${caseId}/contracts/self_improving_pipeline.latest.json`],
  },
  {
    key: 'cascade',
    label: 'autonomous_cascade',
    pathsForCase: (caseId) => [
      `cases/${caseId}/contracts/autonomous_cascade_report.latest.json`,
      `cases/${caseId}/contracts/outcomes/cascade.latest.json`,
    ],
  },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatPercent(value) {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  const normalized = value > 1 ? value : value * 100;
  const rounded = normalized >= 99.95 ? Math.round(normalized) : Number(normalized.toFixed(1));
  return `${rounded}%`;
}

function formatScore(value) {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  return value.toFixed(4);
}

function pushUnique(items, value) {
  const text = String(value ?? '').trim();
  if (!text || items.includes(text)) {
    return;
  }
  items.push(text);
}

function extractPayloadCaseId(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  return String(
    payload.case_id ??
      payload.caseId ??
      payload.result?.case_id ??
      payload.result?.caseId ??
      payload.summary?.case_id ??
      '',
  ).trim();
}

function getCurrentWorkflow(summary, liveProgress) {
  return String(
    summary?.current_workflow ??
      liveProgress?.current?.workflow_key ??
      liveProgress?.current?.workflow ??
      '',
  ).trim();
}

function getCoverageValue(summary, liveProgress, pipelineEvaluation) {
  if (isFiniteNumber(summary?.normalized_outcome_coverage) && summary.normalized_outcome_coverage > 0) {
    return summary.normalized_outcome_coverage;
  }
  if (isFiniteNumber(liveProgress?.summary?.outcome_coverage) && liveProgress.summary.outcome_coverage > 0) {
    return liveProgress.summary.outcome_coverage;
  }
  if (isFiniteNumber(pipelineEvaluation?.coverage_pct) && pipelineEvaluation.coverage_pct > 0) {
    return pipelineEvaluation.coverage_pct;
  }
  return null;
}

function getScoreFacts(autorun, assessment) {
  const finalScore = autorun?.final_score ?? autorun?.final?.overall_score ?? assessment?.overall_score;
  const verdict = autorun?.final_verdict ?? autorun?.final?.verdict ?? assessment?.verdict ?? '';
  return {
    score: isFiniteNumber(finalScore) ? finalScore : null,
    verdict: String(verdict || '').trim(),
  };
}

function summarizeEvidenceSources(contractBundle) {
  return asArray(contractBundle?.evidenceSources).map((entry) => {
    if (entry.parseError) {
      return `${entry.label}: 解析失败`;
    }
    if (entry.found) {
      return `${entry.label}: ${entry.relPath}`;
    }
    return `${entry.label}: 暂无产物`;
  });
}

export function getAutoModelingContractReadPlan(caseId) {
  const normalizedCaseId = String(caseId ?? '').trim();
  if (!normalizedCaseId) {
    return [];
  }
  return AUTO_MODELING_CONTRACT_SOURCES.map((source) => ({
    key: source.key,
    label: source.label,
    relPaths: source.pathsForCase(normalizedCaseId),
  }));
}

export function parseAutoModelingLoopContractPayloads(caseId, rawEntries = []) {
  const normalizedCaseId = String(caseId ?? '').trim();
  const payloads = {};
  const issues = [];
  const evidenceSources = [];
  let hasRealData = false;

  for (const entry of rawEntries) {
    const key = String(entry?.key ?? '').trim();
    if (!key) {
      continue;
    }

    const relPath = String(entry?.relPath ?? entry?.relPaths?.[0] ?? '').trim();
    const text = typeof entry?.text === 'string' ? entry.text : null;
    payloads[key] = null;

    if (!text) {
      evidenceSources.push({
        key,
        label: entry?.label ?? key,
        relPath,
        found: false,
        parseError: false,
      });
      continue;
    }

    try {
      const parsed = JSON.parse(text);
      payloads[key] = parsed;
      hasRealData = true;

      const payloadCaseId = extractPayloadCaseId(parsed);
      if (normalizedCaseId && payloadCaseId && payloadCaseId !== normalizedCaseId) {
        issues.push({
          key,
          type: 'case_mismatch',
          message: `${entry?.label ?? key} 的 case_id=${payloadCaseId}，与当前 case_id=${normalizedCaseId} 不一致。`,
        });
      }

      evidenceSources.push({
        key,
        label: entry?.label ?? key,
        relPath,
        found: true,
        parseError: false,
      });
    } catch (error) {
      issues.push({
        key,
        type: 'parse_error',
        message: `${entry?.label ?? key} 解析失败：${error.message}`,
      });
      evidenceSources.push({
        key,
        label: entry?.label ?? key,
        relPath,
        found: true,
        parseError: true,
      });
    }
  }

  return {
    payloads,
    issues,
    evidenceSources,
    hasRealData,
    hasCaseMismatch: issues.some((issue) => issue.type === 'case_mismatch'),
  };
}

export function deriveAutoModelingLoopContractViewModel({
  caseId,
  loopRun,
  summary,
  contractBundle,
}) {
  const normalizedCaseId = String(caseId ?? '').trim();
  const currentLoopRun = loopRun ?? {};
  const currentSummary = summary ?? {};
  const bundle = contractBundle ?? { payloads: {}, issues: [], evidenceSources: [], hasRealData: false };
  const payloads = bundle.payloads ?? {};
  const liveProgress = payloads.liveProgress ?? null;
  const autorun = payloads.autorun ?? null;
  const assessment = payloads.assessment ?? null;
  const pipelineEvaluation = payloads.pipelineEvaluation ?? null;
  const selfImproving = payloads.selfImproving ?? null;
  const cascade = payloads.cascade ?? null;

  const currentWorkflow = getCurrentWorkflow(currentSummary, liveProgress);
  const failedWorkflows = asArray(currentSummary.failed_workflows);
  const releaseGateBlockers = asArray(currentSummary.release_gate_blockers);
  const rootCauseHints = asArray(autorun?.final?.root_cause_hints);
  const weakDimensions = asArray(autorun?.final?.weak_dimensions).map((item) =>
    item?.dimension ? `${item.dimension} gap ${item.gap ?? '—'}` : '',
  );
  const evidenceItems = summarizeEvidenceSources(bundle);
  const detailItems = [];

  rootCauseHints.forEach((item) => pushUnique(detailItems, item));
  weakDimensions.forEach((item) => pushUnique(detailItems, item));
  releaseGateBlockers.forEach((item) => pushUnique(detailItems, item));

  const hasSummaryEvidence =
    Number(currentSummary.total ?? 0) > 0 ||
    Number(currentSummary.outcomes_generated ?? 0) > 0 ||
    Number(currentSummary.total_executed ?? 0) > 0;
  const hasRuntimeFailure =
    currentLoopRun.status === 'failed' ||
    failedWorkflows.length > 0 ||
    Number(currentSummary.failed ?? 0) > 0 ||
    Number(currentSummary.timeout ?? 0) > 0;
  const isRunning =
    currentLoopRun.status === 'running' ||
    Boolean(currentWorkflow) ||
    Boolean(liveProgress?.current);
  const hasCompletedEvidence = bundle.hasRealData || hasSummaryEvidence;
  const scoreFacts = getScoreFacts(autorun, assessment);

  let stateKey = 'no_results';
  let statusLabel = '无真实结果';
  let statusTone = 'slate';
  let summaryText = normalizedCaseId
    ? `case ${normalizedCaseId} 还没有真实自主建模 contract/runtime 结果。`
    : '缺少 case_id，无法读取真实自主建模 contract/runtime。';

  if (bundle.hasCaseMismatch) {
    stateKey = 'artifact_misaligned';
    statusLabel = '产物错位';
    statusTone = 'amber';
    summaryText = bundle.issues.find((issue) => issue.type === 'case_mismatch')?.message ?? '发现 case_id 错位的 contract 产物。';
  } else if (isRunning) {
    stateKey = 'running';
    statusLabel = '真实运行中';
    statusTone = 'cyan';
    summaryText = currentWorkflow
      ? `当前真实工作流仍在执行：${currentWorkflow}。`
      : currentLoopRun.message || '自主建模闭环正在运行。';
  } else if (hasRuntimeFailure) {
    const firstFailure = failedWorkflows[0];
    stateKey = 'failed';
    statusLabel = '存在失败';
    statusTone = 'rose';
    summaryText = currentLoopRun.status === 'failed'
      ? currentLoopRun.message || '自主建模闭环执行失败。'
      : firstFailure
        ? `${firstFailure.workflow || 'unknown'} ${firstFailure.status || 'failed'}: ${firstFailure.message || '无可诊断信息'}`
        : releaseGateBlockers[0] || '真实产物显示自主建模闭环存在失败。';
  } else if (hasCompletedEvidence) {
    const stopReason = String(autorun?.final?.stop_reason || '').trim();
    stateKey = 'completed';
    statusLabel = '真实结果可用';
    statusTone = currentSummary.pipeline_contract_ready ? 'emerald' : 'amber';
    summaryText = stopReason
      ? `真实 contract 已更新，闭环 stop_reason=${stopReason}。`
      : currentLoopRun.message || '真实 contract 已生成，可据此查看自主建模结果。';
  }

  const metrics = [
    {
      label: '执行通过',
      value:
        Number(currentSummary.total ?? 0) > 0
          ? `${Number(currentSummary.passed ?? 0)}/${Number(currentSummary.total ?? 0)}`
          : '—',
    },
    {
      label: '产物覆盖',
      value: formatPercent(getCoverageValue(currentSummary, liveProgress, pipelineEvaluation)),
    },
    {
      label: '自主评分',
      value:
        scoreFacts.score !== null
          ? `${formatScore(scoreFacts.score)}${scoreFacts.verdict ? ` · ${scoreFacts.verdict}` : ''}`
          : '—',
    },
    {
      label: '成熟度',
      value:
        String(
          pipelineEvaluation?.maturity ??
            (currentSummary.pipeline_contract_ready ? 'contract_ready' : ''),
        ).trim() || '—',
    },
  ];

  const metricMap = Object.fromEntries(metrics.map((item) => [item.label, item.value]));

  const factItems = [];
  if (currentSummary.gate_status) {
    pushUnique(factItems, `gate_status=${currentSummary.gate_status}`);
  }
  if (isFiniteNumber(autorun?.rounds?.length)) {
    pushUnique(factItems, `autorun_rounds=${autorun.rounds.length}`);
  }
  if (selfImproving?.target_nse !== undefined) {
    pushUnique(
      factItems,
      `self_improving target_nse=${selfImproving.target_nse} · converged=${String(Boolean(selfImproving.converged))}`,
    );
  }
  if (cascade?.status) {
    pushUnique(factItems, `cascade status=${cascade.status}`);
  }
  if (currentSummary.pipeline_contract_ready !== undefined) {
    pushUnique(
      factItems,
      `pipeline_contract_ready=${String(Boolean(currentSummary.pipeline_contract_ready))}`,
    );
  }

  return {
    stateKey,
    statusLabel,
    statusTone,
    summaryText,
    metrics,
    metricMap,
    detailItems,
    factItems,
    evidenceItems,
  };
}
