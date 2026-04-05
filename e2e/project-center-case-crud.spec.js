import { test, expect } from '@playwright/test';

/**
 * HydroDesk 通用平台：新增 / 编辑案例入口壳层（不替代 Tauri 真写盘）。
 */
test.describe('工程与案例 · CRUD 壳层', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
  });

  test('新案例工程引导区可见', async ({ page }) => {
    await expect(page.getByTestId('case-scaffold-guide')).toBeVisible();
    await expect(page.getByRole('button', { name: '打开脚手架向导' })).toBeVisible();
    await expect(page.getByRole('button', { name: '当前案例 · 一键健康扫描' })).toBeVisible();
  });

  test('新建案例骨架：弹窗字段与 project_type 选项', async ({ page }) => {
    await page.getByRole('button', { name: '新建案例骨架' }).click();
    const dialog = page.getByTestId('case-scaffold-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '新建案例骨架' })).toBeVisible();
    await expect(dialog.getByPlaceholder('例如 my_river_basin')).toBeVisible();
    await expect(dialog.getByPlaceholder('中文或英文案例名')).toBeVisible();
    const typeSelect = dialog.locator('select').first();
    await expect(typeSelect).toBeVisible();
    await expect(typeSelect.locator('option')).toHaveCount(4);
    await expect(typeSelect.locator('option').first()).toContainText('canal');
    await expect(dialog.getByRole('button', { name: 'Dry-run 预览' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '取消' })).toBeVisible();
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toBeHidden();
  });

  test('浏览器下创建会提示使用桌面端或 CLI（边界可观测）', async ({ page }) => {
    await page.getByRole('button', { name: '新建案例骨架' }).click();
    const dialog = page.getByTestId('case-scaffold-dialog');
    await dialog.getByPlaceholder('例如 my_river_basin').fill('e2e_scratch_case');
    await dialog.getByPlaceholder('中文或英文案例名').fill('E2E 占位案例');
    await dialog.getByRole('button', { name: '创建' }).click();
    await expect(dialog.getByText(/浏览器预览无法执行仓库命令/)).toBeVisible();
  });

  test('编辑案例：外链按钮 + 内联编辑器标题', async ({ page }) => {
    await expect(page.getByRole('button', { name: '编辑案例 manifest' })).toBeVisible();
    await expect(page.getByRole('button', { name: '编辑 Hydrology 案例 YAML' })).toBeVisible();
    await page.getByRole('button', { name: 'HydroDesk 内编辑' }).click();
    await expect(page.getByRole('heading', { name: '编辑案例定义（配置驱动 · 不落硬编码）' })).toBeVisible();
  });
});
