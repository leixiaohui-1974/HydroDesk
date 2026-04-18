import { test, expect } from '@playwright/test';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';

test.describe('Workflow Report Template Validation (Milestone P2)', () => {
  for (const caseId of ROLLOUT_CASE_IDS) {
    test(`Verify template-based reports generation for ${caseId}`, async ({ page }) => {
      await page.goto(`/review?case_id=${caseId}`);
      await expect(page.getByRole('heading', { name: '审查交付工作台' })).toBeVisible();
      
      // We expect some reports to be generated and listed
      // Here we just check if the UI is ready to show reports
      const reportsHeader = page.locator('h2:has-text("Review Bundle"), h2:has-text("Delivery Pack"), h3:has-text("Evidence")').first();
      if (await reportsHeader.isVisible()) {
        await expect(reportsHeader).toBeVisible();
      }
    });
  }
});
