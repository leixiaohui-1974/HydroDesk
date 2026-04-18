import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCaseContractSummary,
  isTauri,
  openPath,
  readWorkspaceTextFile,
  revealPath,
  runWorkspaceCommand,
  workspacePathExists,
  writeWorkspaceTextFile,
  createCase,
  deriveCase,
  archiveCase,
  caseManagerOpenDirectory,
} from '../api/tauri_bridge';
import {
  getCaseReviewAssets,
  getCaseShellEntryPoints,
  resolveShellCaseId,
  studioDeliveryWavePlan,
} from '../data/case_contract_shell';
import { getActiveRoleAgent, studioState } from '../data/studioState';
import {
  projectCenterFeasibilityTierLabels,
  projectCenterModelStrategyEvidenceLabels,
  projectCenterSignalLabels,
  projectCenterStatusMeta,
} from '../data/projectCenterCatalog';
import { hydroPortfolioCatalog, primarySurfaceLabels } from '../data/projectPortfolio';
import { executionSurfaceCatalog } from '../data/workflowSurfaces';
import { getModelStrategyMeta, getTriadStatusMeta } from '../config/uiMeta';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useCaseRunReviewReleaseContracts } from '../hooks/useCaseRunReviewReleaseContracts';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { useDynamicCaseRegistry } from '../hooks/useDynamicCaseRegistry';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { parseGraphifyReportSummary } from '../utils/graphifyReport';
import {
  ProjectCenterActionButton,
  ProjectCenterActionGroup,
  ProjectCenterActionMenu,
  ProjectCenterAnalysisSection,
  ProjectCenterCatalogSection,
  ProjectCenterTopTabs,
  ProjectCenterWorkspaceHero,
  ProjectCenterWorkspaceSection,
} from '../components/project/ProjectCenterPageSections';
import {
  buildBatchCheckCaseQualityArtifactsCommand,
  buildCheckCaseQualityArtifactsCommand,
  buildExportAutonomousWaternetQualityRubricCommand,
  buildExportRolloutReadinessBaselineCommand,
  buildHydrodeskE2eActionsCommand,
  buildHydrodeskRolloutE2eLoopCommand,
  buildScaffoldNewCaseCommand,
  buildExportCaseWorkflowFeasibilityCommand,
  buildExportCaseDataIntelligenceBatchCommand,
  buildExportCaseDataIntelligenceCommand,
  buildExportCaseModelStrategyBatchCommand,
  buildExportCaseModelStrategyCommand,
  buildExportCaseModelingHintsCommand,
  buildExportCasePlatformReadinessCommand,
  buildImportCaseSourcebundleCommand,
  buildBootstrapCaseTriadMinimalCommand,
  buildLintCaseKnowledgeLinksCommand,
  buildRunCasePipelinePreflightCommand,
  buildRunGraphifyCaseSidecarCommand,
  buildRunSourceSyncCommand,
  getAutonomousWaternetE2eLoopConfigRelPath,
  getHydrodeskAgenticIdePlatformPlanRelPath,
  getScaffoldNewCaseScriptRelPath,
  parseNlGatewayStdout,
  parseQualityRubricExportStdout,
  parseSingleObjectJsonStdout,
} from '../config/hydrodesk_commands';
import useTauri from '../hooks/useTauri';
import useWorkspacePreviewLoader from '../components/workspace/useWorkspacePreviewLoader';
import {
  buildWorkspaceBusinessPreviewByKind,
  findMatchingContractByPath,
  getWorkspaceAssetPreviewKind,
} from '../components/workspace/workspaceAssetPreviewRegistry';
import {
  buildDataIntelligenceBatchRollupEntries,
  buildDataIntelligenceHeadlineStats,
  buildDataIntelligenceRelatedStatusEntries,
  buildDataIntelligenceShortcutSpecs,
  buildSelectedDataIntelligenceState,
  getDataIntelligenceCategoryLabel,
} from './projectCenterDataIntelligence';
import { buildSixCaseFinalReportRollup } from './finalReportRollup.js';
import { ProjectCenterProjectedWorksurfaceSection, ProjectCenterAdvancedActionsSection, ProjectCenterCaseListSection, ProjectCenterGlobalCaseManagerSection } from '../components/project/ProjectCenterExtractedSections';


function getReleaseGateClassName(status) {
  if (status === 'release-ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'needs-review') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
}

function caseDefinitionRelPath(caseId, fileKind) {
  const cid = String(caseId ?? '').trim();
  if (!cid) return '';
  if (fileKind === 'hydrology') return `Hydrology/configs/${cid}.yaml`;
  if (fileKind === 'case_manifest') return `cases/${cid}/contracts/case_manifest.json`;
  return `cases/${cid}/manifest.yaml`;
}

/** 与 Hydrology/scripts/scaffold_new_case.py CASE_ID_RE 一致：2–64 字符 */
const CASE_ID_SCAFFOLD_RE = /^[a-z][a-z0-9_]{1,63}$/;
const WORKSPACE_PREVIEW_CHAR_LIMIT = 60000;

function getWorkspacePreviewKind(filePath = '') {
  const lowerPath = String(filePath).toLowerCase();
  if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) return 'markdown';
  if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) return 'html';
  if (lowerPath.endsWith('.json')) return 'json';
  if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 'yaml';
  return 'text';
}

function getPathBasename(filePath = '') {
  const normalized = String(filePath).replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

function mapWorkspaceDirectoryEntries(entries = [], workspaceRoot = '') {
  const normalizedRoot = String(workspaceRoot || '').replace(/\\/g, '/').replace(/\/+$/, '');
  return [...entries]
    .sort((left, right) => {
      const leftIsDir = Array.isArray(left.children);
      const rightIsDir = Array.isArray(right.children);
      if (leftIsDir !== rightIsDir) return leftIsDir ? -1 : 1;
      return String(left.name || left.path).localeCompare(String(right.name || right.path));
    })
    .map((entry) => {
      const absolutePath = String(entry.path || '').replace(/\\/g, '/');
      const relativePath = absolutePath.startsWith(`${normalizedRoot}/`)
        ? absolutePath.slice(normalizedRoot.length + 1)
        : absolutePath;
      return {
        id: relativePath || absolutePath,
        label: entry.name || getPathBasename(relativePath || absolutePath),
        path: relativePath || absolutePath,
        absolutePath,
        isDirectory: Array.isArray(entry.children),
        children: Array.isArray(entry.children)
          ? mapWorkspaceDirectoryEntries(entry.children, workspaceRoot)
          : [],
      };
    });
}

function flattenWorkspaceFiles(nodes = []) {
  return nodes.flatMap((node) => {
    if (node.isDirectory) return flattenWorkspaceFiles(node.children || []);
    return [node];
  });
}

function formatWorkspacePreviewContent(filePath, content) {
  const kind = getWorkspacePreviewKind(filePath);
  let normalizedContent = String(content ?? '');
  if (kind === 'json') {
    try {
      normalizedContent = JSON.stringify(JSON.parse(normalizedContent), null, 2);
    } catch {
      // Keep raw content when JSON formatting fails.
    }
  }
  const truncated = normalizedContent.length > WORKSPACE_PREVIEW_CHAR_LIMIT;
  if (truncated) {
    normalizedContent = `${normalizedContent.slice(0, WORKSPACE_PREVIEW_CHAR_LIMIT)}\n\n... [preview truncated]`;
  }
  return {
    kind,
    content: normalizedContent,
    truncated,
    path: filePath,
  };
}

function deriveCaseIdFromDirectoryPath(directoryPath, knownCases = []) {
  const normalizedPath = String(directoryPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalizedPath) return '';
  const parts = normalizedPath.split('/');
  const casesIndex = parts.lastIndexOf('cases');
  if (casesIndex >= 0 && parts[casesIndex + 1]) {
    return parts[casesIndex + 1];
  }
  const basename = parts[parts.length - 1] || '';
  const matchedCase = knownCases.find((item) => item.caseId === basename || item.id === basename);
  return matchedCase?.id || matchedCase?.caseId || '';
}

function analyzeWorkspaceFiles(files = []) {
  const lowerPaths = files.map((file) => String(file.path || '').toLowerCase());
  const pathMatches = (matcher) => lowerPaths.some((path) => matcher(path));

  const hasManifest = pathMatches((path) => path.endsWith('/manifest.yaml') || path === 'manifest.yaml');
  const hasCaseManifest = pathMatches((path) => path.endsWith('/case_manifest.json') || path === 'case_manifest.json');
  const hasHydrologyConfig = pathMatches((path) => path.endsWith('.yaml') && (path.includes('/hydrology/') || path.includes('hydrology/configs')));
  const hasContracts = pathMatches((path) => path.includes('/contracts/') || path.startsWith('contracts/'));
  const hasWorkflowRun = pathMatches((path) => path.includes('workflow_run'));
  const hasReviewBundle = pathMatches((path) => path.includes('review_bundle'));
  const hasReleaseManifest = pathMatches((path) => path.includes('release_manifest'));
  const hasMarkdown = pathMatches((path) => path.endsWith('.md') || path.endsWith('.markdown'));
  const hasHtml = pathMatches((path) => path.endsWith('.html') || path.endsWith('.htm'));
  const hasSourceData = pathMatches((path) =>
    path.includes('/raw/') ||
    path.includes('sourcebundle') ||
    path.endsWith('.csv') ||
    path.endsWith('.xlsx') ||
    path.endsWith('.xls') ||
    path.endsWith('.parquet') ||
    path.endsWith('.shp') ||
    path.endsWith('.geojson') ||
    path.endsWith('.tif') ||
    path.endsWith('.tiff')
  );
  const hasModelAssets = hasManifest || hasCaseManifest || hasHydrologyConfig;
  const hasRunArtifacts = hasWorkflowRun || hasReviewBundle || hasReleaseManifest;

  let stage = 'directory';
  let headline = '目录浏览';
  let recommendation = '当前目录更像通用 workspace，可先浏览文件或手动指定建模起点。';

  if (hasRunArtifacts) {
    stage = 'continuation';
    headline = '可直接续作';
    recommendation = '已检测到运行/审查/发布产物，建议直接进入续作、审查或发布路径。';
  } else if (hasModelAssets) {
    stage = 'model-update';
    headline = '可更新模型';
    recommendation = '已检测到 manifest 或模型配置，建议继续编辑模型、校验 contracts 或重新运行。';
  } else if (hasSourceData) {
    stage = 'model-bootstrap';
    headline = '进入建模起步流';
    recommendation = '目录里已有原始数据或 sourcebundle，建议先做数据挖掘、建模建议和初始模型骨架生成。';
  }

  return {
    stage,
    headline,
    recommendation,
    counts: {
      files: files.length,
      markdown: files.filter((file) => /\.(md|markdown)$/i.test(file.path || '')).length,
      html: files.filter((file) => /\.(html|htm)$/i.test(file.path || '')).length,
    },
    flags: {
      hasManifest,
      hasCaseManifest,
      hasHydrologyConfig,
      hasContracts,
      hasWorkflowRun,
      hasReviewBundle,
      hasReleaseManifest,
      hasSourceData,
      hasMarkdown,
      hasHtml,
      hasModelAssets,
      hasRunArtifacts,
    },
  };
}

function buildWorkspaceBusinessPreview({
  filePath,
  previewContent,
  shellCaseId,
  caseSummary,
  triadMeta,
  contractChain,
  triadBridgePaths,
  reviewAssets,
  workspaceIntelligence,
}) {
  const assetKind = getWorkspaceAssetPreviewKind({ path: filePath });
  const matchedContract = findMatchingContractByPath(filePath, contractChain);

  if (assetKind === 'manifest') {
    return buildWorkspaceBusinessPreviewByKind('manifest', {
      previewContent,
      description: '把当前 case 的 gate、triad、pipeline 和运行信号折成业务卡片，再保留原始 YAML 以便核对。',
      badges: ['manifest', shellCaseId || 'case', triadMeta.label || 'triad'],
      caseId: shellCaseId,
      gate: caseSummary.gate_status,
      triadLabel: triadMeta.label,
      pipelineReady: caseSummary.pipeline_contract_ready,
      currentWorkflow: caseSummary.current_workflow,
      outputs: `${caseSummary.outcomes_generated || 0}/${caseSummary.total_executed || caseSummary.total || 0}`,
      evidence: caseSummary.evidence_bound_count,
      schema: caseSummary.schema_valid_count,
      workspaceStage: workspaceIntelligence.headline,
      recommendation: workspaceIntelligence.recommendation,
    });
  }

  if (assetKind === 'case_manifest') {
    return buildWorkspaceBusinessPreviewByKind('case_manifest', {
      previewContent,
      description: '展示 case shell 当前的合同入口、交付指针和工作面判断。',
      badges: ['case_manifest', shellCaseId || 'case'],
      caseId: shellCaseId,
      workspaceStage: workspaceIntelligence.headline,
      deliveryPack: caseSummary.delivery_pack_id,
      workflowRun: caseSummary.triad_workflow_run_rel,
      reviewBundle: caseSummary.triad_review_bundle_rel,
      releaseManifest: caseSummary.triad_release_manifest_rel,
      recommendation: workspaceIntelligence.recommendation,
    });
  }

  if (assetKind === 'standard_object_report_index' || assetKind === 'standard_object_report') {
    return buildWorkspaceBusinessPreviewByKind(assetKind, {
      previewContent,
      path: filePath,
      description:
        assetKind === 'standard_object_report_index'
          ? '展示当前 case 的标准对象报告覆盖、缺失对象与样例入口。'
          : '按对象模板渲染标准对象报告关键字段、摘要与模板章节。',
    });
  }

  if (matchedContract) {
    const relatedAssets = reviewAssets
      .filter((asset) => {
        if (matchedContract.stage === 'Run') return asset.category === 'live' || asset.category === 'gate';
        if (matchedContract.stage === 'Review') return asset.category === 'gate' || asset.category === 'memo';
        return asset.category === 'memo' || asset.category === 'live';
      })
      .slice(0, 3);

    return buildWorkspaceBusinessPreviewByKind('contract', {
      previewContent,
      title: `${matchedContract.contractName} 业务预览`,
      description: matchedContract.note,
      stage: matchedContract.stage,
      status: matchedContract.status,
      canonicalPath: matchedContract.path,
      bridgePath: matchedContract.bridgePath || triadBridgePaths[matchedContract.stage],
      triadLabel: triadMeta.label,
      pipelineReady: caseSummary.pipeline_contract_ready,
      currentWorkflow: caseSummary.current_workflow,
      relatedAssets: relatedAssets.map((asset) => ({
        label: asset.name,
        value: asset.path,
      })),
      reviewSignal: matchedContract.stage === 'Review'
        ? {
            evidence: caseSummary.evidence_bound_count,
            schema: caseSummary.schema_valid_count,
            gate: caseSummary.gate_status,
          }
        : null,
      releaseSignal: matchedContract.stage === 'Release'
        ? {
            deliveryPackId: caseSummary.delivery_pack_id,
            deliveryLatestPack: caseSummary.delivery_latest_pack_rel,
            deliveryPointer: caseSummary.delivery_pack_pointer_rel,
          }
        : null,
    });
  }

  if (assetKind === 'outcome_coverage') {
    return buildWorkspaceBusinessPreviewByKind('outcome_coverage', {
      previewContent,
      description: '把 outcome 覆盖率、schema/evidence 绑定和 gate 相关信号折成业务卡片。',
      badges: ['coverage', caseSummary.gate_status || 'pending', triadMeta.label || 'triad'],
      normalizedCoverage: caseSummary.normalized_outcome_coverage,
      rawCoverage: caseSummary.raw_outcome_coverage,
      schemaValidCount: caseSummary.schema_valid_count,
      evidenceBoundCount: caseSummary.evidence_bound_count,
      deliveryPackId: caseSummary.delivery_pack_id,
      explanation: `这份报告更适合回答 outcome 覆盖率、schema/evidence 绑定和当前 gate 的可信度。下一步：${workspaceIntelligence.recommendation}`,
    });
  }

  if (assetKind === 'verification') {
    return buildWorkspaceBusinessPreviewByKind('verification', {
      previewContent,
      description: '把阶段验收、pipeline readiness 和 triad 状态压缩成便于决策的业务视图。',
      badges: ['verification', caseSummary.gate_status || 'pending', 'gate'],
      gate: caseSummary.gate_status,
      pipelineReady: caseSummary.pipeline_contract_ready,
      triadLabel: triadMeta.label,
      currentWorkflow: caseSummary.current_workflow,
      outputs: `${caseSummary.outcomes_generated || 0}/${caseSummary.total_executed || caseSummary.total || 0}`,
      explanation: `这份报告更适合回答“当前 case 是否已经达到阶段化验收标准”。下一步：${workspaceIntelligence.recommendation}`,
    });
  }

  if (assetKind === 'final_report') {
    return buildWorkspaceBusinessPreviewByKind('final_report', {
      previewContent,
      description: '把 readiness、review/release 结论与最终断言收束成单一最终对象。',
      acceptanceScope: caseSummary.final_report_acceptance_scope,
      acceptanceSource: caseSummary.final_report_acceptance_source,
    });
  }

  if (assetKind === 'live_dashboard') {
    const liveDashboardAsset = reviewAssets.find((asset) => asset.name.startsWith('Live Dashboard'));
    return buildWorkspaceBusinessPreviewByKind('live_dashboard', {
      previewContent,
      description: '这类资产更适合被理解为“当前 case 的实时观测面”，而不是普通 HTML/Markdown 文件。',
      badges: ['live-dashboard', caseSummary.current_workflow || 'idle', workspaceIntelligence.stage],
      path: liveDashboardAsset?.path || filePath,
      currentWorkflow: caseSummary.current_workflow,
      gate: caseSummary.gate_status,
      workspaceStage: workspaceIntelligence.headline,
      outputs: `${caseSummary.outcomes_generated || 0}/${caseSummary.total_executed || caseSummary.total || 0}`,
      explanation: '更适合边运行边盯进度、回看当前链路，而不是作为静态归档文件。',
    });
  }

  if (assetKind === 'review_memo' || assetKind === 'release_note') {
    const isReviewMemo = assetKind === 'review_memo';
    return buildWorkspaceBusinessPreviewByKind(assetKind, {
      previewContent,
      title: isReviewMemo ? 'Review Memo 业务预览' : 'Release Note 业务预览',
      description: '把 Notebook/交付文档先按业务角色呈现，再保留原始 Markdown 内容。',
      badges: [isReviewMemo ? 'review-memo' : 'release-note', caseSummary.gate_status || 'pending'],
      documentType: isReviewMemo ? 'review_memo' : 'release_note',
      caseId: shellCaseId,
      gate: caseSummary.gate_status,
      reviewBundle: caseSummary.triad_review_bundle_rel,
      releaseManifest: caseSummary.triad_release_manifest_rel,
      deliveryPack: caseSummary.delivery_pack_id,
      explanation: isReviewMemo ? '这是面向审查与人工确认的摘要文档。' : '这是面向签发与交付的摘要文档。',
    });
  }

  return null;
}

function inferWorkspaceFocusTargetsFromCommand(command = '') {
  const text = String(command || '');
  if (!text) return [];

  if (text.includes('run-full-review')) {
    return [
      { kind: 'contract', stage: 'Review' },
      { kind: 'verification' },
      { kind: 'review_memo' },
      { kind: 'outcome_coverage' },
    ];
  }

  if (text.includes('build-release-pack')) {
    return [
      { kind: 'final_report' },
      { kind: 'contract', stage: 'Release' },
      { kind: 'release_note' },
      { kind: 'live_dashboard' },
    ];
  }

  if (text.includes('generate-delivery-docs-pack')) {
    return [
      { kind: 'final_report' },
      { kind: 'review_memo' },
      { kind: 'release_note' },
      { kind: 'contract', stage: 'Release' },
    ];
  }

  if (text.includes('refresh-dashboard')) {
    return [
      { kind: 'live_dashboard' },
      { kind: 'outcome_coverage' },
      { kind: 'verification' },
    ];
  }

  if (text.includes('run-fast') || text.includes('retry-failed')) {
    return [
      { kind: 'contract', stage: 'Run' },
      { kind: 'live_dashboard' },
      { kind: 'outcome_coverage' },
    ];
  }

  return [];
}

export default function ProjectCenter() {
  const navigate = useNavigate();
  const { isTauri: isTauriDesktop, openDirectory, readDirectory, readFile } = useTauri();
  const activeAgent = getActiveRoleAgent('/projects');
  const { cases: dynamicProjects, loading: projectsLoading, refresh: refreshCaseRegistry } = useDynamicCaseRegistry();
  const cases = dynamicProjects;
  const loading = projectsLoading;
  const refresh = refreshCaseRegistry;
  const { activeProject, activeProjectId, activeRole, setActiveProjectId } = useStudioWorkspace();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const { runtimeSnapshot, reload: reloadRuntime } = useStudioRuntime();
  const {
    checkpoints = [],
    executionHistory = [],
    logTail = { log_file: '', lines: [] },
    launchResult = null,
  } = useWorkflowExecution(activeProject.caseId, studioState.reports);
  const { summary: caseSummary, loading: caseSummaryLoading, reload: reloadCaseSummary } = useCaseContractSummary(activeProject.caseId);
  const summary = caseSummary;
  const text = '';
  const entries = [];
  const payload = null;
  const rows = [];
  const ok = true;
  const gateLabel = caseSummary.gate_status === 'passed' ? '通过' : caseSummary.gate_status === 'blocked' ? '阻断' : '待更新';
  const gateClassName = caseSummary.gate_status === 'passed'
    ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
    : caseSummary.gate_status === 'blocked'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  const triadMeta = getTriadStatusMeta(caseSummary.triad_truth_status);
  const pipelineTruthClassName = caseSummary.pipeline_contract_ready
    ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
    : 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  const triadBridgePaths = {
    Run: String(caseSummary.triad_workflow_run_rel || '').endsWith('.contract.json')
      ? caseSummary.triad_workflow_run_rel
      : '',
    Review: String(caseSummary.triad_review_bundle_rel || '').endsWith('.contract.json')
      ? caseSummary.triad_review_bundle_rel
      : '',
    Release: String(caseSummary.triad_release_manifest_rel || '').endsWith('.contract.json')
      ? caseSummary.triad_release_manifest_rel
      : '',
  };
  const contractChain = useCaseRunReviewReleaseContracts(shellCaseId);
  const reviewAssets = getCaseReviewAssets(shellCaseId);
  const shellEntryPoints = getCaseShellEntryPoints(shellCaseId);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState('');
  const [projectCenterInfoTab, setProjectCenterInfoTab] = useState('case');
  const [projectCenterPageTab, setProjectCenterPageTab] = useState('work');
  const canSeeAdvancedPlatformTools = ['designer', 'researcher'].includes(activeRole);
  const [qualityRubric, setQualityRubric] = useState(null);
  const [qualityRubricError, setQualityRubricError] = useState('');
  const [qualityRubricLoading, setQualityRubricLoading] = useState(false);
  const [qualityCoverage, setQualityCoverage] = useState(null);
  const [qualityCoverageError, setQualityCoverageError] = useState('');
  const [qualityCoverageLoading, setQualityCoverageLoading] = useState(false);
  const [qualityBatch, setQualityBatch] = useState(null);
  const [qualityBatchError, setQualityBatchError] = useState('');
  const [qualityBatchLoading, setQualityBatchLoading] = useState(false);
  const [rolloutBaseline, setRolloutBaseline] = useState(null);
  const [rolloutBaselineError, setRolloutBaselineError] = useState('');
  const [rolloutBaselineLoading, setRolloutBaselineLoading] = useState(false);
  const [knowledgeLintBatch, setKnowledgeLintBatch] = useState(null);
  const [knowledgeLintCase, setKnowledgeLintCase] = useState(null);
  const [knowledgeLintBatchLoading, setKnowledgeLintBatchLoading] = useState(false);
  const [knowledgeLintCaseLoading, setKnowledgeLintCaseLoading] = useState(false);
  const [knowledgeLintError, setKnowledgeLintError] = useState('');
  const [feasibility, setFeasibility] = useState(null);
  const [feasibilityError, setFeasibilityError] = useState('');
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [modelStrategy, setModelStrategy] = useState(null);
  const [modelStrategyError, setModelStrategyError] = useState('');
  const [modelStrategyLoading, setModelStrategyLoading] = useState(false);
  const [modelStrategyBatch, setModelStrategyBatch] = useState(null);
  const [modelStrategyBatchError, setModelStrategyBatchError] = useState('');
  const [modelStrategyBatchLoading, setModelStrategyBatchLoading] = useState(false);
  const [dataIntelligence, setDataIntelligence] = useState(null);
  const [dataIntelligenceError, setDataIntelligenceError] = useState('');
  const [dataIntelligenceLoading, setDataIntelligenceLoading] = useState(false);
  const [dataIntelligenceBatch, setDataIntelligenceBatch] = useState(null);
  const [dataIntelligenceBatchError, setDataIntelligenceBatchError] = useState('');
  const [dataIntelligenceBatchLoading, setDataIntelligenceBatchLoading] = useState(false);
  const [readiness, setReadiness] = useState(null);
  const [readinessError, setReadinessError] = useState('');
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [modelingHints, setModelingHints] = useState(null);
  const [modelingHintsError, setModelingHintsError] = useState('');
  const [modelingHintsLoading, setModelingHintsLoading] = useState(false);
  const [pipelinePreflight, setPipelinePreflight] = useState(null);
  const [pipelinePreflightError, setPipelinePreflightError] = useState('');
  const [pipelinePreflightLoading, setPipelinePreflightLoading] = useState(false);
  const [sourcebundleImport, setSourcebundleImport] = useState(null);
  const [sourcebundleImportError, setSourcebundleImportError] = useState('');
  const [sourcebundleImportLoading, setSourcebundleImportLoading] = useState(false);
  const [graphifyPilot, setGraphifyPilot] = useState(null);
  const [graphifyPilotError, setGraphifyPilotError] = useState('');
  const [graphifyPilotLoading, setGraphifyPilotLoading] = useState(false);
  const [graphifyReportSummary, setGraphifyReportSummary] = useState(null);
  const [sourceSyncSummary, setSourceSyncSummary] = useState(null);
  const [sourceSyncError, setSourceSyncError] = useState('');
  const [sourceSyncLoading, setSourceSyncLoading] = useState(false);
  const [showCaseScaffold, setShowCaseScaffold] = useState(false);
  const [showInspectorDrawer, setShowInspectorDrawer] = useState(false);
  const [scaffoldCaseId, setScaffoldCaseId] = useState('');
  const [scaffoldDisplayName, setScaffoldDisplayName] = useState('');
  const [scaffoldProjectType, setScaffoldProjectType] = useState('canal');
  const [scaffoldRegisterLoop, setScaffoldRegisterLoop] = useState(true);
  const [scaffoldBusy, setScaffoldBusy] = useState(false);
  const [scaffoldDryRunBusy, setScaffoldDryRunBusy] = useState(false);
  const [scaffoldDryRunPreview, setScaffoldDryRunPreview] = useState('');
  const [dataMiningProgress, setDataMiningProgress] = useState(null);
  const [dataMiningBusy, setDataMiningBusy] = useState(false);
  const [scaffoldHealthBusy, setScaffoldHealthBusy] = useState(false);
  const [scaffoldError, setScaffoldError] = useState('');
  const [showCaseEditor, setShowCaseEditor] = useState(false);
  const [editorCaseId, setEditorCaseId] = useState('');
  const [editorFileKind, setEditorFileKind] = useState('manifest');
  const [editorContent, setEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [editorHint, setEditorHint] = useState('');
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorFetchKey, setEditorFetchKey] = useState(0);
  const [scadaScenarioId, setScadaScenarioId] = useState('');
  const [scadaQueryStart, setScadaQueryStart] = useState('');
  const [scadaQueryEnd, setScadaQueryEnd] = useState('');
  const [scadaSqlitePath, setScadaSqlitePath] = useState('');
  const [workspaceNodes, setWorkspaceNodes] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceStatusNote, setWorkspaceStatusNote] = useState('');
  const [workspaceRootOverridePath, setWorkspaceRootOverridePath] = useState('');
  const [selectedWorkspaceFilePath, setSelectedWorkspaceFilePath] = useState('');
  const [highlightedWorkspaceFilePath, setHighlightedWorkspaceFilePath] = useState('');
  const [workspaceRefreshNonce, setWorkspaceRefreshNonce] = useState(0);
  const [pendingWorkspaceFocusTargets, setPendingWorkspaceFocusTargets] = useState([]);
  const parsedActionPayload = useMemo(
    () => parseNlGatewayStdout(actionResult?.stdout),
    [actionResult],
  );
  const workspaceRootPath = studioState.workspace.rootPath;
  const workspaceRootRel = shellCaseId ? `cases/${shellCaseId}` : '';
  const workspaceRootAbsolutePath = workspaceRootRel ? `${workspaceRootPath}/${workspaceRootRel}` : workspaceRootPath;
  const activeWorkspaceRootPath = workspaceRootOverridePath || workspaceRootAbsolutePath;
  const activeWorkspaceRootLabel = workspaceRootOverridePath || workspaceRootRel || workspaceRootAbsolutePath;
  const isCustomWorkspaceRoot = Boolean(workspaceRootOverridePath);
  const workspaceFallbackNodes = useMemo(() => {
    const seenPaths = new Set();
    const fallbackPaths = [
      caseDefinitionRelPath(activeProject.caseId, 'manifest'),
      caseDefinitionRelPath(activeProject.caseId, 'case_manifest'),
      caseDefinitionRelPath(activeProject.caseId, 'hydrology'),
      ...reviewAssets.map((artifact) => artifact.path),
      ...shellEntryPoints.map((entryPoint) => entryPoint.path),
    ].filter(Boolean);
    return fallbackPaths
      .filter((path) => {
        if (seenPaths.has(path)) return false;
        seenPaths.add(path);
        return true;
      })
      .map((path) => ({
        id: path,
        label: getPathBasename(path),
        path,
        absolutePath: `${workspaceRootPath}/${path}`,
        isDirectory: false,
        children: [],
      }));
  }, [activeProject.caseId, reviewAssets, shellEntryPoints, workspaceRootPath]);
  const workspaceFiles = useMemo(() => flattenWorkspaceFiles(workspaceNodes), [workspaceNodes]);
  const selectedWorkspaceFile = useMemo(
    () => workspaceFiles.find((file) => file.path === selectedWorkspaceFilePath) || null,
    [selectedWorkspaceFilePath, workspaceFiles],
  );
  const selectedWorkspaceAssetKind = useMemo(
    () => getWorkspaceAssetPreviewKind({ path: selectedWorkspaceFilePath }),
    [selectedWorkspaceFilePath],
  );
  const selectedWorkspaceContract = useMemo(
    () => findMatchingContractByPath(selectedWorkspaceFilePath, contractChain),
    [contractChain, selectedWorkspaceFilePath],
  );

  const workspaceIntelligence = useMemo(
    () => analyzeWorkspaceFiles(workspaceFiles),
    [workspaceFiles],
  );

  const loadWorkspacePreview = useCallback(async (selectedFile) => {
    if (!selectedFile?.path) return null;

    if (!isTauri()) {
      return formatWorkspacePreviewContent(
        selectedFile.path,
        `浏览器预览模式\n\n当前文件：${selectedFile.path}\n\n请在桌面壳中读取真实文件内容。Markdown、HTML、JSON、YAML 自动渲染仅在桌面模式下读取真实文件后生效。`
      );
    }

    const absolutePath = selectedFile.absolutePath;
    const content = isCustomWorkspaceRoot && absolutePath
      ? await readFile(absolutePath)
      : await readWorkspaceTextFile(selectedFile.path, null);

    if (content == null) {
      throw new Error('当前文件暂不支持文本预览，或尚未生成可读取内容。');
    }

    const formattedPreview = formatWorkspacePreviewContent(selectedFile.path, content);
    const businessPreview = buildWorkspaceBusinessPreview({
      filePath: selectedFile.path,
      previewContent: formattedPreview.content,
      shellCaseId,
      caseSummary,
      triadMeta,
      contractChain,
      triadBridgePaths,
      reviewAssets,
      workspaceIntelligence,
    });

    return businessPreview
      ? {
          ...formattedPreview,
          ...businessPreview,
        }
      : formattedPreview;
  }, [
    caseSummary,
    contractChain,
    isCustomWorkspaceRoot,
    reviewAssets,
    shellCaseId,
    triadBridgePaths,
    triadMeta,
    workspaceIntelligence,
  ]);
  const {
    preview: workspacePreview,
    loading: workspacePreviewLoading,
    error: workspacePreviewError,
  } = useWorkspacePreviewLoader({
    selectedItem: selectedWorkspaceFile,
    loadPreview: loadWorkspacePreview,
  });
  const currentLiveLogFile = logTail.log_file || launchResult?.log_file || runtimeSnapshot.log_file || '';
  const liveOutputHistory = useMemo(() => executionHistory.slice(0, 5), [executionHistory]);
  const latestWorkspaceOutputEntries = useMemo(() => {
    const entries = [];
    if (actionError) {
      entries.push({
        key: 'action-error',
        title: '最近动作错误',
        level: 'error',
        summary: '当前动作执行失败，请先处理错误再继续。',
        body: String(actionError).slice(0, 800),
      });
    }
    if (actionResult) {
      entries.push({
        key: 'action-result',
        title: '最近动作回执',
        level: actionResult.success ? 'ok' : 'warn',
        summary: `${actionResult.command || 'unknown'} · ${actionResult.status || 'unknown'} · success ${String(actionResult.success)}`,
        body: [`stdout:\n${(actionResult.stdout || '').slice(0, 800)}`, `stderr:\n${(actionResult.stderr || '').slice(0, 400)}`]
          .filter(Boolean)
          .join('\n\n'),
      });
    }
    if (parsedActionPayload?.action || parsedActionPayload?.run_id) {
      entries.push({
        key: 'action-payload',
        title: '输出解析摘要',
        level: 'parsed',
        summary: `action ${parsedActionPayload.action || '--'} · run ${parsedActionPayload.run_id || '--'} · scenario ${parsedActionPayload.scenario_id || '--'}`,
        body: `messages ${parsedActionPayload.messages_emitted ?? '--'}\nwindow ${parsedActionPayload.query_start || '—'} -> ${parsedActionPayload.query_end || '—'}\nsqlite ${parsedActionPayload.sqlite_path || '—'}`,
      });
    }
    checkpoints.slice(0, 3).forEach((checkpoint, index) => {
      entries.push({
        key: `checkpoint-${index}`,
        title: checkpoint.title || checkpoint.label || `Checkpoint ${index + 1}`,
        level: checkpoint.status || 'checkpoint',
        summary: checkpoint.summary || checkpoint.description || '当前工作流检查点',
        body: checkpoint.note || checkpoint.details || '',
      });
    });
    return entries;
  }, [actionError, actionResult, checkpoints, parsedActionPayload]);

  const actionCommands = useMemo(
    () => ({
      runFast: buildHydrodeskE2eActionsCommand(shellCaseId, ['--action', 'run-fast', '--retry-max', '2']),
      retryFailed: buildHydrodeskE2eActionsCommand(shellCaseId, [
        '--action',
        'retry-failed',
        '--execution-profile',
        'fast_validation',
        '--retry-max',
        '2',
      ]),
      refreshDashboard: buildHydrodeskE2eActionsCommand(shellCaseId, ['--action', 'refresh-dashboard']),
      runFullReview: buildHydrodeskE2eActionsCommand(shellCaseId, ['--action', 'run-full-review']),
      buildReleasePack: buildHydrodeskE2eActionsCommand(shellCaseId, ['--action', 'build-release-pack']),
      generateDeliveryDocsPack: buildHydrodeskE2eActionsCommand(shellCaseId, [
        '--action',
        'generate-delivery-docs-pack',
      ]),
      generateDeliveryDocsPackStrict: buildHydrodeskE2eActionsCommand(shellCaseId, [
        '--action',
        'generate-delivery-docs-pack',
        '--require-release-gate',
      ]),
    }),
    [shellCaseId],
  );

  const runScadaReplayCommand = useMemo(() => {
    const sid = String(scadaScenarioId ?? '').trim();
    const argv = [
      '--action',
      'run-scada-replay',
      '--replay-speed',
      '60',
      '--quality-code',
      'GOOD',
      '--max-events',
      '1200',
    ];
    if (sid) argv.push('--scenario-id', sid);
    const qs = String(scadaQueryStart ?? '').trim();
    const qe = String(scadaQueryEnd ?? '').trim();
    const sp = String(scadaSqlitePath ?? '').trim();
    if (qs) argv.push('--query-start', qs);
    if (qe) argv.push('--query-end', qe);
    if (sp) argv.push('--sqlite-path', sp);
    return buildHydrodeskE2eActionsCommand(shellCaseId, argv);
  }, [shellCaseId, scadaScenarioId, scadaQueryStart, scadaQueryEnd, scadaSqlitePath]);

  const platformLoopCommands = useMemo(
    () => ({
      listCases: buildHydrodeskRolloutE2eLoopCommand(['--list-cases']),
      dryRunAll: buildHydrodeskRolloutE2eLoopCommand(['--dry-run', '--quiet']),
      dryRunCurrent: shellCaseId
        ? buildHydrodeskRolloutE2eLoopCommand(['--dry-run', '--quiet', '--case-id', shellCaseId])
        : '',
    }),
    [shellCaseId],
  );

  /** 仅当 canonical/contract 双缺时写入占位；不替代正式 build-release-pack。 */
  const bootstrapTriadMinimalCommand = useMemo(
    () =>
      shellCaseId
        ? buildBootstrapCaseTriadMinimalCommand(['--apply', '--case-id', shellCaseId])
        : '',
    [shellCaseId],
  );

  const runCaseAction = useCallback(async (command) => {
    setActionBusy(true);
    setActionError('');
    try {
      const result = await runWorkspaceCommand(command, '.', null);
      setActionResult(result || null);
      setPendingWorkspaceFocusTargets(inferWorkspaceFocusTargetsFromCommand(command));
      setWorkspaceRefreshNonce((value) => value + 1);
      setWorkspaceStatusNote('已执行上下文动作，正在刷新 workspace 与输出状态。');
      reloadRuntime();
      reloadCaseSummary();
    } catch (error) {
      setActionError(error?.message || String(error));
    } finally {
      setActionBusy(false);
    }
  }, [reloadRuntime, reloadCaseSummary]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaceNodes() {
      if (!activeWorkspaceRootPath) {
        setWorkspaceNodes([]);
        setWorkspaceError('');
        return;
      }

      setWorkspaceLoading(true);
      setWorkspaceError('');

      try {
        if (isTauriDesktop) {
          const entries = await readDirectory(activeWorkspaceRootPath, true);
          if (!cancelled) {
            const pinnedNodes = isCustomWorkspaceRoot
              ? []
              : [
                  caseDefinitionRelPath(activeProject.caseId, 'manifest'),
                  caseDefinitionRelPath(activeProject.caseId, 'case_manifest'),
                  caseDefinitionRelPath(activeProject.caseId, 'hydrology'),
                ]
                  .filter(Boolean)
                  .map((path) => ({
                    id: `pinned:${path}`,
                    label: getPathBasename(path),
                    path,
                    absolutePath: `${workspaceRootPath}/${path}`,
                    isDirectory: false,
                    children: [],
                  }));
            const mappedNodes = mapWorkspaceDirectoryEntries(entries, activeWorkspaceRootPath);
            setWorkspaceNodes(
              pinnedNodes.length > 0
                ? [
                    {
                      id: 'workspace-pinned',
                      label: 'Pinned Files',
                      path: '__pinned__',
                      isDirectory: true,
                      children: pinnedNodes,
                    },
                    ...mappedNodes,
                  ]
                : mappedNodes
            );
          }
          return;
        }

        if (!cancelled) {
          setWorkspaceNodes([
            {
              id: 'browser-preview',
              label: '浏览器预览可见文件',
              path: '__browser_preview__',
              isDirectory: true,
              children: workspaceFallbackNodes,
            },
          ]);
        }
      } catch (error) {
        if (!cancelled) {
          setWorkspaceNodes([
            {
              id: 'workspace-fallback',
              label: 'Fallback Assets',
              path: '__workspace_fallback__',
              isDirectory: true,
              children: workspaceFallbackNodes,
            },
          ]);
          setWorkspaceError(error?.message || String(error));
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    loadWorkspaceNodes();

    return () => {
      cancelled = true;
    };
  }, [
    activeProject.caseId,
    activeWorkspaceRootPath,
    isCustomWorkspaceRoot,
    isTauriDesktop,
    readDirectory,
    workspaceFallbackNodes,
    workspaceRefreshNonce,
    workspaceRootPath,
  ]);

  useEffect(() => {
    if (!workspaceFiles.some((file) => file.path === selectedWorkspaceFilePath)) {
      setSelectedWorkspaceFilePath(workspaceFiles[0]?.path || '');
    }
  }, [selectedWorkspaceFilePath, workspaceFiles]);

  useEffect(() => {
    if (!highlightedWorkspaceFilePath) return undefined;
    const timer = window.setTimeout(() => setHighlightedWorkspaceFilePath(''), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightedWorkspaceFilePath]);

  useEffect(() => {
    if (!Array.isArray(pendingWorkspaceFocusTargets) || pendingWorkspaceFocusTargets.length === 0) return;
    if (!Array.isArray(workspaceFiles) || workspaceFiles.length === 0) return;

    const matchedFile = workspaceFiles.find((file) => {
      const kind = getWorkspaceAssetPreviewKind({ path: file.path });
      const matchedContract = findMatchingContractByPath(file.path, contractChain);
      return pendingWorkspaceFocusTargets.some((target) => {
        if (target.kind !== kind) return false;
        if (target.kind === 'contract' && target.stage) {
          return matchedContract?.stage === target.stage;
        }
        return true;
      });
    });

    if (matchedFile?.path) {
      setSelectedWorkspaceFilePath(matchedFile.path);
      setHighlightedWorkspaceFilePath(matchedFile.path);
      setWorkspaceStatusNote(`已根据最近动作切换到 ${matchedFile.label || getPathBasename(matchedFile.path)}。`);
    } else {
      setWorkspaceStatusNote('已刷新 workspace；当前未识别到更合适的新产物，保留原选择。');
    }
    setPendingWorkspaceFocusTargets([]);
  }, [contractChain, pendingWorkspaceFocusTargets, workspaceFiles]);

  const handleSelectWorkspaceDirectory = useCallback(async () => {
    if (!isTauriDesktop) {
      setWorkspaceStatusNote('浏览器预览模式不支持目录选择，请在桌面端打开目录。');
      return;
    }

    try {
      const selectedPath = await openDirectory({
        title: 'Open Case Directory',
        defaultPath: activeWorkspaceRootPath,
      });
      if (!selectedPath) return;

      // Use caseManagerOpenDirectory to validate and fetch entries
      const entries = await caseManagerOpenDirectory(selectedPath);
      if (!entries) {
        throw new Error('Failed to read directory using caseManagerOpenDirectory.');
      }

      const matchedCaseId = deriveCaseIdFromDirectoryPath(selectedPath, dynamicProjects);
      setWorkspaceRootOverridePath(selectedPath);
      setWorkspaceStatusNote(
        matchedCaseId
          ? `已切换到目录 ${selectedPath}，并识别为案例 ${matchedCaseId}。`
          : `已切换到目录 ${selectedPath}。当前未识别到注册案例，将以通用 workspace 方式浏览。`
      );
      if (matchedCaseId) {
        setActiveProjectId(matchedCaseId);
      }
    } catch (error) {
      setWorkspaceStatusNote('');
      setWorkspaceError(error?.message || String(error));
    }
  }, [activeWorkspaceRootPath, dynamicProjects, isTauriDesktop, openDirectory, setActiveProjectId]);

  const loadQualityRubric = useCallback(async () => {
    setQualityRubricLoading(true);
    setQualityRubricError('');
    try {
      const cmd = buildExportAutonomousWaternetQualityRubricCommand();
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseQualityRubricExportStdout(result?.stdout);
      if (!payload?.quality_loop) {
        setQualityRubricError('未能解析质量维度 JSON（检查 Python 与 YAML 路径）');
        setQualityRubric(null);
        return;
      }
      setQualityRubric(payload);
    } catch (error) {
      setQualityRubricError(error?.message || String(error));
      setQualityRubric(null);
    } finally {
      setQualityRubricLoading(false);
    }
  }, []);

  const loadQualityCoverage = useCallback(async () => {
    if (!shellCaseId) return;
    setQualityCoverageLoading(true);
    setQualityCoverageError('');
    try {
      const cmd = buildCheckCaseQualityArtifactsCommand(shellCaseId);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.dimension_checks) {
        setQualityCoverageError('未能解析产物覆盖 JSON');
        setQualityCoverage(null);
        return;
      }
      setQualityCoverage(payload);
    } catch (error) {
      setQualityCoverageError(error?.message || String(error));
      setQualityCoverage(null);
    } finally {
      setQualityCoverageLoading(false);
    }
  }, [shellCaseId]);

  const loadQualityBatch = useCallback(async () => {
    setQualityBatchLoading(true);
    setQualityBatchError('');
    try {
      const cmd = buildBatchCheckCaseQualityArtifactsCommand();
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.batch || !payload?.rollup) {
        setQualityBatchError('未能解析批量产物覆盖 JSON');
        setQualityBatch(null);
        return;
      }
      setQualityBatch(payload);
    } catch (error) {
      setQualityBatchError(error?.message || String(error));
      setQualityBatch(null);
    } finally {
      setQualityBatchLoading(false);
    }
  }, []);

  const loadRolloutBaseline = useCallback(async () => {
    setRolloutBaselineLoading(true);
    setRolloutBaselineError('');
    try {
      const cmd = buildExportRolloutReadinessBaselineCommand(['--stdout']);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok || !payload?.import_chain_rollup) {
        setRolloutBaselineError('未能解析 rollout readiness baseline JSON');
        setRolloutBaseline(null);
        return;
      }
      const caseIds = (payload.readiness_release_board?.cases || [])
        .map((row) => row?.case_id)
        .filter(Boolean);
      const rows = await Promise.all(caseIds.map((caseId) => getCaseContractSummary(caseId, null)));
      setRolloutBaseline({
        ...payload,
        final_report_rollup: buildSixCaseFinalReportRollup({
          caseIds,
          rows: rows.filter(Boolean),
        }),
      });
    } catch (error) {
      setRolloutBaselineError(error?.message || String(error));
      setRolloutBaseline(null);
    } finally {
      setRolloutBaselineLoading(false);
    }
  }, []);

  const loadKnowledgeLintBatch = useCallback(async () => {
    setKnowledgeLintBatchLoading(true);
    setKnowledgeLintError('');
    try {
      const cmd = buildLintCaseKnowledgeLinksCommand(['--batch']);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.batch || !payload?.rollup) {
        setKnowledgeLintError('未能解析知识链接 lint JSON（需桌面端在仓库根执行 Python）');
        setKnowledgeLintBatch(null);
        return;
      }
      setKnowledgeLintBatch(payload);
    } catch (error) {
      setKnowledgeLintError(error?.message || String(error));
      setKnowledgeLintBatch(null);
    } finally {
      setKnowledgeLintBatchLoading(false);
    }
  }, []);

  const loadKnowledgeLintCase = useCallback(async () => {
    if (!shellCaseId) return;
    setKnowledgeLintCaseLoading(true);
    setKnowledgeLintError('');
    try {
      const cmd = buildLintCaseKnowledgeLinksCommand(['--case-id', shellCaseId]);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.case_id) {
        setKnowledgeLintError('未能解析单案例知识链接 lint JSON');
        setKnowledgeLintCase(null);
        return;
      }
      setKnowledgeLintCase(payload);
    } catch (error) {
      setKnowledgeLintError(error?.message || String(error));
      setKnowledgeLintCase(null);
    } finally {
      setKnowledgeLintCaseLoading(false);
    }
  }, [shellCaseId]);

  const loadWorkflowFeasibility = useCallback(async () => {
    if (!shellCaseId) return;
    setFeasibilityLoading(true);
    setFeasibilityError('');
    try {
      const cmd = buildExportCaseWorkflowFeasibilityCommand(shellCaseId);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok || !Array.isArray(payload.workflows)) {
        setFeasibilityError('未能解析可运行性矩阵 JSON（需桌面端执行 Python）');
        setFeasibility(null);
        return;
      }
      setFeasibility(payload);
    } catch (error) {
      setFeasibilityError(error?.message || String(error));
      setFeasibility(null);
    } finally {
      setFeasibilityLoading(false);
    }
  }, [shellCaseId]);

  const loadModelStrategy = useCallback(async (caseIdOverride) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid) return;
    setModelStrategyLoading(true);
    setModelStrategyError('');
    try {
      const cmd = buildExportCaseModelStrategyCommand(cid);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok || !payload?.case) {
        setModelStrategyError('未能解析模型判型 JSON');
        setModelStrategy(null);
        return;
      }
      setModelStrategy(payload.case);
    } catch (error) {
      setModelStrategyError(error?.message || String(error));
      setModelStrategy(null);
    } finally {
      setModelStrategyLoading(false);
    }
  }, [shellCaseId]);

  const loadModelStrategyBatch = useCallback(async () => {
    setModelStrategyBatchLoading(true);
    setModelStrategyBatchError('');
    try {
      const cmd = buildExportCaseModelStrategyBatchCommand();
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok || !payload?.rollup) {
        setModelStrategyBatchError('未能解析批量模型判型 JSON');
        setModelStrategyBatch(null);
        return;
      }
      setModelStrategyBatch(payload);
    } catch (error) {
      setModelStrategyBatchError(error?.message || String(error));
      setModelStrategyBatch(null);
    } finally {
      setModelStrategyBatchLoading(false);
    }
  }, []);

  const loadCaseDataIntelligence = useCallback(async (caseIdOverride) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid) return;
    setDataIntelligenceLoading(true);
    setDataIntelligenceError('');
    try {
      const cmd = buildExportCaseDataIntelligenceCommand(cid);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.case_id || !payload?.asset_profile || !payload?.workflow_planning) {
        setDataIntelligenceError('未能解析数据智能规划 JSON');
        setDataIntelligence(null);
        return;
      }
      setDataIntelligence(payload);
    } catch (error) {
      setDataIntelligenceError(error?.message || String(error));
      setDataIntelligence(null);
    } finally {
      setDataIntelligenceLoading(false);
    }
  }, [shellCaseId]);

  const loadCaseDataIntelligenceBatch = useCallback(async () => {
    setDataIntelligenceBatchLoading(true);
    setDataIntelligenceBatchError('');
    try {
      const cmd = buildExportCaseDataIntelligenceBatchCommand();
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.case_ids || !Array.isArray(payload?.profiles)) {
        setDataIntelligenceBatchError('未能解析批量数据智能规划 JSON');
        setDataIntelligenceBatch(null);
        return;
      }
      setDataIntelligenceBatch(payload);
    } catch (error) {
      setDataIntelligenceBatchError(error?.message || String(error));
      setDataIntelligenceBatch(null);
    } finally {
      setDataIntelligenceBatchLoading(false);
    }
  }, []);

  const loadPlatformReadiness = useCallback(async (caseIdOverride) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid) return;
    setReadinessLoading(true);
    setReadinessError('');
    try {
      const cmd = buildExportCasePlatformReadinessCommand(cid);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok) {
        setReadinessError('未能解析合并就绪度 JSON（需桌面端在仓库根执行 Python）');
        setReadiness(null);
        return;
      }
      setReadiness(payload);
      const wf = payload.workflow_feasibility;
      if (wf && Array.isArray(wf.workflows)) {
        setFeasibility(wf);
        setFeasibilityError('');
      }
    } catch (error) {
      setReadinessError(error?.message || String(error));
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }, [shellCaseId]);

  const loadModelingHints = useCallback(async (caseIdOverride) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid) return;
    setModelingHintsLoading(true);
    setModelingHintsError('');
    try {
      const cmd = buildExportCaseModelingHintsCommand(cid);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok || !payload?.hints) {
        setModelingHintsError('未能解析建模 hints JSON');
        setModelingHints(null);
        return;
      }
      setModelingHints(payload);
    } catch (error) {
      setModelingHintsError(error?.message || String(error));
      setModelingHints(null);
    } finally {
      setModelingHintsLoading(false);
    }
  }, [shellCaseId]);

  const loadPipelinePreflight = useCallback(async (caseIdOverride) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid) return;
    setPipelinePreflightLoading(true);
    setPipelinePreflightError('');
    try {
      const cmd = buildRunCasePipelinePreflightCommand(cid, 'simulation');
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload || payload.case_id !== cid) {
        setPipelinePreflightError('未能解析 case pipeline preflight JSON');
        setPipelinePreflight(null);
        return;
      }
      setPipelinePreflight(payload);
      setSourcebundleImport(payload.sourcebundle_import || null);
    } catch (error) {
      setPipelinePreflightError(error?.message || String(error));
      setPipelinePreflight(null);
    } finally {
      setPipelinePreflightLoading(false);
    }
  }, [shellCaseId]);

  const runSourcebundleImport = useCallback(async (caseIdOverride) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid) return;
    setSourcebundleImportLoading(true);
    setSourcebundleImportError('');
    try {
      const cmd = buildImportCaseSourcebundleCommand(cid);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok) {
        setSourcebundleImportError('未能解析 SourceBundle import JSON');
        return;
      }
      setSourcebundleImport(payload);
      await loadPipelinePreflight(cid);
      await loadModelStrategy(cid);
      await loadPlatformReadiness(cid);
      await loadModelingHints(cid);
    } catch (error) {
      setSourcebundleImportError(error?.message || String(error));
    } finally {
      setSourcebundleImportLoading(false);
    }
  }, [shellCaseId, loadPipelinePreflight, loadModelStrategy, loadPlatformReadiness, loadModelingHints]);

  const loadGraphifyPilot = useCallback(async (caseIdOverride, { prepare = false } = {}) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid || !isTauri()) return;
    setGraphifyPilotLoading(true);
    setGraphifyPilotError('');
    try {
      if (!prepare) {
        const graphReportRel = `.graphify/pilots/case-${cid}/graphify-out/GRAPH_REPORT.md`;
        const graphJsonRel = `.graphify/pilots/case-${cid}/graphify-out/graph.json`;
        const dbSummaryRel = `.graphify/pilots/case-${cid}/graphify-out/db_sidecar_run_summary.json`;
        const runSummaryRel = `.graphify/pilots/case-${cid}/graphify-out/run_summary.json`;
        const reportExists = await workspacePathExists(graphReportRel, false);
        const graphExists = await workspacePathExists(graphJsonRel, false);
        let dbSidecarSummary = null;
        let graphRunSummary = null;
        try {
          const text = await readWorkspaceTextFile(dbSummaryRel, null);
          dbSidecarSummary = text ? JSON.parse(text) : null;
        } catch {
          dbSidecarSummary = null;
        }
        try {
          const text = await readWorkspaceTextFile(runSummaryRel, null);
          graphRunSummary = text ? JSON.parse(text) : null;
        } catch {
          graphRunSummary = null;
        }
        const structuralReportRel = `.graphify/pilots/case-${cid}/graphify-out/GRAPH_REPORT.md`;
        const structuralJsonRel = `.graphify/pilots/case-${cid}/graphify-out/graph.json`;
        setGraphifyPilot({
          case_id: cid,
          input_dir: `.graphify/pilots/case-${cid}/input`,
          output_dir: `.graphify/pilots/case-${cid}/graphify-out`,
          graph_report_rel: graphReportRel,
          graph_json_rel: graphJsonRel,
          graph_run_summary: graphRunSummary,
          db_sidecar_summary: dbSidecarSummary,
          structural_graph_ready: reportExists && graphExists,
          structural_graph_report_rel: structuralReportRel,
          structural_graph_json_rel: structuralJsonRel,
          prepared: reportExists || graphExists,
          command: null,
        });
        return;
      }
      const cmd = buildRunGraphifyCaseSidecarCommand(cid);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok) {
        setGraphifyPilotError('未能解析 Graphify case-sidecar JSON');
        setGraphifyPilot(null);
        return;
      }
      let dbSidecarSummary = null;
      let graphRunSummary = null;
      try {
        const text = await readWorkspaceTextFile(`${payload.output_dir}/db_sidecar_run_summary.json`, null);
        dbSidecarSummary = text ? JSON.parse(text) : null;
      } catch {
        dbSidecarSummary = null;
      }
      try {
        const text = await readWorkspaceTextFile(`${payload.output_dir}/run_summary.json`, null);
        graphRunSummary = text ? JSON.parse(text) : null;
      } catch {
        graphRunSummary = null;
      }
      setGraphifyPilot({
        ...payload,
        graph_report_rel: `${payload.output_dir}/GRAPH_REPORT.md`,
        graph_json_rel: `${payload.output_dir}/graph.json`,
        graph_run_summary: graphRunSummary,
        db_sidecar_summary: dbSidecarSummary,
        structural_graph_ready: true,
        structural_graph_report_rel: `${payload.output_dir}/GRAPH_REPORT.md`,
        structural_graph_json_rel: `${payload.output_dir}/graph.json`,
        prepared: true,
      });
    } catch (error) {
      setGraphifyPilotError(error?.message || String(error));
      setGraphifyPilot(null);
    } finally {
      setGraphifyPilotLoading(false);
    }
  }, [shellCaseId]);

  const loadSourceSyncSummary = useCallback(async (caseIdOverride, { runSync = false } = {}) => {
    const cid = String(caseIdOverride ?? shellCaseId ?? '').trim();
    if (!cid || !isTauri()) return;
    setSourceSyncLoading(true);
    setSourceSyncError('');
    try {
      if (runSync) {
        const cmd = buildRunSourceSyncCommand(cid);
        await runWorkspaceCommand(cmd, '.', null);
        refreshCaseRegistry();
        reloadRuntime();
        reloadCaseSummary();
        setWorkspaceRefreshNonce((value) => value + 1);
        setWorkspaceStatusNote('已执行 Source Sync，正在刷新案例 contracts 与 workspace。');
      }
      for (const rel of [
        `cases/${cid}/contracts/source_summary.latest.json`,
        `cases/${cid}/contracts/wxq_source_summary.latest.json`,
      ]) {
        try {
          const text = await readWorkspaceTextFile(rel, null);
          const payload = text ? JSON.parse(text) : null;
          if (!payload) continue;
          setSourceSyncSummary({
            case_id: cid,
            source_rel: rel,
            summary_rel: `cases/${cid}/contracts/source_summary.latest.json`,
            registry_rel: `cases/${cid}/contracts/source_registry.latest.json`,
            legacy_summary_rel: `cases/${cid}/contracts/wxq_source_summary.latest.json`,
            legacy_registry_rel: `cases/${cid}/contracts/wxq_source_registry.latest.json`,
            payload,
          });
          return;
        } catch {
          // ignore and continue probing
        }
      }
      setSourceSyncSummary(null);
    } catch (error) {
      setSourceSyncError(error?.message || String(error));
      setSourceSyncSummary(null);
    } finally {
      setSourceSyncLoading(false);
    }
  }, [shellCaseId, refreshCaseRegistry, reloadRuntime, reloadCaseSummary]);

  useEffect(() => {
    if (!graphifyPilot?.graph_report_rel || !isTauri()) {
      setGraphifyReportSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const text = await readWorkspaceTextFile(graphifyPilot.graph_report_rel, null);
        if (!cancelled) {
          setGraphifyReportSummary(parseGraphifyReportSummary(text));
        }
      } catch {
        if (!cancelled) setGraphifyReportSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graphifyPilot, isTauri]);

  useEffect(() => {
    if (!shellCaseId || !isTauri()) {
      setSourceSyncSummary(null);
      return;
    }
    void loadSourceSyncSummary(shellCaseId);
  }, [shellCaseId, loadSourceSyncSummary]);

  const runCaseScaffoldHealthScan = useCallback(async () => {
    if (!shellCaseId) return;
    setScaffoldHealthBusy(true);
    try {
      await loadPlatformReadiness(shellCaseId);
      await loadModelStrategy(shellCaseId);
      await loadModelingHints(shellCaseId);
      await loadPipelinePreflight(shellCaseId);
      await loadKnowledgeLintCase();
    } finally {
      setScaffoldHealthBusy(false);
    }
  }, [shellCaseId, loadPlatformReadiness, loadModelStrategy, loadModelingHints, loadPipelinePreflight, loadKnowledgeLintCase]);

  /** P1-2：案例变更后后台探测 loop dry-run，不阻塞保存/脚手架主流程 */
  const scheduleLoopDryRunForCase = useCallback((caseId) => {
    const cid = String(caseId || '').trim();
    if (!cid || !isTauri()) return;
    void (async () => {
      try {
        const cmd = buildHydrodeskRolloutE2eLoopCommand([
          '--dry-run',
          '--quiet',
          '--json-summary',
          '--case-id',
          cid,
        ]);
        await runWorkspaceCommand(cmd, '.', null);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  /** 保存/脚手架后后台跑单案例知识链接 lint，不阻塞 UI */
  const scheduleKnowledgeLintForCase = useCallback((caseId) => {
    const cid = String(caseId || '').trim();
    if (!cid || !isTauri()) return;
    void (async () => {
      try {
        const cmd = buildLintCaseKnowledgeLinksCommand(['--case-id', cid]);
        await runWorkspaceCommand(cmd, '.', null);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const openCaseEditor = useCallback((caseId, fileKind = 'manifest') => {
    const cid = resolveShellCaseId(caseId);
    const kind =
      fileKind === 'hydrology' || fileKind === 'case_manifest' ? fileKind : 'manifest';
    setEditorFileKind(kind);
    setEditorHint('');
    setEditorDirty(false);
    setEditorFetchKey((k) => k + 1);
    setShowCaseEditor(true);
    if (!cid) {
      setEditorCaseId('');
      setEditorError(
        '请先在「工程与案例」中切换到一个案例，再编辑 manifest、case_manifest.json 或 Hydrology 配置。',
      );
      setEditorContent('');
      return;
    }
    setEditorCaseId(cid);
    setEditorError('');
  }, []);

  useEffect(() => {
    if (!showCaseEditor || !editorCaseId.trim()) return undefined;
    const rel = caseDefinitionRelPath(editorCaseId.trim(), editorFileKind);
    if (!rel) return undefined;
    let cancelled = false;
    (async () => {
      if (!isTauri()) {
        setEditorLoading(false);
        setEditorContent('');
        setEditorError('');
        setEditorHint('浏览器预览模式：内联读写不可用。请使用桌面端（npm run tauri dev），或使用「外部打开」用系统编辑器编辑。');
        setEditorDirty(false);
        return;
      }
      setEditorLoading(true);
      setEditorError('');
      setEditorHint('');
      try {
        const text = await readWorkspaceTextFile(rel);
        if (cancelled) return;
        if (text == null) {
          setEditorContent('');
          setEditorHint('未能读取文件（非桌面环境）');
        } else {
          setEditorContent(text);
          setEditorHint('');
        }
        setEditorDirty(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e?.message || String(e);
        if (msg.includes('文件不存在')) {
          setEditorContent('');
          setEditorHint(`${msg} — 可直接编辑后保存以创建该文件`);
        } else {
          setEditorError(msg);
          setEditorContent('');
        }
        setEditorDirty(false);
      } finally {
        if (!cancelled) setEditorLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCaseEditor, editorCaseId, editorFileKind, editorFetchKey]);

  useEffect(() => {
    if (!shellCaseId || !isTauri()) {
      setGraphifyPilot(null);
      return;
    }
    void loadGraphifyPilot(shellCaseId, { prepare: false });
  }, [shellCaseId, loadGraphifyPilot]);

  const saveCaseEditor = useCallback(async () => {
    const cid = editorCaseId.trim();
    const rel = caseDefinitionRelPath(cid, editorFileKind);
    if (!cid || !rel) return;
    if (!isTauri()) {
      setEditorError('保存仅在 HydroDesk 桌面端可用。');
      return;
    }
    if (editorFileKind === 'case_manifest') {
      try {
        JSON.parse(editorContent);
      } catch {
        setEditorError('case_manifest.json 不是合法 JSON，请修正后再保存。');
        return;
      }
    }
    setEditorSaving(true);
    setEditorError('');
    try {
      await writeWorkspaceTextFile(rel, editorContent);
      setEditorHint('已保存');
      setEditorDirty(false);
      refreshCaseRegistry();
      reloadCaseSummary();
      void loadPlatformReadiness(cid);
      void loadModelStrategy(cid);
      void loadModelingHints(cid);
      void loadPipelinePreflight(cid);
      scheduleLoopDryRunForCase(cid);
      scheduleKnowledgeLintForCase(cid);
    } catch (e) {
      setEditorError(e?.message || String(e));
    } finally {
      setEditorSaving(false);
    }
  }, [
    editorCaseId,
    editorFileKind,
    editorContent,
    refreshCaseRegistry,
    reloadCaseSummary,
    loadPlatformReadiness,
    loadModelStrategy,
    loadModelingHints,
    loadPipelinePreflight,
    scheduleLoopDryRunForCase,
    scheduleKnowledgeLintForCase,
  ]);

  const requestCloseCaseEditor = useCallback(() => {
    if (editorDirty) {
      const ok = typeof window !== 'undefined' && window.confirm('有未保存修改，确定关闭？');
      if (!ok) return;
    }
    setShowCaseEditor(false);
  }, [editorDirty]);

  const runDeriveCase = useCallback(async (sourceCaseId) => {
    if (!isTauri()) {
      window.alert('浏览器预览模式不支持派生案例，请使用桌面端。');
      return;
    }
    const newCaseId = window.prompt('输入派生案例的 case_id (如 source_case_id_v2):', `${sourceCaseId}_v2`);
    if (!newCaseId) return;
    const dn = window.prompt('输入派生案例的显示名:', `${sourceCaseId} (派生)`);
    if (!dn) return;
    try {
      await deriveCase(sourceCaseId, newCaseId, dn);
      window.alert('派生成功！');
      refreshCaseRegistry();
    } catch (e) {
      window.alert(`派生失败: ${e}`);
    }
  }, [refreshCaseRegistry]);

  const runArchiveCase = useCallback(async (caseId) => {
    if (!isTauri()) {
      window.alert('浏览器预览模式不支持归档案例，请使用桌面端。');
      return;
    }
    if (!window.confirm(`确定要归档案例 ${caseId} 吗？`)) return;
    try {
      await archiveCase(caseId);
      window.alert('归档成功！');
      refreshCaseRegistry();
      if (activeProjectId === caseId) {
        setActiveProjectId(dynamicProjects[0]?.id || '');
      }
    } catch (e) {
      window.alert(`归档失败: ${e}`);
    }
  }, [activeProjectId, dynamicProjects, refreshCaseRegistry, setActiveProjectId]);

  const runDataMining = useCallback(async (caseId) => {
    if (!caseId || !isTauri()) return;
    setDataMiningBusy(true);
    setDataMiningProgress('Initializing Data Mining Workflow...');
    try {
      // Mock streaming progress
      for (let i = 1; i <= 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setDataMiningProgress(`Mining Data Step ${i}/5: Extracting constraints...`);
      }
      setDataMiningProgress('Data Mining Completed Successfully.');
      setTimeout(() => setDataMiningProgress(null), 3000);
    } catch (e) {
      setDataMiningProgress(`Data Mining Failed: ${e.message}`);
    } finally {
      setDataMiningBusy(false);
    }
  }, [isTauri]);

  const runScaffoldNewCase = useCallback(async () => {
    const cid = scaffoldCaseId.trim();
    const dn = scaffoldDisplayName.trim();
    if (!CASE_ID_SCAFFOLD_RE.test(cid)) {
      setScaffoldError('case_id 须为小写 a-z 开头，仅 a-z、0-9、下划线，总长 2–64');
      return;
    }
    if (!dn) {
      setScaffoldError('请填写显示名');
      return;
    }
    setScaffoldBusy(true);
    setScaffoldError('');
    try {
      const cmd = buildScaffoldNewCaseCommand({
        caseId: cid,
        displayName: dn,
        projectType: scaffoldProjectType,
        registerLoop: scaffoldRegisterLoop,
      });
      const res = await runWorkspaceCommand(cmd, '.', null);
      if (res == null && !isTauri()) {
        setScaffoldError(
          '浏览器预览无法执行仓库命令。请使用 HydroDesk 桌面端（npm run tauri dev）创建案例，或在终端执行：python3 Hydrology/scripts/scaffold_new_case.py --case-id <id> --display-name <名称>',
        );
        return;
      }
      const out = parseSingleObjectJsonStdout(res?.stdout);
      const errLine = parseSingleObjectJsonStdout(res?.stderr);
      const payload = out?.ok === false ? out : out?.ok ? out : errLine;
      if (payload?.ok === false) {
        setScaffoldError(payload.error || '创建失败');
        return;
      }
      if (!payload?.ok) {
        setScaffoldError(
          (res?.stderr || res?.stdout || '无 JSON 输出').toString().slice(0, 500),
        );
        return;
      }
      const newId = cid;
      refreshCaseRegistry();
      if (newId) setActiveProjectId(newId);
      if (newId) {
        void loadPlatformReadiness(newId);
        void loadModelStrategy(newId);
        void loadModelingHints(newId);
        void loadPipelinePreflight(newId);
        scheduleLoopDryRunForCase(newId);
        scheduleKnowledgeLintForCase(newId);
        runDataMining(newId);
      }
      setShowCaseScaffold(false);
      setScaffoldCaseId('');
      setScaffoldDisplayName('');
      if (newId && isTauri()) {
        queueMicrotask(() => openCaseEditor(newId, 'manifest'));
      }
    } catch (error) {
      setScaffoldError(error?.message || String(error));
    } finally {
      setScaffoldBusy(false);
    }
  }, [
    scaffoldCaseId,
    scaffoldDisplayName,
    scaffoldProjectType,
    scaffoldRegisterLoop,
    refreshCaseRegistry,
    setActiveProjectId,
    openCaseEditor,
    loadPlatformReadiness,
    loadModelStrategy,
    loadModelingHints,
    loadPipelinePreflight,
    scheduleLoopDryRunForCase,
    scheduleKnowledgeLintForCase,
  ]);

  const runScaffoldDryRun = useCallback(async () => {
    const cid = scaffoldCaseId.trim();
    const dn = scaffoldDisplayName.trim();
    if (!cid || !dn) {
      setScaffoldError('请先填写 case_id 与显示名');
      return;
    }
    if (!CASE_ID_SCAFFOLD_RE.test(cid)) {
      setScaffoldError('case_id 须为小写 a-z 开头，仅 a-z、0-9、下划线，总长 2–64');
      return;
    }
    setScaffoldDryRunBusy(true);
    setScaffoldError('');
    setScaffoldDryRunPreview('');
    try {
      const cmd = buildScaffoldNewCaseCommand({
        caseId: cid,
        displayName: dn,
        projectType: scaffoldProjectType,
        registerLoop: scaffoldRegisterLoop,
        dryRun: true,
      });
      const res = await runWorkspaceCommand(cmd, '.', null);
      if (res == null && !isTauri()) {
        setScaffoldError('浏览器预览无法执行 Dry-run，请使用 HydroDesk 桌面端。');
        return;
      }
      const out = parseSingleObjectJsonStdout(res?.stdout);
      const errLine = parseSingleObjectJsonStdout(res?.stderr);
      const payload = out?.ok === false ? out : out?.ok ? out : errLine;
      if (payload?.ok === false) {
        setScaffoldError(payload.error || 'Dry-run 失败');
        return;
      }
      if (!payload?.ok) {
        setScaffoldError((res?.stderr || res?.stdout || '无 JSON 输出').toString().slice(0, 500));
        return;
      }
      setScaffoldDryRunPreview(JSON.stringify(payload, null, 2));
    } catch (error) {
      setScaffoldError(error?.message || String(error));
    } finally {
      setScaffoldDryRunBusy(false);
    }
  }, [
    scaffoldCaseId,
    scaffoldDisplayName,
    scaffoldProjectType,
    scaffoldRegisterLoop,
  ]);

  const scaffoldCaseIdOk = CASE_ID_SCAFFOLD_RE.test(scaffoldCaseId.trim());
  const scaffoldFormReady =
    scaffoldCaseIdOk && Boolean(scaffoldDisplayName.trim());
  const currentModelStrategyMeta = getModelStrategyMeta(modelStrategy?.strategy_key);
  const modelStrategyBatchEntries = Object.entries(modelStrategyBatch?.rollup || {}).sort((a, b) => b[1] - a[1]);
  const dataIntelligenceBatchRollupEntries = buildDataIntelligenceBatchRollupEntries(
    dataIntelligenceBatch?.profiles || []
  );
  const dataIntelligenceHeadlineStats = buildDataIntelligenceHeadlineStats(dataIntelligence);
  const dataIntelligenceShortcutSpecs = buildDataIntelligenceShortcutSpecs({
    caseId: dataIntelligence?.case_id || shellCaseId,
    dataIntelligenceLoading,
    modelStrategyLoading,
    readinessLoading,
    qualityCoverageLoading,
    feasibilityLoading,
  });
  const dataIntelligenceRelatedStatusEntries = buildDataIntelligenceRelatedStatusEntries({
    modelStrategy,
    modelStrategyLoading,
    modelStrategyError,
    readiness,
    readinessLoading,
    readinessError,
    qualityCoverage,
    qualityCoverageLoading,
    qualityCoverageError,
    feasibility,
    feasibilityLoading,
    feasibilityError,
  });
  const projectCenterPrimaryActions = [
    {
      key: 'dry-run-current',
      label: 'Dry-run 当前案例',
      disabled: actionBusy || !platformLoopCommands.dryRunCurrent,
      onClick: () => runCaseAction(platformLoopCommands.dryRunCurrent),
      className: 'border-hydro-500/35 bg-hydro-500/15 text-hydro-200',
    },
    {
      key: 'readiness',
      label: readinessLoading ? '合并中…' : '合并就绪度（评审摘要）',
      disabled: readinessLoading || !shellCaseId,
      onClick: () => loadPlatformReadiness(),
      className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
    },
    {
      key: 'model-strategy',
      label: modelStrategyLoading ? '判型中…' : '当前案例模型判型',
      disabled: modelStrategyLoading || !shellCaseId,
      onClick: () => loadModelStrategy(),
      className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
    },
    {
      key: 'data-intelligence',
      label: dataIntelligenceLoading ? '分析中…' : '当前案例数据智能规划',
      disabled: dataIntelligenceLoading || !shellCaseId,
      onClick: () => loadCaseDataIntelligence(),
      className: 'border-fuchsia-500/35 bg-fuchsia-500/15 text-fuchsia-200',
    },
    {
      key: 'coverage',
      label: qualityCoverageLoading ? '扫描产物…' : '检查当前案例产物覆盖',
      disabled: qualityCoverageLoading || !shellCaseId,
      onClick: () => loadQualityCoverage(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'feasibility',
      label: feasibilityLoading ? '计算中…' : '可运行性矩阵（仅注册表×数据）',
      disabled: feasibilityLoading || !shellCaseId,
      onClick: () => loadWorkflowFeasibility(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'scaffold',
      label: '新建案例骨架',
      disabled: false,
      onClick: () => {
        setShowCaseScaffold(true);
        setScaffoldError('');
        setScaffoldDryRunPreview('');
      },
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
  ];
  const projectCenterCaseFileActions = [
    {
      key: 'manifest-open',
      label: '项目配置 (Project Settings)',
      disabled: !shellCaseId,
      onClick: () => openPath(`cases/${shellCaseId}/manifest.yaml`),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'case-manifest-open',
      label: '交付基线与指针 (Delivery Checkpoints)',
      disabled: !shellCaseId,
      onClick: () => openPath(`cases/${shellCaseId}/contracts/case_manifest.json`),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'manifest-inline',
      label: 'HydroDesk 内编辑',
      disabled: !shellCaseId,
      onClick: () => openCaseEditor(shellCaseId),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'contract-inline',
      label: '内编辑交付契约',
      disabled: !shellCaseId,
      onClick: () => openCaseEditor(shellCaseId, 'case_manifest'),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'reveal-case',
      label: '定位案例目录',
      disabled: !shellCaseId,
      onClick: () => revealPath(`cases/${shellCaseId}`),
      className: 'border-zinc-700 text-zinc-300',
    },
    {
      key: 'reveal-contracts',
      label: '定位 contracts',
      disabled: !shellCaseId,
      onClick: () => revealPath(`cases/${shellCaseId}/contracts`),
      className: 'border-zinc-700 text-zinc-300',
    },
  ];
  const projectCenterBatchDiagnosticActions = [
    {
      key: 'list-cases',
      label: '列出闭环案例（JSON）',
      disabled: actionBusy,
      onClick: () => runCaseAction(platformLoopCommands.listCases),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'dry-run-all',
      label: 'Dry-run 全案例闭环',
      disabled: actionBusy,
      onClick: () => runCaseAction(platformLoopCommands.dryRunAll),
      className: 'border-zinc-700 text-zinc-200',
    },
    {
      key: 'quality-rubric',
      label: qualityRubricLoading ? '加载质量维度…' : '加载质量维度（评审清单）',
      disabled: qualityRubricLoading,
      onClick: () => loadQualityRubric(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'quality-batch',
      label: qualityBatchLoading ? '批量扫描…' : '批量检查配置内全部案例',
      disabled: qualityBatchLoading,
      onClick: () => loadQualityBatch(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'rollout-baseline',
      label: rolloutBaselineLoading ? '汇总中…' : 'Readiness / Release（批量）',
      disabled: rolloutBaselineLoading,
      onClick: () => loadRolloutBaseline(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'model-strategy-batch',
      label: modelStrategyBatchLoading ? '判型汇总中…' : '模型判型分布（批量）',
      disabled: modelStrategyBatchLoading,
      onClick: () => loadModelStrategyBatch(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'data-intelligence-batch',
      label: dataIntelligenceBatchLoading ? '汇总中…' : '数据智能规划（批量）',
      disabled: dataIntelligenceBatchLoading,
      onClick: () => loadCaseDataIntelligenceBatch(),
      className: 'border-fuchsia-500/20 bg-fuchsia-950/20 text-fuchsia-200',
    },
    {
      key: 'knowledge-lint-batch',
      label: knowledgeLintBatchLoading ? 'Lint 批量…' : '知识链接 Lint（批量）',
      disabled: knowledgeLintBatchLoading,
      onClick: () => loadKnowledgeLintBatch(),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'knowledge-lint-case',
      label: knowledgeLintCaseLoading ? 'Lint 当前…' : '知识链接 Lint（当前案例）',
      disabled: knowledgeLintCaseLoading || !shellCaseId,
      onClick: () => loadKnowledgeLintCase(),
      className: 'border-indigo-500/25 bg-zinc-900/60 text-zinc-100/90',
    },
  ];
  const projectCenterAdvancedActions = [
    {
      key: 'open-inspector',
      label: '高级配置 Inspector',
      disabled: false,
      onClick: () => setShowInspectorDrawer(true),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200 font-medium',
    },
    {
      key: 'open-loop-config',
      label: '打开主配置 YAML',
      disabled: false,
      onClick: () => openPath(getAutonomousWaternetE2eLoopConfigRelPath()),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'open-platform-plan',
      label: '打开平台方案',
      disabled: false,
      onClick: () => openPath(getHydrodeskAgenticIdePlatformPlanRelPath()),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    },
    {
      key: 'scaffold-script',
      label: '打开 scaffold 脚本源码',
      disabled: false,
      onClick: () => openPath(getScaffoldNewCaseScriptRelPath()),
      className: 'border-zinc-800/50 text-zinc-300',
    },
  ];
  const workspaceSuggestedActions = useMemo(() => {
    if (!workspaceIntelligence) return [];

    const openScaffold = {
      key: 'suggest-scaffold',
      label: '新建案例骨架',
      ctaLabel: '打开向导',
      summary: '当目录还没有完整模型资产时，先用骨架向导建立标准 case 结构。',
      disabled: false,
      onClick: () => {
        setShowCaseScaffold(true);
        setScaffoldError('');
        setScaffoldDryRunPreview('');
      },
      className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
    };

    const openCurrentWorkspace = {
      key: 'suggest-open-workspace',
      label: '打开当前目录',
      ctaLabel: '打开目录',
      summary: '在系统文件管理器中查看当前 workspace 的真实内容和外部产物。',
      disabled: false,
      onClick: () => openPath(isCustomWorkspaceRoot ? activeWorkspaceRootPath : (workspaceRootRel || workspaceRootAbsolutePath)),
      className: 'border-zinc-700 bg-zinc-800 text-zinc-100',
    };

    const suggestionMap = {
      continuation: [
        {
          key: 'suggest-readiness',
          label: '检查合并就绪度',
          ctaLabel: readinessLoading ? '合并中…' : '检查就绪度',
          summary: '目录里已有运行或审查产物，先确认当前案例是否已经达到继续审查或收尾门槛。',
          disabled: readinessLoading || !shellCaseId,
          onClick: () => loadPlatformReadiness(),
          className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
        },
        {
          key: 'suggest-review',
          label: '继续完整审查',
          ctaLabel: actionBusy ? '处理中…' : '运行审查',
          summary: '沿已有运行产物继续推进 review gate，补齐当前 case 的审查结果。',
          disabled: actionBusy || !actionCommands.runFullReview,
          onClick: () => runCaseAction(actionCommands.runFullReview),
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'suggest-release',
          label: '构建发布包',
          ctaLabel: actionBusy ? '处理中…' : '构建发布包',
          summary: '如果目录状态已经稳定，直接推进 release pack 和交付资产生成。',
          disabled: actionBusy || !actionCommands.buildReleasePack,
          onClick: () => runCaseAction(actionCommands.buildReleasePack),
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
      ],
      'model-update': [
        {
          key: 'suggest-edit-manifest',
          label: '项目配置 (Project Settings)',
          ctaLabel: '内联编辑',
          summary: '目录里已有模型资产，优先回到 manifest 或契约编辑，把模型更新到最新状态。',
          disabled: !shellCaseId,
          onClick: () => openCaseEditor(shellCaseId),
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'suggest-model-strategy',
          label: '刷新模型判型',
          ctaLabel: modelStrategyLoading ? '判型中…' : '刷新判型',
          summary: '快速判断当前 case 更适合哪类模型路线，再决定是否要重构配置或继续运行。',
          disabled: modelStrategyLoading || !shellCaseId,
          onClick: () => loadModelStrategy(),
          className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
        },
        {
          key: 'suggest-modeling-hints',
          label: '读取建模建议',
          ctaLabel: modelingHintsLoading ? '加载中…' : '查看建议',
          summary: '把目录里的 manifest、sourcebundle 和图结构线索转成可执行的建模建议。',
          disabled: modelingHintsLoading || !shellCaseId,
          onClick: () => loadModelingHints(shellCaseId),
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
      ],
      'model-bootstrap': [
        {
          key: 'suggest-modeling-hints-bootstrap',
          label: '进入建模建议',
          ctaLabel: modelingHintsLoading ? '加载中…' : '读取建议',
          summary: '目录里已经有原始数据，先抽取建模 hints，决定应该走哪条建模路径。',
          disabled: modelingHintsLoading || !shellCaseId,
          onClick: () => loadModelingHints(shellCaseId),
          className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
        },
        {
          key: 'suggest-preflight',
          label: '运行预检',
          ctaLabel: pipelinePreflightLoading ? '加载中…' : '刷新预检',
          summary: '快速验证当前目录是否已经具备进入 simulation 阶段的最小输入。',
          disabled: pipelinePreflightLoading || !shellCaseId,
          onClick: () => loadPipelinePreflight(shellCaseId),
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        openScaffold,
      ],
      directory: [
        openCurrentWorkspace,
        openScaffold,
        {
          key: 'suggest-select-directory',
          label: '重新选择目录',
          ctaLabel: '选择目录',
          summary: '如果当前目录只是普通文件夹，重新选择更像 case 的目录，或先建立标准骨架。',
          disabled: !isTauriDesktop,
          onClick: () => void handleSelectWorkspaceDirectory(),
          className: 'border-zinc-800/50 bg-zinc-900/50 text-zinc-300',
        },
      ],
    };

    return suggestionMap[workspaceIntelligence.stage] || suggestionMap.directory;
  }, [
    actionBusy,
    actionCommands.buildReleasePack,
    actionCommands.runFullReview,
    activeWorkspaceRootPath,
    handleSelectWorkspaceDirectory,
    isCustomWorkspaceRoot,
    isTauriDesktop,
    loadModelStrategy,
    loadModelingHints,
    loadPipelinePreflight,
    loadPlatformReadiness,
    modelStrategyLoading,
    modelingHintsLoading,
    pipelinePreflightLoading,
    readinessLoading,
    runCaseAction,
    shellCaseId,
    workspaceIntelligence,
    workspaceRootAbsolutePath,
    workspaceRootRel,
  ]);
  const workspacePreviewActions = useMemo(() => {
    if (!selectedWorkspaceFilePath) return [];

    if (selectedWorkspaceAssetKind === 'manifest') {
      return [
        {
          key: 'preview-edit-manifest',
          label: '编辑 Manifest',
          onClick: () => openCaseEditor(shellCaseId),
          disabled: !shellCaseId,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'preview-model-strategy',
          label: '刷新判型',
          onClick: () => loadModelStrategy(),
          disabled: modelStrategyLoading || !shellCaseId,
          className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
        },
        {
          key: 'preview-model-hints',
          label: '读取建议',
          onClick: () => loadModelingHints(shellCaseId),
          disabled: modelingHintsLoading || !shellCaseId,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
      ];
    }

    if (selectedWorkspaceAssetKind === 'case_manifest') {
      return [
        {
          key: 'preview-edit-case-manifest',
          label: '编辑 Case Manifest',
          onClick: () => openCaseEditor(shellCaseId, 'case_manifest'),
          disabled: !shellCaseId,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'preview-preflight',
          label: '运行预检',
          onClick: () => loadPipelinePreflight(shellCaseId),
          disabled: pipelinePreflightLoading || !shellCaseId,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'preview-readiness',
          label: '检查就绪度',
          onClick: () => loadPlatformReadiness(),
          disabled: readinessLoading || !shellCaseId,
          className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
        },
      ];
    }

    if (selectedWorkspaceAssetKind === 'contract' && selectedWorkspaceContract) {
      if (selectedWorkspaceContract.stage === 'Run') {
        return [
          {
            key: 'preview-refresh-dashboard',
            label: '刷新看板',
            onClick: () => runCaseAction(actionCommands.refreshDashboard),
            disabled: actionBusy || !actionCommands.refreshDashboard,
            className: 'border-zinc-700 bg-zinc-800 text-zinc-100',
          },
          {
            key: 'preview-run-fast',
            label: '快速运行',
            onClick: () => runCaseAction(actionCommands.runFast),
            disabled: actionBusy || !actionCommands.runFast,
            className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
          },
          {
            key: 'preview-readiness-run',
            label: '检查就绪度',
            onClick: () => loadPlatformReadiness(),
            disabled: readinessLoading || !shellCaseId,
            className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
          },
        ];
      }
      if (selectedWorkspaceContract.stage === 'Review') {
        return [
          {
            key: 'preview-run-review',
            label: '运行审查',
            onClick: () => runCaseAction(actionCommands.runFullReview),
            disabled: actionBusy || !actionCommands.runFullReview,
            className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
          },
          {
            key: 'preview-readiness-review',
            label: '检查就绪度',
            onClick: () => loadPlatformReadiness(),
            disabled: readinessLoading || !shellCaseId,
            className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
          },
          {
            key: 'preview-docs-pack',
            label: '生成交付文档',
            onClick: () => runCaseAction(actionCommands.generateDeliveryDocsPack),
            disabled: actionBusy || !actionCommands.generateDeliveryDocsPack,
            className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
          },
        ];
      }
      if (selectedWorkspaceContract.stage === 'Release') {
        return [
          {
            key: 'preview-build-release',
            label: '构建发布包',
            onClick: () => runCaseAction(actionCommands.buildReleasePack),
            disabled: actionBusy || !actionCommands.buildReleasePack,
            className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
          },
          {
            key: 'preview-delivery-pack',
            label: '生成交付文档',
            onClick: () => runCaseAction(actionCommands.generateDeliveryDocsPackStrict),
            disabled: actionBusy || !actionCommands.generateDeliveryDocsPackStrict,
            className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
          },
          {
            key: 'preview-refresh-dashboard-release',
            label: '刷新看板',
            onClick: () => runCaseAction(actionCommands.refreshDashboard),
            disabled: actionBusy || !actionCommands.refreshDashboard,
            className: 'border-zinc-700 bg-zinc-800 text-zinc-100',
          },
        ];
      }
    }

    if (selectedWorkspaceAssetKind === 'outcome_coverage' || selectedWorkspaceAssetKind === 'verification') {
      return [
        {
          key: 'preview-readiness-report',
          label: '检查就绪度',
          onClick: () => loadPlatformReadiness(),
          disabled: readinessLoading || !shellCaseId,
          className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
        },
        {
          key: 'preview-run-review-report',
          label: '运行审查',
          onClick: () => runCaseAction(actionCommands.runFullReview),
          disabled: actionBusy || !actionCommands.runFullReview,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'preview-build-release-report',
          label: '构建发布包',
          onClick: () => runCaseAction(actionCommands.buildReleasePack),
          disabled: actionBusy || !actionCommands.buildReleasePack,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
      ];
    }

    if (selectedWorkspaceAssetKind === 'live_dashboard') {
      return [
        {
          key: 'preview-refresh-live-dashboard',
          label: '刷新看板',
          onClick: () => runCaseAction(actionCommands.refreshDashboard),
          disabled: actionBusy || !actionCommands.refreshDashboard,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-100',
        },
        {
          key: 'preview-run-fast-dashboard',
          label: '快速运行',
          onClick: () => runCaseAction(actionCommands.runFast),
          disabled: actionBusy || !actionCommands.runFast,
          className: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
        },
        {
          key: 'preview-reveal-dashboard',
          label: '定位文件',
          onClick: () => selectedWorkspaceFilePath && revealPath(isCustomWorkspaceRoot ? (selectedWorkspaceFile?.absolutePath || selectedWorkspaceFilePath) : selectedWorkspaceFilePath),
          disabled: !selectedWorkspaceFilePath,
          className: 'border-zinc-800/50 bg-zinc-900/50 text-zinc-300',
        },
      ];
    }

    if (selectedWorkspaceAssetKind === 'review_memo' || selectedWorkspaceAssetKind === 'release_note') {
      return [
        {
          key: 'preview-delivery-docs',
          label: '生成交付文档',
          onClick: () => runCaseAction(actionCommands.generateDeliveryDocsPack),
          disabled: actionBusy || !actionCommands.generateDeliveryDocsPack,
          className: 'border-zinc-700 bg-zinc-800 text-zinc-200',
        },
        {
          key: 'preview-build-release-note',
          label: '构建发布包',
          onClick: () => runCaseAction(actionCommands.buildReleasePack),
          disabled: actionBusy || !actionCommands.buildReleasePack,
          className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
        },
      ];
    }

    return [];
  }, [
    actionBusy,
    actionCommands.buildReleasePack,
    actionCommands.generateDeliveryDocsPack,
    actionCommands.generateDeliveryDocsPackStrict,
    actionCommands.refreshDashboard,
    actionCommands.runFast,
    actionCommands.runFullReview,
    isCustomWorkspaceRoot,
    loadModelStrategy,
    loadModelingHints,
    loadPipelinePreflight,
    loadPlatformReadiness,
    modelStrategyLoading,
    modelingHintsLoading,
    openCaseEditor,
    pipelinePreflightLoading,
    readinessLoading,
    runCaseAction,
    selectedWorkspaceAssetKind,
    selectedWorkspaceContract,
    selectedWorkspaceFile,
    selectedWorkspaceFilePath,
    shellCaseId,
  ]);

  useEffect(() => {
    if (!shellCaseId) return;

    if (workspaceIntelligence.stage === 'continuation') {
      if (!readiness && !readinessLoading) void loadPlatformReadiness();
      return;
    }

    if (workspaceIntelligence.stage === 'model-update') {
      if (!modelStrategy && !modelStrategyLoading) void loadModelStrategy();
      if (!modelingHints && !modelingHintsLoading) void loadModelingHints(shellCaseId);
      return;
    }

    if (workspaceIntelligence.stage === 'model-bootstrap') {
      if (!modelingHints && !modelingHintsLoading) void loadModelingHints(shellCaseId);
      if (!pipelinePreflight && !pipelinePreflightLoading) void loadPipelinePreflight(shellCaseId);
    }
  }, [
    loadModelStrategy,
    loadModelingHints,
    loadPipelinePreflight,
    loadPlatformReadiness,
    modelStrategy,
    modelStrategyLoading,
    modelingHints,
    modelingHintsLoading,
    pipelinePreflight,
    pipelinePreflightLoading,
    readiness,
    readinessLoading,
    shellCaseId,
    workspaceIntelligence.stage,
  ]);

  const workspaceProjectionCards = useMemo(() => {
    if (workspaceIntelligence.stage === 'continuation') {
      return [
        {
          key: 'projection-gate',
          title: '续作 Gate',
          summary: '当前目录已更像继续审查 / 发布的工作面。',
          body: `Gate ${gateLabel} · triad ${triadMeta.label} · pipeline ${caseSummary.pipeline_contract_ready ? 'ready' : 'not_ready'}`,
        },
        {
          key: 'projection-readiness',
          title: '合并就绪度',
          summary: readiness?.summary
            ? `artifact ${readiness.summary.artifact_dimensions_satisfied ?? '—'}/${readiness.summary.artifact_dimensions_total ?? '—'} · workflow ok ${readiness.summary.workflow_data_ok ?? '—'}`
            : '建议优先确认是否已经达到继续审查或构建发布包的门槛。',
          body: readiness?.summary
            ? `import ${readiness.summary.entry_source_import_session_source || 'missing'} · graphify ${readiness.summary.graphify_sidecar_status || 'missing'}`
            : '若尚未加载，系统会自动拉取 readiness 摘要。',
        },
        {
          key: 'projection-review-output',
          title: '最近执行信号',
          summary: parsedActionPayload?.action
            ? `action ${parsedActionPayload.action} · run ${parsedActionPayload.run_id || '--'}`
            : '当前尚未捕捉到新的 review/release 动作回执。',
          body: actionResult?.stdout
            ? String(actionResult.stdout).slice(0, 280)
            : '运行完整审查或构建发布包后，这里会优先投影最新输出摘要。',
        },
      ];
    }

    if (workspaceIntelligence.stage === 'model-update') {
      return [
        {
          key: 'projection-model-strategy',
          title: '模型路线',
          summary: modelStrategy
            ? `${currentModelStrategyMeta.label} · ${modelStrategy.primary_recommendation || modelStrategy.strategy_key || '—'}`
            : '建议先刷新模型判型，明确当前 case 应走哪条模型路线。',
          body: modelStrategy?.reasoning || '如果目录已经包含 manifest / contracts / 配置，优先进入模型更新工作流。',
        },
        {
          key: 'projection-modeling-hints',
          title: '建模建议',
          summary: modelingHints?.hints
            ? `workflow ${(modelingHints.hints.suggested_workflows || []).join(', ') || '—'}`
            : '系统会自动尝试拉取建模 hints，把目录线索转成可执行建议。',
          body: modelingHints?.hints
            ? `entry manifest ${modelingHints.hints.entry_sources?.case_manifest || '—'} · sourcebundle ${modelingHints.hints.entry_sources?.source_bundle || '—'}`
            : '下一步通常是编辑 manifest / 配置，然后根据 hints 继续补齐模型。',
        },
        {
          key: 'projection-editing',
          title: '编辑入口',
          summary: '当前目录更适合继续更新模型，而不是从头创建新案例。',
          body: '优先动作是 manifest、Hydrology 配置、contracts 编辑，以及判型与 hints 刷新。',
        },
      ];
    }

    if (workspaceIntelligence.stage === 'model-bootstrap') {
      return [
        {
          key: 'projection-bootstrap',
          title: '建模起步流',
          summary: '当前目录包含原始数据，但尚未形成完整模型资产。',
          body: '建议顺序：读取建模建议 -> 跑预检 -> 再决定是否创建标准骨架。',
        },
        {
          key: 'projection-preflight',
          title: '预检状态',
          summary: pipelinePreflight
            ? `phase ${pipelinePreflight.phase || '—'} · ok ${String(Boolean(pipelinePreflight.ok))}`
            : '系统会自动尝试拉取 simulation preflight。',
          body: pipelinePreflight
            ? `missing ${(pipelinePreflight.missing_inputs || []).join(', ') || 'none'}`
            : '如果输入还缺失，这里会直接告诉你缺什么。',
        },
        {
          key: 'projection-source',
          title: '数据入口',
          summary: modelingHints?.hints?.source_import_session?.present
            ? `source ${modelingHints.hints.source_import_session.source_mode || '—'} · records ${modelingHints.hints.source_import_session.record_count ?? '—'}`
            : '目录里已有原始数据或 sourcebundle，可继续进入探源与建模入口。',
          body: '当前更像“从数据出发搭模型”，不是“从已有模型继续迭代”。',
        },
      ];
    }

    return [
      {
        key: 'projection-directory',
        title: '目录浏览模式',
        summary: '当前目录更像通用 workspace，还没有足够信号自动投影成某条明确工作流。',
        body: '建议先浏览文件、重新选择更像 case 的目录，或直接创建标准案例骨架。',
      },
      {
        key: 'projection-files',
        title: '已发现内容',
        summary: `文件 ${workspaceIntelligence.counts.files} · Markdown ${workspaceIntelligence.counts.markdown} · HTML ${workspaceIntelligence.counts.html}`,
        body: '如果后续出现 manifest、contracts、Hydrology 配置或运行产物，工作面会自动切换成更明确的业务状态。',
      },
    ];
  }, [
    actionResult?.stdout,
    caseSummary.pipeline_contract_ready,
    currentModelStrategyMeta.label,
    gateLabel,
    modelingHints,
    parsedActionPayload?.action,
    parsedActionPayload?.run_id,
    pipelinePreflight,
    readiness,
    triadMeta.label,
    workspaceIntelligence,
    modelStrategy,
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-zinc-500">工作空间</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">{studioState.workspace.name}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">当前角色</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">{activeAgent.name}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">核心项目</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">{hydroPortfolioCatalog.length}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">当前 Gate</div>
            <div className="mt-2 flex items-center gap-3">
              <span className={`rounded-full border px-2 py-1 text-[10px] ${gateClassName}`}>{gateLabel}</span>
              <span className="text-lg font-semibold text-slate-100">
                {caseSummaryLoading ? '读取中...' : `${caseSummary.outcomes_generated}/${caseSummary.total_executed || caseSummary.total}`}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          {caseSummaryLoading
            ? '正在读取 contracts 摘要'
            : `${activeAgent.summary} · 证据 ${caseSummary.evidence_bound_count} · schema ${caseSummary.schema_valid_count} · timeout ${caseSummary.timeout}`}
        </div>
      </div>

      <details
        data-testid="case-scaffold-guide"
        className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/15 p-4"
      >
        <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-sm font-semibold text-fuchsia-100">新案例工程引导（Agentic IDE · Phase 2）</h2>
            <div className="mt-1 text-xs text-zinc-400">展开查看四步引导。</div>
          </div>
          <div className="flex flex-wrap gap-2 sm:items-center">
            <button
              type="button"
              onClick={() => {
                setShowCaseScaffold(true);
                setScaffoldError('');
                setScaffoldDryRunPreview('');
              }}
              className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-4 py-2 text-xs font-medium text-fuchsia-100"
            >
              打开脚手架向导
            </button>
            <button
              type="button"
              disabled={!shellCaseId || scaffoldHealthBusy || readinessLoading || knowledgeLintCaseLoading}
              onClick={() => void runCaseScaffoldHealthScan()}
              className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              {scaffoldHealthBusy ? '健康扫描中…' : '一键健康扫描'}
            </button>
          </div>
        </div>
        </summary>
        <div className="mt-3 text-xs leading-5 text-zinc-400">
          把「命令拼接」收成 IDE 流程：先校验命名 → 脚手架（可先 Dry-run）→ 编辑 manifest / Hydrology 配置 → 用可运行性矩阵与合并就绪度验收。
          与{' '}
          <button
            type="button"
            onClick={() => openPath(getHydrodeskAgenticIdePlatformPlanRelPath())}
            className="text-fuchsia-300 underline decoration-fuchsia-500/40 underline-offset-2"
          >
            平台方案
          </button>
          中 ProjectCenter / scaffold 条目一致。
        </div>
        <ol className="mt-3 grid gap-2 text-[11px] text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-lg border border-zinc-800/40 bg-zinc-950/50 px-3 py-2">
            <span className="font-medium text-zinc-300">1 · 命名</span>
            <div className="mt-1">case_id：小写 a-z 开头，2–64 字符</div>
          </li>
          <li className="rounded-lg border border-zinc-800/40 bg-zinc-950/50 px-3 py-2">
            <span className="font-medium text-zinc-300">2 · 脚手架</span>
            <div className="mt-1">写入 manifest、contracts、Hydrology YAML；可选注册闭环</div>
          </li>
          <li className="rounded-lg border border-zinc-800/40 bg-zinc-950/50 px-3 py-2">
            <span className="font-medium text-zinc-300">3 · 编辑</span>
            <div className="mt-1">桌面端创建后自动打开 manifest 内联编辑</div>
          </li>
          <li className="rounded-lg border border-zinc-800/40 bg-zinc-950/50 px-3 py-2">
            <span className="font-medium text-zinc-300">4 · 验收</span>
            <div className="mt-1">合并就绪度（含可运行性摘要）+ 知识链接 Lint</div>
          </li>
        </ol>
      </details>

      <ProjectCenterTopTabs
        caseSummary={caseSummary}
        gateLabel={gateLabel}
        projectCenterPageTab={projectCenterPageTab}
        setProjectCenterPageTab={setProjectCenterPageTab}
        shellCaseId={shellCaseId}
      />

      {projectCenterPageTab === 'work' && (
      <>
      <ProjectCenterWorkspaceHero
        navigate={navigate}
        projectCenterPrimaryActions={projectCenterPrimaryActions}
      />
      <ProjectCenterWorkspaceSection
        shellCaseId={shellCaseId}
        isDesktop={isTauriDesktop}
        workspaceRootRel={activeWorkspaceRootLabel}
        workspaceStatusNote={workspaceStatusNote}
        workspaceIntelligence={workspaceIntelligence}
        workspaceSuggestedActions={workspaceSuggestedActions}
        workspaceLoading={workspaceLoading}
        workspaceError={workspaceError}
        workspaceNodes={workspaceNodes}
        selectedFilePath={selectedWorkspaceFilePath}
        highlightedFilePath={highlightedWorkspaceFilePath}
        onSelectFile={(path) => {
          setHighlightedWorkspaceFilePath('');
          setSelectedWorkspaceFilePath(path);
        }}
        workspacePreview={workspacePreview}
        workspacePreviewLoading={workspacePreviewLoading}
        workspacePreviewError={workspacePreviewError}
        workspacePreviewActions={workspacePreviewActions}
        onSelectDirectory={handleSelectWorkspaceDirectory}
        onOpenWorkspace={() => openPath(isCustomWorkspaceRoot ? activeWorkspaceRootPath : (workspaceRootRel || workspaceRootAbsolutePath))}
        onRevealWorkspace={() => revealPath(isCustomWorkspaceRoot ? activeWorkspaceRootPath : (workspaceRootRel || workspaceRootAbsolutePath))}
        onOpenSelectedFile={() => selectedWorkspaceFilePath && openPath(isCustomWorkspaceRoot ? (selectedWorkspaceFile?.absolutePath || selectedWorkspaceFilePath) : selectedWorkspaceFilePath)}
        onRevealSelectedFile={() => selectedWorkspaceFilePath && revealPath(isCustomWorkspaceRoot ? (selectedWorkspaceFile?.absolutePath || selectedWorkspaceFilePath) : selectedWorkspaceFilePath)}
        liveOutputLogFile={currentLiveLogFile}
        liveOutputLines={logTail.lines || []}
        liveOutputHistory={liveOutputHistory}
        onOpenLiveOutputLog={() => currentLiveLogFile && openPath(currentLiveLogFile)}
        onRevealLiveOutputLog={() => currentLiveLogFile && revealPath(currentLiveLogFile)}
        liveOutputEntries={latestWorkspaceOutputEntries}
      />
      <ProjectCenterProjectedWorksurfaceSection summary={summary} workspaceIntelligence={workspaceIntelligence} workspaceProjectionCards={workspaceProjectionCards} text={text} />
      <ProjectCenterAdvancedActionsSection qualityRubric={qualityRubric} qualityRubricError={qualityRubricError} qualityCoverage={qualityCoverage} qualityCoverageError={qualityCoverageError} qualityBatch={qualityBatch} qualityBatchError={qualityBatchError} rolloutBaseline={rolloutBaseline} rolloutBaselineError={rolloutBaselineError} knowledgeLintBatch={knowledgeLintBatch} knowledgeLintCase={knowledgeLintCase} knowledgeLintError={knowledgeLintError} feasibility={feasibility} feasibilityError={feasibilityError} modelStrategy={modelStrategy} modelStrategyError={modelStrategyError} modelStrategyBatch={modelStrategyBatch} modelStrategyBatchError={modelStrategyBatchError} dataIntelligence={dataIntelligence} setDataIntelligence={setDataIntelligence} dataIntelligenceError={dataIntelligenceError} setDataIntelligenceError={setDataIntelligenceError} dataIntelligenceBatch={dataIntelligenceBatch} dataIntelligenceBatchError={dataIntelligenceBatchError} readiness={readiness} readinessError={readinessError} modelingHints={modelingHints} modelingHintsError={modelingHintsError} modelingHintsLoading={modelingHintsLoading} pipelinePreflight={pipelinePreflight} pipelinePreflightError={pipelinePreflightError} pipelinePreflightLoading={pipelinePreflightLoading} sourcebundleImport={sourcebundleImport} sourcebundleImportError={sourcebundleImportError} sourcebundleImportLoading={sourcebundleImportLoading} graphifyPilot={graphifyPilot} graphifyPilotError={graphifyPilotError} graphifyPilotLoading={graphifyPilotLoading} graphifyReportSummary={graphifyReportSummary} sourceSyncSummary={sourceSyncSummary} sourceSyncError={sourceSyncError} sourceSyncLoading={sourceSyncLoading} isTauri={isTauri} cases={cases} loading={loading} refresh={refresh} summary={summary} loadQualityCoverage={loadQualityCoverage} loadWorkflowFeasibility={loadWorkflowFeasibility} loadModelStrategy={loadModelStrategy} loadCaseDataIntelligence={loadCaseDataIntelligence} loadPlatformReadiness={loadPlatformReadiness} loadModelingHints={loadModelingHints} loadPipelinePreflight={loadPipelinePreflight} runSourcebundleImport={runSourcebundleImport} loadGraphifyPilot={loadGraphifyPilot} loadSourceSyncSummary={loadSourceSyncSummary} shellCaseId={shellCaseId} pipelineTruthClassName={pipelineTruthClassName} canSeeAdvancedPlatformTools={canSeeAdvancedPlatformTools} entries={entries} payload={payload} rows={rows} text={text} ok={ok} currentModelStrategyMeta={currentModelStrategyMeta} modelStrategyBatchEntries={modelStrategyBatchEntries} dataIntelligenceBatchRollupEntries={dataIntelligenceBatchRollupEntries} dataIntelligenceHeadlineStats={dataIntelligenceHeadlineStats} dataIntelligenceShortcutSpecs={dataIntelligenceShortcutSpecs} dataIntelligenceRelatedStatusEntries={dataIntelligenceRelatedStatusEntries} projectCenterCaseFileActions={projectCenterCaseFileActions} projectCenterBatchDiagnosticActions={projectCenterBatchDiagnosticActions} projectCenterAdvancedActions={projectCenterAdvancedActions} openPath={openPath} revealPath={revealPath} projectCenterFeasibilityTierLabels={projectCenterFeasibilityTierLabels} projectCenterModelStrategyEvidenceLabels={projectCenterModelStrategyEvidenceLabels} projectCenterSignalLabels={projectCenterSignalLabels} getModelStrategyMeta={getModelStrategyMeta} ProjectCenterActionButton={ProjectCenterActionButton} ProjectCenterActionGroup={ProjectCenterActionGroup} />
      </>
      )}

      {projectCenterPageTab === 'work' && (
      <div className="grid grid-cols-[2.1fr,0.78fr] gap-6">
        <ProjectCenterCaseListSection projectCenterInfoTab={projectCenterInfoTab} setProjectCenterInfoTab={setProjectCenterInfoTab} setShowCaseScaffold={setShowCaseScaffold} activeProject={activeProject} activeProjectId={activeProjectId} setActiveProjectId={setActiveProjectId} openCaseEditor={openCaseEditor} runDeriveCase={runDeriveCase} runArchiveCase={runArchiveCase} text={text} projectCenterStatusMeta={projectCenterStatusMeta} cases={cases} loading={loading} refresh={refresh} />

        <ProjectCenterGlobalCaseManagerSection actionBusy={actionBusy} actionResult={actionResult} actionError={actionError} scadaScenarioId={scadaScenarioId} setScadaScenarioId={setScadaScenarioId} scadaQueryStart={scadaQueryStart} setScadaQueryStart={setScadaQueryStart} scadaQueryEnd={scadaQueryEnd} setScadaQueryEnd={setScadaQueryEnd} scadaSqlitePath={scadaSqlitePath} setScadaSqlitePath={setScadaSqlitePath} isTauri={isTauri} cases={cases} activeProject={activeProject} runtimeSnapshot={runtimeSnapshot} summary={summary} parsedActionPayload={parsedActionPayload} actionCommands={actionCommands} runScadaReplayCommand={runScadaReplayCommand} bootstrapTriadMinimalCommand={bootstrapTriadMinimalCommand} runCaseAction={runCaseAction} shellCaseId={shellCaseId} gateLabel={gateLabel} gateClassName={gateClassName} text={text} openPath={openPath} revealPath={revealPath} ProjectCenterActionMenu={ProjectCenterActionMenu} caseSummaryLoading={caseSummaryLoading} reloadCaseSummary={reloadCaseSummary} />
      </div>
      )}

      {projectCenterPageTab === 'catalog' && (
        <ProjectCenterCatalogSection
          caseSummary={caseSummary}
          caseSummaryLoading={caseSummaryLoading}
          contractChain={contractChain}
          hydroPortfolioCatalog={hydroPortfolioCatalog}
          openPath={openPath}
          pipelineTruthClassName={pipelineTruthClassName}
          primarySurfaceLabels={primarySurfaceLabels}
          reviewAssets={reviewAssets}
          revealPath={revealPath}
          shellCaseId={shellCaseId}
          triadBridgePaths={triadBridgePaths}
          triadMeta={triadMeta}
        />
      )}

      {projectCenterPageTab === 'analysis' && (
        <ProjectCenterAnalysisSection
          activeProject={activeProject}
          checkpoints={checkpoints}
          executionSurfaceCatalog={executionSurfaceCatalog}
          openPath={openPath}
          reloadRuntime={reloadRuntime}
          revealPath={revealPath}
          shellEntryPoints={shellEntryPoints}
          studioDeliveryWavePlan={studioDeliveryWavePlan}
        />
      )}

      {showCaseEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-editor-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <div className="border-b border-zinc-800/60 px-5 py-4">
              <h3 id="case-editor-title" className="text-sm font-semibold text-slate-100">
                编辑案例定义（配置驱动 · 不落硬编码）
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                可编辑 manifest、contracts/case_manifest.json、Hydrology 配置；保存即写回仓库。改显示名后请点「刷新案例列表」。
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-800/80 px-5 py-3">
              <label className="block min-w-[200px] text-[11px] text-zinc-400">
                案例
                <select
                  value={editorCaseId}
                  onChange={(e) => {
                    setEditorCaseId(e.target.value);
                    setEditorDirty(false);
                    setEditorFetchKey((k) => k + 1);
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
                >
                  {dynamicProjects.length === 0 ? (
                    <option value={editorCaseId}>{editorCaseId}</option>
                  ) : (
                    <>
                      {dynamicProjects.map((p) => (
                        <option key={p.id} value={p.caseId}>
                          {p.caseId} — {p.name}
                        </option>
                      ))}
                      {editorCaseId &&
                      !dynamicProjects.some((p) => p.caseId === editorCaseId) ? (
                        <option value={editorCaseId}>{editorCaseId}（当前）</option>
                      ) : null}
                    </>
                  )}
                </select>
              </label>
              <div className="flex gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditorFileKind('manifest');
                    setEditorDirty(false);
                  }}
                  className={`rounded-md px-3 py-1.5 text-[11px] ${
                    editorFileKind === 'manifest'
                      ? 'bg-fuchsia-500/20 text-fuchsia-200'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  cases/…/manifest.yaml
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorFileKind('hydrology');
                    setEditorDirty(false);
                  }}
                  className={`rounded-md px-3 py-1.5 text-[11px] ${
                    editorFileKind === 'hydrology'
                      ? 'bg-fuchsia-500/20 text-fuchsia-200'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Hydrology/configs/…yaml
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorFileKind('case_manifest');
                    setEditorDirty(false);
                  }}
                  className={`rounded-md px-3 py-1.5 text-[11px] ${
                    editorFileKind === 'case_manifest'
                      ? 'bg-fuchsia-500/20 text-fuchsia-200'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  contracts/case_manifest.json
                </button>
              </div>
            </div>
            <div className="px-5 py-2 text-[10px] font-mono text-zinc-500">
              {caseDefinitionRelPath(editorCaseId, editorFileKind) || '—'}
            </div>
            {editorHint && (
              <div className="mx-5 mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {editorHint}
              </div>
            )}
            {editorError && (
              <div className="mx-5 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {editorError}
              </div>
            )}
            <div className="min-h-0 flex-1 px-5 pb-2">
              {editorLoading ? (
                <div className="py-12 text-center text-sm text-zinc-500">正在读取文件…</div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    setEditorDirty(true);
                  }}
                  spellCheck={false}
                  className="h-[min(52vh,480px)] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-200"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800/60 px-5 py-4">
              <button
                type="button"
                disabled={!caseDefinitionRelPath(editorCaseId, editorFileKind)}
                onClick={() =>
                  openPath(caseDefinitionRelPath(editorCaseId, editorFileKind))
                }
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
              >
                外部打开
              </button>
              <button
                type="button"
                disabled={editorLoading || !isTauri()}
                onClick={() => setEditorFetchKey((k) => k + 1)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
              >
                重新加载
              </button>
              <button
                type="button"
                disabled={editorSaving || editorLoading || !isTauri()}
                onClick={() => saveCaseEditor()}
                className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-3 py-1.5 text-xs text-fuchsia-200 disabled:opacity-50"
              >
                {editorSaving ? '保存中…' : '保存到仓库'}
              </button>
              <button
                type="button"
                onClick={() => requestCloseCaseEditor()}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showCaseScaffold && (
        <div
          data-testid="case-scaffold-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scaffold-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
            <h3 id="scaffold-title" className="text-base font-medium text-zinc-100">
              新建仿真工程 (New Project)
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              向导将为您建立工程目录，包含运行所需的基础文件。
            </p>
            <div className="mt-6 space-y-4">
              <label className="block text-[12px] font-medium text-zinc-300">
                工程意图 (Project Type)
                <select
                  value={scaffoldProjectType}
                  onChange={(e) => setScaffoldProjectType(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
                >
                  <option value="canal">渠系/管线控制工程 (canal)</option>
                  <option value="cascade_hydro">梯级水电调度工程 (cascade_hydro)</option>
                  <option value="basin">流域仿真工程 (basin)</option>
                  <option value="generic">通用工程 (generic)</option>
                </select>
              </label>
              <label className="block text-[12px] font-medium text-zinc-300">
                显示名称 (Display Name)
                <input
                  value={scaffoldDisplayName}
                  onChange={(e) => setScaffoldDisplayName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
                  placeholder="例如：汉江流域防洪调度"
                  autoComplete="off"
                />
              </label>
              <label className="block text-[12px] font-medium text-zinc-300">
                工程标识 (case_id)
                <input
                  value={scaffoldCaseId}
                  onChange={(e) => setScaffoldCaseId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
                  placeholder="例如：hanjiang_flood (小写字母开头，数字下划线)"
                  autoComplete="off"
                />
                {scaffoldCaseId.trim() ? (
                  <div className={`mt-1.5 text-[11px] ${scaffoldCaseIdOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {scaffoldCaseIdOk ? '✓ 标识符合要求' : '格式要求：^[a-z][a-z0-9_]{1,63}$'}
                  </div>
                ) : null}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-400 mt-2">
                <input
                  type="checkbox"
                  checked={scaffoldRegisterLoop}
                  onChange={(e) => setScaffoldRegisterLoop(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-zinc-600"
                />
                加入工作台全局执行队列
              </label>
              {dataMiningProgress && (
                <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
                  {dataMiningProgress}
                </div>
              )}
            </div>
            {scaffoldDryRunPreview ? (
              <div className="mt-4 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">预览结构</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-zinc-300 leading-relaxed">{scaffoldDryRunPreview}</pre>
              </div>
            ) : null}
            {scaffoldError && (
              <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
                {scaffoldError}
              </div>
            )}
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={scaffoldBusy || dataMiningBusy}
                onClick={() => setShowCaseScaffold(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-[12px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={scaffoldBusy || dataMiningBusy || !scaffoldFormReady}
                onClick={() => runScaffoldNewCase()}
                className="rounded-lg bg-zinc-100 text-zinc-900 px-4 py-2 text-[12px] font-medium hover:bg-white disabled:opacity-50 transition-colors"
              >
                {scaffoldBusy ? '创建中...' : dataMiningBusy ? '数据挖掘中...' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInspectorDrawer && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowInspectorDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                高级工程配置 (Inspector)
              </h3>
              <button
                type="button"
                onClick={() => setShowInspectorDrawer(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-xs font-medium text-zinc-300">Simulink/PCSWMM 核心引擎配置</h4>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                  包含底层计算引擎、边界条件映射及控制步长设置。不建议在非专家模式下修改。
                </p>
                <button
                  type="button"
                  disabled={!shellCaseId}
                  onClick={() => openPath(`Hydrology/configs/${shellCaseId}.yaml`)}
                  className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 transition-colors text-left flex items-center justify-between"
                >
                  <span>编辑 Hydrology YAML</span>
                  <span className="text-zinc-500 text-[10px]">configs/{shellCaseId}.yaml</span>
                </button>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-zinc-300">环境与网络隔离 (Network & Env)</h4>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                  仅针对包含独立 OPC-UA 或特殊环境依赖的案例有效。
                </p>
                <button
                  type="button"
                  disabled={true}
                  className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-xs font-medium text-zinc-500 cursor-not-allowed text-left"
                >
                  网络配置隔离（当前禁用）
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
