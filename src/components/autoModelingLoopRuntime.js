const DEFAULT_PYTHON = 'python3';
const AUTO_LEARNING_LOOP_SCRIPT = 'Hydrology/workflows/run_auto_learning_loop.py';

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function buildAutoLearningLoopCommand(caseId) {
  const normalizedCaseId = String(caseId ?? '').trim();
  if (!normalizedCaseId) {
    throw new Error('缺少 case_id，无法启动自主建模闭环。');
  }
  return [
    shellSingleQuote(DEFAULT_PYTHON),
    shellSingleQuote(AUTO_LEARNING_LOOP_SCRIPT),
    shellSingleQuote('--case-id'),
    shellSingleQuote(normalizedCaseId),
  ].join(' ');
}

function pickExecutionMessage(result) {
  const stderr = String(result?.stderr ?? '').trim();
  const stdout = String(result?.stdout ?? '').trim();
  return stderr || stdout || '自主建模闭环未返回可诊断输出。';
}

export function resolveAutoModelingLoopOutcome({ caseId, result, error }) {
  if (error) {
    return {
      status: 'failed',
      caseId,
      command: result?.command ?? null,
      exitCode: result?.status ?? null,
      message: error.message || '自主建模闭环执行失败。',
      stdout: result?.stdout ?? '',
      stderr: result?.stderr ?? '',
      success: false,
    };
  }

  if (!result) {
    return {
      status: 'failed',
      caseId,
      command: null,
      exitCode: null,
      message: '当前环境无法执行真实自主建模闭环。请在 HydroDesk Tauri 桌面端运行。',
      stdout: '',
      stderr: '',
      success: false,
    };
  }

  if (!result.success) {
    return {
      status: 'failed',
      caseId,
      command: result.command ?? null,
      exitCode: result.status ?? null,
      message: pickExecutionMessage(result),
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      success: false,
    };
  }

  return {
    status: 'completed',
    caseId,
    command: result.command ?? null,
    exitCode: result.status ?? 0,
    message: pickExecutionMessage(result),
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    success: true,
  };
}
