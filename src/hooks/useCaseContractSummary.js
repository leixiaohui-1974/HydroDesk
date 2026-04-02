import { useCallback, useEffect, useState } from 'react';
import { getCaseContractSummary } from '../api/tauri_bridge';

const fallbackSummary = (caseId) => ({
  case_id: caseId,
  case_root: '',
  total: 0,
  passed: 0,
  failed: 0,
  timeout: 0,
  pending: 0,
  current_workflow: '',
  outcomes_generated: 0,
  raw_outcome_coverage: 0,
  total_executed: 0,
  normalized_outcome_coverage: 0,
  schema_valid_count: 0,
  evidence_bound_count: 0,
  gate_status: 'unknown',
  verification_generated_at: '',
  closure_check_passed: false,
  duplicate_runs: [],
  pending_workflows: [],
  key_artifacts: [],
});

export function useCaseContractSummary(caseId, pollMs = 5000) {
  const [summary, setSummary] = useState(fallbackSummary(caseId));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCaseContractSummary(caseId, fallbackSummary(caseId));
      setSummary(result || fallbackSummary(caseId));
    } catch (error) {
      setSummary(fallbackSummary(caseId));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  return {
    summary,
    loading,
    reload: load,
  };
}
