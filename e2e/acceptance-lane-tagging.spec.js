import { test, expect } from '@playwright/test';
import { invokeCommand } from '../src/api/tauri_bridge.js';

function buildBridgePayload(acceptanceLane) {
  return {
    acceptanceLane,
    acceptanceEvidence: {
      case_id: 'daduhe',
      contracts_root: 'cases/daduhe/contracts',
      lane: acceptanceLane,
    },
    caseContractSummaryById: {
      daduhe: {
        case_id: 'daduhe',
        gate_status: 'pass',
      },
    },
    preflightByCase: {
      daduhe: {
        case_id: 'daduhe',
        phase: 'simulation',
        ok: true,
      },
    },
  };
}

function installWindowFixture(acceptanceLane) {
  globalThis.window = {
    __HYDRODESK_PLAYWRIGHT_FIXTURE__: buildBridgePayload(acceptanceLane),
  };
}

test.describe('Playwright Acceptance Lane Tagging', () => {
  test.afterEach(() => {
    delete globalThis.window;
  });

  test('get_case_contract_summary 显式标记 fixture-pass / real-runtime-pass', async ({}, testInfo) => {
    installWindowFixture(testInfo.project.name);

    const result = await invokeCommand('get_case_contract_summary', { caseId: 'daduhe' }, null);

    expect(result).toMatchObject({
      case_id: 'daduhe',
      acceptance_lane: testInfo.project.name,
      acceptance_source: testInfo.project.name === 'real-runtime-pass' ? 'real-runtime' : 'fixture',
    });
    expect(result.acceptance_evidence).toMatchObject({
      case_id: 'daduhe',
      contracts_root: 'cases/daduhe/contracts',
      lane: testInfo.project.name,
    });
  });

  test('run_workspace_command 的预检结果保留来源标签，防止 fixture 误写成 real-runtime', async ({}, testInfo) => {
    installWindowFixture(testInfo.project.name);

    const result = await invokeCommand(
      'run_workspace_command',
      {
        command: 'python3 Hydrology/workflows/run_case_pipeline.py --case-id daduhe --phase simulation --dry-run',
        cwd: '.',
      },
      null,
    );

    expect(result).toMatchObject({
      success: true,
      acceptance_lane: testInfo.project.name,
      acceptance_source: testInfo.project.name === 'real-runtime-pass' ? 'real-runtime' : 'fixture',
    });
    expect(result.acceptance_evidence).toMatchObject({
      case_id: 'daduhe',
      lane: testInfo.project.name,
    });
  });
});
