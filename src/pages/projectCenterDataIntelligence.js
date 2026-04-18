export function getDataIntelligenceCategoryLabel(key) {
  return (
    {
      terrain_and_spatial: '地形与空间',
      hydrology: '水文',
      hydraulics: '水动力',
      engineering_operation: '工程调度',
      runtime_validation: '运行与验证',
      document_knowledge: '文档知识',
    }[key] || key
  );
}

function isDataIntelligenceProfileReady(profile) {
  return Boolean(profile?.case_id && profile?.asset_profile && profile?.workflow_planning);
}

export function buildDataIntelligenceBatchRollupEntries(profiles = []) {
  return Object.entries(
    (profiles || []).reduce((acc, profile) => {
      const primary = profile?.workflow_planning?.recommended_path?.[0] || 'blocked_only';
      acc[primary] = (acc[primary] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0] === 'blocked_only') return -1;
    if (b[0] === 'blocked_only') return 1;
    return a[0].localeCompare(b[0]);
  });
}

export function buildSelectedDataIntelligenceState(profile) {
  if (!isDataIntelligenceProfileReady(profile)) return null;
  return {
    shellCaseId: profile.case_id,
    shellMode: 'case',
    dataIntelligence: profile,
    dataIntelligenceError: '',
  };
}

export function buildDataIntelligenceHeadlineStats(profile = {}) {
  const planning = profile?.workflow_planning || {};
  const authenticity = profile?.authenticity_summary || {};
  const categories = profile?.asset_profile?.categories || {};
  return [
    {
      key: 'recommended_path',
      label: '推荐主链',
      value: Array.isArray(planning.recommended_path) ? planning.recommended_path.length : 0,
    },
    {
      key: 'risk_assets',
      label: '待复核资产',
      value: Number(authenticity.review_required_assets) || 0,
    },
    {
      key: 'missing_evidence',
      label: '缺失证据',
      value: Array.isArray(planning.missing_evidence) ? planning.missing_evidence.length : 0,
    },
    {
      key: 'mining_tasks',
      label: '补挖任务',
      value: Array.isArray(planning.suggested_data_mining_tasks)
        ? planning.suggested_data_mining_tasks.length
        : 0,
    },
    {
      key: 'model_change',
      label: '改模建议',
      value: Array.isArray(planning.model_change_advice) ? planning.model_change_advice.length : 0,
    },
    {
      key: 'asset_categories',
      label: '资产分组',
      value: Object.keys(categories).length,
    },
  ];
}

function buildLoadStateMeta({ loading, error, ready, idleDetail, readyDetail }) {
  if (loading) {
    return { tone: 'loading', detail: '刷新中', ready: false };
  }
  if (error) {
    return { tone: 'error', detail: String(error), ready: false };
  }
  if (ready) {
    return { tone: 'ready', detail: readyDetail, ready: true };
  }
  return { tone: 'idle', detail: idleDetail, ready: false };
}

export function buildDataIntelligenceShortcutSpecs(options = {}) {
  const hasCaseId = Boolean(String(options.caseId || '').trim());
  return [
    {
      key: 'refresh-data-intelligence',
      label: options.dataIntelligenceLoading ? '刷新中…' : '刷新数据智能',
      disabled: !hasCaseId || Boolean(options.dataIntelligenceLoading),
      tone: 'primary',
    },
    {
      key: 'refresh-model-strategy',
      label: options.modelStrategyLoading ? '判型中…' : '刷新模型判型',
      disabled: !hasCaseId || Boolean(options.modelStrategyLoading),
      tone: 'accent',
    },
    {
      key: 'refresh-readiness',
      label: options.readinessLoading ? '检查中…' : '检查合并就绪度',
      disabled: !hasCaseId || Boolean(options.readinessLoading),
      tone: 'success',
    },
    {
      key: 'refresh-quality-coverage',
      label: options.qualityCoverageLoading ? '扫描中…' : '检查产物覆盖',
      disabled: !hasCaseId || Boolean(options.qualityCoverageLoading),
      tone: 'neutral',
    },
    {
      key: 'refresh-feasibility',
      label: options.feasibilityLoading ? '计算中…' : '看可运行性矩阵',
      disabled: !hasCaseId || Boolean(options.feasibilityLoading),
      tone: 'neutral',
    },
  ];
}

export function buildDataIntelligenceRelatedStatusEntries(options = {}) {
  const modelStrategyMeta = buildLoadStateMeta({
    loading: options.modelStrategyLoading,
    error: options.modelStrategyError,
    ready: Boolean(options.modelStrategy?.strategy_key),
    idleDetail: '未加载',
    readyDetail:
      options.modelStrategy?.primary_recommendation ||
      options.modelStrategy?.strategy_key ||
      '已生成',
  });
  const readinessMeta = buildLoadStateMeta({
    loading: options.readinessLoading,
    error: options.readinessError,
    ready: Boolean(options.readiness?.summary),
    idleDetail: '未检查',
    readyDetail: options.readiness?.summary
      ? `${options.readiness.summary.artifact_dimensions_satisfied ?? 0}/${options.readiness.summary.artifact_dimensions_total ?? 0} 维`
      : '已检查',
  });
  const qualityCoverageMeta = buildLoadStateMeta({
    loading: options.qualityCoverageLoading,
    error: options.qualityCoverageError,
    ready: Boolean(options.qualityCoverage?.summary),
    idleDetail: '未扫描',
    readyDetail: options.qualityCoverage?.summary
      ? `${options.qualityCoverage.summary.dimensions_satisfied ?? 0}/${options.qualityCoverage.summary.dimensions_total ?? 0} 维`
      : '已扫描',
  });
  const feasibilityMeta = buildLoadStateMeta({
    loading: options.feasibilityLoading,
    error: options.feasibilityError,
    ready: Array.isArray(options.feasibility?.workflows),
    idleDetail: '未生成',
    readyDetail: `${options.feasibility?.workflows?.length || 0} 条 workflow`,
  });
  return [
    { key: 'model-strategy', label: '模型判型', ...modelStrategyMeta },
    { key: 'readiness', label: '合并就绪度', ...readinessMeta },
    { key: 'quality-coverage', label: '产物覆盖', ...qualityCoverageMeta },
    { key: 'feasibility', label: '可运行性矩阵', ...feasibilityMeta },
  ];
}
