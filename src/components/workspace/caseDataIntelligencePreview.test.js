import test from 'node:test';
import assert from 'node:assert/strict';

import { getCaseReviewAssets } from '../../data/case_contract_shell.js';
import {
  buildWorkspaceBusinessPreviewByKind,
  getWorkspaceAssetPreviewKind,
} from './workspaceAssetPreviewRegistry.js';

test('getWorkspaceAssetPreviewKind recognizes case data intelligence output', () => {
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/case_data_intelligence.latest.json',
    }),
    'case_data_intelligence',
  );
});

test('buildWorkspaceBusinessPreviewByKind renders case data intelligence summary', () => {
  const preview = buildWorkspaceBusinessPreviewByKind('case_data_intelligence', {
    previewContent: JSON.stringify({
      case_id: 'daduhe',
      authenticity_summary: {
        direct_assets: 8,
        review_required_assets: 1,
        configured_only_assets: 2,
        missing_bundle_gaps: 0,
      },
      workflow_planning: {
        recommended_path: ['watershed_delineation', 'hydrological_simulation'],
        blocked_path: [],
        missing_evidence: [],
      },
      learning_strategy: {
        parameter_learning: { status: 'ready' },
        model_strategy_learning: { status: 'steady' },
        model_change_advice: { status: 'not_required' },
      },
      asset_profile: {
        categories: {
          terrain_and_spatial: { asset_count: 3 },
          hydrology: { asset_count: 4 },
        },
      },
    }),
  });

  assert.equal(preview.kind, 'business');
  assert.equal(preview.title, '数据智能规划');
  assert.equal(preview.badges.includes('data-intelligence'), true);
  assert.equal(preview.sections[0].rows.find((row) => row.label === 'case_id').value, 'daduhe');
  assert.equal(preview.sections[1].rows.find((row) => row.label === 'review_required_assets').value, 1);
  assert.equal(preview.sections[2].rows.find((row) => row.label === 'parameter_learning').value, 'ready');
});

test('case contract shell exposes case data intelligence as review asset', () => {
  const reviewAssets = getCaseReviewAssets('daduhe');

  assert.equal(
    reviewAssets.some((asset) => asset.path === 'cases/daduhe/contracts/case_data_intelligence.latest.json'),
    true,
  );
});
