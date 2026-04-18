import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveAutoModelingLoopContractViewModel,
  parseAutoModelingLoopContractPayloads,
} from './autoModelingLoopPanelState.js';

test('parseAutoModelingLoopContractPayloads records case mismatch and parse issues', () => {
  const parsed = parseAutoModelingLoopContractPayloads('zhongxian', [
    {
      key: 'autorun',
      label: 'autonomy_autorun',
      relPath: 'cases/zhongxian/contracts/autonomy_autorun.latest.json',
      text: JSON.stringify({ case_id: 'yjdt', final_score: 0.82 }),
    },
    {
      key: 'pipelineEvaluation',
      label: 'pipeline_evaluation',
      relPath: 'cases/zhongxian/contracts/pipeline_evaluation.latest.json',
      text: '{not-json}',
    },
  ]);

  assert.equal(parsed.hasCaseMismatch, true);
  assert.equal(parsed.issues.length, 2);
  assert.equal(parsed.payloads.autorun.case_id, 'yjdt');
  assert.equal(parsed.payloads.pipelineEvaluation, null);
});

test('deriveAutoModelingLoopContractViewModel marks running state from live runtime workflow', () => {
  const parsed = parseAutoModelingLoopContractPayloads('daduhe', [
    {
      key: 'liveProgress',
      label: 'e2e_live_progress',
      relPath: 'cases/daduhe/contracts/e2e_live_progress.latest.json',
      text: JSON.stringify({
        case_id: 'daduhe',
        current: { workflow_key: 'autonomy_autorun' },
        summary: { total: 43, passed: 39, failed: 0, pending: 4, outcome_coverage: 0.91 },
      }),
    },
  ]);

  const viewModel = deriveAutoModelingLoopContractViewModel({
    caseId: 'daduhe',
    loopRun: { status: 'idle', attemptCount: 0, message: '' },
    summary: {
      total: 43,
      passed: 39,
      failed: 0,
      pending: 4,
      current_workflow: 'autonomy_autorun',
      gate_status: 'running',
      normalized_outcome_coverage: 0.91,
      pipeline_contract_ready: false,
      release_gate_blockers: [],
      failed_workflows: [],
    },
    contractBundle: parsed,
  });

  assert.equal(viewModel.stateKey, 'running');
  assert.match(viewModel.statusLabel, /运行中/);
  assert.match(viewModel.summaryText, /autonomy_autorun/);
});

test('deriveAutoModelingLoopContractViewModel reports failure from real workflow failures', () => {
  const parsed = parseAutoModelingLoopContractPayloads('daduhe', [
    {
      key: 'autorun',
      label: 'autonomy_autorun',
      relPath: 'cases/daduhe/contracts/autonomy_autorun.latest.json',
      text: JSON.stringify({
        case_id: 'daduhe',
        final: {
          verdict: 'WARN',
          root_cause_hints: ['控制链路未收敛'],
        },
      }),
    },
  ]);

  const viewModel = deriveAutoModelingLoopContractViewModel({
    caseId: 'daduhe',
    loopRun: { status: 'idle', attemptCount: 0, message: '' },
    summary: {
      total: 43,
      passed: 39,
      failed: 4,
      pending: 0,
      gate_status: 'blocked',
      normalized_outcome_coverage: 1,
      pipeline_contract_ready: false,
      release_gate_blockers: ['pipeline_contract_ready=false（主链真相未闭合）'],
      failed_workflows: [
        {
          workflow: 'strict_revalidation_ext',
          status: 'failed',
          category: 'gate',
          message: 'gate threshold not met',
        },
      ],
    },
    contractBundle: parsed,
  });

  assert.equal(viewModel.stateKey, 'failed');
  assert.match(viewModel.summaryText, /strict_revalidation_ext/);
  assert.match(viewModel.detailItems.join(' '), /控制链路未收敛|主链真相未闭合/);
});

test('deriveAutoModelingLoopContractViewModel marks artifact mismatch when contract payload case_id is wrong', () => {
  const parsed = parseAutoModelingLoopContractPayloads('daduhe', [
    {
      key: 'autorun',
      label: 'autonomy_autorun',
      relPath: 'cases/daduhe/contracts/autonomy_autorun.latest.json',
      text: JSON.stringify({ case_id: 'yinchuojiliao', final_score: 0.77 }),
    },
  ]);

  const viewModel = deriveAutoModelingLoopContractViewModel({
    caseId: 'daduhe',
    loopRun: { status: 'idle', attemptCount: 0, message: '' },
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      gate_status: 'unknown',
      normalized_outcome_coverage: 0,
      pipeline_contract_ready: false,
      release_gate_blockers: [],
      failed_workflows: [],
    },
    contractBundle: parsed,
  });

  assert.equal(viewModel.stateKey, 'artifact_misaligned');
  assert.match(viewModel.summaryText, /case_id/);
});

test('deriveAutoModelingLoopContractViewModel builds completed metrics from real contracts', () => {
  const parsed = parseAutoModelingLoopContractPayloads('daduhe', [
    {
      key: 'autorun',
      label: 'autonomy_autorun',
      relPath: 'cases/daduhe/contracts/autonomy_autorun.latest.json',
      text: JSON.stringify({
        case_id: 'daduhe',
        final_score: 0.6917,
        final_verdict: 'WARN',
        final: {
          overall_score: 0.6713,
          verdict: 'WARN',
          stop_reason: 'no_improvement',
        },
        rounds: [{ round: 1 }, { round: 2 }],
      }),
    },
    {
      key: 'pipelineEvaluation',
      label: 'pipeline_evaluation',
      relPath: 'cases/daduhe/contracts/pipeline_evaluation.latest.json',
      text: JSON.stringify({
        coverage_pct: 92.3,
        maturity: 'L3_conditional_auto',
        convergence: false,
      }),
    },
  ]);

  const viewModel = deriveAutoModelingLoopContractViewModel({
    caseId: 'daduhe',
    loopRun: { status: 'completed', attemptCount: 1, message: '闭环执行完成。' },
    summary: {
      total: 43,
      passed: 39,
      failed: 0,
      pending: 0,
      gate_status: 'passed',
      normalized_outcome_coverage: 1,
      pipeline_contract_ready: true,
      release_gate_blockers: [],
      failed_workflows: [],
    },
    contractBundle: parsed,
  });

  assert.equal(viewModel.stateKey, 'completed');
  assert.equal(viewModel.metricMap.执行通过, '39/43');
  assert.equal(viewModel.metricMap.产物覆盖, '100%');
  assert.equal(viewModel.metricMap.自主评分, '0.6917 · WARN');
  assert.equal(viewModel.metricMap.成熟度, 'L3_conditional_auto');
});
