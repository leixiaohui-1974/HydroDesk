/**
 * 案例壳层通用 preset：与具体流域名解耦，供 Simulation / Sidebar / 文案使用。
 * 工作流注册键（如 autonomy_autorun）保持不变；展示文案随当前案例变化。
 */

import rolloutRegistry from '../config/playwrightRollout.generated.json';

/** 主链 pinned workflow：与 Hydrology 注册表键一致 */
export const AUTONOMY_PINNED_WORKFLOW_CARDS = [
  {
    workflow: 'autonomy_autorun',
    label: 'Run 主链',
    summary:
      '触发当前案例自主运行闭环，把 live dashboard、运行日志与 gate 资产绑定到同一条执行链。',
  },
  {
    workflow: 'autonomy_assess',
    label: 'Review Gate',
    summary: '主链执行后补充自治评估与验收 gate，避免 review 入口散落在不同目录。',
  },
];

/**
 * @param {string | undefined | null} caseId
 * @returns {string}
 */
export function formatCaseLabel(caseId) {
  const raw = caseId != null ? String(caseId).trim() : '';
  return raw || '当前案例';
}

/**
 * @param {string | undefined | null} caseId
 */
export function caseGatePanelLabel(caseId) {
  return `${formatCaseLabel(caseId)} · Gate`;
}

/**
 * @param {string | undefined | null} caseId
 */
export function caseAutonomyChainSectionTitle(caseId) {
  return `${formatCaseLabel(caseId)} · 自主运行链路`;
}

/**
 * @param {string | undefined | null} caseId
 */
export function caseWorkbenchTitle(caseId) {
  return `${formatCaseLabel(caseId)} Workbench`;
}

/**
 * 具备「探源 / source_selection + 流域划分 + 断面分析 + 水文主链」全量 contracts 证据导航的案例。
 * 来源：`hydrodesk_autonomous_waternet_e2e_loop.yaml` → `hydrodesk_shell.full_spatial_hydro_evidence_case_ids`，
 * 经 `export_playwright_rollout_registry.py` 写入 `playwrightRollout.generated.json`。
 */
export const FULL_SPATIAL_HYDRO_EVIDENCE_CASE_IDS = Object.freeze(
  Array.isArray(rolloutRegistry.full_spatial_hydro_evidence_case_ids)
    ? [...rolloutRegistry.full_spatial_hydro_evidence_case_ids]
    : []
);

/**
 * @param {string | undefined | null} caseId
 */
export function hasFullSpatialHydroEvidenceCase(caseId) {
  const cid = caseId != null ? String(caseId).trim() : '';
  return FULL_SPATIAL_HYDRO_EVIDENCE_CASE_IDS.includes(cid);
}

/**
 * 文案用：当前配置下「全链空间水文证据」案例 id 列表（来自闭环 YAML 导出）。
 * @returns {string}
 */
export function formatFullSpatialHydroEvidenceCaseListText() {
  const ids = FULL_SPATIAL_HYDRO_EVIDENCE_CASE_IDS;
  if (!ids.length) {
    return '（未配置：hydrodesk_shell.full_spatial_hydro_evidence_case_ids）';
  }
  return ids.join('、');
}
