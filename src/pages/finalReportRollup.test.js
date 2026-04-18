import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSixCaseFinalReportRollup } from './finalReportRollup.js';

test('buildSixCaseFinalReportRollup does not treat a single case success as six-case completion', () => {
  const rollup = buildSixCaseFinalReportRollup({
    caseIds: ['daduhe', 'zhongxian', 'xuhonghe'],
    rows: [
      {
        case_id: 'daduhe',
        final_report_present: true,
        final_report_status: 'pass',
        final_report_acceptance_scope: 'case',
        final_report_release_board_status: 'needs-review',
      },
    ],
  });

  assert.equal(rollup.counts.total, 3);
  assert.equal(rollup.counts.finalReportPresent, 1);
  assert.equal(rollup.counts.caseScopedAcceptance, 1);
  assert.equal(rollup.counts.rolloutScopedAcceptance, 0);
  assert.equal(rollup.counts.promotionNeedsReview, 1);
  assert.equal(rollup.counts.promotionMissing, 2);
  assert.equal(rollup.completion.ready, false);
  assert.equal(rollup.completion.status, 'incomplete');
  assert.match(rollup.completion.summary, /不能把单案 final report 成功视为六案例整体完成/i);
});

test('buildSixCaseFinalReportRollup requires every case to be release-ready before marking rollout complete', () => {
  const rollup = buildSixCaseFinalReportRollup({
    caseIds: ['daduhe', 'zhongxian'],
    rows: [
      {
        case_id: 'daduhe',
        final_report_present: true,
        final_report_status: 'pass',
        final_report_acceptance_scope: 'case',
        final_report_release_board_status: 'release-ready',
      },
      {
        case_id: 'zhongxian',
        final_report_present: true,
        final_report_status: 'pass',
        final_report_acceptance_scope: 'case',
        final_report_release_board_status: 'release-ready',
      },
    ],
  });

  assert.equal(rollup.counts.finalReportPresent, 2);
  assert.equal(rollup.counts.promotionReleaseReady, 2);
  assert.equal(rollup.completion.ready, true);
  assert.equal(rollup.completion.status, 'release-ready');
});

test('buildSixCaseFinalReportRollup distinguishes missing final_report from blocked promotion', () => {
  const rollup = buildSixCaseFinalReportRollup({
    caseIds: ['daduhe', 'zhongxian', 'xuhonghe'],
    rows: [
      {
        case_id: 'daduhe',
        final_report_present: true,
        final_report_status: 'attention_required',
        final_report_acceptance_scope: 'case',
        final_report_release_board_status: 'needs-review',
      },
      {
        case_id: 'zhongxian',
        final_report_present: true,
        final_report_status: 'attention_required',
        final_report_acceptance_scope: 'case',
        final_report_release_board_status: 'blocked',
      },
    ],
  });

  assert.equal(rollup.counts.finalReportPresent, 2);
  assert.equal(rollup.counts.promotionNeedsReview, 1);
  assert.equal(rollup.counts.promotionBlocked, 1);
  assert.equal(rollup.counts.promotionMissing, 1);
  assert.match(rollup.completion.summary, /仍有案例缺少 final_report|needs-review \/ blocked/i);
});

test('buildSixCaseFinalReportRollup does not infer case acceptance scope from final_report_present alone', () => {
  const rollup = buildSixCaseFinalReportRollup({
    caseIds: ['daduhe'],
    rows: [
      {
        case_id: 'daduhe',
        final_report_present: true,
        final_report_status: 'pass',
        final_report_release_board_status: 'release-ready',
      },
    ],
  });

  assert.equal(rollup.rows[0].final_report_acceptance_scope, 'missing');
  assert.equal(rollup.counts.caseScopedAcceptance, 0);
  assert.equal(rollup.counts.rolloutScopedAcceptance, 0);
});
