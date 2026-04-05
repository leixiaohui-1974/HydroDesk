import { test, expect } from '@playwright/test';

test.describe('运行中心 · SCADA 回放契约面板', () => {
  test('挂载只读预览块（浏览器壳层提示桌面端读盘）', async ({ page }) => {
    await page.goto('/monitor');
    await expect(page.getByTestId('scada-replay-monitor')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SCADA 历史回放 · 契约只读预览' })).toBeVisible();
    await expect(page.getByText(/浏览器壳层无法读仓库文件/)).toBeVisible();
  });
});
