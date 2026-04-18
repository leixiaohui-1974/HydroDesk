import {
  getBuildReleaseManifestScriptRelPath,
  getBuildReviewBundleScriptRelPath,
  getHydrodeskFusionPlanDocRelPath,
  getRunCasePipelineScriptRelPath,
} from '../config/hydrodesk_commands.js';

const CONTROL_REVIEW_PIPELINE_SCRIPT = 'Hydrology/workflows/run_control_review_pipeline.py';

/**
 * 合同 JSON 双轨：优先 canonical `*.json`，打开/读取可回退到 `*.contract.json`。
 * @param {string} canonicalPath 仓库根相对路径
 * @returns {string[]}
 */
export function contractJsonPathAlternates(canonicalPath) {
  const trimmed = String(canonicalPath ?? '').trim();
  if (!trimmed.endsWith('.json')) return [trimmed];
  if (trimmed.endsWith('.contract.json')) return [trimmed];
  const base = trimmed.slice(0, -'.json'.length);
  return [trimmed, `${base}.contract.json`];
}

function splitContractJsonPaths(canonicalPath) {
  const trimmed = String(canonicalPath ?? '').trim();
  if (!trimmed.endsWith('.json') || trimmed.endsWith('.contract.json')) {
    return { path: trimmed, bridgePath: '' };
  }
  const base = trimmed.slice(0, -'.json'.length);
  return { path: trimmed, bridgePath: `${base}.contract.json` };
}

/** 约定：自主路线图文件名 `cases/<case_id>/contracts/<case_id>_hydrodesk_autonomy_roadmap.md` */
function caseAutonomyRoadmapContractPath(caseId) {
  return `cases/${caseId}/contracts/${caseId}_hydrodesk_autonomy_roadmap.md`;
}

/**
 * 解析桌面壳使用的 case_id：优先当前项目，其次 VITE_HYDRODESK_DEFAULT_CASE_ID，否则空字符串。
 * @param {string | undefined | null} caseId
 */
export function resolveShellCaseId(caseId) {
  const raw = caseId != null ? String(caseId).trim() : '';
  if (raw) return raw;
  return import.meta.env?.VITE_HYDRODESK_DEFAULT_CASE_ID?.trim?.() || '';
}

export function getCaseRunReviewReleaseContracts(caseId) {
  const resolvedCaseId = resolveShellCaseId(caseId);
  const contractRoot = `cases/${resolvedCaseId}/contracts`;

  const runContract = splitContractJsonPaths(`${contractRoot}/workflow_run.json`);
  const reviewContract = splitContractJsonPaths(`${contractRoot}/review_bundle.json`);
  const releaseContract = splitContractJsonPaths(`${contractRoot}/release_manifest.json`);

  return [
    {
      stage: 'Run',
      contractName: 'WorkflowRun',
      path: runContract.path,
      bridgePath: runContract.bridgePath,
      status: 'completed_with_review',
      category: 'run',
      note: `以 CaseManifest + DataPack 为输入锚点，锁定 ${resolvedCaseId || '当前案例'} 的 run_id、steps 与 outputs，并把 control/SIL/ODD 收口结果绑定回同一 Run 引用。`,
    },
    {
      stage: 'Review',
      contractName: 'ReviewBundle',
      path: reviewContract.path,
      bridgePath: reviewContract.bridgePath,
      status: 'review_pending',
      category: 'review',
      note: '把 verdict、findings、coverage、verification、live dashboard 与 control/SIL/ODD 审查信号收束到正式 ReviewBundle，形成可追踪的审查对象。',
    },
    {
      stage: 'Release',
      contractName: 'ReleaseManifest',
      path: releaseContract.path,
      bridgePath: releaseContract.bridgePath,
      status: 'review_pending',
      category: 'release',
      note: '把 Case / Data Pack / Run / Review 与 dashboard、verification、coverage、control validation 资产收口成 HydroDesk shell 的可交付 release 包。',
    },
  ];
}

export function getCaseReviewAssets(caseId) {
  const resolvedCaseId = resolveShellCaseId(caseId);
  const fusionDoc = getHydrodeskFusionPlanDocRelPath();

  return [
    {
      name: 'Raw Ingest 目录',
      note: `Karpathy 式未编译资料槽位（与 knowledge_lint.raw_dir_rel 一致；目录内大文件默认 .gitignore，仅 .gitkeep 入库）。`,
      path: `cases/${resolvedCaseId}/ingest/raw`,
      category: 'knowledge',
    },
    {
      name: 'Live Dashboard HTML',
      note: `端到端实时监控面，适合直接盯 ${resolvedCaseId || '当前案例'} 进度与 agent 结果。`,
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
      name: 'Control Validation Summary',
      note: '控制执行、SIL、ODD 与严格回归的统一收口摘要；HydroDesk review 默认消费该 canonical contract，而不是只盯原始 side files。',
      path: `cases/${resolvedCaseId}/contracts/control_validation.latest.json`,
      category: 'control',
    },
    {
      name: 'Case Data Intelligence',
      note: '统一展示资产画像、真实性风险、推荐主链、缺数清单与改模建议。',
      path: `cases/${resolvedCaseId}/contracts/case_data_intelligence.latest.json`,
      category: 'strategy',
    },
    {
      name: 'Outcome Coverage Report',
      note: '看 gate、coverage、schema/evidence 绑定情况。',
      path: `cases/${resolvedCaseId}/contracts/outcome_coverage_report.latest.json`,
      category: 'gate',
    },
    {
      name: 'Verification Report',
      note: `看 ${resolvedCaseId || '当前案例'} 阶段化验收结论与 execution integrity。`,
      path: `cases/${resolvedCaseId}/contracts/e2e_outcome_verification_report.json`,
      category: 'gate',
    },
    {
      name: 'Final Report',
      note: '统一最终报告对象，收束 readiness、review/release 结论与关键断言。',
      path: `cases/${resolvedCaseId}/contracts/final_report.latest.json`,
      category: 'delivery',
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
      note: '自主运行水网模型体系与 HydroDesk 端到端测试壳的主路线图。',
      path: caseAutonomyRoadmapContractPath(resolvedCaseId),
      category: 'roadmap',
    },
    {
      name: 'HydroDesk Fusion Backlog',
      note: '看 HydroDesk 壳层接下来要补的 backlog、职责边界和融合任务。',
      path: fusionDoc,
      category: 'backlog',
    },
  ];
}

export function getCaseShellEntryPoints(caseId) {
  const resolvedCaseId = resolveShellCaseId(caseId);
  const reviewAssets = getCaseReviewAssets(caseId);
  const fusionDoc = getHydrodeskFusionPlanDocRelPath();

  return [
    {
      title: 'Run Entry',
      summary: `以 case shell 为入口触发 Run 阶段，固定产出 cases/${resolvedCaseId}/contracts/workflow_run.json。`,
      path: getRunCasePipelineScriptRelPath(),
      kind: 'command',
    },
    {
      title: 'Control Entry',
      summary: `以统一控制验证入口收口 ${resolvedCaseId || '当前案例'} 的 control / SIL / ODD / strict revalidation，并回写 cases/${resolvedCaseId}/contracts/control_validation.latest.json 与 triad。`,
      path: CONTROL_REVIEW_PIPELINE_SCRIPT,
      kind: 'command',
    },
    {
      title: 'Review Entry',
      summary: `以 ReviewBundle 为正式审查对象，把 verification / coverage / dashboard 资产绑定回 cases/${resolvedCaseId}/contracts/review_bundle.json。`,
      path: getBuildReviewBundleScriptRelPath(),
      kind: 'command',
    },
    {
      title: 'Release Entry',
      summary: `以 ReleaseManifest 收束 Case / Data Pack / Run / Review 链路，生成 cases/${resolvedCaseId}/contracts/release_manifest.json。`,
      path: getBuildReleaseManifestScriptRelPath(),
      kind: 'command',
    },
    {
      title: 'North Star',
      summary: `以 ${resolvedCaseId || '当前案例'} 为主验收案例的路线图，定义 shell、主链、release gate 的完成标准。`,
      path: reviewAssets.find((asset) => asset.name === 'Autonomy Roadmap')?.path,
      kind: 'roadmap',
    },
    {
      title: 'Fusion Backlog',
      summary: 'HydroDesk 壳层当前 backlog，聚焦 shell 收口、contract 接入和产品化入口。',
      path: fusionDoc,
      kind: 'backlog',
    },
    {
      title: 'Raw Ingest',
      summary: `原始剪藏 / PDF / 笔记先入 cases/${resolvedCaseId}/ingest/raw，再由 Agent 编译进 contracts；与 hydrodesk_shell.knowledge_lint 对齐。`,
      path: `cases/${resolvedCaseId}/ingest/raw`,
      kind: 'knowledge',
    },
    {
      title: 'Program Roadmap',
      summary: '项目群级别路线图，说明当前案例在整个 HydroMind 项目群中的阶段位置。',
      path: '.planning/ROADMAP.md',
      kind: 'program',
    },
  ];
}

export function getCaseWorkbenchStages(caseId, contractsOverride = null) {
  const resolvedCaseId = resolveShellCaseId(caseId);
  const contracts = Array.isArray(contractsOverride)
    ? contractsOverride
    : getCaseRunReviewReleaseContracts(resolvedCaseId);
  const assets = getCaseReviewAssets(resolvedCaseId);

  const launchContract = contracts.find((contract) => contract.stage === 'Run');
  const reviewContract = contracts.find((contract) => contract.stage === 'Review');
  const releaseContract = contracts.find((contract) => contract.stage === 'Release');
  const liveDashboard = assets.find((asset) => asset.name === 'Live Dashboard HTML');
  const verificationReport = assets.find((asset) => asset.name === 'Verification Report');
  const coverageReport = assets.find((asset) => asset.name === 'Outcome Coverage Report');
  const finalReport = assets.find((asset) => asset.name === 'Final Report');
  const roadmap = assets.find((asset) => asset.name === 'Autonomy Roadmap');

  const reviewEvidencePath = verificationReport?.path || reviewContract?.path;
  const releaseEvidencePath = finalReport?.path || releaseContract?.path || coverageReport?.path;

  return [
    {
      key: 'launch',
      title: 'Launch',
      route: '/simulation',
      badge: launchContract?.status || 'pending',
      summary: `从 pinned autonomy workflow 进入 ${resolvedCaseId || '当前案例'} 主链，先锁 WorkflowRun，再把执行日志与恢复命令绑回桌面壳。`,
      evidencePath: launchContract?.path,
      evidenceBridgePath: launchContract?.bridgePath || '',
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
      evidencePathAlternates: liveDashboard?.path ? [liveDashboard.path] : [],
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
      evidencePath: reviewEvidencePath,
      evidenceBridgePath: verificationReport?.path ? '' : reviewContract?.bridgePath || '',
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
      summary: `把 ReleaseManifest、coverage、roadmap 和交付命令收束到同一壳层，形成可签发的 ${resolvedCaseId || '当前案例'} release 面。`,
      evidencePath: releaseEvidencePath,
      evidenceBridgePath: coverageReport?.path ? '' : releaseContract?.bridgePath || '',
      evidenceLabel: finalReport?.name || releaseContract?.contractName || coverageReport?.name || 'Release Manifest',
      notes: [
        'release 入口必须绑定 contract triad 与 gate 结果',
        'roadmap / backlog 保持为 release 前的唯一升级面',
      ],
      secondaryPath: roadmap?.path,
      secondaryLabel: roadmap?.name || 'Autonomy Roadmap',
    },
  ];
}

export function resolveWorkbenchStageKey(path = '') {
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

export function getCaseWorkbenchRail(caseId, path = '/workbench') {
  const stages = getCaseWorkbenchStages(caseId);
  const activeStageKey = resolveWorkbenchStageKey(path);
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

/** 交付波次计划（与具体案例 id 无关，仅作 Studio 展示） */
export const studioDeliveryWavePlan = [
  {
    title: 'Wave 1',
    items: ['修 agent teams runtime', '收口 prompt worker lifecycle', '补 runtime regression probes'],
  },
  {
    title: 'Wave 2-4',
    items: ['清理 outcome 结果资产', '收敛 autonomy chain', '把 HydroDesk 做成端到端测试壳'],
  },
  {
    title: 'Wave 5-6',
    items: ['GIS / 拓扑 / workflow 联动', '对齐 hydromind-contracts', '形成 release gate'],
  },
];
