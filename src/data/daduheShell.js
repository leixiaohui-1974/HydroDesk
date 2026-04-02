const DADUHE_SHELL_CASE_ID = 'daduhe';

export function resolveDaduheShellCaseId(caseId) {
  return caseId === DADUHE_SHELL_CASE_ID ? caseId : DADUHE_SHELL_CASE_ID;
}

export function getDaduheRunReviewReleaseContracts(caseId = DADUHE_SHELL_CASE_ID) {
  const resolvedCaseId = resolveDaduheShellCaseId(caseId);

  return [
    {
      stage: 'Run',
      contractName: 'WorkflowRun',
      path: `cases/${resolvedCaseId}/contracts/workflow_run.json`,
      status: 'completed_with_review',
      category: 'run',
      note: '锁定 daduhe 当前 workflow 的 inputs / outputs / steps，作为后续 review 与 release 的唯一运行引用。',
    },
    {
      stage: 'Review',
      contractName: 'ReviewBundle',
      path: `cases/${resolvedCaseId}/contracts/review_bundle.json`,
      status: 'pending',
      category: 'review',
      note: '承接人工复核 verdict、findings 和报告附件，把审查结论从 live 监控切回正式 contract。',
    },
    {
      stage: 'Release',
      contractName: 'ReleaseManifest',
      path: `cases/${resolvedCaseId}/contracts/release_manifest.json`,
      status: 'review_pending',
      category: 'release',
      note: '把 run/review 与 dashboard、verification、coverage 资产收口成 HydroDesk shell 可交付的 release 包。',
    },
  ];
}

export function getDaduheReviewAssets(caseId = DADUHE_SHELL_CASE_ID) {
  const resolvedCaseId = resolveDaduheShellCaseId(caseId);

  return [
    {
      name: 'Live Dashboard HTML',
      note: '端到端实时监控面，适合直接盯 daduhe 当前进度与 agent 结果。',
      path: `cases/${resolvedCaseId}/contracts/E2E_LIVE_DASHBOARD.html`,
      category: 'live',
    },
    {
      name: 'Live Dashboard Markdown',
      note: '线性文本版 live 进度文档，适合在编辑器和 diff 中追踪。',
      path: `cases/${resolvedCaseId}/contracts/E2E_LIVE_DASHBOARD.md`,
      category: 'live',
    },
    {
      name: 'Outcome Coverage Report',
      note: '看 gate、coverage、schema/evidence 绑定情况。',
      path: `cases/${resolvedCaseId}/contracts/outcome_coverage_report.latest.json`,
      category: 'gate',
    },
    {
      name: 'Verification Report',
      note: '看 daduhe 阶段化验收结论与 execution integrity。',
      path: `cases/${resolvedCaseId}/contracts/e2e_outcome_verification_report.json`,
      category: 'gate',
    },
    {
      name: 'Autonomy Roadmap',
      note: '看大渡河自主运行水网模型体系与 HydroDesk 端到端测试壳的主路线图。',
      path: `cases/${resolvedCaseId}/contracts/daduhe_hydrodesk_autonomy_roadmap.md`,
      category: 'roadmap',
    },
    {
      name: 'HydroDesk Fusion Backlog',
      note: '看 HydroDesk 壳层接下来要补的 backlog、职责边界和融合任务。',
      path: 'HydroDesk/docs/daduhe-e2e-fusion-plan.md',
      category: 'backlog',
    },
  ];
}

export function getDaduheShellEntryPoints(caseId = DADUHE_SHELL_CASE_ID) {
  const reviewAssets = getDaduheReviewAssets(caseId);

  return [
    {
      title: 'North Star',
      summary: '以 daduhe 为唯一验收 case 的主路线图，定义 shell、主链、release gate 的完成标准。',
      path: reviewAssets.find((asset) => asset.name === 'Autonomy Roadmap')?.path,
      kind: 'roadmap',
    },
    {
      title: 'Fusion Backlog',
      summary: 'HydroDesk 壳层当前 backlog，聚焦 shell 收口、contract 接入和产品化入口。',
      path: 'HydroDesk/docs/daduhe-e2e-fusion-plan.md',
      kind: 'backlog',
    },
    {
      title: 'Program Roadmap',
      summary: '项目群级别路线图，说明 daduhe 在整个 HydroMind 项目群中的阶段位置。',
      path: '.planning/ROADMAP.md',
      kind: 'program',
    },
    {
      title: 'Backlog Intake',
      summary: '新增 backlog 时的标准命令说明，避免把下一步任务散落在临时记录里。',
      path: 'commands/gsd/add-backlog.md',
      kind: 'command',
    },
    {
      title: 'Backlog Review',
      summary: '回顾 backlog、梳理优先级和验收口径时的标准入口。',
      path: 'commands/gsd/review-backlog.md',
      kind: 'command',
    },
  ];
}

export const daduheWavePlan = [
  {
    title: 'Wave 1',
    items: ['修 agent teams runtime', '收口 prompt worker lifecycle', '补 runtime regression probes'],
  },
  {
    title: 'Wave 2-4',
    items: ['清理 daduhe outcome 结果资产', '收敛 autonomy chain', '把 HydroDesk 做成端到端测试壳'],
  },
  {
    title: 'Wave 5-6',
    items: ['GIS / 拓扑 / workflow 联动', '对齐 hydromind-contracts', '形成 release gate'],
  },
];
