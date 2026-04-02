const DADUHE_SHELL_CASE_ID = 'daduhe';

export function resolveDaduheShellCaseId(caseId) {
  return caseId === DADUHE_SHELL_CASE_ID ? caseId : DADUHE_SHELL_CASE_ID;
}

export function getDaduheRunReviewReleaseContracts(caseId = DADUHE_SHELL_CASE_ID) {
  const resolvedCaseId = resolveDaduheShellCaseId(caseId);
  const contractRoot = `cases/${resolvedCaseId}/contracts`;

  return [
    {
      stage: 'Run',
      contractName: 'WorkflowRun',
      path: `${contractRoot}/workflow_run.json`,
      status: 'completed_with_review',
      category: 'run',
      note: '以 CaseManifest + DataPack 为输入锚点，锁定 daduhe 当前 run_id、steps 与 outputs，作为 Review / Release 的唯一运行引用。',
    },
    {
      stage: 'Review',
      contractName: 'ReviewBundle',
      path: `${contractRoot}/review_bundle.json`,
      status: 'review_pending',
      category: 'review',
      note: '把 verdict、findings、coverage、verification 与 live dashboard 资产收束到正式 ReviewBundle，形成可追踪的审查对象。',
    },
    {
      stage: 'Release',
      contractName: 'ReleaseManifest',
      path: `${contractRoot}/release_manifest.json`,
      status: 'review_pending',
      category: 'release',
      note: '把 Case / Data Pack / Run / Review 与 dashboard、verification、coverage 资产收口成 HydroDesk shell 的可交付 release 包。',
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
      name: 'HydroDesk Review Memo',
      note: '由 Notebook 工作面自动整理的 review memo，收敛基线、证据与人工审查结论。',
      path: `cases/${resolvedCaseId}/contracts/hydrodesk_review_memo.latest.md`,
      category: 'memo',
    },
    {
      name: 'HydroDesk Release Note',
      note: '由 Notebook 工作面自动生成的 release note 草案，便于签发前复核。',
      path: `cases/${resolvedCaseId}/contracts/hydrodesk_release_note.latest.md`,
      category: 'memo',
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
  const resolvedCaseId = resolveDaduheShellCaseId(caseId);
  const reviewAssets = getDaduheReviewAssets(caseId);

  return [
    {
      title: 'Run Entry',
      summary: `以 daduhe case shell 为入口触发 Run 阶段，固定产出 cases/${resolvedCaseId}/contracts/workflow_run.json。`,
      path: 'Hydrology/workflows/run_case_pipeline.py',
      kind: 'command',
    },
    {
      title: 'Review Entry',
      summary: `以 ReviewBundle 为正式审查对象，把 verification / coverage / dashboard 资产绑定回 cases/${resolvedCaseId}/contracts/review_bundle.json。`,
      path: 'Hydrology/workflows/build_review_bundle.py',
      kind: 'command',
    },
    {
      title: 'Release Entry',
      summary: `以 ReleaseManifest 收束 Case / Data Pack / Run / Review 链路，生成 cases/${resolvedCaseId}/contracts/release_manifest.json。`,
      path: 'Hydrology/workflows/build_release_manifest.py',
      kind: 'command',
    },
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
  ];
}

export function getDaduheWorkbenchStages(caseId = DADUHE_SHELL_CASE_ID) {
  const resolvedCaseId = resolveDaduheShellCaseId(caseId);
  const contracts = getDaduheRunReviewReleaseContracts(resolvedCaseId);
  const assets = getDaduheReviewAssets(resolvedCaseId);

  const launchContract = contracts.find((contract) => contract.stage === 'Run');
  const reviewContract = contracts.find((contract) => contract.stage === 'Review');
  const releaseContract = contracts.find((contract) => contract.stage === 'Release');
  const liveDashboard = assets.find((asset) => asset.name === 'Live Dashboard HTML');
  const verificationReport = assets.find((asset) => asset.name === 'Verification Report');
  const coverageReport = assets.find((asset) => asset.name === 'Outcome Coverage Report');
  const roadmap = assets.find((asset) => asset.name === 'Autonomy Roadmap');

  return [
    {
      key: 'launch',
      title: 'Launch',
      route: '/simulation',
      badge: launchContract?.status || 'pending',
      summary: '从 pinned autonomy workflow 进入 daduhe 主链，先锁 WorkflowRun，再把执行日志与恢复命令绑回桌面壳。',
      evidencePath: launchContract?.path,
      evidenceLabel: launchContract?.contractName || 'WorkflowRun',
      notes: [
        '优先启动 autonomy_autorun / autonomy_assess',
        '执行后第一时间绑定 log tail 与 resume prompt',
      ],
    },
    {
      key: 'monitor',
      title: 'Monitor',
      route: '/monitor',
      badge: liveDashboard ? 'live_ready' : 'pending',
      summary: '围绕 live dashboard、日志尾部、真实执行历史与 checkpoint 组织巡检，不再把监控入口散落在多个页面。',
      evidencePath: liveDashboard?.path,
      evidenceLabel: liveDashboard?.name || 'Live Dashboard',
      notes: [
        '把当前日志、checkpoint 和 artifacts 放在同一巡检面板',
        '把值守动作收敛成“打开 / 定位 / 恢复”三类固定操作',
      ],
    },
    {
      key: 'review',
      title: 'Review',
      route: '/review',
      badge: reviewContract?.status || 'pending',
      summary: '让 verification、coverage、人工确认与 ReviewBundle 回到同一证据链，不再让审查入口飘在项目壳之外。',
      evidencePath: verificationReport?.path || reviewContract?.path,
      evidenceLabel: verificationReport?.name || reviewContract?.contractName || 'Review Bundle',
      notes: [
        '先核 verification / coverage，再回到人工确认项',
        '围绕拓扑图、GIS 图与审查结论双向联动',
      ],
    },
    {
      key: 'release',
      title: 'Release',
      route: '/review',
      badge: releaseContract?.status || 'pending',
      summary: '把 ReleaseManifest、coverage、roadmap 和交付命令收束到同一壳层，形成可签发的 daduhe release 面。',
      evidencePath: releaseContract?.path || coverageReport?.path,
      evidenceLabel: releaseContract?.contractName || coverageReport?.name || 'Release Manifest',
      notes: [
        'release 入口必须绑定 contract triad 与 gate 结果',
        'roadmap / backlog 保持为 release 前的唯一升级面',
      ],
      secondaryPath: roadmap?.path,
      secondaryLabel: roadmap?.name || 'Autonomy Roadmap',
    },
  ];
}

export function resolveDaduheWorkbenchStageKey(path = '') {
  if (path.startsWith('/simulation')) {
    return 'launch';
  }

  if (path.startsWith('/monitor')) {
    return 'monitor';
  }

  if (path.startsWith('/review')) {
    return 'review';
  }

  return null;
}

export function getDaduheWorkbenchRail(caseId = DADUHE_SHELL_CASE_ID, path = '/workbench') {
  const stages = getDaduheWorkbenchStages(caseId);
  const activeStageKey = resolveDaduheWorkbenchStageKey(path);
  const activeIndex = stages.findIndex((stage) => stage.key === activeStageKey);

  return stages.map((stage, index) => {
    let railState = 'idle';

    if (activeIndex >= 0) {
      if (index < activeIndex) {
        railState = 'completed';
      } else if (index === activeIndex) {
        railState = 'active';
      } else {
        railState = 'upcoming';
      }
    } else if (path.startsWith('/workbench')) {
      railState = index === 0 ? 'next' : 'idle';
    }

    return {
      ...stage,
      railState,
      isActive: stage.key === activeStageKey,
    };
  });
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
