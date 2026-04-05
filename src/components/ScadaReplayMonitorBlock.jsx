import { openPath, revealPath } from '../api/tauri_bridge';
import { useScadaReplayPreview } from '../hooks/useScadaReplayPreview';

export default function ScadaReplayMonitorBlock({ caseId }) {
  const { summary, streamEvents, error, loading, reload, browserOnly, contractMeta } = useScadaReplayPreview(
    caseId,
    { maxStreamLines: 50 },
  );

  const sumRel = contractMeta.summary_relative.replaceAll('{caseId}', caseId);
  const streamRel = contractMeta.stream_ndjson_relative.replaceAll('{caseId}', caseId);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-900/40 p-4" data-testid="scada-replay-monitor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">SCADA 历史回放 · 契约只读预览</h2>
          <p className="mt-1 text-xs text-slate-500">
            摘要与 NDJSON 流由 <code className="text-cyan-400/90">ScadaReplayEngine</code> 写入 contracts；Schema 见{' '}
            <code className="text-slate-400">{contractMeta.schema_summary_repo_relative}</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => reload()}
            className="rounded-lg border border-slate-600/50 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/50"
          >
            刷新契约
          </button>
          <button
            type="button"
            onClick={() => openPath(sumRel)}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300"
          >
            打开摘要
          </button>
          <button
            type="button"
            onClick={() => openPath(streamRel)}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300"
          >
            打开 NDJSON
          </button>
          <button
            type="button"
            onClick={() => revealPath(streamRel)}
            className="rounded-lg border border-slate-600/50 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-300"
          >
            定位目录
          </button>
        </div>
      </div>

      {browserOnly && (
        <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
          浏览器壳层无法读仓库文件；请使用 Tauri 桌面端查看回放契约与事件尾部。
        </div>
      )}

      {loading && <div className="mt-3 text-xs text-slate-500">加载契约…</div>}

      {error && !browserOnly && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['run_id', summary.run_id],
            ['scenario', summary.scenario_id],
            ['messages', summary.messages_emitted],
            ['records', summary.records_loaded],
            ['replay×', summary.replay_speed],
            ['quality', summary.quality_code],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-700/40 bg-slate-950/50 px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
              <div className="mt-0.5 truncate text-sm font-medium text-slate-100" title={String(v)}>
                {v ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {!summary && !loading && !browserOnly && !error && (
        <div className="mt-3 text-xs text-slate-500">尚未检测到 scada_replay.latest.json（可先运行「Run SCADA Replay」或等价 workflow）。</div>
      )}

      {streamEvents.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700/40">
          <table className="w-full min-w-[640px] text-left text-[11px] text-slate-300">
            <thead className="bg-slate-950/80 text-slate-500">
              <tr>
                <th className="px-2 py-2 font-medium">ts_event</th>
                <th className="px-2 py-2 font-medium">station</th>
                <th className="px-2 py-2 font-medium">tag</th>
                <th className="px-2 py-2 font-medium">value</th>
                <th className="px-2 py-2 font-medium">run_id</th>
              </tr>
            </thead>
            <tbody>
              {streamEvents.map((ev, i) => (
                <tr key={i} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-400">
                    {ev._parse_error ? '—' : ev.ts_event}
                  </td>
                  <td className="px-2 py-1.5">{ev._parse_error ? ev._raw : `${ev.station_name || ev.station_id || '—'}`}</td>
                  <td className="px-2 py-1.5 text-cyan-300/90">{ev._parse_error ? 'parse_error' : ev.tag}</td>
                  <td className="px-2 py-1.5 font-mono">{ev._parse_error ? '—' : ev.value}</td>
                  <td className="max-w-[140px] truncate px-2 py-1.5 font-mono text-[10px] text-slate-500" title={ev.run_id}>
                    {ev._parse_error ? '—' : ev.run_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-800/80 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-600">
            仅展示 NDJSON 尾部 {streamEvents.length} 条，完整序列见 {streamRel}
          </div>
        </div>
      )}
    </div>
  );
}
