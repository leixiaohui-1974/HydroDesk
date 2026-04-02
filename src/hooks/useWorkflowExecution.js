import { useCallback, useEffect, useState } from 'react';
import {
  getCaseArtifacts,
  getContextCheckpoints,
  getExecutionHistory,
  getLogTail,
  startHydrologyWorkflow,
  stopProcess,
} from '../api/tauri_bridge';

export function useWorkflowExecution(caseId, fallbackArtifacts = [], pollMs = 5000) {
  const [artifacts, setArtifacts] = useState(fallbackArtifacts);
  const [checkpoints, setCheckpoints] = useState([]);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [launchResult, setLaunchResult] = useState(null);
  const [logTail, setLogTail] = useState({ log_file: '', lines: [] });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async (activeLaunchResult = launchResult) => {
    setLoading(true);
    try {
      const [artifactResult, checkpointResult, historyResult] = await Promise.all([
        getCaseArtifacts(caseId, fallbackArtifacts),
        getContextCheckpoints([]),
        getExecutionHistory([]),
      ]);
      setArtifacts(Array.isArray(artifactResult) ? artifactResult : fallbackArtifacts);
      setCheckpoints(Array.isArray(checkpointResult) ? checkpointResult : []);
      setExecutionHistory(Array.isArray(historyResult) ? historyResult : []);
      if (activeLaunchResult?.log_file) {
        const logResult = await getLogTail(activeLaunchResult.log_file, 80, { log_file: activeLaunchResult.log_file, lines: [] });
        setLogTail(logResult || { log_file: activeLaunchResult.log_file, lines: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [caseId, fallbackArtifacts, launchResult]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      load();
    }, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  const startWorkflow = useCallback(async (workflowName) => {
    setStarting(true);
    try {
      const result = await startHydrologyWorkflow(workflowName, caseId, null);
      setLaunchResult(result);
      await load(result);
      return result;
    } finally {
      setStarting(false);
    }
  }, [caseId, load]);

  const stopWorkflow = useCallback(async (pid = launchResult?.pid) => {
    if (!pid) {
      return false;
    }
    const stopped = await stopProcess(pid, false);
    if (stopped) {
      setLaunchResult((previous) =>
        previous && previous.pid === pid
          ? {
              ...previous,
              status: 'stopped',
            }
          : previous
      );
      await load();
    }
    return stopped;
  }, [launchResult, load]);

  return {
    artifacts,
    checkpoints,
    executionHistory,
    launchResult,
    logTail,
    loading,
    starting,
    reload: load,
    startWorkflow,
    stopWorkflow,
  };
}
