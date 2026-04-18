import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';
import { WORKSPACE_ROOT } from './workspaceRoot.js';
import acceptanceConfig from '../src/config/playwrightE2eAcceptance.generated.json' assert { type: 'json' };
import {
  deriveAutoModelingLoopContractViewModel,
  getAutoModelingContractReadPlan,
  parseAutoModelingLoopContractPayloads,
} from '../src/components/autoModelingLoopPanelState.js';
import { buildAutoLearningLoopCommand } from '../src/components/autoModelingLoopRuntime.js';

function readJsonIfExists(relPath) {
  const absPath = path.join(WORKSPACE_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function readTextIfExists(relPath) {
  const absPath = path.join(WORKSPACE_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  return fs.readFileSync(absPath, 'utf8');
}

function contractPath(caseId, fileName) {
  return `cases/${caseId}/contracts/${fileName}`;
}

function outcomePath(caseId, fileName) {
  return `cases/${caseId}/contracts/outcomes/${fileName}`;
}

function fileExists(relPath) {
  return fs.existsSync(path.join(WORKSPACE_ROOT, relPath));
}

function jsonRelFileExists(relPath) {
  return typeof relPath === 'string' && relPath.trim() ? fileExists(relPath.trim()) : false;
}

function tokenizeWorkspaceCommand(command) {
  return String(command ?? '')
    .match(/'[^']*'|[^\s]+/g)
    ?.map((token) => token.replace(/^'|'$/g, '')) ?? [];
}

function getCliArgValue(tokens, flag) {
  const index = tokens.findIndex((token) => token === flag);
  if (index < 0 || index + 1 >= tokens.length) {
    return '';
  }
  return tokens[index + 1] ?? '';
}

function readCaseContractSources(caseId) {
  const workspaceTexts = {};
  const rawEntries = getAutoModelingContractReadPlan(caseId).map((entry) => {
    const resolvedRelPath = entry.relPaths.find((relPath) => fileExists(relPath)) ?? entry.relPaths[0] ?? '';
    const text = resolvedRelPath ? readTextIfExists(resolvedRelPath) : null;
    if (text) {
      workspaceTexts[resolvedRelPath] = text;
    }
    return {
      ...entry,
      relPath: resolvedRelPath,
      text,
    };
  });

  return {
    workspaceTexts,
    rawEntries,
    contractBundle: parseAutoModelingLoopContractPayloads(caseId, rawEntries),
  };
}

function getCaseAcceptance(caseId) {
  return acceptanceConfig?.cases?.[caseId] ?? null;
}

function readAcceptanceArtifacts(caseId) {
  const acceptance = getCaseAcceptance(caseId);
  if (!acceptance) {
    return {
      acceptance: null,
      wnal: null,
      pipelineSummary: null,
    };
  }
  return {
    acceptance,
    wnal: readJsonIfExists(acceptance.wnal_json_relpath),
    pipelineSummary: readJsonIfExists(acceptance.pipeline_summary_relpath),
  };
}

function resolveTriadMemberRel(caseId, basename) {
  const canonical = contractPath(caseId, `${basename}.json`);
  if (fileExists(canonical)) {
    return canonical;
  }
  const fallback = contractPath(caseId, `${basename}.contract.json`);
  return fileExists(fallback) ? fallback : '';
}

function triadMemberUsesBridgeFallback(relPath) {
  return typeof relPath === 'string' && relPath.endsWith('.contract.json');
}

function buildFailedWorkflowSummary(progress) {
  const failedWorkflows = [];
  for (const record of Array.isArray(progress?.records) ? progress.records : []) {
    const status = String(record?.status ?? 'unknown');
    if (!['failed', 'timeout', 'error'].includes(status)) {
      continue;
    }
    const excerpt = String(record?.excerpt ?? '');
    let category = 'unknown';
    const excerptLower = excerpt.toLowerCase();
    if (status === 'timeout' || excerptLower.includes('timeout')) {
      category = 'timeout';
    } else if (
      excerptLower.includes('environment') ||
      excerptLower.includes('docker') ||
      excerptLower.includes('container') ||
      excerptLower.includes('command not found')
    ) {
      category = 'environment';
    } else if (
      excerptLower.includes('gate') ||
      excerptLower.includes('assertion') ||
      excerptLower.includes('threshold')
    ) {
      category = 'gate';
    } else if (
      excerptLower.includes('data') ||
      excerptLower.includes('json') ||
      excerptLower.includes('parse') ||
      excerptLower.includes('missing')
    ) {
      category = 'data';
    }

    failedWorkflows.push({
      workflow: String(record?.workflow_key ?? 'unknown'),
      status,
      category,
      message: excerpt.length > 200 ? `${excerpt.slice(0, 197)}...` : excerpt,
    });
  }
  return failedWorkflows;
}

function buildCaseContractSummary(caseId) {
  const progress = readJsonIfExists(contractPath(caseId, 'e2e_live_progress.latest.json')) ?? {};
  const coverage = readJsonIfExists(contractPath(caseId, 'outcome_coverage_report.latest.json')) ?? {};
  const verification = readJsonIfExists(contractPath(caseId, 'e2e_outcome_verification_report.json')) ?? {};
  const dataPack =
    readJsonIfExists(contractPath(caseId, 'data_pack.latest.json')) ??
    readJsonIfExists(contractPath(caseId, 'data_pack.contract.json')) ??
    readJsonIfExists(contractPath(caseId, 'data_pack.v2.json')) ??
    {};

  const triadWorkflowRunRel = resolveTriadMemberRel(caseId, 'workflow_run');
  const triadReviewBundleRel = resolveTriadMemberRel(caseId, 'review_bundle');
  const triadReleaseManifestRel = resolveTriadMemberRel(caseId, 'release_manifest');
  const triadRelPaths = [triadWorkflowRunRel, triadReviewBundleRel, triadReleaseManifestRel].filter(Boolean);
  const triadCount = triadRelPaths.length;
  const triadBridgeFallbackCount = triadRelPaths.filter((relPath) => triadMemberUsesBridgeFallback(relPath)).length;
  const triadCanonicalCount = triadCount - triadBridgeFallbackCount;
  const triadTruthStatus = triadCount === 3 ? 'real_ready' : triadCount > 0 ? 'partial_real' : 'missing';
  const workflowOutputsCount =
    Number(progress?.summary?.outcomes_generated ?? coverage?.outcomes_generated ?? 0);
  const pipelineMinimalContractReady =
    workflowOutputsCount > 0 &&
    jsonRelFileExists(dataPack?.review_gates?.basin_validation_json) &&
    jsonRelFileExists(dataPack?.source_bundle_json);
  const pipelineContractReady =
    pipelineMinimalContractReady &&
    (fileExists(contractPath(caseId, 'delineation.latest.json')) ||
      fileExists(contractPath(caseId, 'watershed_delineation_result.latest.json'))) &&
    fileExists(contractPath(caseId, 'hydrology_sim.latest.json'));

  const pendingWorkflows = Array.isArray(verification?.stage2_execution_integrity?.pending_workflows)
    ? verification.stage2_execution_integrity.pending_workflows.map((item) =>
        typeof item === 'string' ? item : String(item?.workflow_key ?? ''),
      ).filter(Boolean)
    : [];

  const releaseGateBlockers = [];
  if (!triadWorkflowRunRel) {
    releaseGateBlockers.push('缺少 workflow_run（.json / .contract.json）');
  }
  if (!triadReviewBundleRel) {
    releaseGateBlockers.push('缺少 review_bundle（.json / .contract.json）');
  }
  if (!triadReleaseManifestRel) {
    releaseGateBlockers.push('缺少 release_manifest（.json / .contract.json）');
  }
  if (verification?.stage2_execution_integrity && verification.stage2_execution_integrity.closure_check_passed === false) {
    releaseGateBlockers.push('e2e_outcome_verification_report：closure_check_passed 为 false');
  }
  if (pendingWorkflows.length > 0) {
    releaseGateBlockers.push(`verification pending_workflows 非空（${pendingWorkflows.length} 项）`);
  }
  if (String(coverage?.gate_status ?? '') === 'blocked') {
    releaseGateBlockers.push('outcome_coverage_report gate_status=blocked');
  }
  if (triadBridgeFallbackCount > 0) {
    releaseGateBlockers.push(`triad 仍使用 bridge fallback（.contract.json ${triadBridgeFallbackCount} 项）`);
  }
  if (!pipelineContractReady) {
    releaseGateBlockers.push('pipeline_contract_ready=false（主链真相未闭合）');
  }
  if (triadTruthStatus !== 'real_ready') {
    releaseGateBlockers.push(`triad_truth_status=${triadTruthStatus}（bootstrap/混合 triad 不等于真实主链）`);
  }

  return {
    case_id: caseId,
    case_root: `cases/${caseId}`,
    total: Number(progress?.summary?.total ?? 0),
    passed: Number(progress?.summary?.passed ?? 0),
    failed: Number(progress?.summary?.failed ?? 0),
    timeout: Number(progress?.summary?.timeout ?? 0),
    pending: Number(progress?.summary?.pending ?? 0),
    current_workflow:
      String(progress?.current?.workflow_key ?? verification?.stage2_execution_integrity?.current_workflow ?? ''),
    outcomes_generated: workflowOutputsCount,
    raw_outcome_coverage: Number(progress?.summary?.outcome_coverage ?? 0),
    total_executed: Number(coverage?.total_executed ?? 0),
    normalized_outcome_coverage: Number(coverage?.outcome_coverage ?? 0),
    schema_valid_count: Number(coverage?.schema_valid_count ?? 0),
    evidence_bound_count: Number(coverage?.evidence_bound_count ?? 0),
    gate_status: String(coverage?.gate_status ?? 'unknown'),
    verification_generated_at: String(verification?.generated_at ?? ''),
    closure_check_passed: Boolean(verification?.stage2_execution_integrity?.closure_check_passed),
    duplicate_runs: Object.entries(coverage?.duplicate_runs ?? {}).map(([workflow, count]) => ({ workflow, count })),
    pending_workflows: pendingWorkflows,
    failed_workflows: buildFailedWorkflowSummary(progress),
    key_artifacts: [],
    triad_workflow_run_rel: triadWorkflowRunRel,
    triad_review_bundle_rel: triadReviewBundleRel,
    triad_release_manifest_rel: triadReleaseManifestRel,
    triad_count: triadCount,
    triad_placeholder_count: 0,
    triad_real_count: triadCount,
    triad_status: triadCount === 0 ? 'missing' : 'real',
    triad_truth_status: triadTruthStatus,
    triad_canonical_count: triadCanonicalCount,
    triad_bridge_fallback_count: triadBridgeFallbackCount,
    pipeline_minimal_contract_ready: pipelineMinimalContractReady,
    pipeline_contract_ready: pipelineContractReady,
    release_gate_eligible: releaseGateBlockers.length === 0,
    release_gate_blockers: releaseGateBlockers,
    delivery_pack_pointer_rel: '',
    delivery_latest_pack_rel: '',
    delivery_pack_id: '',
    delivery_pack_updated_at: '',
    delivery_pack_eligible_at_last_pack: false,
  };
}

function buildCaseArtifacts(caseId) {
  const artifactRelPaths = [
    contractPath(caseId, 'e2e_live_progress.latest.json'),
    contractPath(caseId, 'outcome_coverage_report.latest.json'),
    contractPath(caseId, 'e2e_outcome_verification_report.json'),
    outcomePath(caseId, 'autonomy_autorun.latest.json'),
    outcomePath(caseId, 'autonomy_assess.latest.json'),
  ].filter((relPath) => fileExists(relPath));

  return artifactRelPaths.map((relPath) => ({
    name: path.basename(relPath),
    category: relPath.includes('/outcomes/') ? 'outcome' : 'contract',
    path: relPath,
    updated_at: new Date(fs.statSync(path.join(WORKSPACE_ROOT, relPath)).mtimeMs).toISOString(),
  }));
}

function buildHappyPathFixture(caseId) {
  const summary = buildCaseContractSummary(caseId);
  const { workspaceTexts, contractBundle } = readCaseContractSources(caseId);
  const viewModel = deriveAutoModelingLoopContractViewModel({
    caseId,
    loopRun: {
      status: 'idle',
      attemptCount: 0,
      command: null,
      exitCode: null,
      message: '尚未启动真实自主建模闭环。',
      stdout: '',
      stderr: '',
      success: false,
    },
    summary,
    contractBundle,
  });
  const workflowName = 'autonomy_autorun';
  const logFile = `cases/${caseId}/contracts/${caseId}.playwright.workflow.log`;

  return {
    summary,
    workspaceTexts,
    contractBundle,
    viewModel,
    preflight: {
      case_id: caseId,
      phase: 'simulation',
      ok: true,
      missing_inputs: [],
      modeling_hints: {
        suggested_workflows: ['autonomy_autorun', 'autonomy_assess'],
        entry_sources: {
          case_manifest: fileExists(`cases/${caseId}/manifest.yaml`) ? `cases/${caseId}/manifest.yaml` : 'missing',
          source_bundle: summary.pipeline_minimal_contract_ready ? `cases/${caseId}/contracts/data_pack.latest.json` : 'missing',
          outlets: `cases/${caseId}/contracts/outcome_coverage_report.latest.json`,
          simulation_config: `cases/${caseId}/contracts/e2e_live_progress.latest.json`,
        },
      },
    },
    autoModelingRun: {
      success: true,
      status: 0,
      stdout: `${caseId} auto modeling fixture completed`,
      stderr: '',
    },
    workflowName,
    launchResult: {
      workflow: workflowName,
      case_id: caseId,
      backend: 'playwright-fixture',
      log_file: logFile,
      pid: 4242,
      status: 'running',
      id: `${caseId}-${workflowName}-fixture`,
      started_at: '2026-04-11T18:00:00+08:00',
    },
    executionHistory: [
      {
        workflow: workflowName,
        case_id: caseId,
        backend: 'playwright-fixture',
        log_file: logFile,
        pid: 4242,
        status: 'running',
        id: `${caseId}-${workflowName}-fixture`,
        started_at: '2026-04-11T18:00:00+08:00',
      },
    ],
    caseArtifacts: buildCaseArtifacts(caseId),
    logTailByFile: {
      [logFile]: {
        log_file: logFile,
        lines: [`[fixture] ${workflowName} boot for ${caseId}`, '[fixture] contract-native UI validation'],
      },
    },
  };
}

function buildBridgeFixture(caseId, fixture) {
  return {
    caseContractSummaryById: {
      [caseId]: fixture.summary,
    },
    workspaceTexts: fixture.workspaceTexts,
    preflightByCase: {
      [caseId]: fixture.preflight,
    },
    autoModelingRunByCase: {
      [caseId]: fixture.autoModelingRun,
    },
    workflowLaunchByCase: {
      [caseId]: {
        [fixture.workflowName]: fixture.launchResult,
      },
    },
    executionHistory: fixture.executionHistory,
    caseArtifactsById: {
      [caseId]: fixture.caseArtifacts,
    },
    logTailByFile: fixture.logTailByFile,
    contextCheckpoints: [
      {
        name: `${caseId}-checkpoint`,
        path: `cases/${caseId}/contracts/e2e_outcome_verification_report.json`,
        current: true,
      },
    ],
  };
}

async function installFixture(page, caseId, fixture) {
  await page.addInitScript((value) => {
    window.__HYDRODESK_PLAYWRIGHT_FIXTURE__ = value;
  }, buildBridgeFixture(caseId, fixture));
}

async function visitSimulation(page, caseId, fixture) {
  await installFixture(page, caseId, fixture);
  await page.goto(`/simulation?case_id=${caseId}`);
  await expect(page).toHaveURL(new RegExp(`/simulation\\?case_id=${caseId}$`));
  await expect(page.getByRole('button', { name: 'Start AutoModeling Loop' })).toBeVisible();
  await expect(page.locator('main').getByText(new RegExp(`case\\s+${caseId}`, 'i')).first()).toBeVisible();
}

async function expectAutoModelingPanel(page, viewModel) {
  const panel = page.getByTestId('auto-modeling-loop-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('auto-modeling-loop-status')).toContainText(viewModel.statusLabel);
  await expect(panel.getByTestId('auto-modeling-loop-summary')).toContainText(viewModel.summaryText);
  for (const metric of viewModel.metrics) {
    await expect(panel.getByText(metric.label, { exact: true })).toBeVisible();
    await expect(panel.getByText(metric.value, { exact: true })).toBeVisible();
  }
  for (const item of viewModel.factItems.slice(0, 3)) {
    await expect(panel.getByTestId('auto-modeling-loop-facts')).toContainText(item);
  }
  for (const item of viewModel.evidenceItems.slice(0, 2)) {
    await expect(panel.getByTestId('auto-modeling-loop-facts')).toContainText(item);
  }
}

async function dispatchVisibleClick(locator) {
  await expect(locator).toBeVisible();
  await locator.dispatchEvent('click');
}

test.describe('6-Case Contract-Native E2E Loop', () => {
  for (const caseId of ROLLOUT_CASE_IDS) {
    test(`通过 /simulation?case_id=${caseId} 驱动真实 UI 并校验 case-bound contracts`, async ({ page }) => {
      const fixture = buildHappyPathFixture(caseId);
      const { acceptance, wnal, pipelineSummary } = readAcceptanceArtifacts(caseId);

      expect(acceptance, `${caseId} 缺少 Playwright acceptance 配置`).toBeTruthy();
      expect(wnal, `${caseId} 缺少 WNAL 产物 ${acceptance?.wnal_json_relpath ?? ''}`).toBeTruthy();
      expect(Number(wnal?.wnal_level ?? -1)).toBeGreaterThanOrEqual(Number(acceptance?.min_wnal_level ?? 0));

      const hydroNse = pipelineSummary?.calibration?.hydro_model?.NSE;
      if (
        acceptance?.assert_hydro_nse_when_pipeline_summary_present &&
        pipelineSummary &&
        typeof hydroNse === 'number'
      ) {
        expect(hydroNse).toBeGreaterThanOrEqual(Number(acceptance.min_hydro_nse));
      }

      // Readiness board: 0 blocked 维度是所有 case 的硬性验收标准
      const readinessReport = readJsonIfExists(`cases/${caseId}/contracts/wnal_level_report.json`);
      if (readinessReport) {
        expect(readinessReport.status, `${caseId} wnal_level_report status should not be blocked`).not.toBe('blocked');
      }

      await visitSimulation(page, caseId, fixture);
      await expect(page.getByTestId('simulation-case-gate')).toContainText(fixture.summary.gate_status);
      await expect(page.getByTestId('simulation-case-gate')).toContainText(
        `${fixture.summary.evidence_bound_count}/${fixture.summary.schema_valid_count}`,
      );

      await expectAutoModelingPanel(page, fixture.viewModel);

      await dispatchVisibleClick(page.getByRole('button', { name: '刷新 preflight' }));
      await expect(page.getByTestId('simulation-pipeline-preflight')).toContainText(`ok ${String(Boolean(fixture.preflight.ok))}`);
      await expect(page.getByTestId('simulation-pipeline-preflight')).toContainText(`phase ${fixture.preflight.phase}`);
      await expect(page.getByTestId('simulation-pipeline-preflight')).toContainText(caseId);

      await dispatchVisibleClick(page.getByRole('button', { name: 'Start AutoModeling Loop' }));
      const panel = page.getByTestId('auto-modeling-loop-panel');
      await expect(panel.getByTestId('auto-modeling-loop-run-feedback')).toContainText(
        fixture.autoModelingRun.stdout,
      );
      await expect(panel.getByTestId('auto-modeling-loop-command')).toContainText(
        buildAutoLearningLoopCommand(caseId),
      );

      const pinnedCard = page.getByTestId(`pinned-workflow-${fixture.workflowName}`);
      await expect(pinnedCard).toBeVisible();
      await dispatchVisibleClick(pinnedCard.getByRole('button', { name: '直接启动' }));
      await expect(page.getByTestId('simulation-launch-result')).toContainText(
        `${fixture.launchResult.workflow} · case ${caseId}`,
      );
      await expect(page.getByTestId('simulation-launch-result')).toContainText(
        fixture.launchResult.log_file,
      );
      const logSection = page.locator('section').filter({
        has: page.getByRole('heading', { name: '启动后日志跟踪' }),
      });
      await expect(logSection).toContainText(
        `[fixture] ${fixture.workflowName} boot for ${caseId}`,
      );
    });
  }

  test('缺少 contracts 时暴露无真实结果诊断，而不是旁路 WNAL 兜底', async ({ page }) => {
    const caseId = 'daduhe';
    const fixture = buildHappyPathFixture(caseId);
    fixture.summary = {
      ...fixture.summary,
      total: 0,
      passed: 0,
      failed: 0,
      timeout: 0,
      pending: 0,
      outcomes_generated: 0,
      total_executed: 0,
      normalized_outcome_coverage: 0,
      schema_valid_count: 0,
      evidence_bound_count: 0,
      gate_status: 'unknown',
      failed_workflows: [],
      release_gate_blockers: [],
      pipeline_contract_ready: false,
    };
    fixture.workspaceTexts = {};
    fixture.viewModel = deriveAutoModelingLoopContractViewModel({
      caseId,
      loopRun: {
        status: 'idle',
        attemptCount: 0,
        command: null,
        exitCode: null,
        message: '尚未启动真实自主建模闭环。',
        stdout: '',
        stderr: '',
        success: false,
      },
      summary: fixture.summary,
      contractBundle: parseAutoModelingLoopContractPayloads(caseId, []),
    });

    await visitSimulation(page, caseId, fixture);
    const panel = page.getByTestId('auto-modeling-loop-panel');
    await expect(panel.getByTestId('auto-modeling-loop-status')).toContainText('无真实结果');
    await expect(panel.getByTestId('auto-modeling-loop-summary')).toContainText(
      `case ${caseId} 还没有真实自主建模 contract/runtime 结果。`,
    );
    await expect(panel.getByTestId('auto-modeling-loop-facts')).toContainText('autonomy_autorun: 暂无产物');
  });

  test('contract case_id 错位时给出产物错位诊断', async ({ page }) => {
    const caseId = 'daduhe';
    const fixture = buildHappyPathFixture(caseId);
    const autorunRelPath =
      getAutoModelingContractReadPlan(caseId)
        .find((entry) => entry.key === 'autorun')
        ?.relPaths.find((relPath) => relPath in fixture.workspaceTexts) ?? outcomePath(caseId, 'autonomy_autorun.latest.json');
    const wrongPayload = JSON.parse(fixture.workspaceTexts[autorunRelPath]);
    wrongPayload.case_id = 'yinchuojiliao';
    fixture.workspaceTexts[autorunRelPath] = JSON.stringify(wrongPayload, null, 2);
    fixture.viewModel = deriveAutoModelingLoopContractViewModel({
      caseId,
      loopRun: {
        status: 'idle',
        attemptCount: 0,
        command: null,
        exitCode: null,
        message: '尚未启动真实自主建模闭环。',
        stdout: '',
        stderr: '',
        success: false,
      },
      summary: fixture.summary,
      contractBundle: parseAutoModelingLoopContractPayloads(
        caseId,
        getAutoModelingContractReadPlan(caseId).map((entry) => ({
          ...entry,
          relPath: entry.relPaths.find((relPath) => relPath in fixture.workspaceTexts) ?? entry.relPaths[0] ?? '',
          text:
            fixture.workspaceTexts[
              entry.relPaths.find((relPath) => relPath in fixture.workspaceTexts) ?? entry.relPaths[0] ?? ''
            ] ?? null,
        })),
      ),
    });

    await visitSimulation(page, caseId, fixture);
    const panel = page.getByTestId('auto-modeling-loop-panel');
    await expect(panel.getByTestId('auto-modeling-loop-status')).toContainText('产物错位');
    await expect(panel.getByTestId('auto-modeling-loop-summary')).toContainText(
      `autonomy_autorun 的 case_id=yinchuojiliao，与当前 case_id=${caseId} 不一致。`,
    );
  });

  test('workflow/gate 失败时给出失败根因与 stderr 诊断', async ({ page }) => {
    const caseId = 'daduhe';
    const fixture = buildHappyPathFixture(caseId);
    fixture.summary = {
      ...fixture.summary,
      failed: 1,
      gate_status: 'blocked',
      pipeline_contract_ready: false,
      failed_workflows: [
        {
          workflow: 'autonomy_autorun',
          status: 'failed',
          category: 'gate',
          message: 'autonomy_autorun failed: missing verification bundle',
        },
      ],
      release_gate_blockers: ['outcome_coverage_report gate_status=blocked'],
    };
    fixture.autoModelingRun = {
      success: false,
      status: 2,
      stdout: '',
      stderr: 'autonomy_autorun gate failed: missing verification bundle',
    };
    fixture.viewModel = deriveAutoModelingLoopContractViewModel({
      caseId,
      loopRun: {
        status: 'idle',
        attemptCount: 0,
        command: null,
        exitCode: null,
        message: '尚未启动真实自主建模闭环。',
        stdout: '',
        stderr: '',
        success: false,
      },
      summary: fixture.summary,
      contractBundle: fixture.contractBundle,
    });

    await visitSimulation(page, caseId, fixture);
    await expect(page.getByTestId('simulation-case-gate')).toContainText('blocked');
    const panel = page.getByTestId('auto-modeling-loop-panel');
    await expect(panel.getByTestId('auto-modeling-loop-status')).toContainText('存在失败');
    await expect(panel.getByTestId('auto-modeling-loop-summary')).toContainText(
      'autonomy_autorun failed: missing verification bundle',
    );
    await expect(panel.getByTestId('auto-modeling-loop-details')).toContainText(
      'outcome_coverage_report gate_status=blocked',
    );

    await dispatchVisibleClick(page.getByRole('button', { name: 'Start AutoModeling Loop' }));
    await expect(panel.getByTestId('auto-modeling-loop-run-feedback')).toContainText(
      fixture.autoModelingRun.stderr,
    );
    await expect(panel.getByText('Exit Code: 2')).toBeVisible();
  });
});
