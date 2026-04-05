import { useCallback, useEffect, useState } from 'react';
import { getHydrologyWorkflows, getRuntimeSnapshot } from '../api/tauri_bridge';
import { isPlaywrightBrowserFixtureEnabled } from '../config/playwrightEnvGate';
import { getPendingApprovals, getRunningTasks, studioState } from '../data/studioState';
import workflowRegistryPlaywrightFixture from '../config/workflowRegistry.playwright.fixture.json';

const workflowFallback = studioState.workflowRuns.map((workflow) => ({
  name: workflow.name,
  description: workflow.type,
  required_args: ['case_id'],
  kind: 'fallback',
}));

/** 与 Hydrology WORKFLOW_REGISTRY 同构（由 scripts/export_workflow_registry_playwright_fixture.py 生成） */
const playwrightWorkflowRegistry = workflowRegistryPlaywrightFixture.map((w) => ({
  name: w.name,
  description: w.description,
  required_args: Array.isArray(w.required_args) && w.required_args.length ? w.required_args : ['case_id'],
  kind: 'playwright_registry_fixture',
}));

const runtimeFallback = {
  current_focus: 'HydroMind Studio unified shell bootstrap',
  phase: '统一主壳改造',
  status: 'using fallback runtime state',
  last_activity: '2026-04-02',
  blockers: ['真实 runtime state 尚未接入时使用产品层回退状态'],
  task_title: studioState.tasks[0]?.title || '',
  current_step: 'S1',
  next_action: studioState.tasks[0]?.detail || '',
  resume_prompt: '继续当前任务',
  packet_path: studioState.tasks[0]?.checkpoint || '',
  mode: 'studio-fallback',
  backend: studioState.tasks[0]?.backend || 'agent-teams-local',
  log_file: '',
  session_id: 'fallback-session',
  started_at: '',
  running: getRunningTasks().length > 0,
};

export function useStudioRuntime(pollMs = 5000) {
  const [workflows, setWorkflows] = useState(workflowFallback);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(runtimeFallback);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      if (isPlaywrightBrowserFixtureEnabled()) {
        setWorkflows(playwrightWorkflowRegistry);
        setRuntimeSnapshot(runtimeFallback);
        return;
      }

      const [workflowResult, runtimeResult] = await Promise.all([
        getHydrologyWorkflows(workflowFallback),
        getRuntimeSnapshot(runtimeFallback),
      ]);

      setWorkflows(Array.isArray(workflowResult) && workflowResult.length > 0 ? workflowResult : workflowFallback);
      setRuntimeSnapshot(runtimeResult || runtimeFallback);
    } catch (error) {
      setWorkflows(workflowFallback);
      setRuntimeSnapshot(runtimeFallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, pollMs);
    return () => {
      clearInterval(timer);
    };
  }, [load, pollMs]);

  return {
    workflows,
    runtimeSnapshot,
    loading,
    reload: load,
    pendingApprovals: getPendingApprovals(),
    runningTasks: getRunningTasks(),
  };
}
