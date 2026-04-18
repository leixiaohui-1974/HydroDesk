/**
 * 工作区根相对路径与解释器由 Vite 环境变量覆盖（默认与 monorepo 布局一致）。
 * @see vite.config.js envPrefix: VITE_
 *
 * P1-3 产品安全：业务页应优先使用本文件的 `buildPythonScriptCommand` / `build*Command` 工厂生成整段命令；
 * Tauri `run_workspace_command` 在 Rust 侧另做轻量校验（禁止反引号与 $( 命令替换）。IDE 终端仍走同一 IPC，
 * 请勿在用户输入中拼接未转义片段。
 */

import rolloutGen from './playwrightRollout.generated.json' with { type: 'json' };

const DEFAULT_PYTHON = 'python3';
const DEFAULT_NL_GATEWAY = 'Hydrology/workflows/nl_mcp_gateway.py';
const DEFAULT_HYDRODESK_E2E_ACTIONS = 'Hydrology/workflows/hydrodesk_e2e_actions.py';
const DEFAULT_RUN_CASE_PIPELINE = 'Hydrology/workflows/run_case_pipeline.py';
const DEFAULT_BUILD_REVIEW_BUNDLE = 'Hydrology/workflows/build_review_bundle.py';
const DEFAULT_BUILD_RELEASE_MANIFEST = 'Hydrology/workflows/build_release_manifest.py';
const DEFAULT_HYDRODESK_FUSION_PLAN_DOC = 'HydroDesk/docs/hydrodesk-e2e-fusion-plan.md';
const DEFAULT_ROLLOUT_E2E_LOOP_SCRIPT = 'Hydrology/scripts/run_hydrodesk_rollout_e2e_loop.py';
const DEFAULT_AUTONOMOUS_WATERNET_E2E_LOOP_CONFIG =
  'Hydrology/configs/hydrodesk_autonomous_waternet_e2e_loop.yaml';
const DEFAULT_HYDRODESK_AGENT_STACK_CONFIG = 'Hydrology/configs/hydrodesk_agent_stack.json';
const DEFAULT_MCP_SERVER_SCRIPT = 'Hydrology/mcp_server.py';
const DEFAULT_AGENT_LOOP_GATEWAY_SCRIPT = 'Hydrology/workflows/agent_loop_gateway.py';
const DEFAULT_AGENTIC_IDE_PLATFORM_PLAN_DOC = 'HydroDesk/docs/hydrodesk-agentic-ide-platform-plan.md';
const DEFAULT_AGENTIC_IDE_ROADMAP_DOC = 'HydroDesk/docs/hydrodesk-agentic-ide-roadmap.md';
const DEFAULT_SKILL_REGISTRY_YAML = 'Hydrology/configs/skill_registry.yaml';
const DEFAULT_PLUGIN_REGISTRY_YAML = 'Hydrology/configs/plugin_registry.yaml';
const DEFAULT_AGENT_REGISTRY_YAML = 'Hydrology/configs/agent_registry.yaml';
const DEFAULT_EXPORT_AUTONOMOUS_WATERNET_QUALITY_RUBRIC_SCRIPT =
  'Hydrology/scripts/export_autonomous_waternet_quality_rubric.py';
const DEFAULT_CHECK_CASE_QUALITY_ARTIFACTS_SCRIPT =
  'Hydrology/scripts/check_case_quality_artifacts.py';
const DEFAULT_SCAFFOLD_NEW_CASE_SCRIPT = 'Hydrology/scripts/scaffold_new_case.py';
const DEFAULT_EXPORT_CASE_WORKFLOW_FEASIBILITY_SCRIPT =
  'Hydrology/scripts/export_case_workflow_feasibility.py';
const DEFAULT_EXPORT_CASE_PLATFORM_READINESS_SCRIPT =
  'Hydrology/scripts/export_case_platform_readiness.py';
const DEFAULT_EXPORT_CASE_MODELING_HINTS_SCRIPT =
  'Hydrology/scripts/export_case_modeling_hints.py';
const DEFAULT_EXPORT_CASE_MODEL_STRATEGY_SCRIPT =
  'Hydrology/scripts/export_case_model_strategy.py';
const DEFAULT_EXPORT_CASE_DATA_INTELLIGENCE_SCRIPT =
  'Hydrology/scripts/export_case_data_intelligence.py';
const DEFAULT_EXPORT_ROLLOUT_READINESS_BASELINE_SCRIPT =
  'Hydrology/scripts/export_rollout_readiness_baseline.py';
const DEFAULT_IMPORT_CASE_SOURCEBUNDLE_SCRIPT =
  'Hydrology/scripts/import_case_sourcebundle.py';
const DEFAULT_BOOTSTRAP_CASE_TRIAD_MINIMAL_SCRIPT = 'Hydrology/scripts/bootstrap_case_triad_minimal.py';
const DEFAULT_LINT_CASE_KNOWLEDGE_LINKS_SCRIPT = 'Hydrology/scripts/lint_case_knowledge_links.py';
const DEFAULT_RUN_GRAPHIFY_CASE_SIDECAR_SCRIPT = 'scripts/run_graphify_case_sidecar.py';
const DEFAULT_RUN_SOURCE_SYNC_SCRIPT = 'Hydrology/workflows/run_source_sync.py';

/**
 * 与闭环 YAML case_selection 同步的 rollout case id（见 playwrightRollout.generated.json，由 export_playwright_rollout_registry.py 生成）。
 * 同文件另有 full_spatial_hydro_evidence_case_ids、default_active_case_id，供 studioState / caseShellPresets 使用。
 */
export const HYDRODESK_ROLLOUT_CASE_IDS = Object.freeze([...rolloutGen.case_ids]);
export const HYDRODESK_SIX_CASE_WORKFLOW_IDS = HYDRODESK_ROLLOUT_CASE_IDS;

/** POSIX sh 单引号包裹（适用于 Tauri `sh -lc`）。 */
export function shellSingleQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

export function getPythonBin() {
  return import.meta.env?.VITE_PYTHON_BIN || DEFAULT_PYTHON;
}

export function getNlMcpGatewayScriptRelPath() {
  return import.meta.env?.VITE_NL_MCP_GATEWAY_SCRIPT || DEFAULT_NL_GATEWAY;
}

export function getHydrodeskE2eActionsScriptRelPath() {
  return import.meta.env?.VITE_HYDRODESK_E2E_ACTIONS_SCRIPT || DEFAULT_HYDRODESK_E2E_ACTIONS;
}

/** case shell 入口脚本路径，与 `open_path` / `run_workspace_command` 一致，可由 VITE_* 覆盖 */
export function getRunCasePipelineScriptRelPath() {
  return import.meta.env?.VITE_RUN_CASE_PIPELINE_SCRIPT || DEFAULT_RUN_CASE_PIPELINE;
}

export function getBuildReviewBundleScriptRelPath() {
  return import.meta.env?.VITE_BUILD_REVIEW_BUNDLE_SCRIPT || DEFAULT_BUILD_REVIEW_BUNDLE;
}

export function getBuildReleaseManifestScriptRelPath() {
  return import.meta.env?.VITE_BUILD_RELEASE_MANIFEST_SCRIPT || DEFAULT_BUILD_RELEASE_MANIFEST;
}

export function getImportCaseSourcebundleScriptRelPath() {
  return import.meta.env?.VITE_IMPORT_CASE_SOURCEBUNDLE_SCRIPT || DEFAULT_IMPORT_CASE_SOURCEBUNDLE_SCRIPT;
}

/** HydroDesk 融合计划文档（相对仓库根） */
export function getHydrodeskFusionPlanDocRelPath() {
  return import.meta.env?.VITE_HYDRODESK_FUSION_PLAN_DOC || DEFAULT_HYDRODESK_FUSION_PLAN_DOC;
}

/** 通用自主运行水网建模 Agent 平台 · HydroDesk 端到端闭环主配置（相对仓库根） */
export function getAutonomousWaternetE2eLoopConfigRelPath() {
  return (
    import.meta.env?.VITE_AUTONOMOUS_WATERNET_E2E_LOOP_CONFIG || DEFAULT_AUTONOMOUS_WATERNET_E2E_LOOP_CONFIG
  );
}

/** Agent 栈与 claudecode 对照配置（JSON，相对仓库根） */
export function getHydrodeskAgentStackConfigRelPath() {
  return import.meta.env?.VITE_HYDRODESK_AGENT_STACK_CONFIG || DEFAULT_HYDRODESK_AGENT_STACK_CONFIG;
}

/** Hydrology MCP 入口（相对仓库根） */
export function getMcpServerScriptRelPath() {
  return import.meta.env?.VITE_MCP_SERVER_SCRIPT || DEFAULT_MCP_SERVER_SCRIPT;
}

/** Agent Loop NDJSON 网关（相对仓库根） */
export function getAgentLoopGatewayScriptRelPath() {
  return import.meta.env?.VITE_AGENT_LOOP_GATEWAY_SCRIPT || DEFAULT_AGENT_LOOP_GATEWAY_SCRIPT;
}

/** Agentic IDE 平台化方案文档（相对仓库根） */
export function getHydrodeskAgenticIdePlatformPlanRelPath() {
  return import.meta.env?.VITE_HYDRODESK_AGENTIC_IDE_PLATFORM_PLAN || DEFAULT_AGENTIC_IDE_PLATFORM_PLAN_DOC;
}

/** Agentic IDE 路线图（相对仓库根） */
export function getHydrodeskAgenticIdeRoadmapRelPath() {
  return import.meta.env?.VITE_HYDRODESK_AGENTIC_IDE_ROADMAP || DEFAULT_AGENTIC_IDE_ROADMAP_DOC;
}

/** Skills 注册表占位（Phase 3，相对仓库根） */
export function getSkillRegistryYamlRelPath() {
  return import.meta.env?.VITE_SKILL_REGISTRY_YAML || DEFAULT_SKILL_REGISTRY_YAML;
}

/** Plugins 注册表（Phase 3，相对仓库根） */
export function getPluginRegistryYamlRelPath() {
  return import.meta.env?.VITE_PLUGIN_REGISTRY_YAML || DEFAULT_PLUGIN_REGISTRY_YAML;
}

/** 20 Agent 注册表（相对仓库根） */
export function getAgentRegistryYamlRelPath() {
  return import.meta.env?.VITE_AGENT_REGISTRY_YAML || DEFAULT_AGENT_REGISTRY_YAML;
}

export function getRunGraphifyCaseSidecarScriptRelPath() {
  return import.meta.env?.VITE_RUN_GRAPHIFY_CASE_SIDECAR_SCRIPT || DEFAULT_RUN_GRAPHIFY_CASE_SIDECAR_SCRIPT;
}

export function getRunSourceSyncScriptRelPath() {
  return import.meta.env?.VITE_RUN_SOURCE_SYNC_SCRIPT || DEFAULT_RUN_SOURCE_SYNC_SCRIPT;
}

export function getExportCaseDataIntelligenceScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_CASE_DATA_INTELLIGENCE_SCRIPT ||
    DEFAULT_EXPORT_CASE_DATA_INTELLIGENCE_SCRIPT
  );
}

export function getHydrodeskRolloutE2eLoopScriptRelPath() {
  return import.meta.env?.VITE_HYDRODESK_SIX_CASE_E2E_LOOP_SCRIPT || DEFAULT_ROLLOUT_E2E_LOOP_SCRIPT;
}

export function getHydrodeskSixCaseE2eLoopScriptRelPath() {
  return getHydrodeskRolloutE2eLoopScriptRelPath();
}

/**
 * 端到端闭环编排（dry-run / --list-cases / 实跑）；cwd 为仓库根。默认读 autonomous 主配置。
 * @param {string[]} argv 如 --dry-run、--case-id <case_id>、--config Hydrology/configs/hydrodesk_autonomous_waternet_e2e_loop.yaml
 */
export function buildHydrodeskRolloutE2eLoopCommand(argv = []) {
  return buildPythonScriptCommand(getHydrodeskRolloutE2eLoopScriptRelPath(), argv);
}

export function buildHydrodeskSixCaseE2eLoopCommand(argv = []) {
  return buildHydrodeskRolloutE2eLoopCommand(argv);
}

export function getExportAutonomousWaternetQualityRubricScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_AUTONOMOUS_WATERNET_QUALITY_RUBRIC_SCRIPT ||
    DEFAULT_EXPORT_AUTONOMOUS_WATERNET_QUALITY_RUBRIC_SCRIPT
  );
}

/**
 * 导出主 YAML 中 platform + quality_loop（stdout 单行 JSON）。
 * @param {string[]} argv 追加参数
 */
export function buildExportAutonomousWaternetQualityRubricCommand(argv = []) {
  return buildPythonScriptCommand(getExportAutonomousWaternetQualityRubricScriptRelPath(), [
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    ...argv,
  ]);
}

/** 脚本 stdout 中单行 JSON 或首行 `{...}` 对象 */
export function parseSingleObjectJsonStdout(stdout) {
  if (stdout == null || typeof stdout !== 'string') return null;
  const t = stdout.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    for (const raw of stdout.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line[0] !== '{') continue;
      try {
        return JSON.parse(line);
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * 解析 export_autonomous_waternet_quality_rubric.py 的 stdout（整段或首行 JSON）。
 * @param {string | undefined | null} stdout
 * @returns {object | null}
 */
export function parseQualityRubricExportStdout(stdout) {
  return parseSingleObjectJsonStdout(stdout);
}

export function getCheckCaseQualityArtifactsScriptRelPath() {
  return (
    import.meta.env?.VITE_CHECK_CASE_QUALITY_ARTIFACTS_SCRIPT || DEFAULT_CHECK_CASE_QUALITY_ARTIFACTS_SCRIPT
  );
}

/**
 * 对照 quality_loop artifact_hints 检查当前案例 contracts 产物覆盖。
 * @param {string} caseId
 * @param {string[]} argv 追加参数
 */
export function buildCheckCaseQualityArtifactsCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getCheckCaseQualityArtifactsScriptRelPath(), [
    '--case-id',
    String(caseId),
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    ...argv,
  ]);
}

/** 按主配置 case_selection 批量检查各案例 contracts 产物覆盖（stdout 单行 JSON）。 */
export function buildBatchCheckCaseQualityArtifactsCommand(argv = []) {
  return buildPythonScriptCommand(getCheckCaseQualityArtifactsScriptRelPath(), [
    '--batch',
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    ...argv,
  ]);
}

export function getScaffoldNewCaseScriptRelPath() {
  return import.meta.env?.VITE_SCAFFOLD_NEW_CASE_SCRIPT || DEFAULT_SCAFFOLD_NEW_CASE_SCRIPT;
}

/**
 * 创建 cases/&lt;case_id&gt;/ 骨架与 Hydrology 配置；可选注册进主闭环 YAML。
 * @param {{ caseId: string, displayName: string, projectType?: string, registerLoop?: boolean, dryRun?: boolean }} opts
 */
export function buildScaffoldNewCaseCommand(opts) {
  const {
    caseId,
    displayName,
    projectType = 'canal',
    registerLoop = false,
    dryRun = false,
  } = opts || {};
  const argv = [
    '--case-id',
    String(caseId),
    '--display-name',
    String(displayName),
    '--project-type',
    String(projectType),
  ];
  if (registerLoop) argv.push('--register-loop');
  if (dryRun) argv.push('--dry-run');
  return buildPythonScriptCommand(getScaffoldNewCaseScriptRelPath(), argv);
}

export function getExportCaseWorkflowFeasibilityScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_CASE_WORKFLOW_FEASIBILITY_SCRIPT ||
    DEFAULT_EXPORT_CASE_WORKFLOW_FEASIBILITY_SCRIPT
  );
}

/** 当前案例：注册表 × 数据信号 × workflow_feasibility_rules.yaml（stdout 单行 JSON）。 */
export function buildExportCaseWorkflowFeasibilityCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getExportCaseWorkflowFeasibilityScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

export function getExportCasePlatformReadinessScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_CASE_PLATFORM_READINESS_SCRIPT ||
    DEFAULT_EXPORT_CASE_PLATFORM_READINESS_SCRIPT
  );
}

export function getExportCaseModelingHintsScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_CASE_MODELING_HINTS_SCRIPT ||
    DEFAULT_EXPORT_CASE_MODELING_HINTS_SCRIPT
  );
}

export function getExportCaseModelStrategyScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_CASE_MODEL_STRATEGY_SCRIPT ||
    DEFAULT_EXPORT_CASE_MODEL_STRATEGY_SCRIPT
  );
}

export function getExportRolloutReadinessBaselineScriptRelPath() {
  return (
    import.meta.env?.VITE_EXPORT_ROLLOUT_READINESS_BASELINE_SCRIPT ||
    DEFAULT_EXPORT_ROLLOUT_READINESS_BASELINE_SCRIPT
  );
}

export function getBootstrapCaseTriadMinimalScriptRelPath() {
  return (
    import.meta.env?.VITE_BOOTSTRAP_CASE_TRIAD_MINIMAL_SCRIPT ||
    DEFAULT_BOOTSTRAP_CASE_TRIAD_MINIMAL_SCRIPT
  );
}

/**
 * 为缺 triad 的案例写入最小占位 JSON（`--apply` 才写入；默认与 dry-run 一致需自行传参）。
 * @param {string[]} argv 如 ['--apply','--from-loop'] 或 ['--apply','--case-id','<case_id>']
 */
export function buildBootstrapCaseTriadMinimalCommand(argv = []) {
  return buildPythonScriptCommand(getBootstrapCaseTriadMinimalScriptRelPath(), argv);
}

export function buildRunGraphifyCaseSidecarCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getRunGraphifyCaseSidecarScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

export function buildRunSourceSyncCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getRunSourceSyncScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

export function getLintCaseKnowledgeLinksScriptRelPath() {
  return (
    import.meta.env?.VITE_LINT_CASE_KNOWLEDGE_LINKS_SCRIPT || DEFAULT_LINT_CASE_KNOWLEDGE_LINKS_SCRIPT
  );
}

/**
 * 案例知识壳层 lint（required_paths + Markdown 相对链接）；读 hydrodesk_shell.knowledge_lint。
 * @param {string[]} argv 如 ['--batch'] 或 ['--case-id', id, '--config', path]
 */
export function buildLintCaseKnowledgeLinksCommand(argv = []) {
  return buildPythonScriptCommand(getLintCaseKnowledgeLinksScriptRelPath(), argv);
}

/** 单案例：quality_loop + 产物覆盖 + 工作流可行性（stdout 单行 JSON）。 */
export function buildExportCasePlatformReadinessCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getExportCasePlatformReadinessScriptRelPath(), [
    '--case-id',
    String(caseId),
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    ...argv,
  ]);
}

/** 当前案例：基于现有真相判断“现在该建什么模型”。 */
export function buildExportCaseModelStrategyCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getExportCaseModelStrategyScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

/** 批量：配置内全部案例的模型判型。 */
export function buildExportCaseModelStrategyBatchCommand(argv = []) {
  return buildPythonScriptCommand(getExportCaseModelStrategyScriptRelPath(), [
    '--batch',
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    ...argv,
  ]);
}

/** 批量：rollout readiness baseline（`--stdout` 时返回完整 JSON）。 */
export function buildExportRolloutReadinessBaselineCommand(argv = []) {
  return buildPythonScriptCommand(getExportRolloutReadinessBaselineScriptRelPath(), [
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    ...argv,
  ]);
}

export function buildExportCaseModelingHintsCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getExportCaseModelingHintsScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

/** 当前案例：统一资产画像 + 真实性风险 + 双向工作流规划 + 改模建议。 */
export function buildExportCaseDataIntelligenceCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getExportCaseDataIntelligenceScriptRelPath(), [
    '--case-id',
    String(caseId),
    '--write-latest',
    ...argv,
  ]);
}

/** 批量：主闭环 YAML 六案例的数据智能规划摘要。 */
export function buildExportCaseDataIntelligenceBatchCommand(argv = []) {
  return buildPythonScriptCommand(getExportCaseDataIntelligenceScriptRelPath(), [
    '--config',
    getAutonomousWaternetE2eLoopConfigRelPath(),
    '--write-latest',
    ...argv,
  ]);
}

export function buildImportCaseSourcebundleCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getImportCaseSourcebundleScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

/**
 * `python <scriptRelPath>` + argv，每项经 `shellSingleQuote`（Tauri `sh -lc`）。
 * @param {string} scriptRelPath
 * @param {string[]} argv
 */
export function buildPythonScriptCommand(scriptRelPath, argv = []) {
  const py = shellSingleQuote(getPythonBin());
  const script = shellSingleQuote(scriptRelPath);
  const tail = argv.map((a) => shellSingleQuote(String(a))).join(' ');
  return tail ? `${py} ${script} ${tail}` : `${py} ${script}`;
}

/**
 * workspace 级 rg 搜索命令构造器：统一参数转义，避免页面内联 shell 拼接。
 * @param {{ query: string, targets: string[], flags?: string[] }} options
 */
export function buildWorkspaceRgSearchCommand(options = {}) {
  const { query, targets = [], flags = [] } = options;
  const rawQuery = String(query ?? '');
  if (!rawQuery.trim()) {
    throw new Error('workspace rg search: empty query');
  }

  const normalizedTargets = targets.map((target) => String(target ?? '').trim()).filter(Boolean);
  if (normalizedTargets.length === 0) {
    throw new Error('workspace rg search: missing targets');
  }

  const normalizedFlags = flags.map((flag) => String(flag ?? '').trim()).filter(Boolean);
  return [
    'rg',
    ...normalizedFlags.map((flag) => shellSingleQuote(flag)),
    shellSingleQuote(rawQuery),
    ...normalizedTargets.map((target) => shellSingleQuote(target)),
  ].join(' ');
}

/**
 * `run_case_pipeline.py --case-id <caseId>` + 额外 argv。
 * @param {string} caseId
 * @param {string[]} argv
 */
export function buildRunCasePipelineCommand(caseId, argv = []) {
  return buildPythonScriptCommand(getRunCasePipelineScriptRelPath(), [
    '--case-id',
    String(caseId),
    ...argv,
  ]);
}

export function buildRunCasePipelinePreflightCommand(caseId, phase = 'simulation', argv = []) {
  return buildRunCasePipelineCommand(caseId, ['--phase', String(phase), '--dry-run', ...argv]);
}

/**
 * hydrodesk_e2e_actions.py：固定 `--case-id` 在前，后接其它参数。
 * @param {string} caseId
 * @param {string[]} argv 不含 --case-id
 */
export function buildHydrodeskE2eActionsCommand(caseId, argv = []) {
  const script = getHydrodeskE2eActionsScriptRelPath();
  return buildPythonScriptCommand(script, ['--case-id', String(caseId), ...argv]);
}

/**
 * 生成在仓库根 cwd 下执行的 nl_mcp_gateway 命令（拓扑块在 stderr，主 JSON 在 stdout）。
 * @param {string} query
 */
export function buildNlMcpGatewayCommand(query) {
  const q = String(query ?? '').trim();
  if (!q) {
    throw new Error('nl_mcp_gateway: empty query');
  }
  const py = shellSingleQuote(getPythonBin());
  const script = shellSingleQuote(getNlMcpGatewayScriptRelPath());
  return `${py} ${script} --query ${shellSingleQuote(q)}`;
}

/**
 * 取 stdout 中首行可解析的 JSON（工作流 CLI 常见「一行 JSON + 日志」）。
 * @param {string | undefined | null} stdout
 * @returns {object | null}
 */
export function parseNlGatewayStdout(stdout) {
  if (stdout == null || typeof stdout !== 'string') return null;
  const trimmed = stdout.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through: may be logs + JSON */
    }
  }
  const lines = stdout.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || (line[0] !== '{' && line[0] !== '[')) continue;
    try {
      return JSON.parse(line);
    } catch {
      continue;
    }
  }
  return null;
}
