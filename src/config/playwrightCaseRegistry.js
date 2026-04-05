/**
 * Playwright 浏览器 E2E：在 VITE_PLAYWRIGHT=1 且非 Tauri 时注入案例列表。
 * 数据来自 `playwrightRollout.generated.json`（由 Hydrology/scripts/export_playwright_rollout_registry.py 从闭环 YAML + case_manifest 生成）。
 */
import raw from './playwrightRollout.generated.json';

export const PLAYWRIGHT_CASE_REGISTRY = Object.freeze(
  raw.registry.map((r) => ({
    id: r.id,
    name: r.name,
    caseId: r.caseId,
    status: r.status ?? 'active',
    stage: r.stage ?? 'V2_E2E',
    source: r.source ?? 'playwright_fixture',
  })),
);
