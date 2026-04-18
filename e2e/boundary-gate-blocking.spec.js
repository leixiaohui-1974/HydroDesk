import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';
import { WORKSPACE_ROOT } from './workspaceRoot.js';

const PLATFORM_GOVERNANCE_INDEX = JSON.parse(
  fs.readFileSync(path.join(WORKSPACE_ROOT, 'Hydrology/configs/platform_governance_gates.index.json'), 'utf8'),
);

function readTextIfExists(relPath) {
  const absPath = path.join(WORKSPACE_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  return fs.readFileSync(absPath, 'utf8');
}

function readJsonIfExists(relPath) {
  const text = readTextIfExists(relPath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function summarizeGovernanceGatePayload(obj) {
  if (!obj || typeof obj !== 'object') {
    return { status: 'missing', hint: '无有效 JSON' };
  }
  if (typeof obj.outcome_status === 'string' && obj.outcome_status) {
    return { status: obj.outcome_status, hint: 'outcome_status' };
  }
  if (typeof obj.gate_status === 'string' && obj.gate_status) {
    return { status: obj.gate_status, hint: 'gate_status' };
  }
  if (obj.quality_gate_passed === false) {
    return { status: 'quality_failed', hint: 'quality_gate_passed' };
  }
  if (obj.quality_gate_passed === true) {
    return { status: 'quality_passed', hint: 'quality_gate_passed' };
  }
  if (typeof obj.ok === 'boolean') {
    return { status: obj.ok ? 'ok' : 'failed', hint: 'ok' };
  }
  if (typeof obj.status === 'string' && obj.status) {
    return { status: obj.status, hint: 'status' };
  }
  if (obj.execution_status && typeof obj.execution_status === 'string') {
    return { status: obj.execution_status, hint: 'execution_status' };
  }
  return { status: 'present', hint: '已加载，无标准门控字段' };
}

function buildCaseContractSummary(caseId) {
  const contractRoot = `cases/${caseId}/contracts`;
  const coverage = readJsonIfExists(`${contractRoot}/outcome_coverage_report.latest.json`) ?? {};
  const verification = readJsonIfExists(`${contractRoot}/e2e_outcome_verification_report.json`) ?? {};

  return {
    case_id: caseId,
    case_root: `cases/${caseId}`,
    total: Number(coverage?.total_executed ?? 0),
    passed: Number(coverage?.outcomes_generated ?? 0),
    failed: 0,
    timeout: 0,
    pending: 0,
    current_workflow: String(verification?.stage2_execution_integrity?.current_workflow ?? 'autonomy_autorun'),
    outcomes_generated: Number(coverage?.outcomes_generated ?? 0),
    raw_outcome_coverage: Number(coverage?.outcome_coverage ?? 0),
    total_executed: Number(coverage?.total_executed ?? 0),
    normalized_outcome_coverage: Number(coverage?.outcome_coverage ?? 0),
    schema_valid_count: Number(coverage?.schema_valid_count ?? 0),
    evidence_bound_count: Number(coverage?.evidence_bound_count ?? 0),
    gate_status: String(coverage?.gate_status ?? 'unknown'),
    verification_generated_at: String(verification?.generated_at ?? ''),
    closure_check_passed: Boolean(verification?.stage2_execution_integrity?.closure_check_passed),
    duplicate_runs: Object.entries(coverage?.duplicate_runs ?? {}).map(([workflow, count]) => ({ workflow, count })),
    pending_workflows: Array.isArray(verification?.stage2_execution_integrity?.pending_workflows)
      ? verification.stage2_execution_integrity.pending_workflows
      : [],
    failed_workflows: [],
    key_artifacts: [],
    triad_workflow_run_rel: `${contractRoot}/workflow_run.json`,
    triad_review_bundle_rel: `${contractRoot}/review_bundle.json`,
    triad_release_manifest_rel: `${contractRoot}/release_manifest.json`,
    triad_count: 3,
    triad_placeholder_count: 0,
    triad_real_count: 3,
    triad_status: 'real',
    triad_truth_status: 'real_ready',
    triad_canonical_count: 3,
    triad_bridge_fallback_count: 0,
    pipeline_minimal_contract_ready: true,
    pipeline_contract_ready: true,
    release_gate_eligible: true,
    release_gate_blockers: [],
    delivery_pack_pointer_rel: '',
    delivery_latest_pack_rel: '',
    delivery_pack_id: '',
    delivery_pack_updated_at: '',
    delivery_pack_eligible_at_last_pack: false,
  };
}

function buildWorkspaceTexts(caseId) {
  const contractRoot = `cases/${caseId}/contracts`;
  const relPaths = new Set([
    `${contractRoot}/workflow_run.json`,
    `${contractRoot}/review_bundle.json`,
    `${contractRoot}/release_manifest.json`,
    `${contractRoot}/control_validation.latest.json`,
    `${contractRoot}/outcome_coverage_report.latest.json`,
    `${contractRoot}/e2e_outcome_verification_report.json`,
  ]);

  for (const gate of PLATFORM_GOVERNANCE_INDEX.gates ?? []) {
    for (const template of gate.path_template_chain ?? []) {
      relPaths.add(template.replaceAll('{case_id}', caseId));
    }
  }

  const workspaceTexts = {};
  for (const relPath of relPaths) {
    const text = readTextIfExists(relPath);
    if (text != null) {
      workspaceTexts[relPath] = text;
    }
  }
  return workspaceTexts;
}

function buildGateExpectations(caseId) {
  return (PLATFORM_GOVERNANCE_INDEX.gates ?? []).map((gate) => {
    const pathsTried = (gate.path_template_chain ?? []).map((template) => template.replaceAll('{case_id}', caseId));
    const resolvedPath = pathsTried.find((relPath) => readTextIfExists(relPath) != null) ?? null;
    if (!resolvedPath) {
      return {
        key: gate.key,
        status: 'missing',
        hint: '文件不存在',
        resolvedPath: null,
        pathsTried,
      };
    }
    const gatePayload = readJsonIfExists(resolvedPath);
    if (!gatePayload) {
      return {
        key: gate.key,
        status: 'invalid_json',
        hint: 'JSON 解析失败',
        resolvedPath,
        pathsTried,
      };
    }
    return {
      key: gate.key,
      ...summarizeGovernanceGatePayload(gatePayload),
      resolvedPath,
      pathsTried,
    };
  });
}

function buildFixture(caseId) {
  return {
    defaultCaseId: caseId,
    caseContractSummaryById: {
      [caseId]: buildCaseContractSummary(caseId),
    },
    workspaceTexts: buildWorkspaceTexts(caseId),
  };
}

async function installFixture(page, caseId) {
  await page.addInitScript((value) => {
    window.__HYDRODESK_PLAYWRIGHT_FIXTURE__ = value;
  }, buildFixture(caseId));
}

test.describe('Boundary Gate Blocking Simulation (Parameter Governance)', () => {
  for (const caseId of ROLLOUT_CASE_IDS) {
    test(`Review 治理门在浏览器壳下可观测（case-bound 契约事实）：${caseId}`, async ({ page }) => {
      const expectedRows = buildGateExpectations(caseId);

      await installFixture(page, caseId);
      await page.goto('/projects');

      await page.getByTestId('project-center-info-tab-catalog').dispatchEvent('click');
      const catalogPanel = page.getByTestId('project-center-info-panel-catalog');
      const row = catalogPanel.locator(`[data-testid="case-row"][data-case-id="${caseId}"]`);
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: '切换' }).dispatchEvent('click');

      await page.getByRole('link', { name: 'Review / Release' }).click();
      await expect(page).toHaveURL(/\/review(\?|$)/);

      const gatePanel = page.getByTestId('platform-governance-gates');
      await expect(gatePanel).toBeVisible();
      await expect(gatePanel).not.toContainText('browser_preview');

      for (const expectedRow of expectedRows) {
        const gate = page.getByTestId(`platform-governance-gate-${expectedRow.key}`);
        await expect(gate).toBeVisible();
        await expect(gate).toContainText(expectedRow.status);
        await expect(gate).toContainText(`字段：${expectedRow.hint}`);
        if (expectedRow.resolvedPath) {
          await expect(gate).toContainText(expectedRow.resolvedPath);
        } else {
          await expect(gate).toContainText(`尝试：${expectedRow.pathsTried.join(' · ')}`);
        }
      }
    });
  }
});
