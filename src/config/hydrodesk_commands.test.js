import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRunSourceSyncCommand,
  buildPythonScriptCommand,
  buildExportCaseDataIntelligenceCommand,
  buildExportCaseDataIntelligenceBatchCommand,
} from './hydrodesk_commands.js';

test('buildRunSourceSyncCommand binds the source_sync workflow entry and case id', () => {
  assert.equal(
    buildRunSourceSyncCommand('daduhe'),
    "'python3' 'Hydrology/workflows/run_source_sync.py' '--case-id' 'daduhe'",
  );
});

test('buildPythonScriptCommand preserves additional argv for source sync compatibility calls', () => {
  assert.equal(
    buildPythonScriptCommand('Hydrology/workflows/run_source_sync.py', [
      '--case-id',
      'daduhe',
      '--skip-wiki-sync',
    ]),
    "'python3' 'Hydrology/workflows/run_source_sync.py' '--case-id' 'daduhe' '--skip-wiki-sync'",
  );
});

test('buildExportCaseDataIntelligenceCommand binds the current case intelligence export script', () => {
  assert.equal(
    buildExportCaseDataIntelligenceCommand('zhongxian'),
    "'python3' 'Hydrology/scripts/export_case_data_intelligence.py' '--case-id' 'zhongxian' '--write-latest'",
  );
});

test('buildExportCaseDataIntelligenceBatchCommand binds the rollout config for six-case export', () => {
  assert.equal(
    buildExportCaseDataIntelligenceBatchCommand(),
    "'python3' 'Hydrology/scripts/export_case_data_intelligence.py' '--config' 'Hydrology/configs/hydrodesk_autonomous_waternet_e2e_loop.yaml' '--write-latest'",
  );
});
