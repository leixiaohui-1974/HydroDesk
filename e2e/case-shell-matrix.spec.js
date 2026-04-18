import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';
import { SHELL_SURFACES } from './shellSurfaces.js';

/**
 * 逐案例 × 逐业务面壳层巡检。
 *
 * 边界说明（评审/规划一致）：
 * - 浏览器模式无法 invoke Tauri、无法在容器内无仓库时扫全 cases；列表里不出现的 case 会 skip。
 * - 「逐工作流 / 逐算法」的真执行与 HTML/精度门禁应由 Hydrology CLI + contracts +（可选）Tauri E2E 承担；
 *   此处校验 Launch 页「注册表下拉」与 pinned 卡片 DOM（若运行时注入到注册表）。
 */
for (const caseId of ROLLOUT_CASE_IDS) {
  test.describe(`案例壳层 · ${caseId}`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await page.goto('/projects');
      await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
      await page.getByTestId('project-center-info-tab-catalog').dispatchEvent('click');
      const row = page.locator(`[data-testid="case-row"][data-case-id="${caseId}"]`);
      const n = await row.count();
      if (n === 0) {
        testInfo.skip(
          true,
          `动态扫描未包含 ${caseId}（浏览器预览常见：仅 fallback；桌面端连仓库可扫全 cases）`,
        );
        return;
      }
      await row.getByRole('button', { name: '切换' }).dispatchEvent('click');
      await expect(page.locator('main').getByText(new RegExp(`case\\s+${caseId}`, 'i'))).toBeVisible();
    });

    for (const surf of SHELL_SURFACES) {
      test(`业务面 ${surf.path}`, async ({ page }) => {
        await page.goto(surf.path);
        const main = page.locator('main');
        const { assert } = surf;
        if (assert.heading) {
          await expect(main.getByRole('heading', { name: assert.heading }).first()).toBeVisible();
        }
        if (assert.text) {
          await expect(main.getByText(assert.text)).toBeVisible();
        }
      });
    }

    test('Launch：工作流注册表 UI（壳层）', async ({ page }) => {
      await page.goto('/simulation');
      await expect(page.getByTestId('workflow-registry-select')).toBeVisible();
      const select = page.getByTestId('workflow-registry-select');
      const optCount = await select.locator('option').count();
      expect(optCount).toBeGreaterThan(0);
      const pinned = page.locator('[data-testid^="pinned-workflow-"]');
      const pc = await pinned.count();
      if (pc > 0) {
        await expect(pinned.first()).toBeVisible();
      } else {
        await expect(
          page.getByText(/当前 workflow 注册表里还没有|先通过下方通用 selector/),
        ).toBeVisible();
      }
    });
  });
}
