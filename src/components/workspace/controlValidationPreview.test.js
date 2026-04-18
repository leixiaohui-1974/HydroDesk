import test from 'node:test';
import assert from 'node:assert/strict';

import { getCaseReviewAssets, getCaseShellEntryPoints } from '../../data/case_contract_shell.js';
import {
  buildWorkspaceBusinessPreviewByKind,
  getWorkspaceAssetPreviewKind,
} from './workspaceAssetPreviewRegistry.js';

test('getWorkspaceAssetPreviewKind recognizes control validation summary', () => {
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/control_validation.latest.json',
    }),
    'control_validation',
  );
});

test('case contract shell exposes control validation as review asset and workflow entry', () => {
  const reviewAssets = getCaseReviewAssets('daduhe');
  const entryPoints = getCaseShellEntryPoints('daduhe');

  assert.equal(
    reviewAssets.some((asset) => asset.path === 'cases/daduhe/contracts/control_validation.latest.json'),
    true,
  );
  assert.equal(
    entryPoints.some((entry) => entry.title === 'Control Entry'),
    true,
  );
});

test('buildWorkspaceBusinessPreviewByKind renders structured control validation preview', () => {
  const preview = buildWorkspaceBusinessPreviewByKind('control_validation', {
    previewContent: JSON.stringify({
      case_id: 'daduhe',
      summary: {
        overall_status: 'attention_required',
        review_verdict: 'pass_with_comments',
      },
      control: {
        controller_backend: 'mpc',
        pass_rate: 0.75,
      },
      sil: {
        status: 'warning',
        pass_rate: 0.25,
        scenario_count: 4,
      },
      odd: {
        status: 'validated',
        validated_in_simulation: true,
        transition_count: 5,
      },
    }),
  });

  assert.equal(preview.kind, 'business');
  assert.equal(preview.title, '控制验证收口');
  assert.equal(preview.badges.includes('control-validation'), true);
  assert.equal(preview.sections[0].rows.find((row) => row.label === 'overall_status').value, 'attention_required');
  assert.equal(preview.sections[1].rows.find((row) => row.label === 'controller_backend').value, 'mpc');
  assert.equal(preview.sections[2].rows.find((row) => row.label === 'pass_rate').value, '25%');
  assert.equal(preview.sections[2].rows.find((row) => row.label === 'validated_in_simulation').value, 'yes');
});
