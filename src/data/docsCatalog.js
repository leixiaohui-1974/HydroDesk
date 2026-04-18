export const hydroDeskDocsCatalog = [
  {
    key: 'docs-nav',
    title: '文档导航页',
    path: 'docs/2026-04-10_HydroDesk文档导航页.md',
    group: 'overview',
    summary: '整个 HydroDesk 文档体系的统一入口。',
  },
  {
    key: 'logic-guide',
    title: '完整逻辑与开发指南',
    path: 'docs/2026-04-10_HydroDesk完整逻辑与开发指南.md',
    group: 'overview',
    summary: '系统整体逻辑、设计原则、页面职责与开发基线。',
  },
  {
    key: 'user-flows',
    title: '用户操作路径与时序图',
    path: 'docs/2026-04-10_HydroDesk用户操作路径与时序图.md',
    group: 'overview',
    summary: '按真实使用路径讲清账号、案例、工作流与审查交付链。',
  },
  {
    key: 'terms',
    title: '术语表',
    path: 'docs/2026-04-10_HydroDesk术语表.md',
    group: 'overview',
    summary: '统一 triad、contract、rollout、surfaceMode 等术语。',
  },
  {
    key: 'feature-matrix',
    title: '功能-脚本-合同矩阵',
    path: 'docs/2026-04-10_HydroDesk功能-脚本-合同矩阵.md',
    group: 'engineering',
    summary: '前台功能、前端入口、后台脚本和合同输出的一张表。',
  },
  {
    key: 'page-entry-map',
    title: '页面开发者入口图',
    path: 'docs/2026-04-10_HydroDesk页面开发者入口图.md',
    group: 'engineering',
    summary: '按页面说明改动时先看哪些文件、hooks、bridge 和 contracts。',
  },
  {
    key: 'workflow-lineage',
    title: '后台算法与工作流谱系图',
    path: 'docs/2026-04-10_HydroDesk后台算法与工作流谱系图.md',
    group: 'engineering',
    summary: '从 Hydrology 视角看 rollout、case pipeline、workflow registry 和 contracts 生成链。',
  },
  {
    key: 'by-account',
    title: '按账号使用手册',
    path: 'docs/2026-04-10_HydroDesk按账号使用手册.md',
    group: 'operations',
    summary: '不同账号该看什么、做什么、不该做什么。',
  },
  {
    key: 'todo-map',
    title: '页面 TODO 与技术债地图',
    path: 'docs/2026-04-10_HydroDesk页面TODO与技术债地图.md',
    group: 'engineering',
    summary: '按页面整理当前主要技术债、收口项与后续优先级。',
  },
  {
    key: 'progress-gap',
    title: '开发进度与对标验收差距',
    path: 'docs/2026-04-10_HydroDesk当前开发进度与对标验收差距.md',
    group: 'status',
    summary: '总结当前做到哪、还差什么、距离 Ralph/目标验收的缺口在哪。',
  },
  {
    key: 'review-plan-update',
    title: '续评审与规划更新',
    path: 'docs/2026-04-11_HydroDesk续评审与规划更新_对标Claude工程案例管理.md',
    group: 'status',
    summary: '基于 04-11 深度评审与当前代码增量，更新哪些判断仍成立、哪些已消化、下一主线如何调整。',
  },
  {
    key: 'execution-plan',
    title: '开发任务分解版',
    path: 'docs/2026-04-11_HydroDesk开发任务分解版_评审规划落地清单.md',
    group: 'status',
    summary: '把续评审与规划拆成可执行任务包，按 P0/P1/P2/P3 给出页面、脚本、合同与验收口径。',
  },
];

export const hydroDeskDocGroups = [
  { key: 'overview', label: '整体理解' },
  { key: 'operations', label: '账号与使用' },
  { key: 'engineering', label: '开发与后台' },
  { key: 'status', label: '进度与差距' },
];

export const hydroDeskPageDocMap = {
  projects: ['logic-guide', 'feature-matrix', 'page-entry-map', 'todo-map', 'progress-gap', 'review-plan-update', 'execution-plan'],
  review: ['logic-guide', 'feature-matrix', 'page-entry-map', 'todo-map', 'progress-gap', 'review-plan-update', 'execution-plan'],
  monitor: ['logic-guide', 'user-flows', 'page-entry-map', 'todo-map', 'progress-gap', 'review-plan-update', 'execution-plan'],
};

export const hydroDeskAccountDocMap = {
  manager_lead: ['logic-guide', 'by-account', 'user-flows', 'progress-gap', 'review-plan-update', 'execution-plan'],
  designer_zhongxian: ['logic-guide', 'by-account', 'feature-matrix', 'page-entry-map', 'todo-map', 'progress-gap', 'review-plan-update', 'execution-plan'],
  researcher_lab: ['logic-guide', 'by-account', 'user-flows', 'page-entry-map', 'workflow-lineage', 'review-plan-update', 'execution-plan'],
  dispatcher_ops: ['logic-guide', 'by-account', 'user-flows', 'progress-gap', 'review-plan-update', 'execution-plan'],
  operator_duty: ['logic-guide', 'by-account', 'user-flows', 'progress-gap', 'review-plan-update', 'execution-plan'],
};
