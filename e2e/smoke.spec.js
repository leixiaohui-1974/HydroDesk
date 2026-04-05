import { test, expect } from '@playwright/test';

test.describe('HydroDesk Web Shell', () => {
  test('根路径重定向到工作台', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/workbench/);
  });

  test('项目中心渲染平台说明与工程列表区块', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('自主运行水网建模 Agent 平台')).toBeVisible();
    await expect(page.getByRole('heading', { name: '工程与案例 · 平台中控', level: 1 })).toBeVisible();
    await expect(
      page.locator('main').getByRole('heading', { name: '工程与案例', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
  });

  test('项目中心可打开新建案例骨架入口', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: '新建案例骨架' }).click();
    await expect(page.getByRole('heading', { name: '新建案例骨架' })).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();
  });
});
