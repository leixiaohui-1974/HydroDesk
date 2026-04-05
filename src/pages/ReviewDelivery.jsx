import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  openPath,
  openPathWithAlternates,
  readWorkspaceTextFileFirstOf,
  revealPath,
  revealPathWithAlternates,
  runWorkspaceCommand,
} from '../api/tauri_bridge';
import {
  getCaseReviewAssets,
  getCaseRunReviewReleaseContracts,
  getCaseShellEntryPoints,
  resolveShellCaseId,
} from '../data/case_contract_shell';
import { getActiveRoleAgent, getPendingApprovals, studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import {
  buildBootstrapCaseTriadMinimalCommand,
  buildHydrodeskE2eActionsCommand,
  buildLintCaseKnowledgeLinksCommand,
  parseSingleObjectJsonStdout,
} from '../config/hydrodesk_commands';

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
  const { isTauri } = useTauri();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const { summary: caseContractSummary, loading: caseContractSummaryLoading, reload: reloadCaseContractSummary } =
    useCaseContractSummary(activeProject.caseId, 8000);
  const [triadBootstrapBusy, setTriadBootstrapBusy] = useState(false);
  const [triadBootstrapError, setTriadBootstrapError] = useState('');
  const [triadBootstrapStdout, setTriadBootstrapStdout] = useState('');
  const [knowledgeLintBusy, setKnowledgeLintBusy] = useState(false);
  const [knowledgeLintError, setKnowledgeLintError] = useState('');
  const [knowledgeLintLast, setKnowledgeLintLast] = useState(null);
  const [deliveryPackBusy, setDeliveryPackBusy] = useState(false);
  const [deliveryPackError, setDeliveryPackError] = useState('');
  const [deliveryPackLast, setDeliveryPackLast] = useState(null);

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
  const { artifacts, checkpoints, executionHistory, loading } = useWorkflowExecution(activeProject.caseId, studioState.reports);
  const roleTemplate = roleTemplates[activeRole] || roleTemplates.designer;
  const primaryAgent = getActiveRoleAgent('/review', activeRole);
  const latestRun = executionHistory[0];
  const contractChain = getCaseRunReviewReleaseContracts(shellCaseId);
  const liveMonitorAssets = getCaseReviewAssets(shellCaseId);
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
  const shellEntryPoints = getCaseShellEntryPoints(shellCaseId);
  const [notebookMetaMap, setNotebookMetaMap] = useState({});
  const signoffOverview = useMemo(() => {
    const notebookMeta =
      notebookMetaMap[`cases/${shellCaseId}/contracts/hydrodesk_notebook.latest.json`] ||
      notebookMetaMap[`cases/${shellCaseId}/contracts/hydrodesk_notebook.latest.md`] ||
      null;
    const releaseManifest = contractChain.find((contract) => contract.contractName === 'ReleaseManifest');
    return {
      version: notebookMeta?.version || 'v0.1.0',
      signoffStatus: notebookMeta?.signoffStatus || 'draft',
      updatedBy: notebookMeta?.updatedBy || 'Manager Agent',
      pendingApprovals: pendingApprovals.length,
      liveGateCount: liveMonitorAssets.filter((asset) => asset.category === 'gate').length,
      memoCount: memoAssets.length,
      manifestPath: releaseManifest?.path || '未接入 ReleaseManifest',
    };
  }, [contractChain, liveMonitorAssets, memoAssets.length, notebookMetaMap, pendingApprovals.length, shellCaseId]);
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
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">签发状态总览卡</div>
                <div className="mt-1 text-xs text-slate-500">
                  把 notebook chain 的当前版本、签发状态、更新责任人与 gate 资产数量放到同一总览卡，供管理主智能体快速签发。
                </div>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-300">
                {signoffOverview.signoffStatus}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: '版本号', value: signoffOverview.version, note: 'Notebook chain 当前版本' },
                { label: '最后更新人', value: signoffOverview.updatedBy, note: '当前签发资产责任人' },
                { label: '待确认', value: signoffOverview.pendingApprovals, note: '人工确认点数量' },
                { label: 'Gate 资产', value: signoffOverview.liveGateCount, note: 'coverage / verification 等关键验收资产' },
                { label: 'Memo 数量', value: signoffOverview.memoCount, note: 'review memo 与 release note' },
                { label: 'Manifest', value: signoffOverview.manifestPath, note: '正式签发清单入口' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                  <div className="text-xs text-slate-500">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-100 break-all">{item.value}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">统一签发 Gate（P2）</div>
                <div className="mt-1 text-xs text-slate-500">
                  Triad 齐备 + verification 无 pending + closure 通过 + coverage 非 blocked。由 Tauri
                  get_case_contract_summary 汇总。
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={triadBootstrapBusy || !bootstrapTriadMinimalCommand || !isTauri}
                  onClick={() => void runTriadBootstrapMinimal()}
                  className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                  title="双缺时写入最小 workflow_run / review_bundle / release_manifest（_auto_generated）；不替代正式 build-release-pack"
                >
                  {triadBootstrapBusy ? '写入中…' : '补最小 triad 占位'}
                </button>
                <button
                  type="button"
                  disabled={knowledgeLintBusy || !shellCaseId || !isTauri}
                  onClick={() => void runKnowledgeLintCurrent()}
                  className="rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2 py-1 text-[10px] text-indigo-200/90 disabled:opacity-50"
                  title="README/contracts 内相对链接 + 必填路径；配置见 hydrodesk_shell.knowledge_lint"
                >
                  {knowledgeLintBusy ? 'Lint…' : '知识链接 Lint'}
                </button>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] ${
                    caseContractSummary.release_gate_eligible
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {caseContractSummaryLoading
                    ? '加载中…'
                    : caseContractSummary.release_gate_eligible
                      ? '可签发'
                      : '不可签发'}
                </span>
              </div>
            </div>
            {triadBootstrapError ? (
              <p className="mt-2 text-[11px] text-rose-300/90">{triadBootstrapError}</p>
            ) : null}
            {triadBootstrapStdout ? (
              <pre className="mt-2 max-h-24 overflow-auto rounded border border-slate-800/80 bg-slate-950/80 p-2 font-mono text-[10px] text-slate-500">
                {triadBootstrapStdout}
              </pre>
            ) : null}
            {knowledgeLintError ? (
              <p className="mt-2 text-[11px] text-rose-300/90">{knowledgeLintError}</p>
            ) : null}
            {knowledgeLintLast ? (
              <p className="mt-2 text-[11px] text-slate-500">
                知识壳 lint（当前案例）：{knowledgeLintLast.ok ? '通过' : '未通过'} · 相对断链{' '}
                {knowledgeLintLast.broken_relative_link_count} · raw 目录
                {knowledgeLintLast.raw_dir_exists ? '有' : '无'}
                {knowledgeLintLast.errors?.length > 0
                  ? ` · ${knowledgeLintLast.errors.join(' · ')}`
                  : ''}
              </p>
            ) : null}
            <div className="mt-3 grid gap-2 text-[11px] text-slate-500 md:grid-cols-3">
              <div>
                <span className="text-slate-600">Triad</span>{' '}
                <span className="font-mono text-slate-300">
                  {caseContractSummary.triad_count ?? 0}/3
                </span>
              </div>
              <div>
                <span className="text-slate-600">coverage gate</span>{' '}
                <span className="font-mono text-slate-300">{caseContractSummary.gate_status || 'unknown'}</span>
              </div>
              <div>
                <span className="text-slate-600">closure</span>{' '}
                <span className="font-mono text-slate-300">
                  {caseContractSummary.closure_check_passed ? 'ok' : 'fail/缺报告'}
                </span>
              </div>
            </div>
            <div className="mt-2 space-y-1 font-mono text-[10px] leading-5 text-slate-600 break-all">
              <div>workflow_run: {caseContractSummary.triad_workflow_run_rel || '—'}</div>
              <div>review_bundle: {caseContractSummary.triad_review_bundle_rel || '—'}</div>
              <div>release_manifest: {caseContractSummary.triad_release_manifest_rel || '—'}</div>
            </div>
            {(caseContractSummary.release_gate_blockers || []).length > 0 ? (
              <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-amber-200/90">
                {caseContractSummary.release_gate_blockers.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : !caseContractSummaryLoading ? (
              <p className="mt-3 text-xs text-emerald-200/80">当前规则下阻断项为空（仍建议人工复核 Notebook / Memo）。</p>
            ) : null}
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
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">交付文档包（delivery_pack）</div>
                <div className="mt-1 text-xs text-slate-500">
                  写入 <span className="font-mono text-slate-400">cases/{shellCaseId}/contracts/delivery_pack/&lt;UTC&gt;/</span>
                  ：manifest、SUMMARY、<span className="font-mono text-slate-400">snapshots/triad/</span>（三件套）与{' '}
                  <span className="font-mono text-slate-400">snapshots/contracts/&lt;相对路径&gt;</span>
                  （YAML 列出的 contracts 内文件）；并更新{' '}
                  <span className="font-mono text-slate-400">delivery_pack.latest.json</span>。
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={deliveryPackBusy || !shellCaseId || !isTauri}
                  onClick={() => void runDeliveryDocsPack(false)}
                  className="rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-200/90 disabled:opacity-50"
                  title="默认即使 Gate/Lint 未过也落盘；manifest 记录 eligible_at_pack_time"
                >
                  {deliveryPackBusy ? '生成中…' : '生成交付包'}
                </button>
                <button
                  type="button"
                  disabled={deliveryPackBusy || !shellCaseId || !isTauri}
                  onClick={() => void runDeliveryDocsPack(true)}
                  className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                  title="须签发 Gate 与 knowledge_lint 均通过才写入"
                >
                  {deliveryPackBusy ? '生成中…' : '严格（须 Gate+Lint）'}
                </button>
                {deliveryPackLast?.pack_dir ? (
                  <>
                    <button
                      type="button"
                      disabled={!isTauri}
                      onClick={() => openPath(deliveryPackLast.pack_dir)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300 disabled:opacity-50"
                    >
                      打开目录
                    </button>
                    <button
                      type="button"
                      disabled={!isTauri}
                      onClick={() => revealPath(deliveryPackLast.pack_dir)}
                      className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                    >
                      定位
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {deliveryPackError ? (
              <p className="mt-2 text-[11px] text-rose-300/90">{deliveryPackError}</p>
            ) : null}
            {deliveryPackError &&
            Array.isArray(deliveryPackLast?.combined_blockers) &&
            deliveryPackLast.combined_blockers.length > 0 ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-amber-200/90">
                {deliveryPackLast.combined_blockers.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {deliveryPackLast ? (
              <p className="mt-2 text-[11px] text-slate-500">
                ok: {deliveryPackLast.ok ? '是' : '否'} · eligible_at_pack_time:{' '}
                {deliveryPackLast.eligible_at_pack_time ? '是' : '否'}
                {deliveryPackLast.pack_dir ? (
                  <>
                    {' '}
                    · <span className="font-mono text-slate-400">{deliveryPackLast.pack_dir}</span>
                  </>
                ) : null}
              </p>
            ) : null}
            {caseContractSummary.delivery_pack_pointer_rel ? (
              <div className="mt-3 rounded-lg border border-slate-700/40 bg-slate-950/50 p-3 text-[11px] text-slate-500">
                <div className="font-medium text-slate-400">壳层摘要 · 最新交付包指针</div>
                <div className="mt-1">
                  pack_id{' '}
                  <span className="font-mono text-slate-300">{caseContractSummary.delivery_pack_id || '—'}</span>
                  {' · '}
                  eligible_at_pack_time: {caseContractSummary.delivery_pack_eligible_at_last_pack ? '是' : '否'}
                  {caseContractSummary.delivery_pack_updated_at ? (
                    <>
                      {' '}
                      · updated{' '}
                      <span className="font-mono text-slate-400">{caseContractSummary.delivery_pack_updated_at}</span>
                    </>
                  ) : null}
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-600 break-all">
                  {caseContractSummary.delivery_latest_pack_rel || caseContractSummary.delivery_pack_pointer_rel}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {caseContractSummary.delivery_latest_pack_rel ? (
                    <button
                      type="button"
                      disabled={!isTauri}
                      onClick={() => openPath(caseContractSummary.delivery_latest_pack_rel)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300 disabled:opacity-50"
                    >
                      打开最新包目录
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!isTauri}
                    onClick={() => openPath(caseContractSummary.delivery_pack_pointer_rel)}
                    className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                  >
                    打开指针 JSON
                  </button>
                  {caseContractSummary.delivery_latest_pack_rel ? (
                    <button
                      type="button"
                      disabled={!isTauri}
                      onClick={() => revealPath(caseContractSummary.delivery_latest_pack_rel)}
                      className="rounded-lg border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                    >
                      定位最新包
                    </button>
                  ) : null}
                </div>
              </div>
            ) : !caseContractSummaryLoading ? (
              <p className="mt-2 text-[11px] text-slate-600">
                尚无 <span className="font-mono">delivery_pack.latest.json</span>；生成一次交付包后将出现在此并由摘要轮询刷新。
              </p>
            ) : null}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Run / Review / Release 合同链</div>
                <div className="mt-1 text-xs text-slate-500">
                  先读 WorkflowRun，再核 ReviewBundle，最后从 ReleaseManifest 进入正式交付清单。
                </div>
              </div>
              <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
                contract triad
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {contractChain.map((contract) => (
                <div key={contract.path} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">{contract.stage}</div>
                      <div className="mt-1 text-sm text-slate-200">{contract.contractName}</div>
                    </div>
                    <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                      {contract.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">{contract.note}</div>
                  <div className="mt-3 text-[10px] leading-5 text-slate-500">{contract.path}</div>
                  <div className="mt-3 flex items-center gap-2">
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
          </div>
          <div className="mt-4 rounded-2xl border border-hydro-500/20 bg-hydro-500/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Live 监控与验收入口</div>
                <div className="mt-1 text-xs text-slate-500">
                  在产品壳里直接打开当前案例（{shellCaseId}）的 live dashboard、coverage 和 verification 资产。
                </div>
              </div>
              <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
                pinned shell · {shellCaseId}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {liveMonitorAssets.map((asset) => (
                <div
                  key={asset.path}
                  data-testid="review-live-asset"
                  data-contract-path={asset.path}
                  className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4"
                >
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
          {notebookAssetChain.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Notebook / Memo / Manifest 联动</div>
                  <div className="mt-1 text-xs text-slate-500">
                    把 Notebook 原稿、自动生成 Memo 和 ReleaseManifest 放到同一审查面板，便于追踪“草稿 → 审查 → 签发”链条。
                  </div>
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-300">
                  notebook chain
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {notebookAssetChain.map((asset) => (
                  <div key={asset.path} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-4">
                    <div className="text-sm text-slate-200">{asset.name}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{asset.note}</div>
                    {notebookMetaMap[asset.path] && (
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">
                          {notebookMetaMap[asset.path].version || 'v0.1.0'}
                        </span>
                        <span className="rounded-full border border-slate-700/40 bg-slate-900/60 px-2 py-1 text-slate-300">
                          {notebookMetaMap[asset.path].signoffStatus || 'draft'}
                        </span>
                        <span className="rounded-full border border-slate-700/40 bg-slate-900/60 px-2 py-1 text-slate-300">
                          {notebookMetaMap[asset.path].updatedBy || 'unknown'}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 rounded-xl border border-slate-700/30 bg-slate-900/50 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Preview</div>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
                        {memoPreviewMap[asset.path] || '在桌面壳中可读取 memo 预览。'}
                      </pre>
                    </div>
                    <div className="mt-3 text-[10px] text-slate-500">{asset.path}</div>
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
          )}
          <div className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">路线图 / backlog 入口</div>
                <div className="mt-1 text-xs text-slate-500">
                  把当前案例壳层（North Star）、HydroDesk backlog 与命令入口收敛到同一面板。
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
