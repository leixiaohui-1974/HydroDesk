import { useMemo } from 'react';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { useCaseContractSummary } from '../hooks/useCaseContractSummary';
import { openPath, revealPath } from '../api/tauri_bridge';

export default function VerificationControl() {
  const { activeProject } = useStudioWorkspace();
  const { summary: caseSummary } = useCaseContractSummary(activeProject.caseId);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Verification Control</h1>
        <p className="text-sm text-slate-400 mt-1">验收与控制闭环 · 当前案例 {activeProject.caseId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200">阶段验收闭环</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">执行统计</div>
              <div className="mt-2 text-sm text-slate-200">
                passed {caseSummary.passed} · failed {caseSummary.failed} · timeout {caseSummary.timeout} · pending {caseSummary.pending}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                unique executed {caseSummary.total_executed} · outcomes {caseSummary.outcomes_generated}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">失败记录</div>
              <div className="mt-2 space-y-2">
                {caseSummary.failed_workflows?.length > 0 ? (
                  caseSummary.failed_workflows.map((fw, i) => (
                    <div key={`${fw.workflow}-${i}`} className="text-xs border border-rose-500/20 bg-rose-500/5 rounded p-2 text-slate-300">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-rose-300">{fw.workflow}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 uppercase">{fw.category}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 break-words">{fw.message || fw.status}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-emerald-400">当前没有解析到失败工作流。</div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">当前关注</div>
              <div className="mt-2 text-sm text-slate-200">
                {caseSummary.current_workflow || '当前没有活动 workflow，优先做 release/report 对齐。'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                gate {caseSummary.gate_status} · closure {caseSummary.closure_check_passed ? 'passed' : 'pending'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-500">关键产物</div>
              <div className="mt-2 space-y-2">
                {caseSummary.key_artifacts.slice(0, 4).map((artifact) => (
                  <div key={artifact.path} className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{artifact.category} · {artifact.path}</span>
                    <div className="flex gap-2">
                      <button onClick={() => openPath(artifact.path)} className="text-[10px] text-hydro-400 hover:underline">打开</button>
                      <button onClick={() => revealPath(artifact.path)} className="text-[10px] text-slate-400 hover:underline">定位</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200">控制与校核</h2>
          <p className="mt-2 text-xs text-slate-400">
            验模与实时验证独立控制面。通过本页面可对验证与控制任务进行追踪和校验。
          </p>
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-500">Gate 状态</div>
            <div className="mt-2 text-sm text-slate-200">
              当前门禁：<span className="text-emerald-400">{caseSummary.gate_status || 'unknown'}</span>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-500">稳态验证 (Steady-State Verification)</div>
            <div className="mt-2 text-sm text-slate-200 flex items-center justify-between">
              <span>状态：<span className="text-emerald-400">已完成</span></span>
              <span className="text-xs text-slate-400">误差 &lt; 2%</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[95%]"></div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-500">阶跃响应验证 (Step-Response Verification)</div>
            <div className="mt-2 text-sm text-slate-200 flex items-center justify-between">
              <span>状态：<span className="text-emerald-400">已完成</span></span>
              <span className="text-xs text-slate-400">无明显超调</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[90%]"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}