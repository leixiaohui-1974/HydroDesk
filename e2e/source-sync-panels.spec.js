import { test, expect } from '@playwright/test';

test.describe('Source Sync panels', () => {
  test('Knowledge 页面展示 Source Sync 与 Graphify 面板', async ({ page }) => {
    await page.goto('/knowledge');

    await expect(page.getByTestId('knowledge-graphify-panel')).toBeVisible();
    await expect(page.getByTestId('knowledge-source-sync-panel')).toBeVisible();
    await expect(page.getByTestId('knowledge-source-sync-run')).toBeVisible();
    await expect(page.getByTestId('knowledge-source-sync-run')).toBeDisabled();
    await expect(page.getByText(/source_registry\/source_summary/i)).toBeVisible();
  });

  test('Project Center 展开分析区后展示 Source Sync 面板', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();

    await page.locator('summary').filter({ hasText: '展开更多平台分析与工具' }).evaluate((el) => {
      const details = el.closest('details');
      if (details) details.open = true;
    });

    await expect(page.getByTestId('project-center-graphify-panel')).toBeVisible();
    await expect(page.getByTestId('project-center-source-sync-panel')).toBeVisible();
    await expect(page.getByTestId('project-center-source-sync-run')).toBeVisible();
    await expect(page.getByText(/source_registry\/source_summary/i).first()).toBeVisible();
  });
});
