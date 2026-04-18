import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAutoLearningLoopCommand,
  resolveAutoModelingLoopOutcome,
} from './autoModelingLoopRuntime.js';

test('buildAutoLearningLoopCommand binds the real workflow entry and case id', () => {
  assert.equal(
    buildAutoLearningLoopCommand('daduhe'),
    "'python3' 'Hydrology/workflows/run_auto_learning_loop.py' '--case-id' 'daduhe'",
  );
});

test('resolveAutoModelingLoopOutcome treats browser fallback as a real failure instead of fake success', () => {
  const outcome = resolveAutoModelingLoopOutcome({
    caseId: 'daduhe',
    result: null,
    error: null,
  });

  assert.equal(outcome.status, 'failed');
  assert.match(outcome.message, /Tauri|桌面环境/);
});

test('resolveAutoModelingLoopOutcome exposes stderr for failed workflow execution', () => {
  const outcome = resolveAutoModelingLoopOutcome({
    caseId: 'daduhe',
    result: {
      success: false,
      status: 2,
      stdout: '',
      stderr: 'missing contracts',
      command: "'python3' 'Hydrology/workflows/run_auto_learning_loop.py' '--case-id' 'daduhe'",
    },
    error: null,
  });

  assert.equal(outcome.status, 'failed');
  assert.match(outcome.message, /missing contracts/);
});
