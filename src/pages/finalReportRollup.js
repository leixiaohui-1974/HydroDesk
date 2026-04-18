function normalizePromotionStatus(value) {
  const status = String(value || '').trim();
  if (!status) return 'missing';
  return status;
}

function normalizeAcceptanceScope(value) {
  const scope = String(value || '').trim();
  if (scope) return scope;
  return 'missing';
}

export function buildSixCaseFinalReportRollup({ caseIds = [], rows = [] } = {}) {
  const rowMap = new Map(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.case_id)
      .map((row) => [row.case_id, row]),
  );

  const normalizedRows = (Array.isArray(caseIds) ? caseIds : []).map((caseId) => {
    const row = rowMap.get(caseId) || { case_id: caseId };
    const finalReportPresent = Boolean(row.final_report_present);
    const acceptanceScope = normalizeAcceptanceScope(row.final_report_acceptance_scope);
    const promotionStatus = normalizePromotionStatus(
      row.final_report_promotion_status || row.final_report_release_board_status,
    );

    return {
      case_id: caseId,
      final_report_present: finalReportPresent,
      final_report_status: String(row.final_report_status || '').trim() || 'missing',
      final_report_acceptance_scope: acceptanceScope,
      final_report_release_board_status: String(row.final_report_release_board_status || '').trim() || promotionStatus,
      final_report_promotion_status: promotionStatus,
    };
  });

  const counts = {
    total: normalizedRows.length,
    finalReportPresent: normalizedRows.filter((row) => row.final_report_present).length,
    caseScopedAcceptance: normalizedRows.filter((row) => row.final_report_acceptance_scope === 'case').length,
    rolloutScopedAcceptance: normalizedRows.filter((row) => row.final_report_acceptance_scope === 'rollout').length,
    promotionReleaseReady: normalizedRows.filter((row) => row.final_report_promotion_status === 'release-ready').length,
    promotionNeedsReview: normalizedRows.filter((row) => row.final_report_promotion_status === 'needs-review').length,
    promotionBlocked: normalizedRows.filter((row) => row.final_report_promotion_status === 'blocked').length,
    promotionMissing: normalizedRows.filter((row) => row.final_report_promotion_status === 'missing').length,
  };

  const ready =
    counts.total > 0 &&
    counts.finalReportPresent === counts.total &&
    counts.promotionReleaseReady === counts.total;

  let summary = '六案例 final report 与推广状态尚未齐备。';
  if (ready) {
    summary = '六案例均具备 final_report，且推广状态全部为 release-ready。';
  } else if (counts.finalReportPresent < counts.total) {
    summary = '不能把单案 final report 成功视为六案例整体完成；仍有案例缺少 final_report。';
  } else if (counts.promotionBlocked > 0 || counts.promotionNeedsReview > 0) {
    summary = '六案例都已有 final_report，但推广状态仍存在 needs-review / blocked，尚不能宣称整体完成。';
  }

  return {
    rows: normalizedRows,
    counts,
    completion: {
      ready,
      status: ready ? 'release-ready' : 'incomplete',
      summary,
    },
  };
}
