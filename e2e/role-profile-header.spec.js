import { test, expect } from '@playwright/test';

test.describe('Role profile (Wave H minimal)', () => {
  test('Layout 页眉暴露当前角色标签', async ({ page }) => {
    await page.goto('/projects');
    const roleChip = page.getByTestId('view-header-active-role-label');
    await expect(roleChip).toBeVisible();
    await expect(roleChip).toContainText(/角色锁定/);
    await expect(roleChip).toContainText('设计');
  });
});
