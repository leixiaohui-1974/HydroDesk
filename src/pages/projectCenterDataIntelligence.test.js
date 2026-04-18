import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDataIntelligenceBatchRollupEntries,
  buildDataIntelligenceHeadlineStats,
  buildDataIntelligenceRelatedStatusEntries,
  buildDataIntelligenceShortcutSpecs,
  buildSelectedDataIntelligenceState,
  getDataIntelligenceCategoryLabel,
} from './projectCenterDataIntelligence.js';

test('getDataIntelligenceCategoryLabel maps known category labels', () => {
  assert.equal(getDataIntelligenceCategoryLabel('terrain_and_spatial'), '地形与空间');
  assert.equal(getDataIntelligenceCategoryLabel('document_knowledge'), '文档知识');
  assert.equal(getDataIntelligenceCategoryLabel('custom'), 'custom');
});

test('buildDataIntelligenceBatchRollupEntries groups by first recommended workflow', () => {
  const entries = buildDataIntelligenceBatchRollupEntries([
    { workflow_planning: { recommended_path: ['hydraulic_control_modeling'] } },
    { workflow_planning: { recommended_path: ['hydraulic_control_modeling'] } },
    { workflow_planning: { recommended_path: ['watershed_delineation'] } },
    { workflow_planning: { recommended_path: [] } },
  ]);

  assert.deepEqual(entries, [
    ['hydraulic_control_modeling', 2],
    ['blocked_only', 1],
    ['watershed_delineation', 1],
  ]);
});

test('buildSelectedDataIntelligenceState promotes a batch profile into the current detail state', () => {
  const profile = {
    case_id: 'daduhe',
    workflow_planning: {
      recommended_path: ['watershed_delineation', 'hydrological_simulation'],
    },
    asset_profile: {
      categories: {
        terrain_and_spatial: { asset_count: 3 },
      },
    },
  };

  assert.deepEqual(buildSelectedDataIntelligenceState(profile), {
    shellCaseId: 'daduhe',
    shellMode: 'case',
    dataIntelligence: profile,
    dataIntelligenceError: '',
  });
});

test('buildDataIntelligenceHeadlineStats summarizes focus counts for the current detail view', () => {
  const profile = {
    workflow_planning: {
      recommended_path: ['watershed_delineation', 'hydrological_simulation'],
      missing_evidence: ['rainfall', 'boundary'],
      suggested_data_mining_tasks: ['补挖雨量站', '核对边界条件', '补充调度文档'],
      model_change_advice: [
        { advice_type: 'switch_model', priority: 'high' },
        { advice_type: 'refine_mesh', priority: 'medium' },
      ],
    },
    authenticity_summary: {
      review_required_assets: 2,
    },
    asset_profile: {
      categories: {
        terrain_and_spatial: { asset_count: 3 },
        hydrology: { asset_count: 4 },
      },
    },
  };

  assert.deepEqual(buildDataIntelligenceHeadlineStats(profile), [
    { key: 'recommended_path', label: '推荐主链', value: 2 },
    { key: 'risk_assets', label: '待复核资产', value: 2 },
    { key: 'missing_evidence', label: '缺失证据', value: 2 },
    { key: 'mining_tasks', label: '补挖任务', value: 3 },
    { key: 'model_change', label: '改模建议', value: 2 },
    { key: 'asset_categories', label: '资产分组', value: 2 },
  ]);
});

test('buildDataIntelligenceShortcutSpecs exposes direct actions from existing commands and loading states', () => {
  assert.deepEqual(
    buildDataIntelligenceShortcutSpecs({
      caseId: 'daduhe',
      dataIntelligenceLoading: true,
      modelStrategyLoading: false,
      readinessLoading: false,
      qualityCoverageLoading: true,
      feasibilityLoading: false,
    }),
    [
      {
        key: 'refresh-data-intelligence',
        label: '刷新中…',
        disabled: true,
        tone: 'primary',
      },
      {
        key: 'refresh-model-strategy',
        label: '刷新模型判型',
        disabled: false,
        tone: 'accent',
      },
      {
        key: 'refresh-readiness',
        label: '检查合并就绪度',
        disabled: false,
        tone: 'success',
      },
      {
        key: 'refresh-quality-coverage',
        label: '扫描中…',
        disabled: true,
        tone: 'neutral',
      },
      {
        key: 'refresh-feasibility',
        label: '看可运行性矩阵',
        disabled: false,
        tone: 'neutral',
      },
    ]
  );
});

test('buildDataIntelligenceRelatedStatusEntries summarizes existing dependent states', () => {
  assert.deepEqual(
    buildDataIntelligenceRelatedStatusEntries({
      modelStrategy: {
        strategy_key: 'hydraulic_control_modeling',
        primary_recommendation: '优先进入水力控制建模',
      },
      readiness: {
        summary: {
          artifact_dimensions_satisfied: 3,
          artifact_dimensions_total: 5,
        },
      },
      qualityCoverage: {
        summary: {
          dimensions_satisfied: 2,
          dimensions_total: 4,
        },
      },
      feasibilityError: '规则文件缺失',
    }),
    [
      {
        key: 'model-strategy',
        label: '模型判型',
        tone: 'ready',
        detail: '优先进入水力控制建模',
        ready: true,
      },
      {
        key: 'readiness',
        label: '合并就绪度',
        tone: 'ready',
        detail: '3/5 维',
        ready: true,
      },
      {
        key: 'quality-coverage',
        label: '产物覆盖',
        tone: 'ready',
        detail: '2/4 维',
        ready: true,
      },
      {
        key: 'feasibility',
        label: '可运行性矩阵',
        tone: 'error',
        detail: '规则文件缺失',
        ready: false,
      },
    ]
  );
});
