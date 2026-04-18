import {
  CLAUDECODE_OFFICIAL_PLUGINS,
  CLAUDECODE_OFFICIAL_ROOT,
  CLAUDECODE_SOURCEMAP_SRC,
  CLAW_CODE_ROOT,
  getClaudecodeLineageDocRelPath,
} from '../config/claudecodeReference';
import {
  getHydrodeskAgenticIdePlatformPlanRelPath,
  getHydrodeskAgenticIdeRoadmapRelPath,
  getPluginRegistryYamlRelPath,
  getSkillRegistryYamlRelPath,
} from '../config/hydrodesk_commands';
import { extensionRoleSegments } from './roleProfiles';

export const extensionStatusClass = {
  enabled: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  draft: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

export const extensionGroups = [
  {
    title: 'Agent Packs',
    items: [
      { name: 'official.designer.agent', version: '0.1.0', status: 'enabled' },
      { name: 'official.dispatch.agent', version: '0.1.0', status: 'enabled' },
    ],
  },
  {
    title: 'Skill Packs',
    items: [
      { name: 'official.gis.validation', version: '0.1.0', status: 'enabled' },
      { name: 'team.review.bundle', version: '0.0.3', status: 'draft' },
    ],
  },
  {
    title: 'Workflow Packs',
    items: [
      { name: 'official.run_watershed_delineation', version: '1.0.0', status: 'enabled' },
      { name: 'official.generate_review_bundle', version: '1.0.0', status: 'enabled' },
    ],
  },
];

export const hostMatrix = [
  { title: 'Qwen Code', detail: '支持 DashScope 兼容模式与 Coding Plan 双服务，并可切换 Qwen3-Coder / Qwen3.6 系列模型。', state: '已配置' },
  { title: 'Codex / Max', detail: '用于高级编码、补全与对话式开发入口。', state: '可配置' },
  { title: 'VS Code 插件', detail: '用于承接熟悉的开发体验与编辑器生态。', state: '宿主预留' },
  { title: 'MCP Server', detail: '用于承接工具、资源、Prompt 与执行桥接。', state: '已接入' },
];

export const architectureLayers = [
  {
    key: 'workspace',
    title: 'Layer 0 · Workspace & Case',
    summary: '桌面壳、case=project、工作面路由与 Agent Runtime 状态；平台方案与路线图在此层落地入口。',
    hydrodeskPath: 'HydroDesk AgentRuntimeStatusPanel / StudioWorkspaceContext',
    referencePath: getHydrodeskAgenticIdePlatformPlanRelPath(),
    status: '进行中',
  },
  {
    key: 'mcp',
    title: 'Layer 1 · MCP Servers',
    summary: '给 AI 装上手，负责文件、命令、搜索、系统调用和外部桥接。',
    hydrodeskPath: 'Hydrology/mcp_server.py + HydroDesk tauri_bridge / main.rs',
    referencePath: CLAUDECODE_SOURCEMAP_SRC,
    status: '已接线',
  },
  {
    key: 'skills',
    title: 'Layer 2 · Skills',
    summary: '给 AI 注入做事方法，承接规划、审查、调试、测试与上下文策略。',
    hydrodeskPath: '.cursor/rules + contracts/README + shell knowledge lint',
    referencePath: `${CLAUDECODE_OFFICIAL_ROOT}/plugins`,
    status: '部分到位',
  },
  {
    key: 'plugins',
    title: 'Layer 3 · Plugins',
    summary: '扩展宿主能力，把 case shell、页面入口、命令工厂和桌面壳功能插件化。',
    hydrodeskPath: 'HydroDesk studioViews / Extensions / Tauri commands',
    referencePath: CLAUDECODE_OFFICIAL_PLUGINS,
    status: '在产品化',
  },
  {
    key: 'subagents',
    title: 'Layer 4 · Subagents',
    summary: '多角色分工与协同，把工程师、审查员、调度员、签发者拆成独立能力面。',
    hydrodeskPath: 'studioState.roleAgents + Hydrology/configs/agent_registry.yaml',
    referencePath: CLAW_CODE_ROOT,
    status: '已起壳',
  },
];

export const caseProjectPrinciples = [
  '每个 case 都是一个 project，不是一次性脚本目录。',
  'HydroDesk 是统一 IDE 壳，但不同角色看到的工作面、动作和结果模板不同。',
  'Hydrology 负责确定性 workflow 与 outcome contract，HydroDesk 负责项目中控、Agent 交互和审查签发。',
  'ClaudeCode 谱系主要作为工程方法参考，不是简单搬运 UI。',
];

export const roleSegments = extensionRoleSegments;

export const implementationPhases = [
  {
    key: 'phase1',
    title: 'Phase 1 · Agent Loop 驻留与桥接',
    items: ['挂接 claw-code / claudecode 后端通道', 'Agent Workspace 流式回显与工具调用状态', 'Scaffold / Manifest / Lint 首批 MCP 化'],
  },
  {
    key: 'phase2',
    title: 'Phase 2 · 角色 Context 与工程基因',
    items: ['把角色视角、manifest 基因、case summary 注入会话', 'Skill 按角色/行业动态装配', '让 case = project 形成统一模板层'],
  },
  {
    key: 'phase3',
    title: 'Phase 3 · 20 位涉水专家并行编排',
    items: ['打通 agent_registry.yaml 与子代理目录', '支持多人格会商、任务拆解、并发协同', '把 review / signoff 汇总给 Manager Agent'],
  },
];

export const extensionReferenceEntries = [
  { key: 'lineage-doc', label: '谱系文档', path: getClaudecodeLineageDocRelPath() },
  { key: 'platform-plan', label: '平台方案', path: getHydrodeskAgenticIdePlatformPlanRelPath() },
  { key: 'roadmap', label: 'Agentic 路线图', path: getHydrodeskAgenticIdeRoadmapRelPath() },
  { key: 'skill-registry', label: 'Skill Registry', path: getSkillRegistryYamlRelPath() },
  { key: 'plugin-registry', label: 'Plugin Registry', path: getPluginRegistryYamlRelPath() },
];

export const extensionWorkspaceEntries = [
  { label: 'Sourcemap Restored Src', path: CLAUDECODE_SOURCEMAP_SRC },
  { label: 'Official Plugins', path: CLAUDECODE_OFFICIAL_PLUGINS },
  { label: 'Official Root', path: CLAUDECODE_OFFICIAL_ROOT },
  { label: 'Claw / Harness', path: CLAW_CODE_ROOT },
];
