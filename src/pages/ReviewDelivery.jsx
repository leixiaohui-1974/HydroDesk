import { useEffect, useMemo, useState } from 'react';
import { openPath, revealPath } from '../api/tauri_bridge';
import { getDaduheReviewAssets, getDaduheShellEntryPoints, resolveDaduheShellCaseId } from '../data/daduheShell';
import { getActiveRoleAgent, getPendingApprovals, studioState } from '../data/studioState';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

const badgeStyles = {
  passed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  review: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
};

const roleTemplates = {
  teacher: {
    label: '教师',
    headline: '课堂讲解版',
    summary: '先展示结论与案例脉络，再回到拓扑节点和 GIS 图层做讲解，适合课堂投屏与分步演示。',
    readingHabits: ['先看结论摘要', '再看过程回放', '最后下钻到图层证据'],
    narrative: '适合把 review bundle 拆成“问题—证据—结论—作业”的教学路径。',
    topologyNodes: ['取水口', '输水干线', '控制断面', '风险支流'],
    gisLayers: ['河网结果', '断面候选', '调度影响范围'],
  },
  student: {
    label: '学生',
    headline: '学习练习版',
    summary: '突出步骤解释、术语提示和结果对照，方便按任务单逐步理解成果页与空间证据之间的关系。',
    readingHabits: ['先看任务目标', '再看步骤提示', '最后对照成果产物'],
    narrative: '适合围绕“为什么这样建模、为什么这样判断”进行自主学习。',
    topologyNodes: ['任务起点', '河网节点', '断面候选', '结论锚点'],
    gisLayers: ['DEM 校核', '流域边界', '成果叠图'],
  },
  designer: {
    label: '设计',
    headline: '方案审查版',
    summary: '突出拓扑关系、空间校核与交付风险，把文字审查意见和图上对象绑定在一起。',
    readingHabits: ['先看关键断面', '再看 GIS 校核', '最后看交付清单'],
    narrative: '适合从图上追踪证据，再落回成果物与 release 条件。',
    topologyNodes: ['渠首节点', '分水口', '控制断面', '支流汇入点'],
    gisLayers: ['控制断面图层', '地形校核图层', '成果边界叠加'],
  },
  researcher: {
    label: '科研',
    headline: '证据链版',
    summary: '突出参数来源、实验记录和多轮结果对比，方便把拓扑/GIS 观察转成研究结论。',
    readingHabits: ['先看数据可信度', '再看实验差异', '最后提炼结论'],
    narrative: '适合做参数敏感性分析、方法对比和论文图表素材整理。',
    topologyNodes: ['实验节点', '对比断面', '敏感支流', '验证节点'],
    gisLayers: ['参数试验层', '结果差分层', '验证样点层'],
  },
  dispatcher: {
    label: '调度',
    headline: '调度会商版',
    summary: '突出最新运行状态、影响范围和处置建议，支持从成果页直接跳到拓扑或 GIS 证据。',
    readingHabits: ['先看态势与风险', '再看影响范围', '最后确认动作'],
    narrative: '适合会商时围绕关键断面、告警范围和调度预案快速阅读。',
    topologyNodes: ['当前任务', '关键控制点', '调度影响节点', '告警位置'],
    gisLayers: ['实时影响范围', '供水覆盖层', '风险热区'],
  },
  operator: {
    label: '运行',
    headline: '值守处置版',
    summary: '突出日志、最新产物和定位动作，让运行人员快速从成果页跳回现场对象与文件。',
    readingHabits: ['先看异常点', '再看日志与产物', '最后执行处置'],
    narrative: '适合值守巡检、异常复盘和班次交接。',
    topologyNodes: ['告警站点', '运行断面', '巡检路线', '恢复节点'],
    gisLayers: ['站点态势层', '告警热区', '巡检范围层'],
  },
  manager: {
    label: '管理',
    headline: '签发总览版',
    summary: '突出可交付结论、关键风险和成果完整性，便于管理人员快速签发与追踪。',
    readingHabits: ['先看结论与风险', '再看关键证据', '最后看交付完整性'],
    narrative: '适合做跨团队汇报、成果验收和版本放行决策。',
    topologyNodes: ['核心干线', '重点断面', '影响区域', '交付节点'],
    gisLayers: ['总览态势层', '重点成果层', '风险覆盖层'],
  },
};

export default function ReviewDelivery() {
  const { activeProject, activeRole, setActiveRole } = useStudioWorkspace();
  const shellCaseId = resolveDaduheShellCaseId(activeProject.caseId);
  const pendingApprovals = getPendingApprovals();
  const { artifacts, checkpoints, executionHistory, loading } = useWorkflowExecution(activeProject.caseId, studioState.reports);
  const roleTemplate = roleTemplates[activeRole] || roleTemplates.designer;
  const primaryAgent = getActiveRoleAgent('/review', activeRole);
  const latestRun = executionHistory[0];
  const liveMonitorAssets = getDaduheReviewAssets(shellCaseId);
  const shellEntryPoints = getDaduheShellEntryPoints(shellCaseId);
  const defaultSpotlight = useMemo(
    () => ({
      title: roleTemplate.topologyNodes[0],
      source: 'topology',
      description: `${roleTemplate.label}视角优先从该拓扑对象进入成果页，查看其绑定的审查意见、相关产物与空间证据。`,
    }),
    [roleTemplate]
  );
  const [selectedSpotlight, setSelectedSpotlight] = useState(defaultSpotlight);

  useEffect(() => {
    setSelectedSpotlight(defaultSpotlight);
  }, [defaultSpotlight]);

  return (
    <div className="p-6 space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/95 to-hydro-900/30 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
              成果页面模板 · {roleTemplate.headline}
            </div>
            <h1 className="mt-4 text-3xl font-bold text-slate-100">成果阅读、拓扑图、GIS 图双向联动</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">{roleTemplate.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {roleTemplate.readingHabits.map((habit) => (
                <span key={habit} className="rounded-full border border-slate-700/60 bg-slate-800/50 px-3 py-1 text-xs text-slate-300">
                  {habit}
                </span>
              ))}
            </div>
          </div>
          <div className="w-80 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">当前主智能体</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">{primaryAgent.name}</div>
            <div className="mt-1 text-sm text-slate-400">{primaryAgent.summary}</div>
            <div className="mt-4 text-xs text-slate-500">当前案例</div>
            <div className="mt-1 text-sm text-slate-200">{activeProject.name}</div>
            <div className="text-xs text-slate-500">{activeProject.caseId}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {[
            { label: '待确认', value: pendingApprovals.length, note: '人工确认点' },
            { label: '交付物', value: artifacts.length, note: '真实 artifacts' },
            { label: '上下文包', value: checkpoints.length, note: 'checkpoint / packet' },
            { label: '运行记录', value: executionHistory.length, note: '真实执行历史' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">{item.value}</div>
              <div className="mt-1 text-xs text-slate-500">{item.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">角色化阅读模式</h2>
            <p className="mt-1 text-sm text-slate-400">沿用既有项目中的角色化阅读思路，把同一成果页切换成不同角色的阅读结构与交互重点。</p>
          </div>
          <span className="rounded-full border border-slate-700/50 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            {roleTemplate.narrative}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-3">
          {Object.entries(roleTemplates).map(([role, template]) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                activeRole === role
                  ? 'border-hydro-500/50 bg-hydro-500/10'
                  : 'border-slate-700/50 bg-slate-900/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="text-sm font-medium text-slate-100">{template.label}</div>
              <div className="mt-1 text-xs text-slate-500">{template.headline}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[1.2fr,1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">审查结论</h2>
              <p className="mt-1 text-sm text-slate-400">围绕 review bundle、人工确认点和交付物形成统一审查视图</p>
            </div>
            <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
              {pendingApprovals.length} 项待确认
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">当前案例</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{activeProject.caseId}</div>
              <div className="mt-1 text-sm text-slate-400">{activeProject.name}</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">最新运行</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{latestRun?.workflow || '尚未启动真实运行'}</div>
              <div className="mt-1 text-sm text-slate-400">{latestRun ? `pid ${latestRun.pid} · ${latestRun.status}` : '等待 workflow 记录写入'}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {studioState.reviewChecks.map((check) => (
              <div key={check.name} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{check.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{check.note}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] ${badgeStyles[check.status]}`}>
                    {check.status === 'passed' ? '通过' : check.status === 'warning' ? '警告' : '待确认'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200">交付物与导出</h2>
          <div className="mt-1 text-xs text-slate-500">{loading ? '读取真实 artifacts 中...' : '优先展示真实案例产物'}</div>
          <div className="mt-4 rounded-2xl border border-hydro-500/20 bg-hydro-500/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Live 监控与验收入口</div>
                <div className="mt-1 text-xs text-slate-500">
                  在产品壳里直接打开 daduhe 的 live dashboard、coverage 和 verification 资产。
                </div>
              </div>
              <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
                pinned shell · {shellCaseId}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {liveMonitorAssets.map((asset) => (
                <div key={asset.path} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                  <div className="text-sm text-slate-200">{asset.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{asset.note}</div>
                  <div className="mt-3 text-xs text-slate-500">{asset.path}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openPath(asset.path)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
                    >
                      打开
                    </button>
                    <button
                      onClick={() => revealPath(asset.path)}
                      className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
                    >
                      定位
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">路线图 / backlog 入口</div>
                <div className="mt-1 text-xs text-slate-500">
                  把 daduhe 壳层的 North Star、HydroDesk backlog 和 backlog 命令入口放到同一面板。
                </div>
              </div>
              <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
                aligned
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {shellEntryPoints.map((entryPoint) => (
                <div key={entryPoint.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">{entryPoint.title}</div>
                    <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                      {entryPoint.kind}
                    </span>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{entryPoint.summary}</div>
                  <div className="mt-3 text-[10px] leading-5 text-slate-500">{entryPoint.path}</div>
                  <div className="mt-3 flex items-center gap-2">
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
          </div>
          <div className="mt-4 space-y-3">
            {artifacts.slice(0, 6).map((report) => (
              <div key={report.name} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                <div className="text-sm text-slate-200">{report.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {(report.type || report.category || 'artifact')} · 更新于 {report.updated || report.updated_at || 'unknown'}
                </div>
                <div className="mt-3 text-xs text-slate-500">{report.path}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openPath(report.path)} className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300">
                    打开
                  </button>
                  <button onClick={() => revealPath(report.path)} className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300">
                    定位
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[1fr,1fr,1.1fr] gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">拓扑图联动</h2>
              <p className="mt-1 text-xs text-slate-500">点击节点后，成果页跳转到对应的审查片段、产物与结论。</p>
            </div>
            <span className="text-xs text-slate-500">{roleTemplate.label}视角</span>
          </div>
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
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">GIS 图联动</h2>
              <p className="mt-1 text-xs text-slate-500">点击图层后，成果页切到对应空间证据，并反向高亮拓扑对象。</p>
            </div>
            <span className="text-xs text-slate-500">空间证据</span>
          </div>
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
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="text-sm font-semibold text-slate-200">图文联动聚焦</div>
          <div className="mt-1 text-xs text-slate-500">当前选中对象会驱动成果摘要、图上高亮和下方交付物过滤。</div>
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
              {[
                '成果摘要自动滚动到对应章节',
                '拓扑图高亮上下游关联节点',
                'GIS 图同步切换相关图层与视口',
                '交付物区自动过滤对应 artifact',
              ].map((item) => (
                <div key={item} className="rounded-xl border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
