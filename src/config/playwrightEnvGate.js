/**
 * Playwright 浏览器 E2E：`npm run test:e2e` 的 webServer 可设 VITE_PLAYWRIGHT=1。
 * 生产构建 (import.meta.env.PROD) 下恒为 false，避免误将固定案例/全量工作流注册表注入发布包。
 */
export function isPlaywrightBrowserFixtureEnabled() {
  return Boolean(
    typeof import.meta !== 'undefined' &&
      import.meta.env &&
      !import.meta.env.PROD &&
      import.meta.env.VITE_PLAYWRIGHT === '1',
  );
}
