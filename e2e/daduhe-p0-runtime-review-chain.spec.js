import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { WORKSPACE_ROOT } from './workspaceRoot.js';

const DADUHE = 'daduhe';
const CONTRACT_ROOT = `cases/${DADUHE}/contracts`;

function readTextIfExists(relPath) {
  const absPath = path.join(WORKSPACE_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  return fs.readFileSync(absPath, 'utf8');
}

function readJsonIfExists(relPath) {
  const text = readTextIfExists(relPath);
  return text ? JSON.parse(text) : null;
}

function buildCaseContractSummary(caseId) {
  const coverage = readJsonIfExists(`cases/${caseId}/contracts/outcome_coverage_report.latest.json`) ?? {};
  const verification = readJsonIfExists(`cases/${caseId}/contracts/e2e_outcome_verification_report.json`) ?? {};

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
    triad_workflow_run_rel: `${CONTRACT_ROOT}/workflow_run.json`,
    triad_review_bundle_rel: `${CONTRACT_ROOT}/review_bundle.json`,
    triad_release_manifest_rel: `${CONTRACT_ROOT}/release_manifest.json`,
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

function buildWorkspaceTexts() {
  const relPaths = [
    `${CONTRACT_ROOT}/workflow_run.json`,
    `${CONTRACT_ROOT}/review_bundle.json`,
    `${CONTRACT_ROOT}/release_manifest.json`,
    `${CONTRACT_ROOT}/control_validation.latest.json`,
    `${CONTRACT_ROOT}/outcome_coverage_report.latest.json`,
    `${CONTRACT_ROOT}/e2e_outcome_verification_report.json`,
    `${CONTRACT_ROOT}/hydraulics_parameter_governance.latest.json`,
    `${CONTRACT_ROOT}/coupling_parameter_governance.latest.json`,
    `${CONTRACT_ROOT}/assimilation_parameter_governance.latest.json`,
  ];
  const workspaceTexts = {};
  relPaths.forEach((relPath) => {
    const text = readTextIfExists(relPath);
    if (text != null) {
      workspaceTexts[relPath] = text;
    }
  });
  return workspaceTexts;
}

function buildFixture() {
  return {
    acceptanceLane: 'fixture-pass',
    acceptanceEvidence: {
      case_id: DADUHE,
      contracts_root: CONTRACT_ROOT,
      review_bundle: `${CONTRACT_ROOT}/review_bundle.json`,
      release_manifest: `${CONTRACT_ROOT}/release_manifest.json`,
    },
    defaultCaseId: DADUHE,
    caseContractSummaryById: {
      [DADUHE]: buildCaseContractSummary(DADUHE),
    },
    workspaceTexts: buildWorkspaceTexts(),
    gatewaySessionPid: 42017,
    gatewayToolsByCase: {
      [DADUHE]: [
        { name: 'case_knowledge_lint', target: 'acceptance_review' },
        { name: 'bootstrap_case_triad_minimal', target: 'acceptance_review' },
        { name: 'delivery_docs_pack_dry_run', target: 'release_publish' },
      ],
    },
    gatewayPolicyByCase: {
      [DADUHE]: {
        filter_mode: 'case_manifest',
        case_id: DADUHE,
      },
    },
    gatewayInvokeToolByCase: {
      [DADUHE]: {
        case_knowledge_lint: {
          returncode: 0,
          stdout: JSON.stringify({ ok: true, case_id: DADUHE, checked_links: 12, broken_links: 0 }),
          stderr: '',
        },
        bootstrap_case_triad_minimal: {
          returncode: 0,
          stdout: JSON.stringify({ ok: true, case_id: DADUHE, updated_contracts: 3 }),
          stderr: '',
        },
        delivery_docs_pack_dry_run: {
          returncode: 0,
          stdout: JSON.stringify({ ok: true, case_id: DADUHE, dry_run: true }),
          stderr: '',
        },
      },
    },
  };
}

async function installFixture(page, acceptanceLane) {
  await page.addInitScript((value) => {
    window.__HYDRODESK_PLAYWRIGHT_FIXTURE__ = value;
  }, {
    ...buildFixture(),
    acceptanceLane,
    acceptanceEvidence: {
      case_id: DADUHE,
      contracts_root: CONTRACT_ROOT,
      review_bundle: `${CONTRACT_ROOT}/review_bundle.json`,
      release_manifest: `${CONTRACT_ROOT}/release_manifest.json`,
      lane: acceptanceLane,
    },
  });
}

/**
 * P0 A-02：大渡河壳内链路（项目中心 → Agent Runtime → Review 三道治理门）。
 * 依赖 VITE_PLAYWRIGHT=1（playwright.config webServer 已注入）以展示 rollout 案例行。
 * 交付模式默认不展示「Agent 模式」侧栏项，故 Agent 断言使用直链 /agent。
 */
test.describe('P0 A-02 · daduhe 壳层链（Agent Runtime → Review 治理门）', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await installFixture(page, testInfo.project.name);
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
    await page.getByTestId('project-center-info-tab-catalog').dispatchEvent('click');
    const row = page.locator(`[data-testid="case-row"][data-case-id="${DADUHE}"]`);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '切换' }).dispatchEvent('click');
    await expect(page.locator('main').getByText(new RegExp(`case\\s+${DADUHE}`, 'i'))).toBeVisible();
  });

  test('Agent 工位提供可复验的 session 往返与工具轨迹', async ({ page }) => {
    const agentNav = page.locator('aside a[href="/agent"]');
    await expect(agentNav).toBeVisible({ timeout: 10_000 });
    await agentNav.dispatchEvent('click');
    await expect(page).toHaveURL(/\/agent$/);
    await expect(page.getByTestId('agent-runtime-panel')).toBeVisible();
    await expect(page.getByTestId('agent-runtime-unified-state')).toBeVisible();
    await expect(page.getByTestId('agent-runtime-mounts')).toBeVisible();
    await expect(page.getByTestId('agent-runtime-unified-state').getByText(/网关模式/i)).toBeVisible();

    await page.getByRole('button', { name: '启动 Gateway' }).click();
    await expect(page.getByText(/Gateway Active \(PID: 42017\)/)).toBeVisible();
    await expect(page.getByTestId('agent-runtime-unified-state')).toContainText('常驻 session');

    await page.getByRole('button', { name: 'Ping' }).nth(1).click();
    await expect(page.getByTestId('agent-runtime-happy-path').getByText('ping → pong')).toBeVisible();

    await page.getByRole('button', { name: 'list_tools（当前 case）' }).click();
    await expect(page.getByText('list_tools (3 个工具)', { exact: true })).toBeVisible();
    await expect(page.getByText(/policy: case_manifest/)).toBeVisible();

    await page.getByRole('button', { name: '知识壳 Lint' }).click();
    await expect(page.getByText('invoke_tool · case_knowledge_lint', { exact: true })).toBeVisible();
    await expect(page.locator('pre').filter({ hasText: '"tool": "case_knowledge_lint"' })).toBeVisible();
  });

  test('Review 工位读取 case 绑定治理门证据而非 browser_preview 占位', async ({ page }) => {
    await page.locator('aside a[href="/review"]').dispatchEvent('click');
    await expect(page).toHaveURL(/\/review$/);
    const governance = page.getByTestId('platform-governance-gates');
    await expect(governance).toBeVisible();
    await expect(governance.getByRole('button', { name: '刷新契约摘要' })).toBeVisible();
    await expect(page.getByText('三道治理门（Hydraulics / Coupling / Assimilation）')).toBeVisible();
    await expect(page.getByText('统一签发 Gate（P2）')).toBeVisible();

    const hydraulics = page.getByTestId('platform-governance-gate-hydraulics');
    const coupling = page.getByTestId('platform-governance-gate-coupling');
    const assimilation = page.getByTestId('platform-governance-gate-assimilation');
    await expect(hydraulics).toContainText('pass');
    await expect(hydraulics).toContainText('字段：gate_status');
    await expect(hydraulics).toContainText(`${CONTRACT_ROOT}/hydraulics_parameter_governance.latest.json`);
    await expect(coupling).toContainText('pass');
    await expect(coupling).toContainText(`${CONTRACT_ROOT}/coupling_parameter_governance.latest.json`);
    await expect(assimilation).toContainText('pass');
    await expect(assimilation).toContainText(`${CONTRACT_ROOT}/assimilation_parameter_governance.latest.json`);
    await expect(governance).not.toContainText('browser_preview');
    await expect(page.locator('main')).not.toContainText('浏览器预览模式');
  });

  test('real-runtime lane 为 daduhe 明确标记来源，不再把 fixture 结果等同真实运行时', async ({ page }, testInfo) => {
    const summary = await page.evaluate(async (caseId) => {
      const bridge = await import('/src/api/tauri_bridge.js');
      return bridge.getCaseContractSummary(caseId, null);
    }, DADUHE);

    expect(summary).toMatchObject({
      case_id: DADUHE,
      acceptance_lane: testInfo.project.name,
      acceptance_source: 'real-runtime',
    });
    expect(summary.acceptance_evidence).toMatchObject({
      case_id: DADUHE,
      contracts_root: CONTRACT_ROOT,
      lane: testInfo.project.name,
    });
  });
});
