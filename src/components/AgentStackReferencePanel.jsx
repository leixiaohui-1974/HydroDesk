import { useMemo, useState } from 'react';
import { openPath, revealPath } from '../api/tauri_bridge';
import useTauri from '../hooks/useTauri';

const DEEP_LINK_LABELS = {
  coordinator: 'coordinator',
  tools: 'tools',
  plugins_restored: 'plugins（还原）',
  skills_restored: 'skills（还原）',
  official_plugins: '官方 plugins',
  claw_code: 'claw-code',
};

/**
 * Agent 栈说明 + 一键定位 claudecode 目录 + HydroDesk 层入口路径
 */
export default function AgentStackReferencePanel({ stack, loadError, configSource, onReload, caseId }) {
  const { isTauri } = useTauri();
  const [open, setOpen] = useState(true);
  const deepLinks = stack?.claudecode_reference?.deep_links || {};
  const layers = stack?.hydrodesk_layers || {};
  const caseProject = stack?.case_project || {};

  const manifestRel = useMemo(
    () => String(caseProject.manifest_rel || '').replace(/\{case_id\}/g, caseId || '{case_id}'),
    [caseProject.manifest_rel, caseId],
  );
  const contractsRel = useMemo(
    () => String(caseProject.contracts_rel || '').replace(/\{case_id\}/g, caseId || '{case_id}'),
    [caseProject.contracts_rel, caseId],
  );

  return (
    <div className="mt-5 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="text-sm font-semibold text-slate-200">Agent 栈与 claudecode 参考</div>
        <span className="text-[10px] text-slate-500">{open ? '收起' : '展开'}</span>
      </button>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
        <span>配置：{configSource === 'file' ? '已读 JSON' : '内置默认'}</span>
        {isTauri ? (
          <button
            type="button"
            onClick={() => void onReload?.()}
            className="rounded border border-slate-700/50 px-2 py-0.5 text-slate-400 hover:text-slate-200"
          >
            重新加载
          </button>
        ) : null}
      </div>
      {loadError ? <p className="mt-2 text-[11px] text-rose-300/90">{loadError}</p> : null}
      {open ? (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">当前案例（项目根）</div>
            <div className="mt-1 font-mono text-[10px] leading-5 text-slate-500 break-all">{manifestRel}</div>
            <div className="font-mono text-[10px] leading-5 text-slate-500 break-all">{contractsRel}</div>
            {isTauri && manifestRel && !manifestRel.includes('{case_id}') ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openPath(manifestRel)}
                  className="rounded border border-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300"
                >
                  打开 manifest
                </button>
                <button
                  type="button"
                  onClick={() => revealPath(contractsRel)}
                  className="rounded border border-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300"
                >
                  定位 contracts
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">HydroDesk 分层</div>
            <div className="mt-2 space-y-2">
              {Object.entries(layers).map(([key, layer]) => (
                <div key={key} className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
                  <div className="text-xs text-slate-300">{layer?.label || key}</div>
                  {layer?.hint ? <div className="mt-1 text-[10px] text-slate-500">{layer.hint}</div> : null}
                  {Array.isArray(layer?.paths) && layer.paths.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {layer.paths.map((p) => {
                        const tail = p.includes('/') ? p.split('/').pop() : p;
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={!isTauri}
                            onClick={() => revealPath(p)}
                            className="rounded border border-slate-700/40 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 disabled:opacity-40"
                            title={p}
                          >
                            {tail || '·'}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              claudecode 目录（研究参考）
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(deepLinks).map(([key, relPath]) => (
                <button
                  key={key}
                  type="button"
                  disabled={!isTauri || !relPath}
                  onClick={() => revealPath(relPath)}
                  className="rounded border border-amber-500/25 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-200/80 disabled:opacity-40"
                  title={relPath}
                >
                  {DEEP_LINK_LABELS[key] || key}
                </button>
              ))}
            </div>
            {stack?.claudecode_reference?.sourcemap_src ? (
              <button
                type="button"
                disabled={!isTauri}
                onClick={() => openPath(stack.claudecode_reference.sourcemap_src)}
                className="mt-2 text-[10px] text-slate-500 underline decoration-dotted hover:text-slate-300 disabled:opacity-40"
              >
                打开还原源码根（sourcemap_src）
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
