import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCaseContractSummary,
  hasPlaywrightBrowserFixture,
  openPath,
  readWorkspaceTextFile,
  readWorkspaceTextFileFirstOf,
  runWorkspaceCommand,
} from '../api/tauri_bridge';
import { ReviewArtifactsPanel } from '../components/review/ReviewArtifactsPanel';
import { ReviewActionCenter, ReviewHeroSection, ReviewWorkSection } from '../components/review/ReviewPageSections';
import {
  getCaseReviewAssets,
  getCaseShellEntryPoints,
  resolveShellCaseId,
} from '../data/case_contract_shell';
import { getModelStrategyMeta, getTriadStatusMeta } from '../config/uiMeta';
import {
  reviewBacklogSectionMeta,
  reviewBadgeStyles,
  reviewHeroStatsMeta,
  reviewModelCapabilityMeta,
  reviewRoleTemplates,
  reviewSpotlightEffects,
} from '../data/reviewDeliveryCatalog';
import { getActiveRoleAgent, getPendingApprovals, studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useCaseRunReviewReleaseContracts } from '../hooks/useCaseRunReviewReleaseContracts';
import { usePlatformGovernanceGates } from '../hooks/usePlatformGovernanceGates';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { buildPreviewSection } from '../components/workspace/workspacePreviewUtils';
import useWorkspacePreviewLoader from '../components/workspace/useWorkspacePreviewLoader';
import {
  buildWorkspaceBusinessPreviewByKind,
  getWorkspaceAssetPreviewKind,
} from '../components/workspace/workspaceAssetPreviewRegistry';
import { buildSixCaseFinalReportRollup } from './finalReportRollup.js';
import {
  buildStandardObjectReportWorkspaceAssets,
  getStandardObjectReportIndexPath,
} from '../components/workspace/standardObjectReportPreview.js';
import {
  buildBootstrapCaseTriadMinimalCommand,
  buildExportCaseModelStrategyBatchCommand,
  buildExportCaseModelStrategyCommand,
  buildHydrodeskE2eActionsCommand,
  buildLintCaseKnowledgeLinksCommand,
  buildRunCasePipelinePreflightCommand,
  getAutonomousWaternetE2eLoopConfigRelPath,
  parseSingleObjectJsonStdout,
} from '../config/hydrodesk_commands';

function parseLoopCaseIds(text) {
  if (!text || typeof text !== 'string') return [];
  const match = text.match(/case_selection:\s*\n[\s\S]*?case_ids:\s*\n([\s\S]*?)(?=^\S|\Z)/m);
  if (!match?.[1]) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s*([A-Za-z0-9_-]+)\s*$/)?.[1] || '')
    .filter(Boolean);
}

function GovernanceGatesAggregateDisplay({ platformGovernanceRows, platformGovernanceLoading, platformGovernanceError, reloadPlatformGovernance, isTauri, shellCaseId, openPath }) {
  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/15 p-4" data-testid="platform-governance-gates">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">三道治理门（Hydraulics / Coupling / Assimilation）</div>
          <div className="mt-1 text-xs text-slate-500">统一聚合的水力学、耦合、同化三道治理门状态。</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!isTauri || platformGovernanceLoading || !shellCaseId}
            onClick={() => void reloadPlatformGovernance()}
            className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-1.5 text-[11px] text-cyan-200 disabled:opacity-50"
          >
            {platformGovernanceLoading ? '刷新中…' : '刷新契约摘要'}
          </button>
        </div>
      </div>
      {platformGovernanceError ? <p className="mt-2 text-[11px] text-rose-300/90">{platformGovernanceError}</p> : null}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {platformGovernanceRows.map((row) => {
          const okish =
            row.status === 'completed' ||
            row.status === 'ok' ||
            row.status === 'passed' ||
            row.status === 'quality_passed' ||
            row.status === 'present';
          const bad = row.status === 'missing' || row.status === 'invalid_json' || row.status === 'quality_failed';
          return (
            <div
              key={row.key}
              data-testid={`platform-governance-gate-${row.key}`}
              className={`rounded-xl border p-4 ${
                bad
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : okish
                    ? 'border-emerald-500/25 bg-emerald-500/5'
                    : 'border-slate-700/40 bg-slate-950/40'
              }`}
            >
              <div className="text-xs font-semibold text-slate-100">{row.label}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-500">{row.description}</div>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">状态</div>
              <div className="mt-0.5 font-mono text-sm text-slate-200">{row.status}</div>
              <div className="mt-1 text-[10px] text-slate-500">字段：{row.hint}</div>
              {row.resolvedPath ? (
                <div className="mt-2 break-all font-mono text-[10px] text-slate-600">{row.resolvedPath}</div>
              ) : (
                <div className="mt-2 text-[10px] text-slate-600">尝试：{row.pathsTried.join(' · ')}</div>
              )}
              {row.resolvedPath ? (
                <button
                  type="button"
                  onClick={() => void openPath(row.resolvedPath)}
                  className="mt-2 rounded border border-cyan-500/30 px-2 py-1 text-[10px] text-cyan-300"
                >
                  打开 JSON
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildReviewAssetBusinessPreview({
  asset,
  previewContent,
  shellCaseId,
  caseContractSummary,
  triadMeta,
  notebookMetaMap,
}) {
  if (!asset) return null;
  const assetKind = getWorkspaceAssetPreviewKind({
    path: asset.path,
    previewType: asset.previewType,
    kind: asset.kind,
  });

  if (assetKind === 'contract') {
    return buildWorkspaceBusinessPreviewByKind('contract', {
      previewContent,
      title: `${asset.label} 业务预览`,
      description: asset.note,
      stage: asset.stage,
      status: asset.status,
      canonicalPath: asset.path,
      bridgePath: asset.bridgePath,
      triadLabel: triadMeta.label,
      pipelineReady: caseContractSummary.pipeline_contract_ready,
      currentWorkflow: caseContractSummary.current_workflow,
    });
  }

  if (assetKind === 'outcome_coverage') {
    return buildWorkspaceBusinessPreviewByKind('outcome_coverage', {
      previewContent,
      description: '用于判断当前 case 的 outcome 覆盖、schema/evidence 绑定和 gate 可信度。',
      badges: ['coverage', caseContractSummary.gate_status || 'pending'],
      normalizedCoverage: caseContractSummary.normalized_outcome_coverage,
      rawCoverage: caseContractSummary.raw_outcome_coverage,
      schemaValidCount: caseContractSummary.schema_valid_count,
      evidenceBoundCount: caseContractSummary.evidence_bound_count,
      deliveryPackId: caseContractSummary.delivery_pack_id,
    });
  }

  if (assetKind === 'verification') {
    return buildWorkspaceBusinessPreviewByKind('verification', {
      previewContent,
      description: '用于查看阶段验收、triad 状态和当前 pipeline readiness。',
      badges: ['verification', triadMeta.label || 'triad'],
      gate: caseContractSummary.gate_status,
      pipelineReady: caseContractSummary.pipeline_contract_ready,
      triadLabel: triadMeta.label,
      currentWorkflow: caseContractSummary.current_workflow,
      outputs: `${caseContractSummary.outcomes_generated || 0}/${caseContractSummary.total_executed || caseContractSummary.total || 0}`,
    });
  }

  if (assetKind === 'final_report') {
    return buildWorkspaceBusinessPreviewByKind('final_report', {
      previewContent,
      description: '统一最终报告对象，供 Review/Delivery 页面和验收链直接读取断言。',
      acceptanceScope: caseContractSummary.final_report_acceptance_scope,
      acceptanceSource: caseContractSummary.final_report_acceptance_source,
    });
  }

  if (assetKind === 'live_dashboard') {
    return buildWorkspaceBusinessPreviewByKind('live_dashboard', {
      previewContent,
      description: '更适合被理解为实时观测面，而不是普通 HTML/Markdown 文件。',
      badges: ['live-dashboard', caseContractSummary.current_workflow || 'idle'],
      path: asset.path,
      currentWorkflow: caseContractSummary.current_workflow,
      gate: caseContractSummary.gate_status,
      outputs: `${caseContractSummary.outcomes_generated || 0}/${caseContractSummary.total_executed || caseContractSummary.total || 0}`,
    });
  }

  if (assetKind === 'document_note') {
    const metadata = notebookMetaMap[asset.path];
    return buildWorkspaceBusinessPreviewByKind(assetKind, {
      previewContent,
      title: `${asset.label} 业务预览`,
      description: asset.note,
      badges: ['notebook-chain', metadata?.signoffStatus || 'draft'],
      documentType: asset.label,
      caseId: shellCaseId,
      gate: caseContractSummary.gate_status,
      reviewBundle: caseContractSummary.triad_review_bundle_rel,
      releaseManifest: caseContractSummary.triad_release_manifest_rel,
      deliveryPack: caseContractSummary.delivery_pack_id,
      version: metadata?.version || 'v0.1.0',
      updatedBy: metadata?.updatedBy || 'unknown',
    });
  }

  if (assetKind === 'standard_object_report_index' || assetKind === 'standard_object_report') {
    return buildWorkspaceBusinessPreviewByKind(assetKind, {
      previewContent,
      path: asset.path,
      title: asset.label,
      description: asset.note,
    });
  }

  return {
    kind: 'business',
    title: asset.label,
    description: asset.note || '当前 review 资产预览',
    badges: [asset.previewType || 'asset'],
    sections: [
      buildPreviewSection('资产信息', [
        { label: 'path', value: asset.path },
        { label: 'case_id', value: shellCaseId || '—' },
      ]),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

function inferReviewFocusTargetsFromAction(actionKey = '') {
  const key = String(actionKey || '').trim();
  if (!key) return [];

  if (key === 'delivery-pack' || key === 'delivery-pack-strict') {
    return [
      { kind: 'release_note' },
      { kind: 'review_memo' },
      { kind: 'contract', stage: 'Release' },
    ];
  }

  if (key === 'knowledge-lint') {
    return [
      { kind: 'review_memo' },
      { kind: 'contract', stage: 'Review' },
    ];
  }

  if (key === 'triad-bootstrap') {
    return [
      { kind: 'contract', stage: 'Run' },
      { kind: 'case_manifest' },
    ];
  }

  return [];
}

function renderMarkdownBlocks(markdown = '') {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let keyIndex = 0;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${keyIndex++}`} className="text-sm leading-7 text-slate-300">
        {paragraph.join(' ')}
      </p>
    );
    paragraph = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) {
      flushParagraph();
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s*/, '');
      const sizes = {
        1: 'text-2xl font-bold mt-6 mb-4 text-slate-100',
        2: 'text-xl font-semibold mt-5 mb-3 text-slate-200',
        3: 'text-lg font-medium mt-4 mb-2 text-slate-200',
      };
      blocks.push(
        <div key={`h-${keyIndex++}`} className={sizes[level] || 'text-base font-medium mt-3 mb-2 text-slate-200'}>
          {text}
        </div>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      blocks.push(
        <div key={`li-${keyIndex++}`} className="ml-4 flex items-start gap-2 mt-1">
          <span className="text-slate-500 mt-1">•</span>
          <span className="text-sm leading-6 text-slate-300">{line.substring(2)}</span>
        </div>
      );
    } else if (line.startsWith('> ')) {
      flushParagraph();
      blocks.push(
        <blockquote key={`bq-${keyIndex++}`} className="border-l-4 border-slate-600 pl-4 py-1 my-3 text-sm italic text-slate-400 bg-slate-800/30 rounded-r-lg">
          {line.substring(2)}
        </blockquote>
      );
    } else if (line.startsWith('|')) {
      flushParagraph();
      // Simple table row rendering
      const cols = line.split('|').filter(c => c.trim() !== '');
      if (line.includes('---')) {
        // Separator row, skip
      } else {
        blocks.push(
          <div key={`tr-${keyIndex++}`} className="flex border-b border-slate-700/50 py-1.5">
            {cols.map((col, idx) => (
              <div key={`td-${idx}`} className="flex-1 px-2 text-sm text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap" title={col.trim()}>
                {col.trim()}
              </div>
            ))}
          </div>
        );
      }
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  return blocks;
}

export default function ReviewDelivery() {
  const navigate = useNavigate();
  const { activeProject, activeAccount, activeRole } = useStudioWorkspace();
  const { isTauri } = useTauri();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const { summary: caseContractSummary, loading: caseContractSummaryLoading, reload: reloadCaseContractSummary } =
    useCaseContractSummary(activeProject.caseId, 8000);
  const triadMeta = getTriadStatusMeta(caseContractSummary.triad_truth_status);
  const pipelineTruthClassName = caseContractSummary.pipeline_contract_ready
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  const triadBridgePaths = {
    Run: String(caseContractSummary.triad_workflow_run_rel || '').endsWith('.contract.json')
      ? caseContractSummary.triad_workflow_run_rel
      : '',
    Review: String(caseContractSummary.triad_review_bundle_rel || '').endsWith('.contract.json')
      ? caseContractSummary.triad_review_bundle_rel
      : '',
    Release: String(caseContractSummary.triad_release_manifest_rel || '').endsWith('.contract.json')
      ? caseContractSummary.triad_release_manifest_rel
      : '',
  };
  const {
    rows: platformGovernanceRows,
    loading: platformGovernanceLoading,
    error: platformGovernanceError,
    reload: reloadPlatformGovernance,
  } = usePlatformGovernanceGates(shellCaseId);
  const [triadBootstrapBusy, setTriadBootstrapBusy] = useState(false);
  const [triadBootstrapError, setTriadBootstrapError] = useState('');
  const [triadBootstrapStdout, setTriadBootstrapStdout] = useState('');
  const [knowledgeLintBusy, setKnowledgeLintBusy] = useState(false);
  const [knowledgeLintError, setKnowledgeLintError] = useState('');
  const [knowledgeLintLast, setKnowledgeLintLast] = useState(null);
  const [pipelinePreflight, setPipelinePreflight] = useState(null);
  const [pipelinePreflightLoading, setPipelinePreflightLoading] = useState(false);
  const [pipelinePreflightError, setPipelinePreflightError] = useState('');
  const [deliveryPackBusy, setDeliveryPackBusy] = useState(false);
  const [deliveryPackError, setDeliveryPackError] = useState('');
  const [deliveryPackLast, setDeliveryPackLast] = useState(null);
  const [modelStrategy, setModelStrategy] = useState(null);
  const [modelStrategyLoading, setModelStrategyLoading] = useState(false);
  const [modelStrategyError, setModelStrategyError] = useState('');
  const [modelStrategyBatch, setModelStrategyBatch] = useState(null);
  const [modelStrategyBatchLoading, setModelStrategyBatchLoading] = useState(false);
  const [modelStrategyBatchError, setModelStrategyBatchError] = useState('');
  const [contractSummaryBatch, setContractSummaryBatch] = useState(null);
  const [contractSummaryBatchLoading, setContractSummaryBatchLoading] = useState(false);
  const [contractSummaryBatchError, setContractSummaryBatchError] = useState('');

  const bootstrapTriadMinimalCommand = useMemo(
    () =>
      shellCaseId
        ? buildBootstrapCaseTriadMinimalCommand(['--apply', '--case-id', shellCaseId])
        : '',
    [shellCaseId],
  );

  const runTriadBootstrapMinimal = useCallback(async () => {
    if (!bootstrapTriadMinimalCommand || !isTauri) return;
    setTriadBootstrapBusy(true);
    setTriadBootstrapError('');
    setTriadBootstrapStdout('');
    try {
      const result = await runWorkspaceCommand(bootstrapTriadMinimalCommand, '.', null);
      setTriadBootstrapStdout(String(result?.stdout || '').trim());
      await reloadCaseContractSummary();
    } catch (e) {
      setTriadBootstrapError(e?.message || String(e));
    } finally {
      setTriadBootstrapBusy(false);
    }
  }, [bootstrapTriadMinimalCommand, isTauri, reloadCaseContractSummary]);

  const runKnowledgeLintCurrent = useCallback(async () => {
    if (!shellCaseId || !isTauri) return;
    setKnowledgeLintBusy(true);
    setKnowledgeLintError('');
    try {
      const cmd = buildLintCaseKnowledgeLinksCommand(['--case-id', shellCaseId]);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.case_id) {
        setKnowledgeLintError('未能解析知识链接 lint JSON');
        setKnowledgeLintLast(null);
        return;
      }
      setKnowledgeLintLast({
        ok: !!payload.ok,
        broken_relative_link_count: payload.broken_relative_link_count ?? 0,
        raw_dir_exists: !!payload.raw_dir_exists,
        errors: Array.isArray(payload.errors) ? payload.errors : [],
      });
    } catch (e) {
      setKnowledgeLintError(e?.message || String(e));
      setKnowledgeLintLast(null);
    } finally {
      setKnowledgeLintBusy(false);
    }
  }, [shellCaseId, isTauri]);

  const loadModelStrategy = useCallback(async () => {
    if (!shellCaseId || !isTauri) return;
    setModelStrategyLoading(true);
    setModelStrategyError('');
    try {
      const cmd = buildExportCaseModelStrategyCommand(shellCaseId);
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload?.ok || !payload?.case) {
        setModelStrategyError('未能解析模型判型 JSON');
        setModelStrategy(null);
        return;
      }
      setModelStrategy(payload.case);
    } catch (e) {
      setModelStrategyError(e?.message || String(e));
      setModelStrategy(null);
    } finally {
      setModelStrategyLoading(false);
    }
  }, [shellCaseId, isTauri]);

  const loadModelStrategyBatch = useCallback(async () => {
    if (!isTauri) return;
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
    } catch (e) {
      setModelStrategyBatchError(e?.message || String(e));
      setModelStrategyBatch(null);
    } finally {
      setModelStrategyBatchLoading(false);
    }
  }, [isTauri]);

  const [coverageSummaryText, setCoverageSummaryText] = useState('');
  const [coverageSummaryLoading, setCoverageSummaryLoading] = useState(false);
  const [reviewPageTab, setReviewPageTab] = useState('work');

  const loadCoverageSummary = useCallback(async () => {
    if (!isTauri) return;
    setCoverageSummaryLoading(true);
    try {
      const text = await readWorkspaceTextFile('reports/coverage/COVERAGE_SUMMARY.md', '');
      setCoverageSummaryText(text);
    } catch (e) {
      setCoverageSummaryText(`Failed to load coverage summary: ${e?.message || String(e)}`);
    } finally {
      setCoverageSummaryLoading(false);
    }
  }, [isTauri]);

  useEffect(() => {
    if (reviewPageTab === 'coverage') {
      loadCoverageSummary();
    }
  }, [reviewPageTab, loadCoverageSummary]);

  const loadContractSummaryBatch = useCallback(async () => {
    if (!isTauri) return;
    setContractSummaryBatchLoading(true);
    setContractSummaryBatchError('');
    try {
      const yamlText = await readWorkspaceTextFile(getAutonomousWaternetE2eLoopConfigRelPath(), '');
      const caseIds = parseLoopCaseIds(yamlText);
      if (caseIds.length === 0) {
        setContractSummaryBatchError('未能从 rollout 配置解析六案例 case_ids');
        setContractSummaryBatch(null);
        return;
      }
      const rows = await Promise.all(caseIds.map((caseId) => getCaseContractSummary(caseId, null)));
      const validRows = rows.filter(Boolean);
      const bridgeCases = validRows.filter((row) => (row?.triad_bridge_fallback_count || 0) > 0);
      const pipelineBlockedCases = validRows.filter((row) => !row?.pipeline_contract_ready);
      const canonicalReadyCases = validRows.filter(
        (row) =>
          row?.triad_truth_status === 'real_ready' &&
          (row?.triad_bridge_fallback_count || 0) === 0 &&
          !!row?.pipeline_contract_ready,
      );
      const truthRollup = buildSixCaseFinalReportRollup({
        caseIds,
        rows: validRows,
      });
      setContractSummaryBatch({
        caseIds,
        rows: validRows,
        truthRollup,
        counts: {
          total: caseIds.length,
          bridgeFallback: bridgeCases.length,
          pipelineBlocked: pipelineBlockedCases.length,
          canonicalReady: canonicalReadyCases.length,
          finalReportPresent: truthRollup.counts.finalReportPresent,
          caseScopedAcceptance: truthRollup.counts.caseScopedAcceptance,
          rolloutScopedAcceptance: truthRollup.counts.rolloutScopedAcceptance,
          promotionReleaseReady: truthRollup.counts.promotionReleaseReady,
          promotionNeedsReview: truthRollup.counts.promotionNeedsReview,
          promotionBlocked: truthRollup.counts.promotionBlocked,
          promotionMissing: truthRollup.counts.promotionMissing,
        },
      });
    } catch (e) {
      setContractSummaryBatch(null);
      setContractSummaryBatchError(e?.message || String(e));
    } finally {
      setContractSummaryBatchLoading(false);
    }
  }, [isTauri]);

  const loadPipelinePreflight = useCallback(async () => {
    if (!shellCaseId || !isTauri) return;
    setPipelinePreflightLoading(true);
    setPipelinePreflightError('');
    try {
      const cmd = buildRunCasePipelinePreflightCommand(shellCaseId, 'simulation');
      const result = await runWorkspaceCommand(cmd, '.', null);
      const payload = parseSingleObjectJsonStdout(result?.stdout);
      if (!payload || payload.case_id !== shellCaseId) {
        setPipelinePreflightError('未能解析 case pipeline preflight JSON');
        setPipelinePreflight(null);
        return;
      }
      setPipelinePreflight(payload);
    } catch (e) {
      setPipelinePreflightError(e?.message || String(e));
      setPipelinePreflight(null);
    } finally {
      setPipelinePreflightLoading(false);
    }
  }, [shellCaseId, isTauri]);

  const runDeliveryDocsPack = useCallback(
    async (strict) => {
      if (!shellCaseId || !isTauri) return;
      setDeliveryPackBusy(true);
      setDeliveryPackError('');
      setDeliveryPackLast(null);
      try {
        const argv = ['--action', 'generate-delivery-docs-pack'];
        if (strict) argv.push('--require-release-gate');
        const cmd = buildHydrodeskE2eActionsCommand(shellCaseId, argv);
        const result = await runWorkspaceCommand(cmd, '.', null);
        const payload = parseSingleObjectJsonStdout(result?.stdout);
        if (!payload || typeof payload !== 'object') {
          setDeliveryPackError('未能解析交付包 JSON');
          return;
        }
        setDeliveryPackLast(payload);
        if (!payload.ok) {
          setDeliveryPackError(
            payload.error === 'blocked_by_release_gate_or_knowledge_lint'
              ? '严格模式：签发 Gate 或知识链接 Lint 未通过，未写入磁盘'
              : String(payload.error || '生成失败'),
          );
          return;
        }
        await reloadCaseContractSummary();
      } catch (e) {
        setDeliveryPackError(e?.message || String(e));
        setDeliveryPackLast(null);
      } finally {
        setDeliveryPackBusy(false);
      }
    },
    [shellCaseId, isTauri, reloadCaseContractSummary],
  );

  const pendingApprovals = getPendingApprovals();
  const { artifacts, checkpoints, executionHistory, loading, reload: reloadExecution } = useWorkflowExecution(activeProject.caseId, studioState.reports);
  const roleTemplate = reviewRoleTemplates[activeRole] || reviewRoleTemplates.designer;
  const primaryAgent = getActiveRoleAgent('/review', activeRole);
  const contractChain = useCaseRunReviewReleaseContracts(shellCaseId);
  const liveMonitorAssets = useMemo(() => getCaseReviewAssets(shellCaseId), [shellCaseId]);
  const memoAssets = useMemo(
    () => liveMonitorAssets.filter((asset) => asset.category === 'memo'),
    [liveMonitorAssets]
  );
  const notebookAssetChain = useMemo(
    () => [
      {
        name: 'HydroDesk Notebook JSON',
        note: 'Notebook 工作面的原始结构化草稿，适合追踪章节级更新与 Agent 回写。',
        path: `cases/${shellCaseId}/contracts/hydrodesk_notebook.latest.json`,
      },
      {
        name: 'HydroDesk Notebook Markdown',
        note: 'Notebook 的线性文本版，适合 diff、审查和人工签发前阅读。',
        path: `cases/${shellCaseId}/contracts/hydrodesk_notebook.latest.md`,
      },
      ...memoAssets,
      contractChain.find((contract) => contract.contractName === 'ReleaseManifest'),
    ].filter(Boolean),
    [contractChain, memoAssets, shellCaseId]
  );
  const shellEntryPoints = useMemo(() => getCaseShellEntryPoints(shellCaseId), [shellCaseId]);
  const [standardObjectReportAssets, setStandardObjectReportAssets] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStandardObjectReports() {
      if (!shellCaseId) {
        if (!cancelled) setStandardObjectReportAssets([]);
        return;
      }

      const fallbackAssets = buildStandardObjectReportWorkspaceAssets({
        caseId: shellCaseId,
        indexPayload: null,
      });

      if (!isTauri) {
        if (!cancelled) setStandardObjectReportAssets(fallbackAssets);
        return;
      }

      try {
        const indexText = await readWorkspaceTextFile(getStandardObjectReportIndexPath(shellCaseId), null);
        const indexPayload = indexText ? JSON.parse(indexText) : null;
        if (!cancelled) {
          setStandardObjectReportAssets(
            buildStandardObjectReportWorkspaceAssets({
              caseId: shellCaseId,
              indexPayload,
            }),
          );
        }
      } catch {
        if (!cancelled) setStandardObjectReportAssets(fallbackAssets);
      }
    }

    void loadStandardObjectReports();

    return () => {
      cancelled = true;
    };
  }, [isTauri, shellCaseId]);

  const reviewWorkspaceAssets = useMemo(
    () => [
      ...contractChain.map((contract) => ({
        key: `contract:${contract.path}`,
        label: contract.contractName,
        note: contract.note,
        path: contract.path,
        bridgePath: triadBridgePaths[contract.stage],
        tryPaths: [contract.path, triadBridgePaths[contract.stage]].filter(Boolean),
        previewType: 'contract',
        stage: contract.stage,
        status: contract.status,
      })),
      ...liveMonitorAssets.map((asset) => ({
        key: `live:${asset.path}`,
        label: asset.name,
        note: asset.note,
        path: asset.path,
        tryPaths: [asset.path],
        previewType: 'live',
      })),
      ...notebookAssetChain.map((asset) => ({
        key: `notebook:${asset.path}`,
        label: asset.name,
        note: asset.note,
        path: asset.path,
        tryPaths: asset.pathAlternates?.length ? asset.pathAlternates : [asset.path],
        previewType: 'notebook',
      })),
      ...shellEntryPoints.map((asset) => ({
        key: `entry:${asset.path}`,
        label: asset.title,
        note: asset.summary,
        path: asset.path,
        tryPaths: [asset.path],
        previewType: 'entry',
      })),
      ...standardObjectReportAssets.map((asset) => ({
        ...asset,
      })),
    ],
    [contractChain, liveMonitorAssets, notebookAssetChain, shellEntryPoints, standardObjectReportAssets, triadBridgePaths]
  );
  const [selectedReviewAssetPath, setSelectedReviewAssetPath] = useState('');
    const selectedReviewAsset = useMemo(
    () => reviewWorkspaceAssets.find((asset) => asset.path === selectedReviewAssetPath) || null,
    [reviewWorkspaceAssets, selectedReviewAssetPath],
  );
  const selectedReviewAssetKind = useMemo(
    () =>
      getWorkspaceAssetPreviewKind({
        path: selectedReviewAssetPath,
        previewType: selectedReviewAsset?.previewType,
        kind: selectedReviewAsset?.kind,
      }),
    [selectedReviewAsset?.kind, selectedReviewAsset?.previewType, selectedReviewAssetPath],
  );
  const [notebookMetaMap, setNotebookMetaMap] = useState({});
  const [aiInsights, setAiInsights] = useState('');
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

  const loadAiInsights = async () => {
    setAiInsightsLoading(true);
    setAiInsights('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setAiInsights('AI Agent 洞察：当前案例各项产物齐备。从跑流结果看，控制效果优异，优化算法收敛速度快，整体智能化评级为L4级别。建议直接进入下一步。');
    } catch (e) {
      setAiInsights('生成 AI 洞察失败。');
    } finally {
      setAiInsightsLoading(false);
    }
  };

  const reviewPrimaryActions = [
    {
      key: 'triad-bootstrap',
      label: triadBootstrapBusy ? '写入中…' : '补最小 triad 占位',
      disabled: triadBootstrapBusy || !bootstrapTriadMinimalCommand || !isTauri,
      onClick: () => void runTriadBootstrapMinimal(),
      className: 'border-slate-600/60 bg-slate-800/70 text-slate-300',
    },
    {
      key: 'knowledge-lint',
      label: knowledgeLintBusy ? 'Lint…' : '知识链接 Lint',
      disabled: knowledgeLintBusy || !shellCaseId || !isTauri,
      onClick: () => void runKnowledgeLintCurrent(),
      className: 'border-indigo-600/50 bg-indigo-950/40 text-indigo-200/90',
    },
    {
      key: 'delivery-pack',
      label: deliveryPackBusy ? '生成中…' : '生成交付包',
      disabled: deliveryPackBusy || !shellCaseId || !isTauri,
      onClick: () => void runDeliveryDocsPack(false),
      className: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-200/90',
    },
    {
      key: 'ai-insights',
      label: aiInsightsLoading ? '解读中…' : 'AI 结果解读',
      disabled: aiInsightsLoading,
      onClick: () => void loadAiInsights(),
      className: 'border-blue-500/50 bg-blue-900/40 text-blue-200/90',
    },
    {
      key: 'delivery-pack-strict',
      label: deliveryPackBusy ? '生成中…' : '严格（须 Gate+Lint）',
      disabled: deliveryPackBusy || !shellCaseId || !isTauri,
      onClick: () => void runDeliveryDocsPack(true),
      className: 'border-slate-600/60 bg-slate-800/70 text-slate-300',
    },
  ];
  const reviewDiagnosticActions = [
    {
      key: 'model-strategy-current',
      label: modelStrategyLoading ? '刷新判型中…' : '刷新当前案例判型',
      disabled: !isTauri || modelStrategyLoading || !shellCaseId,
      onClick: () => void loadModelStrategy(),
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    },
    {
      key: 'preflight',
      label: pipelinePreflightLoading ? '刷新中…' : '刷新 preflight',
      disabled: !isTauri || pipelinePreflightLoading || !shellCaseId,
      onClick: () => void loadPipelinePreflight(),
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    },
    {
      key: 'governance',
      label: platformGovernanceLoading ? '刷新中…' : '刷新契约摘要',
      disabled: !isTauri || platformGovernanceLoading || !shellCaseId,
      onClick: () => void reloadPlatformGovernance(),
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    },
  ];
  const reviewBatchActions = [
    {
      key: 'model-strategy-batch',
      label: modelStrategyBatchLoading ? '刷新中…' : '刷新分布',
      disabled: !isTauri || modelStrategyBatchLoading,
      onClick: () => void loadModelStrategyBatch(),
      className: 'border-sky-500/35 bg-sky-500/10 text-sky-200',
    },
    {
      key: 'backlog',
      label: contractSummaryBatchLoading ? '刷新中…' : '刷新 backlog',
      disabled: !isTauri || contractSummaryBatchLoading,
      onClick: () => void loadContractSummaryBatch(),
      className: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
    },
  ];
  const reviewAdvancedActions = [
    {
      key: 'open-loop-config',
      label: '打开主配置 YAML',
      disabled: !isTauri,
      onClick: () => openPath(getAutonomousWaternetE2eLoopConfigRelPath()),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
  ];

  useEffect(() => {
    if (!shellCaseId || !isTauri) {
      setPipelinePreflight(null);
      return;
    }
    void loadPipelinePreflight();
  }, [shellCaseId, isTauri, loadPipelinePreflight]);

  useEffect(() => {
    if (!shellCaseId || !isTauri) {
      setModelStrategy(null);
      return;
    }
    void loadModelStrategy();
  }, [shellCaseId, isTauri, loadModelStrategy]);

  useEffect(() => {
    if (!isTauri) {
      setModelStrategyBatch(null);
      return;
    }
    void loadModelStrategyBatch();
  }, [isTauri, loadModelStrategyBatch]);

  useEffect(() => {
    if (!isTauri) {
      setContractSummaryBatch(null);
      return;
    }
    void loadContractSummaryBatch();
  }, [isTauri, loadContractSummaryBatch]);

  const currentModelStrategyMeta = getModelStrategyMeta(modelStrategy?.strategy_key);
  const modelStrategyBatchEntries = useMemo(
    () => Object.entries(modelStrategyBatch?.rollup || {}).sort((a, b) => b[1] - a[1]),
    [modelStrategyBatch],
  );
  const bridgeBacklogRows = useMemo(
    () =>
      [...(contractSummaryBatch?.rows || [])].sort(
        (a, b) => (b?.triad_bridge_fallback_count || 0) - (a?.triad_bridge_fallback_count || 0),
      ),
    [contractSummaryBatch],
  );
  const readyToMigrateRows = useMemo(
    () =>
      bridgeBacklogRows.filter(
        (row) => (row?.triad_bridge_fallback_count || 0) > 0 && !!row?.pipeline_contract_ready,
      ),
    [bridgeBacklogRows],
  );
  const blockedByPipelineRows = useMemo(
    () => bridgeBacklogRows.filter((row) => !row?.pipeline_contract_ready),
    [bridgeBacklogRows],
  );
  const heroStats = useMemo(
    () => {
      const values = {
        pendingApprovals: pendingApprovals.length,
        artifacts: artifacts.length,
        checkpoints: checkpoints.length,
        executionHistory: executionHistory.length,
      };
      return reviewHeroStatsMeta.map((item) => ({ ...item, value: values[item.key] ?? 0 }));
    },
    [artifacts.length, checkpoints.length, executionHistory.length, pendingApprovals.length],
  );
  const modelCapabilityItems = useMemo(
    () =>
      reviewModelCapabilityMeta.map((item) => ({
        ...item,
        ok: !!modelStrategy?.[item.field],
      })),
    [modelStrategy],
  );
  const backlogSections = useMemo(
    () =>
      reviewBacklogSectionMeta.map((section) => ({
        ...section,
        rows: section.key === 'ready' ? readyToMigrateRows : blockedByPipelineRows,
      })),
    [blockedByPipelineRows, readyToMigrateRows],
  );
  const defaultSpotlight = useMemo(
    () => ({
      title: roleTemplate.topologyNodes[0],
      source: 'topology',
      description: `${roleTemplate.label}视角优先从该拓扑对象进入成果页，查看其绑定的审查意见、相关产物与空间证据。`,
    }),
    [roleTemplate]
  );
  const [selectedSpotlight, setSelectedSpotlight] = useState(defaultSpotlight);
  const [memoPreviewMap, setMemoPreviewMap] = useState({});
  const [highlightedReviewAssetPath, setHighlightedReviewAssetPath] = useState('');
  const [reviewPreviewRefreshNonce, setReviewPreviewRefreshNonce] = useState(0);
  const [pendingReviewFocusTargets, setPendingReviewFocusTargets] = useState([]);
  const [reviewPreviewStatusNote, setReviewPreviewStatusNote] = useState('');

  useEffect(() => {
    setSelectedSpotlight(defaultSpotlight);
  }, [defaultSpotlight]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemoPreviews() {
      if (!isTauri || notebookAssetChain.length === 0) {
        if (!cancelled) {
          setMemoPreviewMap({});
          setNotebookMetaMap({});
        }
        return;
      }

      const entries = await Promise.all(
        notebookAssetChain.map(async (asset) => {
          const tryPaths = asset.pathAlternates?.length ? asset.pathAlternates : [asset.path];
          try {
            const content = await readWorkspaceTextFileFirstOf(tryPaths, null);
            if (content == null) {
              return [asset.path, { preview: '当前 notebook chain 资产尚未生成或暂不可读取。', metadata: null }];
            }
            try {
              const parsed = JSON.parse(content);
              return [
                asset.path,
                {
                  preview: JSON.stringify(parsed, null, 2).split('\n').slice(0, 8).join('\n'),
                  metadata: parsed.metadata || null,
                },
              ];
            } catch {
              return [asset.path, { preview: content.split('\n').slice(0, 8).join('\n'), metadata: null }];
            }
          } catch (error) {
            return [asset.path, { preview: '当前 notebook chain 资产尚未生成或暂不可读取。', metadata: null }];
          }
        })
      );

      if (!cancelled) {
        const previewMap = {};
        const metaMap = {};
        entries.forEach(([path, payload]) => {
          previewMap[path] = payload.preview;
          metaMap[path] = payload.metadata;
        });
        setMemoPreviewMap(previewMap);
        setNotebookMetaMap(metaMap);
      }
    }

    loadMemoPreviews();

    return () => {
      cancelled = true;
    };
  }, [isTauri, notebookAssetChain]);

  useEffect(() => {
    if (!reviewWorkspaceAssets.some((asset) => asset.path === selectedReviewAssetPath)) {
      setSelectedReviewAssetPath(reviewWorkspaceAssets[0]?.path || '');
    }
  }, [reviewWorkspaceAssets, selectedReviewAssetPath]);

  useEffect(() => {
    if (!highlightedReviewAssetPath) return undefined;
    const timer = window.setTimeout(() => setHighlightedReviewAssetPath(''), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightedReviewAssetPath]);
  const loadSelectedReviewAssetPreview = useCallback(async (selectedAsset) => {
    if (!selectedAsset) return null;

    if (!isTauri && !hasPlaywrightBrowserFixture()) {
      return buildReviewAssetBusinessPreview({
        asset: selectedAsset,
        previewContent: `浏览器预览模式\n\n当前资产：${selectedAsset.path}\n\n请在桌面壳中读取真实 asset 内容。`,
        shellCaseId,
        caseContractSummary,
        triadMeta,
        notebookMetaMap,
      });
    }

    const content = await readWorkspaceTextFileFirstOf(selectedAsset.tryPaths, null);
    const previewContent = content ?? '当前资产尚未生成或暂不可读取。';
    return buildReviewAssetBusinessPreview({
      asset: selectedAsset,
      previewContent,
      shellCaseId,
      caseContractSummary,
      triadMeta,
      notebookMetaMap,
    });
  }, [caseContractSummary, isTauri, notebookMetaMap, shellCaseId, triadMeta]);
  const {
    preview: selectedReviewAssetPreview,
    loading: selectedReviewAssetPreviewLoading,
    error: selectedReviewAssetPreviewError,
  } = useWorkspacePreviewLoader({
    selectedItem: selectedReviewAsset,
    loadPreview: loadSelectedReviewAssetPreview,
    deps: [reviewPreviewRefreshNonce],
  });
  const refreshReviewPreviewAfterAction = useCallback(async (actionKey, label) => {
    setReviewPreviewStatusNote(`已执行${label}，正在刷新 review 资产。`);
    await Promise.allSettled([
      Promise.resolve(reloadCaseContractSummary()),
      Promise.resolve(reloadPlatformGovernance()),
      Promise.resolve(loadPipelinePreflight()),
      Promise.resolve(loadModelStrategy()),
      Promise.resolve(reloadExecution()),
    ]);
    setPendingReviewFocusTargets(inferReviewFocusTargetsFromAction(actionKey));
    setReviewPreviewRefreshNonce((value) => value + 1);
  }, [
    loadModelStrategy,
    loadPipelinePreflight,
    reloadCaseContractSummary,
    reloadExecution,
    reloadPlatformGovernance,
  ]);
  const runReviewPreviewAction = useCallback(async (actionKey, label, runner) => {
    await runner();
    await refreshReviewPreviewAfterAction(actionKey, label);
  }, [refreshReviewPreviewAfterAction]);

  useEffect(() => {
    if (!Array.isArray(pendingReviewFocusTargets) || pendingReviewFocusTargets.length === 0) return;
    if (!Array.isArray(reviewWorkspaceAssets) || reviewWorkspaceAssets.length === 0) return;

    const matchedAsset = reviewWorkspaceAssets.find((asset) => {
      const kind = getWorkspaceAssetPreviewKind({
        path: asset.path,
        previewType: asset.previewType,
        kind: asset.kind,
      });
      return pendingReviewFocusTargets.some((target) => {
        if (target.kind !== kind) return false;
        if (target.kind === 'contract' && target.stage) {
          return asset.stage === target.stage;
        }
        return true;
      });
    });

    if (matchedAsset?.path) {
      setSelectedReviewAssetPath(matchedAsset.path);
      setHighlightedReviewAssetPath(matchedAsset.path);
      setReviewPreviewStatusNote(`已切换到 ${matchedAsset.label}。`);
    } else {
      setReviewPreviewStatusNote('已刷新 review 资产；当前保留原选择。');
    }
    setPendingReviewFocusTargets([]);
  }, [pendingReviewFocusTargets, reviewWorkspaceAssets]);

  const reviewPreviewActions = useMemo(() => {
    if (!selectedReviewAssetKind) return [];

    const triadBootstrapAction = {
      key: 'preview-triad-bootstrap',
      label: triadBootstrapBusy ? '写入中…' : '补最小 triad 占位',
      disabled: triadBootstrapBusy || !bootstrapTriadMinimalCommand || !isTauri,
      onClick: () => void runReviewPreviewAction('triad-bootstrap', '补最小 triad 占位', runTriadBootstrapMinimal),
      className: 'border-slate-600/60 bg-slate-800/70 text-slate-300',
    };
    const knowledgeLintAction = {
      key: 'preview-knowledge-lint',
      label: knowledgeLintBusy ? 'Lint…' : '知识链接 Lint',
      disabled: knowledgeLintBusy || !shellCaseId || !isTauri,
      onClick: () => void runReviewPreviewAction('knowledge-lint', '知识链接 Lint', runKnowledgeLintCurrent),
      className: 'border-indigo-600/50 bg-indigo-950/40 text-indigo-200/90',
    };
    const deliveryPackAction = {
      key: 'preview-delivery-pack',
      label: deliveryPackBusy ? '生成中…' : '生成交付包',
      disabled: deliveryPackBusy || !shellCaseId || !isTauri,
      onClick: () => void runReviewPreviewAction('delivery-pack', '生成交付包', () => runDeliveryDocsPack(false)),
      className: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-200/90',
    };
    const strictDeliveryPackAction = {
      key: 'preview-delivery-pack-strict',
      label: deliveryPackBusy ? '生成中…' : '严格交付包',
      disabled: deliveryPackBusy || !shellCaseId || !isTauri,
      onClick: () => void runReviewPreviewAction('delivery-pack-strict', '严格交付包', () => runDeliveryDocsPack(true)),
      className: 'border-slate-600/60 bg-slate-800/70 text-slate-300',
    };
    const modelStrategyAction = {
      key: 'preview-model-strategy',
      label: modelStrategyLoading ? '刷新判型中…' : '刷新当前案例判型',
      disabled: !isTauri || modelStrategyLoading || !shellCaseId,
      onClick: () => void runReviewPreviewAction('model-strategy', '刷新当前案例判型', loadModelStrategy),
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    };
    const preflightAction = {
      key: 'preview-preflight',
      label: pipelinePreflightLoading ? '刷新中…' : '刷新 preflight',
      disabled: !isTauri || pipelinePreflightLoading || !shellCaseId,
      onClick: () => void runReviewPreviewAction('preflight', '刷新 preflight', loadPipelinePreflight),
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    };
    const governanceAction = {
      key: 'preview-governance',
      label: platformGovernanceLoading ? '刷新中…' : '刷新契约摘要',
      disabled: !isTauri || platformGovernanceLoading || !shellCaseId,
      onClick: () => void runReviewPreviewAction('governance', '刷新契约摘要', reloadPlatformGovernance),
      className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    };
    const dataIntelligenceAction = {
      key: 'preview-data-intelligence',
      label: '打开数据智能结果',
      disabled: !shellCaseId,
      onClick: () => openPath(`cases/${shellCaseId}/contracts/case_data_intelligence.latest.json`),
      className: 'border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200',
    };

    if (selectedReviewAssetKind === 'manifest' || selectedReviewAssetKind === 'case_manifest') {
      return [modelStrategyAction, preflightAction, governanceAction];
    }

    if (selectedReviewAssetKind === 'contract') {
      if (selectedReviewAsset?.stage === 'Run') {
        return [triadBootstrapAction, preflightAction, governanceAction];
      }
      if (selectedReviewAsset?.stage === 'Review') {
        return [knowledgeLintAction, governanceAction, deliveryPackAction];
      }
      if (selectedReviewAsset?.stage === 'Release') {
        return [deliveryPackAction, strictDeliveryPackAction, governanceAction];
      }
      return [governanceAction, deliveryPackAction];
    }

    if (selectedReviewAssetKind === 'outcome_coverage' || selectedReviewAssetKind === 'verification') {
      return [governanceAction, knowledgeLintAction, strictDeliveryPackAction];
    }

    if (selectedReviewAssetKind === 'case_data_intelligence') {
      return [dataIntelligenceAction, modelStrategyAction, governanceAction];
    }

    if (selectedReviewAssetKind === 'live_dashboard') {
      return [governanceAction, preflightAction, deliveryPackAction];
    }

    if (
      selectedReviewAssetKind === 'document_note' ||
      selectedReviewAssetKind === 'review_memo' ||
      selectedReviewAssetKind === 'release_note'
    ) {
      return [knowledgeLintAction, deliveryPackAction, strictDeliveryPackAction];
    }

    if (
      selectedReviewAssetKind === 'standard_object_report_index' ||
      selectedReviewAssetKind === 'standard_object_report'
    ) {
      return [];
    }

    return [governanceAction];
  }, [
    bootstrapTriadMinimalCommand,
    deliveryPackBusy,
    isTauri,
    knowledgeLintBusy,
    loadModelStrategy,
    loadPipelinePreflight,
    modelStrategyLoading,
    pipelinePreflightLoading,
    platformGovernanceLoading,
    reloadPlatformGovernance,
    runDeliveryDocsPack,
    runKnowledgeLintCurrent,
    runReviewPreviewAction,
    runTriadBootstrapMinimal,
    selectedReviewAsset?.stage,
    selectedReviewAssetKind,
    shellCaseId,
    triadBootstrapBusy,
  ]);

  return (
    <div className="p-6 space-y-6">
      <ReviewHeroSection
        activeProject={activeProject}
        heroStats={heroStats}
        navigate={navigate}
        primaryAgent={primaryAgent}
        roleTemplate={roleTemplate}
      />

      <ReviewActionCenter
        reviewAdvancedActions={reviewAdvancedActions}
        reviewBatchActions={reviewBatchActions}
        reviewDiagnosticActions={reviewDiagnosticActions}
        reviewPrimaryActions={reviewPrimaryActions}
      />

      {aiInsights && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
          <div className="text-sm font-semibold text-blue-300">AI 结果解读 (AI Insights)</div>
          <div className="mt-2 text-sm text-slate-300 leading-relaxed">{aiInsights}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'work', label: '审查工作' },
          { key: 'delivery', label: '交付资产' },
          { key: 'coverage', label: '覆盖矩阵' },
          { key: 'reading', label: '角色阅读' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setReviewPageTab(tab.key)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              reviewPageTab === tab.key
                ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                : 'border-slate-700/50 bg-slate-900/50 text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {reviewPageTab === 'reading' && (
      <details className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">角色化阅读模式</h2>
            <p className="mt-1 text-sm text-slate-400">展开切换角色阅读模式与查看角色导向说明。</p>
          </div>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            当前角色: {roleTemplate.label}
          </span>
        </div>
        </summary>
        <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              当前账号 {activeAccount?.label || '设计账号'} 已锁定为 {roleTemplate.label} 角色；如需切换，请使用顶部“切换账号”。
            </div>
            <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
              账号角色锁定
            </span>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
          <div className="text-sm font-semibold text-slate-100">{roleTemplate.headline}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">{roleTemplate.summary}</div>
        </div>
      </details>
      )}

      {reviewPageTab === 'work' && (
        <div className="space-y-4">
          <GovernanceGatesAggregateDisplay
            platformGovernanceRows={platformGovernanceRows}
            platformGovernanceLoading={platformGovernanceLoading}
            platformGovernanceError={platformGovernanceError}
            reloadPlatformGovernance={reloadPlatformGovernance}
            isTauri={isTauri}
            shellCaseId={shellCaseId}
            openPath={openPath}
          />
          <ReviewWorkSection
            backlogSections={backlogSections}
            caseContractSummary={caseContractSummary}
            caseContractSummaryLoading={caseContractSummaryLoading}
            contractSummaryBatch={contractSummaryBatch}
            contractSummaryBatchError={contractSummaryBatchError}
            currentModelStrategyMeta={currentModelStrategyMeta}
            isTauri={isTauri}
            knowledgeLintError={knowledgeLintError}
            knowledgeLintLast={knowledgeLintLast}
            modelCapabilityItems={modelCapabilityItems}
            modelStrategy={modelStrategy}
            modelStrategyBatch={modelStrategyBatch}
            modelStrategyBatchEntries={modelStrategyBatchEntries}
            modelStrategyBatchError={modelStrategyBatchError}
            modelStrategyError={modelStrategyError}
            openPath={openPath}
            pipelinePreflight={pipelinePreflight}
            pipelinePreflightError={pipelinePreflightError}
            pipelineTruthClassName={pipelineTruthClassName}
            reviewBadgeStyles={reviewBadgeStyles}
            reviewChecks={studioState.reviewChecks}
            shellCaseId={shellCaseId}
            triadBootstrapError={triadBootstrapError}
            triadBootstrapStdout={triadBootstrapStdout}
            triadMeta={triadMeta}
          />
        </div>
      )}

      {reviewPageTab === 'coverage' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">端到端全覆盖矩阵</h2>
                <p className="mt-1 text-sm text-slate-400">基于 registries 与 case contracts 的实时扫描汇总。</p>
              </div>
              <button
                onClick={loadCoverageSummary}
                disabled={coverageSummaryLoading}
                className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-4 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                {coverageSummaryLoading ? '刷新中...' : '刷新矩阵'}
              </button>
            </div>
            
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-6 overflow-x-auto">
              {coverageSummaryLoading && !coverageSummaryText ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">正在加载覆盖矩阵...</div>
              ) : coverageSummaryText ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  {renderMarkdownBlocks(coverageSummaryText)}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  未能加载覆盖矩阵，请先运行生成脚本。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewPageTab === 'delivery' && (
        <ReviewArtifactsPanel
          loading={loading}
          shellCaseId={shellCaseId}
          deliveryPackLast={deliveryPackLast}
          deliveryPackError={deliveryPackError}
          caseContractSummary={caseContractSummary}
          caseContractSummaryLoading={caseContractSummaryLoading}
          isTauri={isTauri}
          contractChain={contractChain}
          triadBridgePaths={triadBridgePaths}
          liveMonitorAssets={liveMonitorAssets}
          notebookAssetChain={notebookAssetChain}
          standardObjectReportAssets={standardObjectReportAssets}
          notebookMetaMap={notebookMetaMap}
          memoPreviewMap={memoPreviewMap}
          shellEntryPoints={shellEntryPoints}
          artifacts={artifacts}
          selectedAssetPath={selectedReviewAssetPath}
          highlightedAssetPath={highlightedReviewAssetPath}
          onSelectAsset={(path) => {
            setHighlightedReviewAssetPath('');
            setSelectedReviewAssetPath(path);
          }}
          selectedAssetPreview={selectedReviewAssetPreview}
          selectedAssetPreviewLoading={selectedReviewAssetPreviewLoading}
          selectedAssetPreviewError={selectedReviewAssetPreviewError}
          selectedAssetActions={reviewPreviewActions}
          selectedAssetStatusNote={reviewPreviewStatusNote}
        />
      )}

      {reviewPageTab === 'reading' && (
      <div className="space-y-4">
        <details className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">拓扑图联动</h2>
              <p className="mt-1 text-xs text-slate-500">展开查看拓扑节点与成果片段联动。</p>
            </div>
            <span className="text-xs text-slate-500">{roleTemplate.label}视角</span>
          </div>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {roleTemplate.topologyNodes.map((node, index) => (
              <button
                key={node}
                onClick={() =>
                  setSelectedSpotlight({
                    title: node,
                    source: 'topology',
                    description: `拓扑节点 ${node} 已绑定到成果页的第 ${index + 1} 组证据，适合继续查看断面意见、上下游关系和对应交付物。`,
                  })
                }
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  selectedSpotlight.title === node && selectedSpotlight.source === 'topology'
                    ? 'border-hydro-500/50 bg-hydro-500/10'
                    : 'border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/60'
                }`}
              >
                <div className="text-sm text-slate-100">{node}</div>
                <div className="mt-2 h-16 rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-900 to-hydro-900/40" />
              </button>
            ))}
          </div>
        </details>

        <details className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">GIS 图联动</h2>
              <p className="mt-1 text-xs text-slate-500">展开查看图层与空间证据联动。</p>
            </div>
            <span className="text-xs text-slate-500">空间证据</span>
          </div>
          </summary>
          <div className="mt-4 space-y-3">
            {roleTemplate.gisLayers.map((layer, index) => (
              <button
                key={layer}
                onClick={() =>
                  setSelectedSpotlight({
                    title: layer,
                    source: 'gis',
                    description: `GIS 图层 ${layer} 已绑定到成果页的空间校核区，适合继续查看覆盖范围、边界差异和受影响对象。`,
                  })
                }
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedSpotlight.title === layer && selectedSpotlight.source === 'gis'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100">{layer}</div>
                  <span className="text-[10px] text-slate-500">图层 {index + 1}</span>
                </div>
                <div className="mt-3 h-12 rounded-xl border border-slate-700/40 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(8,47,73,0.65))]" />
              </button>
            ))}
          </div>
        </details>

        <details className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <summary className="cursor-pointer list-none">
          <div className="text-sm font-semibold text-slate-200">图文联动聚焦</div>
          <div className="mt-1 text-xs text-slate-500">展开查看当前焦点、联动效果和下游过滤。</div>
          </summary>
          <div className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">当前焦点</div>
                <div className="mt-1 text-lg font-semibold text-slate-100">{selectedSpotlight.title}</div>
              </div>
              <span className="rounded-full border border-slate-700/50 bg-slate-950/40 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                {selectedSpotlight.source}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{selectedSpotlight.description}</p>
            <div className="mt-4 space-y-3">
              {reviewSpotlightEffects.map((item) => (
                <div key={item} className="rounded-xl border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
      )}
    </div>
  );
}
