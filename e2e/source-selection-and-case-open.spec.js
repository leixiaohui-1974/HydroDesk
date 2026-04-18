import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';

test.describe('Source Selection and Case Open (Milestone P2)', () => {
  for (const caseId of ROLLOUT_CASE_IDS) {
    test(`Should open case directory and parse manifest for ${caseId}`, async ({ page }) => {
      await page.goto('/projects');
      await page.waitForSelector('nav');
      await expect(page.getByText(/项目中心|工程与案例|案例目录/).first()).toBeVisible();

      await page.getByTestId('project-center-info-tab-catalog').dispatchEvent('click');
      const catalogPanel = page.getByTestId('project-center-info-panel-catalog');
      await expect(
        catalogPanel.locator(`[data-testid="case-row"][data-case-id="${caseId}"]`),
      ).toBeVisible();
    });
  }
});
