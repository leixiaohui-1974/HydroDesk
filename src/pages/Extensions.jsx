import { useEffect } from 'react';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';
import { useHydrodeskAgentStack } from '../hooks/useHydrodeskAgentStack';
import { useHydrodeskSkillRegistry } from '../hooks/useHydrodeskSkillRegistry';
import {
  CLAUDECODE_DIR,
  CLAUDECODE_OFFICIAL_PLUGINS,
  CLAUDECODE_OFFICIAL_ROOT,
  CLAUDECODE_SOURCEMAP_SRC,
  CLAW_CODE_ROOT,
  getClaudecodeLineageDocRelPath,
} from '../config/claudecodeReference';
import {
  getHydrodeskAgenticIdePlatformPlanRelPath,
  getHydrodeskAgenticIdeRoadmapRelPath,
  getSkillRegistryYamlRelPath,
} from '../config/hydrodesk_commands';
import { openPath, revealPath } from '../api/tauri_bridge';

const extensionGroups = [
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

const statusClass = {
  enabled: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  draft: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

const hostMatrix = [
  { title: 'Codex / Max', detail: '用于高级编码、补全与对话式开发入口。', state: '可配置' },
  { title: 'VS Code 插件', detail: '用于承接熟悉的开发体验与编辑器生态。', state: '宿主预留' },
  { title: 'MCP Server', detail: '用于承接工具、资源、Prompt 与执行桥接。', state: '已接入' },
];

const architectureLayers = [
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

const caseProjectPrinciples = [
  '每个 case 都是一个 project，不是一次性脚本目录。',
  'HydroDesk 是统一 IDE 壳，但不同角色看到的工作面、动作和结果模板不同。',
  'Hydrology 负责确定性 workflow 与 outcome contract，HydroDesk 负责项目中控、Agent 交互和审查签发。',
  'ClaudeCode 谱系主要作为工程方法参考，不是简单搬运 UI。',
];

const roleSegments = [
  {
    key: 'research',
    title: '科研人员',
    focus: '机理算法、数据同化、误差矩阵、率定与实验可追溯',
    surfaces: ['Agent', 'Notebook', 'Terminal'],
  },
  {
    key: 'design',
    title: '设计人员',
    focus: '工况方案、地形断面、图纸与工程可行性',
    surfaces: ['Project', 'Notebook', 'Review'],
  },
  {
    key: 'operations',
    title: '运行人员',
    focus: '预报、调度排期、报警流、MPC 与安全响应',
    surfaces: ['Agent', 'Monitor', 'Review'],
  },
  {
    key: 'education',
    title: '教育/学习者',
    focus: '引导式推演、步骤沙盘、知识壳与对标验证',
    surfaces: ['Notebook', 'Agent', 'Workbench'],
  },
];

const implementationPhases = [
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

export default function Extensions() {
  const { activeMode, activeProject } = useStudioWorkspace();
  const { openFile } = useTauri();
  const { stack: agentStack, configSource, loadError, reload } = useHydrodeskAgentStack();
  const {
    summary: skillRegSummary,
    loadError: skillRegError,
    loading: skillRegLoading,
    reload: reloadSkillReg,
    registryRelPath,
  } = useHydrodeskSkillRegistry();

  useEffect(() => {
    void reloadSkillReg();
  }, [reloadSkillReg]);

  async function handleImportManifest() {
    const picked = await openFile({
      title: '选择扩展清单',
      filters: [
        { name: 'Manifest', extensions: ['json', 'yaml', 'yml', 'toml'] },
      ],
    });
    if (!picked) {
      return;
    }
    window.alert(`已选择扩展清单：\n${picked}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">扩展中心</h1>
          <p className="mt-1 text-sm text-slate-400">统一管理 agent、skill、MCP、模型算法与 workflow 的注册、启停与校验</p>
          <div className="mt-3 inline-flex rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
            {activeMode === 'development' ? '开发模式已开放扩展宿主与打包入口' : '发布模式下该入口默认收起'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300">校验 schema</button>
          <button
            onClick={handleImportManifest}
            className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
          >
            导入清单
          </button>
          <button className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300">新建扩展</button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">ClaudeCode 风格四层架构</div>
            <div className="mt-1 text-xs text-slate-500">
              HydroDesk 正在把仓库内 `claudecode/` 的工程体系吸收成面向 case-project 的桌面 IDE：不是复制终端，而是把 MCP / Skills / Plugins / Subagents 四层真正落到产品壳。
            </div>
            <div className="mt-2 text-[11px] text-slate-600">
              Agent Stack 配置源：{configSource === 'file' ? 'Hydrology/configs/hydrodesk_agent_stack.json' : '内置默认'}
              {loadError ? ` · load error: ${loadError}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => reload()}
              className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
            >
              重载 Agent Stack
            </button>
            <button
              onClick={() => openPath(getClaudecodeLineageDocRelPath())}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
            >
              打开谱系文档
            </button>
            <button
              onClick={() => openPath(getHydrodeskAgenticIdePlatformPlanRelPath())}
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
            >
              平台方案
            </button>
            <button
              onClick={() => openPath(getHydrodeskAgenticIdeRoadmapRelPath())}
              className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
            >
              Agentic 路线图
            </button>
            <button
              onClick={() => revealPath(CLAUDECODE_DIR)}
              className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
            >
              定位 claudecode/
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {architectureLayers.map((layer) => (
            <div key={layer.key} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-100">{layer.title}</div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
                  {layer.status}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-400">{layer.summary}</div>
              <div className="mt-3 rounded-lg border border-slate-700/30 bg-slate-900/60 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">HydroDesk / 本仓映射</div>
                <div className="mt-2 text-xs text-slate-300">{layer.hydrodeskPath}</div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="truncate text-[11px] text-slate-500">{layer.referencePath}</div>
                <button
                  onClick={() => openPath(layer.referencePath)}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                >
                  打开参考
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">Skills Registry（Phase 3）</div>
            <div className="mt-1 text-xs text-slate-500">
              与平台方案 Phase 3 对齐的占位注册表；后续按角色与 manifest 装配 skill pack。桌面端自动读取摘要（无 js-yaml，仅轻量解析）。
            </div>
            <div className="mt-2 font-mono text-[11px] text-slate-600">{registryRelPath}</div>
            {skillRegSummary ? (
              <div className="mt-2 text-[11px] text-slate-400">
                已读摘要 · version {skillRegSummary.version} · skills 条目 {skillRegSummary.skillCount} · 约{' '}
                {skillRegSummary.rawLines} 行
              </div>
            ) : null}
            {skillRegError ? <div className="mt-2 text-[11px] text-amber-300/90">{skillRegError}</div> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={skillRegLoading}
              onClick={() => void reloadSkillReg()}
              className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
            >
              {skillRegLoading ? '读取中…' : '刷新摘要'}
            </button>
            <button
              type="button"
              onClick={() => openPath(getSkillRegistryYamlRelPath())}
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
            >
              打开
            </button>
            <button
              type="button"
              onClick={() => revealPath(getSkillRegistryYamlRelPath())}
              className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
            >
              定位
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr,0.8fr] gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="text-sm font-semibold text-slate-200">Case = Project</div>
          <div className="mt-2 text-xs leading-6 text-slate-500">
            当前 HydroDesk 的真实产品方向，不是做通用聊天客户端，而是做“每个 case 都是一个工程项目”的行业 IDE。当前激活项目是 {activeProject.name}，对应 case `{
              activeProject.caseId
            }`。
          </div>
          <div className="mt-4 space-y-2">
            {caseProjectPrinciples.map((item) => (
              <div key={item} className="rounded-xl border border-slate-700/40 bg-slate-950/40 px-3 py-3 text-xs text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="text-sm font-semibold text-slate-200">参考入口</div>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Sourcemap Restored Src', path: CLAUDECODE_SOURCEMAP_SRC },
              { label: 'Official Plugins', path: CLAUDECODE_OFFICIAL_PLUGINS },
              { label: 'Official Root', path: CLAUDECODE_OFFICIAL_ROOT },
              { label: 'Claw / Harness', path: CLAW_CODE_ROOT },
            ].map((entry) => (
              <div key={entry.path} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-200">{entry.label}</div>
                <div className="mt-1 text-[11px] text-slate-500">{entry.path}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => openPath(entry.path)}
                    className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                  >
                    打开
                  </button>
                  <button
                    onClick={() => revealPath(entry.path)}
                    className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                  >
                    定位
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr,1fr] gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="text-sm font-semibold text-slate-200">角色服务矩阵</div>
          <div className="mt-2 text-xs leading-6 text-slate-500">
            HydroDesk 不应只是“给开发者的 IDE”，而是给涉水领域多角色使用的 Agentic IDE。不同人群看到的工作面、技能注入和结果模板应该不同。
          </div>
          <div className="mt-4 space-y-3">
            {roleSegments.map((role) => (
              <div key={role.key} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-200">{role.title}</div>
                <div className="mt-1 text-xs text-slate-500">{role.focus}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.surfaces.map((surface) => (
                    <span
                      key={`${role.key}-${surface}`}
                      className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300"
                    >
                      {surface}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="text-sm font-semibold text-slate-200">实施路径（方案 A）</div>
          <div className="mt-2 text-xs leading-6 text-slate-500">
            当前建议继续走“深度利用本地 claudecode / claw-code 底座 + HydroDesk 前端桥接”的路线。先把 Agent Runtime 驻留，再做角色感知和多 Agent 编排。
          </div>
          <div className="mt-4 space-y-3">
            {implementationPhases.map((phase) => (
              <div key={phase.key} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-200">{phase.title}</div>
                <div className="mt-3 space-y-2">
                  {phase.items.map((item) => (
                    <div key={item} className="text-xs text-slate-400">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">Agent Stack Registry 视图</div>
            <div className="mt-1 text-xs text-slate-500">
              这里不是静态说明，而是后续真正的平台配置中控。当前先展示加载到的 Agent Stack 层信息，后续可继续扩成 skills registry、plugin permissions、subagent catalog。
            </div>
          </div>
          <div className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
            {agentStack?.version ? `stack v${agentStack.version}` : 'stack default'}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Object.entries(agentStack?.hydrodesk_layers || {}).map(([key, layer]) => (
            <div key={key} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-200">{layer?.label || key}</div>
              <div className="mt-1 text-xs text-slate-500">{layer?.hint || '—'}</div>
              <div className="mt-3 space-y-1">
                {(layer?.paths || []).map((item) => (
                  <div key={item} className="truncate rounded border border-slate-800/80 bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-400">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">已注册扩展</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">18</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">待校验</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">3</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">高权限扩展</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">2</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {hostMatrix.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-200">{item.title}</div>
              <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                {item.state}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="text-sm font-semibold text-slate-200">开发者工作区</div>
        <div className="mt-2 text-xs text-slate-500">
          当前根路径 {studioState.workspace.rootPath} · 开发模式下可继续接入真实插件宿主、订阅登录和本地安装链路。
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {extensionGroups.map((group) => (
          <section key={group.title} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
            <h2 className="text-sm font-semibold text-slate-200">{group.title}</h2>
            <div className="mt-4 space-y-3">
              {group.items.map((item) => (
                <div key={item.name} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                  <div className="text-sm text-slate-200">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">版本 {item.version}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass[item.status]}`}>
                      {item.status === 'enabled' ? '已启用' : '草稿'}
                    </span>
                    <button className="text-xs text-hydro-300">详情</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
