import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { readWorkspaceTextFileFirstOf, runWorkspaceCommand } from '../api/tauri_bridge';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import {
  buildAutoLearningLoopCommand,
  resolveAutoModelingLoopOutcome,
} from './autoModelingLoopRuntime.js';
import {
  deriveAutoModelingLoopContractViewModel,
  getAutoModelingContractReadPlan,
  parseAutoModelingLoopContractPayloads,
} from './autoModelingLoopPanelState.js';

const EMPTY_CONTRACT_BUNDLE = {
  payloads: {},
  issues: [],
  evidenceSources: [],
  hasRealData: false,
  hasCaseMismatch: false,
};

const STATUS_TONE_CLASS = {
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
  slate: 'border-slate-700 bg-slate-800/80 text-slate-200',
};

export default function AutoModelingLoopPanel({ caseId }) {
  const [isRunning, setIsRunning] = useState(false);
  const [loopRun, setLoopRun] = useState({
    status: 'idle',
    attemptCount: 0,
    command: null,
    exitCode: null,
    message: '尚未启动真实自主建模闭环。',
    stdout: '',
    stderr: '',
    success: false,
  });
  const [contractBundle, setContractBundle] = useState(EMPTY_CONTRACT_BUNDLE);
  const [contractsLoading, setContractsLoading] = useState(false);
  const { summary: contractSummary, loading: contractSummaryLoading, reload: reloadContractSummary } =
    useCaseContractSummary(caseId || '');

  const loadContractBundle = useCallback(async () => {
    const normalizedCaseId = String(caseId ?? '').trim();
    if (!normalizedCaseId) {
      setContractBundle(EMPTY_CONTRACT_BUNDLE);
      return;
    }

    setContractsLoading(true);
    try {
      const plan = getAutoModelingContractReadPlan(normalizedCaseId);
      const rawEntries = await Promise.all(
        plan.map(async (entry) => {
          const text = await readWorkspaceTextFileFirstOf(entry.relPaths, null);
          return {
            ...entry,
            relPath: entry.relPaths[0] ?? '',
            text,
          };
        }),
      );
      setContractBundle(parseAutoModelingLoopContractPayloads(normalizedCaseId, rawEntries));
    } finally {
      setContractsLoading(false);
    }
  }, [caseId]);

  const refreshPanelData = useCallback(async () => {
    await Promise.all([reloadContractSummary(), loadContractBundle()]);
  }, [loadContractBundle, reloadContractSummary]);

  useEffect(() => {
    void loadContractBundle();
    const timer = setInterval(() => {
      void loadContractBundle();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadContractBundle]);

  const startLoop = async () => {
    const command = buildAutoLearningLoopCommand(caseId);
    const nextAttempt = loopRun.attemptCount + 1;
    setIsRunning(true);
    setLoopRun({
      status: 'running',
      attemptCount: nextAttempt,
      command,
      exitCode: null,
      message: `正在为 case ${caseId} 启动真实自主建模闭环...`,
      stdout: '',
      stderr: '',
      success: false,
    });
    try {
      const result = await runWorkspaceCommand(command, '.', null);
      const outcome = resolveAutoModelingLoopOutcome({ caseId, result, error: null });
      setLoopRun({
        ...outcome,
        attemptCount: nextAttempt,
      });
    } catch (error) {
      const outcome = resolveAutoModelingLoopOutcome({ caseId, result: null, error });
      setLoopRun({
        ...outcome,
        command,
        attemptCount: nextAttempt,
      });
    }
    setIsRunning(false);
    await refreshPanelData();
  };

  const viewModel = useMemo(
    () =>
      deriveAutoModelingLoopContractViewModel({
        caseId,
        loopRun,
        summary: contractSummary,
        contractBundle,
      }),
    [caseId, loopRun, contractSummary, contractBundle],
  );

  const statusToneClass = STATUS_TONE_CLASS[viewModel.statusTone] || STATUS_TONE_CLASS.slate;
  const isSyncing = contractSummaryLoading || contractsLoading;

  return (
    <div data-testid="auto-modeling-loop-panel" className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-2">AutoModeling Loop (E2E)</h3>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={startLoop}
          disabled={isRunning || !caseId}
          className="bg-hydro-600 hover:bg-hydro-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
        >
          {isRunning ? 'Looping...' : 'Start AutoModeling Loop'}
        </button>
        <span className="text-sm text-slate-400">
          Status: {viewModel.statusLabel} | Attempts: {loopRun.attemptCount} {isSyncing ? '| Syncing real contracts...' : ''}
        </span>
      </div>

      <div className="space-y-3 text-sm text-slate-300">
        <div data-testid="auto-modeling-loop-status" className={`rounded-lg border px-3 py-3 ${statusToneClass}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-70">真实状态</div>
              <div className="mt-1 text-sm font-semibold">{viewModel.statusLabel}</div>
            </div>
            <div className="rounded-full border border-current/30 px-3 py-1 text-[11px] uppercase tracking-wide">
              {viewModel.stateKey}
            </div>
          </div>
          <div data-testid="auto-modeling-loop-summary" className="mt-2 text-sm">{viewModel.summaryText}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {viewModel.metrics.map((metric) => (
            <div key={metric.label} className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{metric.value}</div>
            </div>
          ))}
        </div>

        <div data-testid="auto-modeling-loop-run-feedback" className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">运行反馈</div>
          <div className="text-slate-200">{loopRun.message}</div>
          {loopRun.exitCode !== null ? (
            <div className="text-xs text-slate-500 mt-2">Exit Code: {loopRun.exitCode}</div>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div data-testid="auto-modeling-loop-details" className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">关键事实</div>
            {viewModel.detailItems.length > 0 ? (
              <ul className="space-y-2 text-[12px] text-slate-300">
                {viewModel.detailItems.map((item) => (
                  <li key={item} className="leading-5">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12px] text-slate-500">当前没有额外的失败根因、弱项维度或 gate blocker。</div>
            )}
          </div>

          <div data-testid="auto-modeling-loop-facts" className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">状态依据</div>
            <ul className="space-y-2 text-[12px] text-slate-300">
              {viewModel.factItems.map((item) => (
                <li key={item} className="leading-5">
                  {item}
                </li>
              ))}
              {viewModel.evidenceItems.map((item) => (
                <li key={item} className="leading-5 text-slate-400">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {loopRun.command ? (
          <div data-testid="auto-modeling-loop-command" className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">真实执行命令</div>
            <code className="block whitespace-pre-wrap break-all text-[12px] text-emerald-300">
              {loopRun.command}
            </code>
          </div>
        ) : null}

        {loopRun.stderr ? (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wide text-rose-300/70 mb-2">stderr</div>
            <pre className="whitespace-pre-wrap break-words text-[12px] text-rose-100">{loopRun.stderr}</pre>
          </div>
        ) : null}

        {loopRun.stdout ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">stdout</div>
            <pre className="whitespace-pre-wrap break-words text-[12px] text-slate-300">{loopRun.stdout}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
