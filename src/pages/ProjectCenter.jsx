import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isTauri,
  openPath,
  openPathWithAlternates,
  readWorkspaceTextFile,
  revealPath,
  revealPathWithAlternates,
  runWorkspaceCommand,
  writeWorkspaceTextFile,
} from '../api/tauri_bridge';
import {
  getCaseReviewAssets,
  getCaseRunReviewReleaseContracts,
  getCaseShellEntryPoints,
  resolveShellCaseId,
  studioDeliveryWavePlan,
} from '../data/case_contract_shell';
import { getActiveRoleAgent, studioState } from '../data/studioState';
import { hydroPortfolioCatalog, primarySurfaceLabels } from '../data/projectPortfolio';
import { executionSurfaceCatalog } from '../data/workflowSurfaces';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { useDynamicCaseRegistry } from '../hooks/useDynamicCaseRegistry';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import {
  buildBatchCheckCaseQualityArtifactsCommand,
  buildCheckCaseQualityArtifactsCommand,
  buildExportAutonomousWaternetQualityRubricCommand,
  buildHydrodeskE2eActionsCommand,
  buildHydrodeskSixCaseE2eLoopCommand,
  buildScaffoldNewCaseCommand,
  buildExportCaseWorkflowFeasibilityCommand,
  buildExportCasePlatformReadinessCommand,
  buildBootstrapCaseTriadMinimalCommand,
  buildLintCaseKnowledgeLinksCommand,
  getAutonomousWaternetE2eLoopConfigRelPath,
  getHydrodeskAgenticIdePlatformPlanRelPath,
  getScaffoldNewCaseScriptRelPath,
  parseNlGatewayStdout,
  parseQualityRubricExportStdout,
  parseSingleObjectJsonStdout,
} from '../config/hydrodesk_commands';

function caseDefinitionRelPath(caseId, fileKind) {
  const cid = String(caseId ?? '').trim();
  if (!cid) return '';
  if (fileKind === 'hydrology') return `Hydrology/configs/${cid}.yaml`;
  if (fileKind === 'case_manifest') return `cases/${cid}/contracts/case_manifest.json`;
  return `cases/${cid}/manifest.yaml`;
}

const FEASIBILITY_TIER_LABELS = {
  no_case_config: '无 case YAML',
  registry_only: '注册表级（规则未覆盖）',
  data_ok: '数据信号 ∩ 规则',
  data_gap: '缺规则所需数据信号',
};

/** 与 Hydrology/scripts/scaffold_new_case.py CASE_ID_RE 一致：2–64 字符 */
const CASE_ID_SCAFFOLD_RE = /^[a-z][a-z0-9_]{1,63}$/;

const SIGNAL_LABELS = {
  case_config_file: 'case YAML',
  dem_file: 'DEM 文件',
  river_network_file: '河网文件',
  topology_files: '拓扑 JSON',
  sqlite_files: 'SQLite',
  case_manifest_file: 'case_manifest',
  source_bundle_file: 'source_bundle',
  scan_dirs_data: 'scan_dirs 有数据',
  contracts_dir: 'contracts 目录',
  hydrology_outputs_hint: '水文类 contracts 线索',
};

const statusStyles = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  review: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
  risk: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

export default function ProjectCenter() {
  const activeAgent = getActiveRoleAgent('/projects');
  const { cases: dynamicProjects, loading: projectsLoading, refresh: refreshCaseRegistry } = useDynamicCaseRegistry();
  const { activeProject, activeProjectId, setActiveProjectId } = useStudioWorkspace();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const { runtimeSnapshot, reload: reloadRuntime } = useStudioRuntime();
  const { checkpoints = [] } = useWorkflowExecution(activeProject.caseId, studioState.reports);
  const { summary: caseSummary, loading: caseSummaryLoading, reload: reloadCaseSummary } = useCaseContractSummary(activeProject.caseId);
  const gateLabel = caseSummary.gate_status === 'passed' ? '通过' : caseSummary.gate_status === 'blocked' ? '阻断' : '待更新';
  const gateClassName = caseSummary.gate_status === 'passed'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : caseSummary.gate_status === 'blocked'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  const contractChain = getCaseRunReviewReleaseContracts(shellCaseId);
  const reviewAssets = getCaseReviewAssets(shellCaseId);
  const shellEntryPoints = getCaseShellEntryPoints(shellCaseId);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState('');
  const [qualityRubric, setQualityRubric] = useState(null);
  const [qualityRubricError, setQualityRubricError] = useState('');
  const [qualityRubricLoading, setQualityRubricLoading] = useState(false);
  const [qualityCoverage, setQualityCoverage] = useState(null);
  const [qualityCoverageError, setQualityCoverageError] = useState('');
  const [qualityCoverageLoading, setQualityCoverageLoading] = useState(false);
  const [qualityBatch, setQualityBatch] = useState(null);
  const [qualityBatchError, setQualityBatchError] = useState('');
  const [qualityBatchLoading, setQualityBatchLoading] = useState(false);
  const [knowledgeLintBatch, setKnowledgeLintBatch] = useState(null);
  const [knowledgeLintCase, setKnowledgeLintCase] = useState(null);
  const [knowledgeLintBatchLoading, setKnowledgeLintBatchLoading] = useState(false);
  const [knowledgeLintCaseLoading, setKnowledgeLintCaseLoading] = useState(false);
  const [knowledgeLintError, setKnowledgeLintError] = useState('');
  const [feasibility, setFeasibility] = useState(null);
  const [feasibilityError, setFeasibilityError] = useState('');
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [readiness, setReadiness] = useState(null);
  const [readinessError, setReadinessError] = useState('');
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [showCaseScaffold, setShowCaseScaffold] = useState(false);
  const [scaffoldCaseId, setScaffoldCaseId] = useState('');
  const [scaffoldDisplayName, setScaffoldDisplayName] = useState('');
  const [scaffoldProjectType, setScaffoldProjectType] = useState('canal');
  const [scaffoldRegisterLoop, setScaffoldRegisterLoop] = useState(true);
  const [scaffoldBusy, setScaffoldBusy] = useState(false);
  const [scaffoldDryRunBusy, setScaffoldDryRunBusy] = useState(false);
  const [scaffoldDryRunPreview, setScaffoldDryRunPreview] = useState('');
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
  const parsedActionPayload = useMemo(
    () => parseNlGatewayStdout(actionResult?.stdout),
    [actionResult],
  );

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
      listCases: buildHydrodeskSixCaseE2eLoopCommand(['--list-cases']),
      dryRunAll: buildHydrodeskSixCaseE2eLoopCommand(['--dry-run', '--quiet']),
      dryRunCurrent: shellCaseId
        ? buildHydrodeskSixCaseE2eLoopCommand(['--dry-run', '--quiet', '--case-id', shellCaseId])
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
      reloadRuntime();
      reloadCaseSummary();
    } catch (error) {
      setActionError(error?.message || String(error));
    } finally {
      setActionBusy(false);
    }
  }, [reloadRuntime, reloadCaseSummary]);

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

  const runCaseScaffoldHealthScan = useCallback(async () => {
    if (!shellCaseId) return;
    setScaffoldHealthBusy(true);
    try {
      await loadPlatformReadiness(shellCaseId);
      await loadKnowledgeLintCase();
    } finally {
      setScaffoldHealthBusy(false);
    }
  }, [shellCaseId, loadPlatformReadiness, loadKnowledgeLintCase]);

  /** P1-2：案例变更后后台探测 loop dry-run，不阻塞保存/脚手架主流程 */
  const scheduleLoopDryRunForCase = useCallback((caseId) => {
    const cid = String(caseId || '').trim();
    if (!cid || !isTauri()) return;
    void (async () => {
      try {
        const cmd = buildHydrodeskSixCaseE2eLoopCommand([
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
        scheduleLoopDryRunForCase(newId);
        scheduleKnowledgeLintForCase(newId);
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

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">工作空间</div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{studioState.workspace.name}</div>
          <div className="mt-1 text-sm text-slate-400">统一承接工程、案例、会话和运行记录</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">当前角色</div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{activeAgent.name}</div>
          <div className="mt-1 text-sm text-slate-400">{activeAgent.summary}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">项目群</div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{hydroPortfolioCatalog.length} 个核心项目</div>
          <div className="mt-1 text-sm text-slate-400">覆盖建模、闭环、控制、验收、调度与契约层</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">案例 E2E Gate</div>
          <div className="mt-2 flex items-center gap-3">
            <span className={`rounded-full border px-2 py-1 text-[10px] ${gateClassName}`}>{gateLabel}</span>
            <span className="text-lg font-semibold text-slate-100">
              {caseSummaryLoading ? '读取中...' : `${caseSummary.outcomes_generated}/${caseSummary.total_executed || caseSummary.total}`}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {caseSummaryLoading
              ? '正在读取 contracts 摘要'
              : `证据 ${caseSummary.evidence_bound_count} · schema ${caseSummary.schema_valid_count} · timeout ${caseSummary.timeout}`}
          </div>
        </div>
      </div>

      <section
        data-testid="case-scaffold-guide"
        className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/15 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-sm font-semibold text-fuchsia-100">新案例工程引导（Agentic IDE · Phase 2）</h2>
            <div className="mt-1 text-xs leading-5 text-slate-400">
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
            <ol className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
              <li className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-3 py-2">
                <span className="font-medium text-slate-300">1 · 命名</span>
                <div className="mt-1">case_id：小写 a-z 开头，2–64 字符</div>
              </li>
              <li className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-3 py-2">
                <span className="font-medium text-slate-300">2 · 脚手架</span>
                <div className="mt-1">写入 manifest、contracts、Hydrology YAML；可选注册闭环</div>
              </li>
              <li className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-3 py-2">
                <span className="font-medium text-slate-300">3 · 编辑</span>
                <div className="mt-1">桌面端创建后自动打开 manifest 内联编辑</div>
              </li>
              <li className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-3 py-2">
                <span className="font-medium text-slate-300">4 · 验收</span>
                <div className="mt-1">合并就绪度（含可运行性摘要）+ 知识链接 Lint</div>
              </li>
            </ol>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
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
              {scaffoldHealthBusy ? '健康扫描中…' : '当前案例 · 一键健康扫描'}
            </button>
            <button
              type="button"
              onClick={() => openPath(getScaffoldNewCaseScriptRelPath())}
              className="text-left text-[11px] text-slate-500 underline decoration-slate-600 underline-offset-2"
            >
              打开 scaffold 脚本源码
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-500/25 bg-indigo-950/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-indigo-100">自主运行水网建模 Agent 平台 · 全案例闭环</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
              配置驱动编排：原始数据契约 → watershed / 建模链 → HydroDesk HTML 与 release；质量维度（流域、水文、水动力、辨识、同化、调度、控制、SIL/ODD、智能等级等）在 YAML
              <code className="mx-1 rounded bg-slate-900/80 px-1 text-[10px] text-slate-300">quality_loop</code>
              中定义，产物进各案例 contracts。增删案例改
              <code className="mx-1 rounded bg-slate-900/80 px-1 text-[10px] text-slate-300">case_selection</code>
              或切换 manifest 扫描即可，无需改编排脚本。
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => runCaseAction(platformLoopCommands.listCases)}
            className="rounded-lg border border-indigo-500/35 bg-indigo-500/15 px-3 py-1.5 text-[11px] text-indigo-200 disabled:opacity-50"
          >
            列出闭环案例（JSON）
          </button>
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => runCaseAction(platformLoopCommands.dryRunAll)}
            className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
          >
            Dry-run 全案例闭环
          </button>
          <button
            type="button"
            disabled={actionBusy || !platformLoopCommands.dryRunCurrent}
            onClick={() => runCaseAction(platformLoopCommands.dryRunCurrent)}
            className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
          >
            Dry-run 当前案例
          </button>
          <button
            type="button"
            onClick={() => openPath(getAutonomousWaternetE2eLoopConfigRelPath())}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300"
          >
            打开主配置 YAML
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => openPath(`cases/${shellCaseId}/manifest.yaml`)}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300 disabled:opacity-50"
          >
            编辑案例 manifest
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => openPath(`Hydrology/configs/${shellCaseId}.yaml`)}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300 disabled:opacity-50"
          >
            编辑 Hydrology 案例 YAML
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => openPath(`cases/${shellCaseId}/contracts/case_manifest.json`)}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300 disabled:opacity-50"
          >
            打开 case_manifest.json
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => openCaseEditor(shellCaseId)}
            className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/15 px-3 py-1.5 text-[11px] text-fuchsia-200 disabled:opacity-50"
          >
            HydroDesk 内编辑
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => openCaseEditor(shellCaseId, 'case_manifest')}
            className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] text-fuchsia-200 disabled:opacity-50"
          >
            内编辑契约 JSON
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => revealPath(`cases/${shellCaseId}`)}
            className="rounded-lg border border-slate-600/50 px-3 py-1.5 text-[11px] text-slate-300 disabled:opacity-50"
          >
            定位案例目录
          </button>
          <button
            type="button"
            disabled={!shellCaseId}
            onClick={() => revealPath(`cases/${shellCaseId}/contracts`)}
            className="rounded-lg border border-slate-600/50 px-3 py-1.5 text-[11px] text-slate-300 disabled:opacity-50"
          >
            定位 contracts
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCaseScaffold(true);
              setScaffoldError('');
              setScaffoldDryRunPreview('');
            }}
            className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/15 px-3 py-1.5 text-[11px] text-fuchsia-200"
          >
            新建案例骨架
          </button>
          <button
            type="button"
            disabled={qualityRubricLoading}
            onClick={() => loadQualityRubric()}
            className="rounded-lg border border-violet-500/35 bg-violet-500/15 px-3 py-1.5 text-[11px] text-violet-200 disabled:opacity-50"
          >
            {qualityRubricLoading ? '加载质量维度…' : '加载质量维度（评审清单）'}
          </button>
          <button
            type="button"
            disabled={qualityCoverageLoading || !shellCaseId}
            onClick={() => loadQualityCoverage()}
            className="rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-1.5 text-[11px] text-amber-200 disabled:opacity-50"
          >
            {qualityCoverageLoading ? '扫描产物…' : '检查当前案例产物覆盖'}
          </button>
          <button
            type="button"
            disabled={qualityBatchLoading}
            onClick={() => loadQualityBatch()}
            className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-[11px] text-cyan-200 disabled:opacity-50"
          >
            {qualityBatchLoading ? '批量扫描…' : '批量检查配置内全部案例'}
          </button>
          <button
            type="button"
            disabled={knowledgeLintBatchLoading}
            onClick={() => loadKnowledgeLintBatch()}
            className="rounded-lg border border-indigo-500/35 bg-indigo-500/15 px-3 py-1.5 text-[11px] text-indigo-200 disabled:opacity-50"
            title="hydrodesk_shell.knowledge_lint：必填路径 + README/contracts 内相对链接"
          >
            {knowledgeLintBatchLoading ? 'Lint 批量…' : '知识链接 Lint（批量）'}
          </button>
          <button
            type="button"
            disabled={knowledgeLintCaseLoading || !shellCaseId}
            onClick={() => loadKnowledgeLintCase()}
            className="rounded-lg border border-indigo-500/25 bg-slate-900/60 px-3 py-1.5 text-[11px] text-indigo-100/90 disabled:opacity-50"
            title="当前 shell 案例：同上，单案例"
          >
            {knowledgeLintCaseLoading ? 'Lint 当前…' : '知识链接 Lint（当前案例）'}
          </button>
          <button
            type="button"
            disabled={readinessLoading || !shellCaseId}
            onClick={() => loadPlatformReadiness()}
            className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-[11px] text-emerald-200 disabled:opacity-50"
          >
            {readinessLoading ? '合并中…' : '合并就绪度（评审摘要）'}
          </button>
          <button
            type="button"
            disabled={feasibilityLoading || !shellCaseId}
            onClick={() => loadWorkflowFeasibility()}
            className="rounded-lg border border-teal-500/35 bg-teal-500/15 px-3 py-1.5 text-[11px] text-teal-200 disabled:opacity-50"
          >
            {feasibilityLoading ? '计算中…' : '可运行性矩阵（仅注册表×数据）'}
          </button>
        </div>
        {qualityRubricError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {qualityRubricError}
          </div>
        )}
        {qualityRubric?.platform?.display_name_zh && (
          <div className="mt-3 text-xs text-slate-500">
            已加载 · {qualityRubric.platform.display_name_zh} · config {qualityRubric.config_path || '—'} · v
            {qualityRubric.version ?? '—'}
          </div>
        )}
        {Array.isArray(qualityRubric?.quality_loop?.dimensions) && qualityRubric.quality_loop.dimensions.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {qualityRubric.quality_loop.dimensions.map((dim) => (
              <div
                key={dim.key || dim.display_zh}
                className="rounded-xl border border-slate-700/50 bg-slate-950/50 px-3 py-2.5"
              >
                <div className="text-[11px] font-medium text-slate-200">{dim.display_zh || dim.key}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-600">{dim.key}</div>
                {Array.isArray(dim.metric_hints) && dim.metric_hints.length > 0 && (
                  <div className="mt-1.5 text-[10px] leading-4 text-slate-500">
                    指标：{dim.metric_hints.join(' · ')}
                  </div>
                )}
                {Array.isArray(dim.artifact_hints) && dim.artifact_hints.length > 0 && (
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    产物线索：{dim.artifact_hints.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {qualityCoverageError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {qualityCoverageError}
          </div>
        )}
        {qualityCoverage?.summary && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>
              产物覆盖（有 artifact_hints 的维度）：{qualityCoverage.summary.dimensions_satisfied}/
              {qualityCoverage.summary.dimensions_total} ·
              {Math.round((qualityCoverage.summary.ratio || 0) * 100)}%
            </span>
            <span className="text-slate-600">
              contracts 文件数 {qualityCoverage.contracts_file_count ?? '—'} · {qualityCoverage.contracts_dir}
            </span>
            {qualityCoverage.error === 'contracts_directory_missing' && (
              <span className="text-amber-400">contracts 目录不存在</span>
            )}
          </div>
        )}
        {Array.isArray(qualityCoverage?.dimension_checks) && qualityCoverage.dimension_checks.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {qualityCoverage.dimension_checks.map((row) => (
              <div
                key={row.key || row.display_zh}
                className="rounded-xl border border-slate-700/50 bg-slate-950/50 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[11px] font-medium text-slate-200">{row.display_zh || row.key}</div>
                  {row.skipped ? (
                    <span className="shrink-0 rounded border border-slate-600 px-1.5 py-0.5 text-[9px] text-slate-500">
                      无 hints
                    </span>
                  ) : row.satisfied ? (
                    <span className="shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">
                      已命中
                    </span>
                  ) : (
                    <span className="shrink-0 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-300">
                      未命中
                    </span>
                  )}
                </div>
                {!row.skipped && Array.isArray(row.matched_paths) && row.matched_paths.length > 0 && (
                  <div className="mt-1.5 text-[10px] leading-4 text-slate-500">
                    匹配：{row.matched_paths.slice(0, 4).join(' · ')}
                    {row.matched_paths.length > 4 ? ' …' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {qualityBatchError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {qualityBatchError}
          </div>
        )}
        {knowledgeLintError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {knowledgeLintError}
          </div>
        )}
        {knowledgeLintBatch?.rollup && (
          <div className="mt-4 rounded-xl border border-indigo-500/25 bg-slate-950/40 p-4">
            <div className="text-[11px] font-medium text-indigo-200">知识壳层 lint 汇总（Markdown 相对链接 + 必填路径）</div>
            <div className="mt-2 text-[10px] text-slate-500">
              {knowledgeLintBatch.config_path} · 案例 {knowledgeLintBatch.rollup.case_count} · 通过{' '}
              {knowledgeLintBatch.rollup.cases_ok} · 断链（相对）{knowledgeLintBatch.rollup.broken_relative_links ?? 0}
              {knowledgeLintBatch.ok === false ? (
                <span className="ml-2 text-rose-400">· 存在失败项</span>
              ) : (
                <span className="ml-2 text-emerald-500/80">· 全通过</span>
              )}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-[10px] text-slate-400">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-500">
                    <th className="py-1.5 pr-3 font-medium">case_id</th>
                    <th className="py-1.5 pr-3 font-medium">ok</th>
                    <th className="py-1.5 pr-3 font-medium">相对断链</th>
                    <th className="py-1.5 pr-3 font-medium">raw 目录</th>
                    <th className="py-1.5 font-medium">errors</th>
                  </tr>
                </thead>
                <tbody>
                  {(knowledgeLintBatch.cases || []).map((row) => (
                    <tr key={row.case_id} className="border-b border-slate-800/80">
                      <td className="py-1.5 pr-3 text-slate-200">{row.case_id}</td>
                      <td className="py-1.5 pr-3">{row.ok ? 'yes' : 'no'}</td>
                      <td className="py-1.5 pr-3">{row.broken_relative_link_count ?? 0}</td>
                      <td className="py-1.5 pr-3">{row.raw_dir_exists ? '有' : '无'}</td>
                      <td className="py-1.5 text-amber-200/80">
                        {(row.errors || []).length ? (row.errors || []).join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {knowledgeLintCase?.case_id && (
          <div className="mt-3 rounded-xl border border-indigo-500/20 bg-slate-950/35 p-3">
            <div className="text-[11px] font-medium text-indigo-200/90">知识壳层 lint · 当前案例</div>
            <div className="mt-1 text-[10px] text-slate-500">
              {knowledgeLintCase.case_id} · ok {knowledgeLintCase.ok ? 'yes' : 'no'} · 相对断链{' '}
              {knowledgeLintCase.broken_relative_link_count ?? 0} · raw{' '}
              {knowledgeLintCase.raw_dir_exists ? '有' : '无'}
            </div>
            {Array.isArray(knowledgeLintCase.errors) && knowledgeLintCase.errors.length > 0 && (
              <div className="mt-1 text-[10px] text-amber-200/90">{knowledgeLintCase.errors.join(' · ')}</div>
            )}
          </div>
        )}
        {qualityBatch?.rollup && (
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-slate-950/40 p-4">
            <div className="text-[11px] font-medium text-cyan-200">配置内全案例产物覆盖汇总</div>
            <div className="mt-2 text-[10px] text-slate-500">
              {qualityBatch.config_path} · 案例数 {qualityBatch.rollup.case_count} · 有 contracts 目录{' '}
              {qualityBatch.rollup.cases_with_contracts_dir} · 平均命中率{' '}
              {Math.round((qualityBatch.rollup.mean_ratio || 0) * 100)}% · 最低{' '}
              {Math.round((qualityBatch.rollup.min_ratio || 0) * 100)}%
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-[10px] text-slate-400">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-500">
                    <th className="py-1.5 pr-3 font-medium">case_id</th>
                    <th className="py-1.5 pr-3 font-medium">命中比</th>
                    <th className="py-1.5 pr-3 font-medium">维度</th>
                    <th className="py-1.5 font-medium">contracts 文件数</th>
                  </tr>
                </thead>
                <tbody>
                  {(qualityBatch.rollup.per_case || []).map((row) => (
                    <tr key={row.case_id} className="border-b border-slate-800/80">
                      <td className="py-1.5 pr-3 text-slate-200">{row.case_id}</td>
                      <td className="py-1.5 pr-3">
                        {row.error ? (
                          <span className="text-amber-400">无目录</span>
                        ) : (
                          `${Math.round((row.ratio || 0) * 100)}%`
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {row.error ? '—' : `${row.dimensions_satisfied}/${row.dimensions_total}`}
                      </td>
                      <td className="py-1.5">{row.contracts_file_count ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {readinessError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {readinessError}
          </div>
        )}
        {readiness?.summary && (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-4">
            <div className="text-[11px] font-medium text-emerald-200">
              平台就绪度摘要（主闭环 × 产物 × 工作流矩阵）
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              {readiness.platform_rubric?.platform?.display_name_zh || '—'} ·{' '}
              {readiness.generated_at || '—'}
            </div>
            {readiness.platform_rubric?.platform?.essence_zh && (
              <p className="mt-2 text-[11px] leading-5 text-slate-400 line-clamp-4">
                {readiness.platform_rubric.platform.essence_zh}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-300">
              <span>
                质量维度产物命中{' '}
                {readiness.summary.artifact_dimensions_satisfied ?? '—'}/
                {readiness.summary.artifact_dimensions_total ?? '—'}（
                {Math.round((readiness.summary.artifact_ratio || 0) * 100)}%）
              </span>
              <span className="text-slate-500">|</span>
              <span>
                工作流 data_ok {readiness.summary.workflow_data_ok ?? '—'} · data_gap{' '}
                {readiness.summary.workflow_data_gap ?? '—'}
              </span>
              <span className="text-slate-500">|</span>
              <span>
                case 配置信号 {readiness.summary.case_config_signal ? '有' : '无'}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-600">
              新案例仅增 YAML + 数据目录即可纳入同一套门禁；下方矩阵已随本摘要同步刷新。
            </div>
          </div>
        )}
        {feasibilityError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {feasibilityError}
          </div>
        )}
        {feasibility?.methodology_note_zh && (
          <div className="mt-4 rounded-xl border border-teal-500/20 bg-slate-950/50 p-4">
            <div className="text-[11px] font-medium text-teal-200">方法论（求交，非单一路径）</div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{feasibility.methodology_note_zh}</p>
            {feasibility.rules_path && (
              <div className="mt-2 text-[10px] text-slate-600">规则文件 {feasibility.rules_path}</div>
            )}
            {feasibility.signals && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(feasibility.signals).map(([k, v]) => (
                  <span
                    key={k}
                    className={`rounded border px-2 py-0.5 text-[10px] ${
                      v
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-700 bg-slate-900/80 text-slate-500'
                    }`}
                  >
                    {SIGNAL_LABELS[k] || k}:{v ? '有' : '无'}
                  </span>
                ))}
              </div>
            )}
            {Array.isArray(feasibility.workflows) && feasibility.workflows.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[10px] text-slate-400">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-500">
                      <th className="py-1.5 pr-2 font-medium">workflow</th>
                      <th className="py-1.5 pr-2 font-medium">就绪层级</th>
                      <th className="py-1.5 pr-2 font-medium">命中信号</th>
                      <th className="py-1.5 font-medium">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feasibility.workflows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-800/80">
                        <td className="py-1.5 pr-2 align-top font-mono text-slate-200">{row.key}</td>
                        <td className="py-1.5 pr-2 align-top text-slate-300">
                          {FEASIBILITY_TIER_LABELS[row.tier] || row.tier}
                        </td>
                        <td className="py-1.5 pr-2 align-top text-slate-500">
                          {Array.isArray(row.matched_signals) && row.matched_signals.length > 0
                            ? row.matched_signals.map((s) => SIGNAL_LABELS[s] || s).join(' · ')
                            : '—'}
                        </td>
                        <td className="py-1.5 align-top text-slate-500">
                          <span className="line-clamp-2" title={row.description}>
                            {row.rule_note_zh || row.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-[1.6fr,1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40">
          <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">工程与案例</h2>
              <p className="mt-1 text-xs text-slate-500">围绕当前项目阶段、案例与主链任务组织</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refreshCaseRegistry()}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/50"
              >
                刷新案例列表
              </button>
              <button
                type="button"
                className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
              >
                新建工程
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-700/40">
            {projectsLoading ? (
              <div className="px-5 py-4 text-sm text-slate-500">正在动态扫描工程目录...</div>
            ) : dynamicProjects.map((project) => (
              <div
                key={project.id}
                data-testid="case-row"
                data-case-id={project.caseId}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">{project.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {project.id} · {project.caseId} · 阶段 {project.stage}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2 py-1 text-[10px] ${statusStyles[project.status] || statusStyles.active}`}>
                    {project.status === 'active' ? '进行中' : project.status === 'review' ? '审查中' : '需关注'}
                  </span>
                  <button
                    onClick={() => setActiveProjectId(project.id)}
                    className={`text-xs ${activeProjectId === project.id ? 'text-emerald-300' : 'text-hydro-300'}`}
                  >
                    {activeProjectId === project.id ? '当前案例' : '切换'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProjectId(project.id);
                      openCaseEditor(project.caseId);
                    }}
                    className="text-xs text-slate-500 underline decoration-slate-600 decoration-dotted hover:text-fuchsia-300"
                  >
                    内编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">{shellCaseId || '当前案例'} 运行闭环</h2>
              <div className="mt-2 text-xs text-slate-500">
                当前 phase: {runtimeSnapshot.phase || '未检测到'} · 当前步骤: {runtimeSnapshot.current_step || '无'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={actionBusy}
                onClick={() => runCaseAction(actionCommands.runFast)}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 disabled:opacity-50"
              >
                Run Fast
              </button>
              <button
                disabled={actionBusy}
                onClick={() => runCaseAction(actionCommands.retryFailed)}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 disabled:opacity-50"
              >
                Retry Failed
              </button>
              <button
                onClick={() => {
                  reloadRuntime();
                  reloadCaseSummary();
                }}
                className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800/60"
              >
                刷新摘要
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={actionBusy}
              onClick={() => runCaseAction(actionCommands.refreshDashboard)}
              className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-200 disabled:opacity-50"
            >
              Refresh Dashboard
            </button>
            <button
              disabled={actionBusy}
              onClick={() => runCaseAction(actionCommands.runFullReview)}
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300 disabled:opacity-50"
            >
              Run Full Review
            </button>
            <button
              disabled={actionBusy}
              onClick={() => runCaseAction(actionCommands.buildReleasePack)}
              className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-300 disabled:opacity-50"
            >
              Build Release Pack
            </button>
            <button
              disabled={actionBusy}
              onClick={() => runCaseAction(actionCommands.generateDeliveryDocsPack)}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 disabled:opacity-50"
              title="contracts/delivery_pack/&lt;UTC&gt;/ + delivery_pack.latest.json"
            >
              Delivery Docs Pack
            </button>
            <button
              disabled={actionBusy}
              onClick={() => runCaseAction(actionCommands.generateDeliveryDocsPackStrict)}
              className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-2 py-1 text-[10px] text-emerald-200/80 disabled:opacity-50"
              title="须签发 Gate 与 knowledge_lint 通过"
            >
              Delivery Pack（严格）
            </button>
            <button
              disabled={actionBusy || !bootstrapTriadMinimalCommand}
              onClick={() => runCaseAction(bootstrapTriadMinimalCommand)}
              className="rounded-lg border border-slate-600/50 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
              title="双缺时写入最小 workflow_run / review_bundle / release_manifest 占位（带 _auto_generated）"
            >
              补最小 triad 占位
            </button>
            <button
              disabled={actionBusy}
              onClick={() => runCaseAction(runScadaReplayCommand)}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300 disabled:opacity-50"
            >
              Run SCADA Replay
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-700/30 pt-2 text-[10px] text-slate-500">
            <span className="text-slate-600">交付文档包</span>
            {caseSummaryLoading ? (
              <span className="text-slate-600">摘要读取中…</span>
            ) : caseSummary.delivery_pack_pointer_rel ? (
              <>
                <span className="font-mono text-slate-400">{caseSummary.delivery_pack_id || '—'}</span>
                <span
                  className={
                    caseSummary.delivery_pack_eligible_at_last_pack
                      ? 'text-emerald-400/90'
                      : 'text-amber-400/90'
                  }
                >
                  {caseSummary.delivery_pack_eligible_at_last_pack ? 'pack 时 eligible' : 'pack 时未 eligible'}
                </span>
                {caseSummary.delivery_latest_pack_rel ? (
                  <button
                    type="button"
                    disabled={!isTauri()}
                    onClick={() => openPath(caseSummary.delivery_latest_pack_rel)}
                    className="rounded border border-hydro-500/30 bg-hydro-500/10 px-2 py-0.5 text-hydro-300 disabled:opacity-50"
                  >
                    打开最新包
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!isTauri()}
                  onClick={() => openPath(caseSummary.delivery_pack_pointer_rel)}
                  className="rounded border border-slate-700/50 px-2 py-0.5 text-slate-300 disabled:opacity-50"
                >
                  指针 JSON
                </button>
                {caseSummary.delivery_latest_pack_rel ? (
                  <button
                    type="button"
                    disabled={!isTauri()}
                    onClick={() => revealPath(caseSummary.delivery_latest_pack_rel)}
                    className="rounded border border-slate-700/50 px-2 py-0.5 text-slate-300 disabled:opacity-50"
                  >
                    定位最新包
                  </button>
                ) : null}
              </>
            ) : (
              <span className="text-slate-600">尚无指针；点上方「Delivery Docs Pack」生成</span>
            )}
          </div>
          <div className="mt-3 rounded-lg border border-cyan-500/20 bg-slate-950/40 p-3">
            <div className="text-[10px] text-slate-500">
              SCADA 回放参数：scenario-id 留空则由 Hydrology 配置解析（defaults + 案例 scada_replay）；起止时间与 sqlite 留空同上
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[10px] text-slate-400">
                <span className="text-slate-500">scenario-id</span>
                <input
                  value={scadaScenarioId}
                  onChange={(e) => setScadaScenarioId(e.target.value)}
                  className="rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200"
                  placeholder="留空=配置默认（如 replay_baseline）"
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] text-slate-400">
                <span className="text-slate-500">sqlite 路径（相对仓库根，可选）</span>
                <input
                  value={scadaSqlitePath}
                  onChange={(e) => setScadaSqlitePath(e.target.value)}
                  className="rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200"
                  placeholder={shellCaseId ? `cases/${shellCaseId}/${shellCaseId}_hydromind.sqlite3` : 'cases/<case_id>/<case_id>_hydromind.sqlite3'}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] text-slate-400">
                <span className="text-slate-500">query-start（可选）</span>
                <input
                  value={scadaQueryStart}
                  onChange={(e) => setScadaQueryStart(e.target.value)}
                  className="rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200"
                  placeholder="2021-07-10 00:00:00"
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] text-slate-400">
                <span className="text-slate-500">query-end（可选）</span>
                <input
                  value={scadaQueryEnd}
                  onChange={(e) => setScadaQueryEnd(e.target.value)}
                  className="rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200"
                  placeholder="2021-07-13 00:00:00"
                />
              </label>
            </div>
          </div>
          {actionError && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {actionError}
            </div>
          )}
          {actionResult && (
            <div className="mt-3 rounded-lg border border-slate-700/40 bg-slate-950/60 px-3 py-2 text-[11px] leading-5 text-slate-400">
              <div>command: {actionResult.command}</div>
              <div>status: {actionResult.status} · success: {String(actionResult.success)}</div>
              <div className="mt-1 whitespace-pre-wrap">stdout: {(actionResult.stdout || '').slice(0, 260)}</div>
              <div className="mt-1 whitespace-pre-wrap">stderr: {(actionResult.stderr || '').slice(0, 160)}</div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">唯一执行 workflow</div>
              <div className="mt-2 text-xl font-semibold text-slate-100">{caseSummary.total_executed || '--'}</div>
              <div className="mt-1 text-xs text-slate-500">原始记录 {caseSummary.total || '--'} 条</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">Outcome Coverage</div>
              <div className="mt-2 text-xl font-semibold text-slate-100">
                {caseSummary.normalized_outcome_coverage ? `${Math.round(caseSummary.normalized_outcome_coverage * 100)}%` : '--'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                原始口径 {caseSummary.raw_outcome_coverage ? `${Math.round(caseSummary.raw_outcome_coverage * 100)}%` : '--'}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-200">SCADA Replay 实时面板</div>
              <span className="text-[10px] text-slate-500">
                {parsedActionPayload?.action === 'run-scada-replay' ? 'latest run loaded' : '等待回放任务'}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              run_id: {parsedActionPayload?.run_id || '--'} · scenario: {parsedActionPayload?.scenario_id || '--'} · messages:{' '}
              {parsedActionPayload?.messages_emitted ?? '--'}
              {parsedActionPayload?.cli_override ? ' · CLI 覆盖' : ''}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-slate-500">
              window: {parsedActionPayload?.query_start || '—'} → {parsedActionPayload?.query_end || '—'}
              <br />
              sqlite: {parsedActionPayload?.sqlite_path || '—'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => openPath(`cases/${shellCaseId}/contracts/scada_replay.latest.json`)}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300"
              >
                打开回放摘要
              </button>
              <button
                onClick={() => openPath(`cases/${shellCaseId}/contracts/scada_replay.stream.ndjson`)}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300"
              >
                打开实时消息流
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                title: '当前运行焦点',
                detail: caseSummary.current_workflow || runtimeSnapshot.current_focus || '当前没有活动 workflow，进入验收与回放阶段。',
              },
              {
                title: '重复执行提示',
                detail: caseSummary.duplicate_runs.length > 0
                  ? caseSummary.duplicate_runs.map((item) => `${item.workflow} ×${item.count}`).join('，')
                  : '没有检测到重复 workflow 记录。',
              },
              {
                title: '待处理项',
                detail: caseSummary.pending_workflows.length > 0
                  ? caseSummary.pending_workflows.join('，')
                  : '当前没有 pending workflows，可以转入交付/对齐阶段。',
              },
            ].map((run) => (
              <div key={run.title} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-200">{run.title}</div>
                  <span className="text-[10px] text-slate-500">{activeProject.caseId}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-400">{run.detail}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">项目群中控</h2>
            <p className="mt-1 text-xs text-slate-500">把端到端链路拆到真实项目：谁拥有 workflow、谁负责验收、谁是协议面。</p>
          </div>
          <span className="text-xs text-slate-500">HydroDesk 作为统一编排壳</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {hydroPortfolioCatalog.map((project) => (
            <div key={project.id} className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{project.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{project.path}</div>
                </div>
                <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                  {primarySurfaceLabels[project.primarySurface]}
                </span>
              </div>
              <div className="mt-3 text-sm text-slate-300">{project.role}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{project.summary}</div>
              <div className="mt-3 text-xs text-slate-400">目录: {project.directories.join(' · ')}</div>
              <div className="mt-2 text-xs text-slate-400">文件: {project.files.join(' · ')}</div>
              <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">
                {project.integrationNote}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Run / Review / Release 合同链</h2>
            <p className="mt-1 text-xs text-slate-500">把当前案例运行、审查和交付 contract 固定成 HydroDesk 可追踪的三段式链路。</p>
            <p className="mt-1 text-[10px] text-slate-600">
              统一签发 Gate（审查页 P2）：triad {caseSummaryLoading ? '…' : `${caseSummary.triad_count ?? 0}/3`}
              {caseSummary.release_gate_eligible ? ' · 无阻断项' : ' · 见审查页 blockers'}
              {caseSummary.delivery_pack_pointer_rel
                ? ` · 交付包 ${caseSummary.delivery_pack_id || 'latest'}`
                : ''}
            </p>
          </div>
          <span className="text-xs text-slate-500">hydromind-contracts aligned</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {contractChain.map((contract) => (
            <div key={contract.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">{contract.stage}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{contract.contractName}</div>
                </div>
                <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {contract.status}
                </span>
              </div>
              <div className="mt-3 text-xs leading-5 text-slate-400">{contract.note}</div>
              <div className="mt-3 text-[10px] leading-5 text-slate-500">{contract.path}</div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openPathWithAlternates(contract.pathAlternates || [contract.path])}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPathWithAlternates(contract.pathAlternates || [contract.path])}
                  className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                >
                  定位
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">验收资产面板</h2>
            <p className="mt-1 text-xs text-slate-500">`md/html/json` 是案例 E2E 的真实进度源，HydroDesk 用它们做产品化展示。</p>
          </div>
          <span className="text-xs text-slate-500">固定验收壳 · {shellCaseId}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {reviewAssets.map((artifact) => (
            <div key={artifact.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-100">{artifact.name}</div>
                <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {artifact.category}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{artifact.path}</div>
              <div className="mt-3 text-[10px] text-slate-500">updated_at {artifact.updated_at || 'pinned entry point'}</div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openPath(artifact.path)}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPath(artifact.path)}
                  className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                >
                  定位
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">后续开发任务</h2>
            <p className="mt-1 text-xs text-slate-500">围绕自主运行主链和 HydroDesk 端到端测试壳，按波次推进。</p>
          </div>
          <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
            roadmap / backlog 已对齐到 case shell
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {studioDeliveryWavePlan.map((wave) => (
            <div key={wave.title} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-sm font-semibold text-slate-100">{wave.title}</div>
              <div className="mt-3 space-y-2">
                {wave.items.map((item) => (
                  <div key={item} className="text-xs leading-5 text-slate-400">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-4">
          {shellEntryPoints.map((entryPoint) => (
            <div key={entryPoint.path} className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-slate-100">{entryPoint.title}</div>
                <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {entryPoint.kind}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-400">{entryPoint.summary}</div>
              <div className="mt-3 text-[10px] leading-5 text-slate-500">{entryPoint.path}</div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openPath(entryPoint.path)}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPath(entryPoint.path)}
                  className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                >
                  定位
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <h2 className="text-sm font-semibold text-slate-200">执行面分层</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {Object.entries(executionSurfaceCatalog).map(([surfaceId, surface]) => (
            <div key={surfaceId} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-sm font-medium text-slate-100">{surface.label}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{surface.summary}</div>
              <div className="mt-3 text-xs text-slate-400">{surface.whenToUse}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">最近 checkpoints</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{activeProject.caseId}</span>
            <button
              onClick={reloadRuntime}
              className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800/60"
            >
              刷新
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {checkpoints.slice(0, 6).map((checkpoint) => (
            <div key={checkpoint.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">{checkpoint.name}</div>
                {checkpoint.current && (
                  <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                    current
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-500">{checkpoint.path}</div>
            </div>
          ))}
        </div>
      </section>

      {showCaseEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-editor-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-600 bg-slate-900 shadow-xl">
            <div className="border-b border-slate-700/60 px-5 py-4">
              <h3 id="case-editor-title" className="text-sm font-semibold text-slate-100">
                编辑案例定义（配置驱动 · 不落硬编码）
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                可编辑 manifest、contracts/case_manifest.json、Hydrology 配置；保存即写回仓库。改显示名后请点「刷新案例列表」。
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-800/80 px-5 py-3">
              <label className="block min-w-[200px] text-[11px] text-slate-400">
                案例
                <select
                  value={editorCaseId}
                  onChange={(e) => {
                    setEditorCaseId(e.target.value);
                    setEditorDirty(false);
                    setEditorFetchKey((k) => k + 1);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
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
              <div className="flex gap-1 rounded-lg border border-slate-700/80 bg-slate-950/80 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditorFileKind('manifest');
                    setEditorDirty(false);
                  }}
                  className={`rounded-md px-3 py-1.5 text-[11px] ${
                    editorFileKind === 'manifest'
                      ? 'bg-fuchsia-500/20 text-fuchsia-200'
                      : 'text-slate-400 hover:text-slate-200'
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
                      : 'text-slate-400 hover:text-slate-200'
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
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  contracts/case_manifest.json
                </button>
              </div>
            </div>
            <div className="px-5 py-2 text-[10px] font-mono text-slate-500">
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
                <div className="py-12 text-center text-sm text-slate-500">正在读取文件…</div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    setEditorDirty(true);
                  }}
                  spellCheck={false}
                  className="h-[min(52vh,480px)] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-200"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-700/60 px-5 py-4">
              <button
                type="button"
                disabled={!caseDefinitionRelPath(editorCaseId, editorFileKind)}
                onClick={() =>
                  openPath(caseDefinitionRelPath(editorCaseId, editorFileKind))
                }
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50"
              >
                外部打开
              </button>
              <button
                type="button"
                disabled={editorLoading || !isTauri()}
                onClick={() => setEditorFetchKey((k) => k + 1)}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50"
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
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-xl">
            <h3 id="scaffold-title" className="text-sm font-semibold text-slate-100">
              新建案例骨架
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              写入仓库：manifest、最小 case_manifest.json、Hydrology 配置与 product_outputs 目录。桌面端创建成功后将自动打开 manifest
              内联编辑；亦可于下方列表「切换」该 case_id（与内置 proj-* 工程并存）。
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-[11px] text-slate-400">
                case_id（小写 a-z 开头）
                <input
                  value={scaffoldCaseId}
                  onChange={(e) => setScaffoldCaseId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="例如 my_river_basin"
                  autoComplete="off"
                />
                {scaffoldCaseId.trim() ? (
                  <div
                    className={`mt-1 text-[11px] ${scaffoldCaseIdOk ? 'text-emerald-400/90' : 'text-amber-300/90'}`}
                  >
                    {scaffoldCaseIdOk ? 'case_id 格式符合 scaffold 规则' : '须匹配 ^[a-z][a-z0-9_]{1,63}$（2–64 字符）'}
                  </div>
                ) : null}
              </label>
              <label className="block text-[11px] text-slate-400">
                显示名
                <input
                  value={scaffoldDisplayName}
                  onChange={(e) => setScaffoldDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="中文或英文案例名"
                  autoComplete="off"
                />
              </label>
              <label className="block text-[11px] text-slate-400">
                project_type
                <select
                  value={scaffoldProjectType}
                  onChange={(e) => setScaffoldProjectType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="canal">canal（渠系/管线）</option>
                  <option value="cascade_hydro">cascade_hydro（梯级水电）</option>
                  <option value="basin">basin（流域）</option>
                  <option value="generic">generic</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={scaffoldRegisterLoop}
                  onChange={(e) => setScaffoldRegisterLoop(e.target.checked)}
                  className="rounded border-slate-600"
                />
                同时写入主闭环 YAML 的 case_selection.case_ids（推荐）
              </label>
            </div>
            {scaffoldDryRunPreview ? (
              <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-slate-700/60 bg-slate-950/80 p-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Dry-run JSON</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-slate-400">{scaffoldDryRunPreview}</pre>
              </div>
            ) : null}
            {scaffoldError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {scaffoldError}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCaseScaffold(false)}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
              >
                取消
              </button>
              <button
                type="button"
                disabled={scaffoldDryRunBusy || !scaffoldFormReady}
                onClick={() => void runScaffoldDryRun()}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
              >
                {scaffoldDryRunBusy ? 'Dry-run…' : 'Dry-run 预览'}
              </button>
              <button
                type="button"
                disabled={scaffoldBusy || !scaffoldFormReady}
                onClick={() => runScaffoldNewCase()}
                className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-3 py-1.5 text-xs text-fuchsia-200 disabled:opacity-50"
              >
                {scaffoldBusy ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
