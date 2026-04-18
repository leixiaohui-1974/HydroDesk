import { test, expect } from '@playwright/test';

/**
 * HydroDesk 通用平台：新增 / 编辑案例入口壳层（不替代 Tauri 真写盘）。
 */
test.describe('工程与案例 · CRUD 壳层', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: '刷新案例列表' })).toBeVisible();
    await page.locator('summary').filter({ hasText: '展开更多平台分析与工具' }).evaluate((el) => {
      const details = el.closest('details');
      if (details) details.open = true;
    });
    await page.getByText('当前案例文件与编辑', { exact: true }).evaluate((el) => {
      const details = el.closest('details');
      if (details) details.open = true;
    });
  });

  test('新案例工程引导区可见', async ({ page }) => {
    await expect(page.getByTestId('case-scaffold-guide')).toBeVisible();
    await expect(page.getByRole('button', { name: '打开脚手架向导' })).toBeVisible();
    await expect(page.getByRole('button', { name: '一键健康扫描' })).toBeVisible();
  });

  test('新建案例骨架：弹窗字段与 project_type 选项', async ({ page }) => {
    await page.getByTestId('registry-case-scaffold-open').dispatchEvent('click');
    const dialog = page.getByTestId('case-scaffold-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /新建仿真工程/ })).toBeVisible();
    await expect(dialog.getByPlaceholder(/小写字母开头/)).toBeVisible();
    await expect(dialog.getByPlaceholder(/汉江流域/)).toBeVisible();
    const typeSelect = dialog.locator('select').first();
    await expect(typeSelect).toBeVisible();
    await expect(typeSelect.locator('option')).toHaveCount(4);
    await expect(typeSelect.locator('option').first()).toContainText('canal');
    await expect(dialog.getByRole('button', { name: '确认创建' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '取消' })).toBeVisible();
    await dialog.getByRole('button', { name: '取消' }).dispatchEvent('click');
    await expect(dialog).toBeHidden();
  });

  test('浏览器下创建会提示使用桌面端或 CLI（边界可观测）', async ({ page }) => {
    await page.getByTestId('registry-case-scaffold-open').dispatchEvent('click');
    const dialog = page.getByTestId('case-scaffold-dialog');
    await dialog.evaluate((root) => {
      const inputs = [...root.querySelectorAll('input')].filter((i) => i.type !== 'checkbox');
      const display = inputs.find((i) => /汉江流域/.test(i.placeholder || ''));
      const caseIdEl = inputs.find((i) => /小写字母开头/.test(i.placeholder || ''));
      if (!display || !caseIdEl) throw new Error('scaffold inputs not found');
      const setVal = (el, val) => {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        desc.set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setVal(display, 'E2E 占位案例');
      setVal(caseIdEl, 'e2e_scratch_case');
    });
    await dialog.getByRole('button', { name: '确认创建' }).dispatchEvent('click');
    await expect(dialog.getByText(/浏览器预览无法执行仓库命令/)).toBeVisible();
  });

  test('编辑案例：外链按钮 + 内联编辑器标题', async ({ page }) => {
    await expect(page.getByRole('button', { name: /项目配置/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /交付基线与指针/ })).toBeVisible();
    await page.getByRole('button', { name: 'HydroDesk 内编辑' }).dispatchEvent('click');
    await expect(page.getByRole('heading', { name: '编辑案例定义（配置驱动 · 不落硬编码）' })).toBeVisible();
  });
});
