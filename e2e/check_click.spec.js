import { test, expect } from '@playwright/test';

test('案例目录内层 Tab：全部案例 可点', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
  const allCases = page.getByTestId('project-center-info-tab-catalog');
  await expect(allCases).toBeVisible();
  await allCases.dispatchEvent('click');
});
