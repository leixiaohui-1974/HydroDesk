import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';
import { WORKSPACE_ROOT } from './workspaceRoot.js';

const FIXTURE_PATH = path.join(WORKSPACE_ROOT, 'HydroDesk/src/config/workflowRegistry.playwright.fixture.json');
const FIXTURE = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

async function switchRolloutCase(page, caseId, testInfo) {
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
  const row = page.locator(`[data-testid="case-row"][data-case-id="${caseId}"]`);
  if ((await row.count()) === 0) {
    testInfo.skip(true, `列表未含 ${caseId}`);
    return false;
  }
  await row.getByRole('button', { name: '切换' }).click();
  await expect(page.locator('main').getByText(new RegExp(`case\\s+${caseId}`, 'i'))).toBeVisible();
  return true;
}

/**
 * 逐案例 × 全 WORKFLOW_REGISTRY key：Launch 下拉 option[value] 与 Python 注册表同构。
 * 真算与 HTML/精度门禁仍由 Hydrology CLI + contracts-repo-gates 承担。
 */
for (const caseId of ROLLOUT_CASE_IDS) {
  test.describe(`Launch 工作流注册表矩阵 · ${caseId}`, () => {
    test('下拉含全部已注册 workflow key', async ({ page }, testInfo) => {
      const ok = await switchRolloutCase(page, caseId, testInfo);
      if (!ok) return;

      await page.locator('aside a[href="/simulation"]').click();
      await expect(page).toHaveURL(/\/simulation$/);

      const select = page.getByTestId('workflow-registry-select');
      await expect(select).toBeVisible();

      for (const { name } of FIXTURE) {
        await expect.soft(select.locator(`option[value="${name}"]`)).toHaveCount(1);
      }
    });
  });
}
