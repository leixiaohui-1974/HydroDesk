import test from 'node:test';
import assert from 'node:assert/strict';

import { getCaseReviewAssets } from '../../data/case_contract_shell.js';
import {
  buildWorkspaceBusinessPreviewByKind,
  getWorkspaceAssetPreviewKind,
} from './workspaceAssetPreviewRegistry.js';

test('getWorkspaceAssetPreviewKind recognizes final report output', () => {
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/final_report.latest.json',
    }),
    'final_report',
  );
});

test('case contract shell exposes final report as review asset', () => {
  const reviewAssets = getCaseReviewAssets('daduhe');

  assert.equal(
    reviewAssets.some((asset) => asset.path === 'cases/daduhe/contracts/final_report.latest.json'),
    true,
  );
});

test('buildWorkspaceBusinessPreviewByKind renders final report assertions', () => {
  const preview = buildWorkspaceBusinessPreviewByKind('final_report', {
    previewContent: JSON.stringify({
      case_id: 'daduhe',
      generated_at: '2026-04-12T09:54:14Z',
      review: {
        verdict: 'pass_with_comments',
      },
      release: {
        status: 'review_pending',
      },
      readiness: {
        release_board: {
          status: 'needs-review',
        },
      },
      business_metrics: {
        normalized_outcome_coverage: 0.8,
        evidence_bound_count: 3,
      },
      assertions: [
        {
          key: 'pipeline_contract_ready',
          passed: true,
          source: 'platform_readiness.summary.pipeline_contract_ready',
        },
        {
          key: 'release_gate_not_blocked',
          passed: true,
          source: 'rollout_readiness_baseline.readiness_release_board.cases[].release_gate.status',
        },
      ],
      assertion_summary: {
        total: 2,
        passed: 2,
      },
      overall_status: 'pass',
      governance: {
        promotion_semantics: {
          semantic_lane: 'promotion_pending_with_comments',
          labels: { zh: '附条件通过' },
          observed_manifest_status: 'review_pending',
          observed_release_board_gate_status: 'needs-review',
          consistency_notes: [],
        },
      },
    }),
    acceptanceSource: 'real-runtime',
    acceptanceScope: 'case',
  });

  assert.equal(preview.kind, 'business');
  assert.equal(preview.title, '最终报告对象');
  assert.equal(preview.badges.includes('final-report'), true);
  assert.equal(preview.sections[0].rows.find((row) => row.label === 'case_id').value, 'daduhe');
  assert.equal(
    preview.sections[1].rows.find((row) => row.label === 'semantic_lane').value,
    'promotion_pending_with_comments',
  );
  assert.equal(preview.sections[1].rows.find((row) => row.label === 'label_zh').value, '附条件通过');
  assert.equal(preview.sections[2].rows.find((row) => row.label === 'coverage').value, '80%');
  assert.equal(preview.sections[3].rows.find((row) => row.label === 'status').value, 'pass');
  assert.equal(preview.sections[3].rows.find((row) => row.label === 'acceptance_scope').value, 'case');
  assert.equal(preview.sections[3].rows.find((row) => row.label === 'acceptance_source').value, 'real-runtime');
  assert.equal(
    preview.sections[3].rows.find((row) => row.label === 'acceptance_contract_source').value,
    'rollout_readiness_baseline.readiness_release_board.cases[].release_gate.status',
  );
  assert.equal(preview.sections[4].rows.find((row) => row.label === 'pipeline_contract_ready').value, 'pass');
  assert.match(preview.sections[5].rows[0].value, /仅代表当前 case/i);
});

test('final report preview defaults acceptance_scope to missing when contract is silent', () => {
  const preview = buildWorkspaceBusinessPreviewByKind('final_report', {
    previewContent: JSON.stringify({
      case_id: 'daduhe',
      overall_status: 'pass',
      review: { verdict: 'pass' },
      release: { status: 'review_pending' },
      readiness: { release_board: { status: 'needs-review' } },
      assertions: [],
      assertion_summary: { total: 0, passed: 0 },
    }),
  });

  const sections = preview.sections.filter(Boolean);
  const scopeRow = sections.find((s) => s.title === '验收语义')?.rows.find((r) => r.label === 'acceptance_scope');
  assert.equal(scopeRow.value, 'missing');
  const noteRow = sections.find((s) => s.title === '说明')?.rows.find((r) => r.label === 'scope_note');
  assert.match(noteRow.value, /尚未声明验收范围/i);
});
