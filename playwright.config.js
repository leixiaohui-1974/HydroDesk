/**
 * HydroDesk 浏览器端 E2E（Playwright）
 *
 * 范围：Vite 输出的 Web Shell（与 Tauri 桌面端共用 React 路由）。
 * webServer 注入 VITE_PLAYWRIGHT=1：开发态下六案例 + 全量工作流 fixture（`playwrightEnvGate`：生产 PROD 下永不启用）。
 * 不覆盖：invoke/run_workspace_command 真执行、Hydrology 工作流真跑与精度门禁数值（由 CLI/contracts + 可选 Tauri E2E 承担）。
 *
 * CI：设置 CI=1 且需先 `npx playwright install --with-deps chromium`
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          /** 注入六案例注册表，使壳层矩阵在纯浏览器 E2E 下不全为 skip */
          VITE_PLAYWRIGHT: '1',
        },
      },
});
