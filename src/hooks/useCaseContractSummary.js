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
  failed_workflows: [],
  key_artifacts: [],
  triad_workflow_run_rel: '',
  triad_review_bundle_rel: '',
  triad_release_manifest_rel: '',
  triad_count: 0,
  triad_placeholder_count: 0,
  triad_real_count: 0,
  triad_status: 'missing',
  triad_truth_status: 'missing',
  triad_canonical_count: 0,
  triad_bridge_fallback_count: 0,
  pipeline_minimal_contract_ready: false,
  pipeline_contract_ready: false,
  release_gate_eligible: false,
  release_gate_blockers: [],
  delivery_pack_pointer_rel: '',
  delivery_latest_pack_rel: '',
  delivery_pack_id: '',
  delivery_pack_updated_at: '',
  delivery_pack_eligible_at_last_pack: false,
  final_report_present: false,
  final_report_path: '',
  final_report_generated_at: '',
  final_report_status: '',
  final_report_release_board_status: '',
  final_report_promotion_status: '',
  final_report_review_verdict: '',
  final_report_release_status: '',
  final_report_assertion_total: 0,
  final_report_assertion_passed: 0,
  final_report_acceptance_scope: '',
  final_report_acceptance_source: '',
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
