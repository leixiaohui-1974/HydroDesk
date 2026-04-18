import {
  buildCaseManifestBusinessPreview,
  buildCaseDataIntelligenceBusinessPreview,
  buildControlValidationBusinessPreview,
  buildContractBusinessPreview,
  buildDocumentNoteBusinessPreview,
  buildFinalReportBusinessPreview,
  buildLiveDashboardBusinessPreview,
  buildManifestBusinessPreview,
  buildOutcomeCoverageBusinessPreview,
  buildRuntimeLogBusinessPreview,
  buildRuntimeRunBusinessPreview,
  buildVerificationBusinessPreview,
} from './workspaceBusinessPreviewBuilders.js';
import {
  buildStandardObjectReportIndexPreviewModel,
  buildStandardObjectReportPreviewModel,
} from './standardObjectReportPreview.js';

function normalizePreviewPath(path = '') {
  return String(path || '').toLowerCase();
}

export function findMatchingContractByPath(path, contractChain = []) {
  const lowerPath = normalizePreviewPath(path);
  return contractChain.find(
    (contract) =>
      lowerPath.endsWith(normalizePreviewPath(contract.path)) ||
      (contract.bridgePath && lowerPath.endsWith(normalizePreviewPath(contract.bridgePath)))
  ) || null;
}

export function getWorkspaceAssetPreviewKind({ path = '', previewType = '', kind = '' }) {
  const lowerPath = normalizePreviewPath(path);

  if (previewType === 'contract') return 'contract';
  if (previewType === 'notebook') return 'document_note';
  if (kind === 'log') return 'runtime_log';
  if (kind === 'run') return 'runtime_run';

  if (lowerPath.endsWith('manifest.yaml')) return 'manifest';
  if (lowerPath.endsWith('case_manifest.json')) return 'case_manifest';
  if (lowerPath.endsWith('case_data_intelligence.latest.json')) return 'case_data_intelligence';
  if (lowerPath.endsWith('control_validation.latest.json')) return 'control_validation';
  if (lowerPath.endsWith('final_report.latest.json')) return 'final_report';
  if (lowerPath.endsWith('outcome_coverage_report.latest.json')) return 'outcome_coverage';
  if (lowerPath.endsWith('e2e_outcome_verification_report.json')) return 'verification';
  if (lowerPath.endsWith('e2e_live_dashboard.html') || lowerPath.endsWith('e2e_live_dashboard.md')) return 'live_dashboard';
  if (lowerPath.endsWith('hydrodesk_review_memo.latest.md')) return 'review_memo';
  if (lowerPath.endsWith('hydrodesk_release_note.latest.md')) return 'release_note';
  if (lowerPath.endsWith('standard_object_reports.index.json')) return 'standard_object_report_index';
  if (
    lowerPath.includes('/object_reports/') &&
    (lowerPath.endsWith('.sample.json') || lowerPath.endsWith('.sample.md'))
  ) {
    return 'standard_object_report';
  }

  return null;
}

const PREVIEW_BUILDERS = {
  contract: buildContractBusinessPreview,
  manifest: buildManifestBusinessPreview,
  case_manifest: buildCaseManifestBusinessPreview,
  case_data_intelligence: buildCaseDataIntelligenceBusinessPreview,
  control_validation: buildControlValidationBusinessPreview,
  final_report: buildFinalReportBusinessPreview,
  outcome_coverage: buildOutcomeCoverageBusinessPreview,
  verification: buildVerificationBusinessPreview,
  live_dashboard: buildLiveDashboardBusinessPreview,
  document_note: buildDocumentNoteBusinessPreview,
  review_memo: buildDocumentNoteBusinessPreview,
  release_note: buildDocumentNoteBusinessPreview,
  runtime_log: buildRuntimeLogBusinessPreview,
  runtime_run: buildRuntimeRunBusinessPreview,
  standard_object_report_index: buildStandardObjectReportIndexPreviewModel,
  standard_object_report: buildStandardObjectReportPreviewModel,
};

export function buildWorkspaceBusinessPreviewByKind(kind, args) {
  const builder = PREVIEW_BUILDERS[kind];
  if (!builder) return null;
  return builder(args);
}
