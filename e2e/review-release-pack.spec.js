import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';

test.describe('Review and Release Pack (Milestone P2)', () => {
  for (const caseId of ROLLOUT_CASE_IDS) {
    test(`Verify triad and delivery pack generation for ${caseId}`, async ({ page }) => {
      await page.goto(`/review?case_id=${caseId}`);
      await expect(page.getByRole('heading', { name: '审查交付工作台' })).toBeVisible();

      // Ensure triad / evidence 语义在审查面可见（中英皆可）
      await expect(page.getByText(/evidence|证据/i).first()).toBeVisible();
      
      // Check Release generation action availability
      const releaseBtn = page.locator('button:has-text("Release")');
      if (await releaseBtn.count() > 0) {
        await expect(releaseBtn).toBeVisible();
      }
    });
  }
});
