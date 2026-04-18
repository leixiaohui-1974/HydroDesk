import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';

/**
 * 逐案例：Review 页「Live 监控与验收入口」与 case_contract_shell 路径一致（壳层契约锚点）。
 * 真 HTML 是否在仓库落盘由 contracts-repo-gates.spec.js 门禁。
 */
for (const caseId of ROLLOUT_CASE_IDS) {
  test.describe(`Review 契约锚点 · ${caseId}`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await page.goto('/projects');
      await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
      await page.getByTestId('project-center-info-tab-catalog').dispatchEvent('click');
      const row = page.locator(`[data-testid="case-row"][data-case-id="${caseId}"]`);
      if ((await row.count()) === 0) {
        testInfo.skip(true, `案例列表未包含 ${caseId}（未设 VITE_PLAYWRIGHT=1 或桌面扫描失败）`);
        return;
      }
      await row.getByRole('button', { name: '切换' }).dispatchEvent('click');
      await expect(page.locator('main').getByText(new RegExp(`case\\s+${caseId}`, 'i'))).toBeVisible();
    });

    test('Live Dashboard HTML 路径挂载在审查面', async ({ page }) => {
      // 禁止 page.goto：会整页刷新，StudioWorkspace 回退到默认 proj-001（daduhe）
      await page.locator('aside a[href="/review"]').dispatchEvent('click');
      await expect(page).toHaveURL(/\/review(\?|$)/);
      await page.getByRole('button', { name: '交付资产' }).dispatchEvent('click');
      const dashboardPath = `cases/${caseId}/contracts/E2E_LIVE_DASHBOARD.html`;
      const tile = page.locator(`[data-testid="review-live-asset"][data-contract-path="${dashboardPath}"]`);
      await expect(tile).toBeVisible();
      await expect(tile.getByText('Live Dashboard HTML')).toBeVisible();
    });
  });
}
