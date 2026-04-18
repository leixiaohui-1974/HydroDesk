import { useEffect } from 'react';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';
import { useHydrodeskAgentStack } from '../hooks/useHydrodeskAgentStack';
import { useHydrodeskPluginRegistry } from '../hooks/useHydrodeskPluginRegistry';
import { useHydrodeskSkillRegistry } from '../hooks/useHydrodeskSkillRegistry';
import {
  CLAUDECODE_DIR,
} from '../config/claudecodeReference';
import { openPath, revealPath } from '../api/tauri_bridge';
import {
  architectureLayers,
  caseProjectPrinciples,
  extensionGroups,
  extensionReferenceEntries,
  extensionStatusClass,
  extensionWorkspaceEntries,
  hostMatrix,
  implementationPhases,
  roleSegments,
} from '../data/extensionsCatalog';

function ExtensionsActionButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function ExtensionsActionGroup({ title, summary, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="rounded-xl border border-slate-700/50 bg-slate-950/35">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-slate-200">{title}</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-500">{summary}</div>
          </div>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
            展开
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-800/70 px-4 py-3">
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </details>
  );
}

export default function Extensions() {
  const { activeMode, activeProject } = useStudioWorkspace();
  const { openFile } = useTauri();
  const { stack: agentStack, configSource, loadError, reload } = useHydrodeskAgentStack();
  const referencePathByKey = Object.fromEntries(extensionReferenceEntries.map((entry) => [entry.key, entry.path]));
  const {
    summary: skillRegSummary,
    loadError: skillRegError,
    loading: skillRegLoading,
    reload: reloadSkillReg,
    registryRelPath,
  } = useHydrodeskSkillRegistry();
  const {
    summary: pluginRegSummary,
    loadError: pluginRegError,
    loading: pluginRegLoading,
    reload: reloadPluginReg,
    registryRelPath: pluginRegistryRelPath,
  } = useHydrodeskPluginRegistry();

  useEffect(() => {
    void reloadSkillReg();
  }, [reloadSkillReg]);

  useEffect(() => {
    void reloadPluginReg();
  }, [reloadPluginReg]);

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
  const extensionsPrimaryActions = [
    {
      key: 'validate-schema',
      label: '校验 schema',
      onClick: () => window.alert('Schema 校验入口保留，后续将接入真实校验链路。'),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
    {
      key: 'import-manifest',
      label: '导入清单',
      onClick: handleImportManifest,
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
    {
      key: 'new-extension',
      label: '新建扩展',
      onClick: () => window.alert('新建扩展入口保留，后续将接入模板化 scaffold。'),
      className: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300 hover:bg-hydro-500/15',
    },
  ];
  const extensionsRegistryActions = [
    {
      key: 'reload-stack',
      label: '重载 Agent Stack',
      onClick: () => reload(),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
    {
      key: 'reload-skills',
      label: skillRegLoading ? '读取 Skills…' : '刷新 Skills 摘要',
      disabled: skillRegLoading,
      onClick: () => void reloadSkillReg(),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
    {
      key: 'reload-plugins',
      label: pluginRegLoading ? '读取 Plugins…' : '刷新 Plugins 摘要',
      disabled: pluginRegLoading,
      onClick: () => void reloadPluginReg(),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
  ];
  const extensionsReferenceActions = [
    {
      key: 'lineage',
      label: '打开谱系文档',
      onClick: () => openPath(referencePathByKey['lineage-doc']),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    },
    {
      key: 'platform-plan',
      label: '平台方案',
      onClick: () => openPath(referencePathByKey['platform-plan']),
      className: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
    },
    {
      key: 'roadmap',
      label: 'Agentic 路线图',
      onClick: () => openPath(referencePathByKey.roadmap),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
    {
      key: 'claudecode-dir',
      label: '定位 claudecode/',
      onClick: () => revealPath(CLAUDECODE_DIR),
      className: 'border-slate-700/50 text-slate-300 hover:bg-slate-800/60',
    },
    {
      key: 'skill-registry',
      label: '打开 Skill Registry',
      onClick: () => openPath(referencePathByKey['skill-registry']),
      className: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
    },
    {
      key: 'plugin-registry',
      label: '打开 Plugin Registry',
      onClick: () => openPath(referencePathByKey['plugin-registry']),
      className: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">扩展中心</h1>
          <p className="mt-1 text-sm text-slate-400">统一管理 agent、skill、plugin、MCP 与 workflow 的注册、校验和参考入口</p>
          <div className="mt-3 inline-flex rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
            {activeMode === 'development' ? '开发模式已开放扩展宿主与打包入口' : '发布模式下该入口默认收起'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
            Developer Surface
          </span>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            case {activeProject.caseId}
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">扩展动作中心</h2>
            <p className="mt-1 text-sm text-slate-400">
              第一屏只保留扩展治理的高频动作、注册表刷新和参考入口；架构说明与 catalog 信息继续保留在下方正文区。
            </p>
          </div>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            功能全保留 · 入口重组
          </span>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <ExtensionsActionGroup
            title="主操作"
            summary="扩展清单导入、schema 校验和新建入口保留在第一屏。"
            defaultOpen
          >
            {extensionsPrimaryActions.map((action) => (
              <ExtensionsActionButton key={action.key} onClick={action.onClick} className={action.className}>
                {action.label}
              </ExtensionsActionButton>
            ))}
          </ExtensionsActionGroup>
          <ExtensionsActionGroup
            title="注册表与运行态"
            summary="Agent Stack、Skills、Plugins 的读取与刷新集中在这里。"
            defaultOpen
          >
            {extensionsRegistryActions.map((action) => (
              <ExtensionsActionButton
                key={action.key}
                disabled={action.disabled}
                onClick={action.onClick}
                className={action.className}
              >
                {action.label}
              </ExtensionsActionButton>
            ))}
          </ExtensionsActionGroup>
          <ExtensionsActionGroup
            title="参考入口"
            summary="低频但重要的谱系、方案、路线图和注册表文件入口统一后置。"
          >
            {extensionsReferenceActions.map((action) => (
              <ExtensionsActionButton key={action.key} onClick={action.onClick} className={action.className}>
                {action.label}
              </ExtensionsActionButton>
            ))}
          </ExtensionsActionGroup>
        </div>
      </section>

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
          <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
            主入口已收纳到扩展动作中心
          </span>
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
          <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
            注册表操作已收纳到扩展动作中心
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">Plugin Registry（Phase 3）</div>
            <div className="mt-1 text-xs text-slate-500">
              对齐平台方案与运行态挂载视图的插件注册表；先把 ProjectCenter / ReviewDelivery / AgentWorkspace / Extensions 收口成真实条目。
            </div>
            <div className="mt-2 font-mono text-[11px] text-slate-600">{pluginRegistryRelPath}</div>
            {pluginRegSummary ? (
              <div className="mt-2 text-[11px] text-slate-400">
                已读摘要 · version {pluginRegSummary.version} · plugins 条目 {pluginRegSummary.pluginCount} · enabled{' '}
                {pluginRegSummary.enabledCount} · 高权限 {pluginRegSummary.highPermissionCount}
              </div>
            ) : null}
            {pluginRegError ? <div className="mt-2 text-[11px] text-amber-300/90">{pluginRegError}</div> : null}
          </div>
          <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
            注册表操作已收纳到扩展动作中心
          </span>
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
            {extensionWorkspaceEntries.map((entry) => (
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
          <div className="mt-2 text-2xl font-semibold text-slate-100">{pluginRegSummary?.pluginCount ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">待校验</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">
            {pluginRegSummary ? Math.max((pluginRegSummary.pluginCount || 0) - (pluginRegSummary.enabledCount || 0), 0) : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <div className="text-xs text-slate-500">高权限扩展</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{pluginRegSummary?.highPermissionCount ?? '—'}</div>
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
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${extensionStatusClass[item.status]}`}>
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
