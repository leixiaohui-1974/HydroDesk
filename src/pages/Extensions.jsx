import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';

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

export default function Extensions() {
  const { activeMode } = useStudioWorkspace();
  const { openFile } = useTauri();

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
