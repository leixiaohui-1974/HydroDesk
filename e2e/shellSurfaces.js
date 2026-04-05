/**
 * HydroDesk 全业务面壳层路由（浏览器 E2E：验证挂载与导航，不替代 Python/Tauri 真跑工作流）。
 */
export const SHELL_SURFACES = Object.freeze([
  /** 与 Layout 顶栏 `studioViews` 标题一致，避免子页面渐变/重复标题导致 strict 或 a11y 名缺失 */
  { path: '/workbench', assert: { heading: '主工作台' } },
  { path: '/projects', assert: { text: '自主运行水网建模 Agent 平台' } },
  { path: '/simulation', assert: { heading: 'Launch · 主链启动台' } },
  { path: '/monitor', assert: { heading: '运行中心' } },
  { path: '/review', assert: { heading: 'Review / Release · 审查交付台' } },
  { path: '/modeling', assert: { heading: '图形拓扑与 GIS 建模' } },
  { path: '/analysis', assert: { heading: '资料发现与资产视图' } },
]);
