import { useEffect, useRef } from 'react';

import { openPath, revealPath } from '../../api/tauri_bridge';
import { ReviewActionButton, ReviewEntityCard, ReviewPathActions } from './ReviewSharedCards';
import WorkspacePreviewPanel from '../workspace/WorkspacePreviewPanel';

export function ReviewArtifactsPanel({
  loading,
  shellCaseId,
  deliveryPackLast,
  deliveryPackError,
  caseContractSummary,
  caseContractSummaryLoading,
  isTauri,
  contractChain,
  triadBridgePaths,
  liveMonitorAssets,
  notebookAssetChain,
  standardObjectReportAssets,
  notebookMetaMap,
  memoPreviewMap,
  shellEntryPoints,
  artifacts,
  selectedAssetPath,
  highlightedAssetPath,
  onSelectAsset,
  selectedAssetPreview,
  selectedAssetPreviewLoading,
  selectedAssetPreviewError,
  selectedAssetActions,
  selectedAssetStatusNote,
}) {
  const panelRef = useRef(null);
  const selectableCardClassName = (path) =>
    `rounded-xl border p-4 transition-colors cursor-pointer ${
      selectedAssetPath === path
        ? 'border-hydro-500/40 bg-hydro-500/10'
        : highlightedAssetPath === path
          ? 'border-amber-400/50 bg-amber-500/10'
        : 'border-slate-700/40 bg-slate-900/50 hover:bg-slate-800/60'
    }`;

  useEffect(() => {
    if (!highlightedAssetPath || !panelRef.current) return;
    const target = Array.from(panelRef.current.querySelectorAll('[data-review-asset-path]')).find(
      (element) => element.getAttribute('data-review-asset-path') === highlightedAssetPath
    );
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedAssetPath]);

  return (
    <section ref={panelRef} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
      <h2 className="text-sm font-semibold text-slate-200">交付物与导出</h2>
      <div className="mt-1 text-xs text-slate-500">{loading ? '读取真实 artifacts 中...' : '优先展示真实案例产物'}</div>
      <div className="mt-4">
        <WorkspacePreviewPanel
          title="Review Workspace Preview"
          description="点击下方任意合同、看板或 memo 资产，在这里直接查看业务化预览。"
          badge="selected asset"
          loading={selectedAssetPreviewLoading}
          loadingText="正在读取当前选中资产..."
          error={selectedAssetPreviewError}
          preview={selectedAssetPreview}
          emptyText="请从下方资产列表中选择一个对象进行预览。"
        />
        {Array.isArray(selectedAssetActions) && selectedAssetActions.length > 0 ? (
          <div className="mt-3 rounded-xl border border-hydro-500/20 bg-hydro-500/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-hydro-300/80">Context Actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedAssetActions.map((action) => (
                <ReviewActionButton
                  key={action.key}
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={action.className || 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'}
                >
                  {action.label}
                </ReviewActionButton>
              ))}
            </div>
          </div>
        ) : null}
        {selectedAssetStatusNote ? (
          <div className="mt-2 text-[11px] text-hydro-200/90">{selectedAssetStatusNote}</div>
        ) : null}
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">交付文档包（delivery_pack）</div>
            <div className="mt-1 text-xs text-slate-500">
              写入 <span className="font-mono text-slate-400">cases/{shellCaseId}/contracts/delivery_pack/&lt;UTC&gt;/</span>
              ，并更新 <span className="font-mono text-slate-400">delivery_pack.latest.json</span>。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-400">
              交付包生成已收纳到上方动作中心
            </span>
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
        {deliveryPackError ? <p className="mt-2 text-[11px] text-rose-300/90">{deliveryPackError}</p> : null}
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
            ok: {deliveryPackLast.ok ? '是' : '否'} · eligible_at_pack_time: {deliveryPackLast.eligible_at_pack_time ? '是' : '否'}
          </p>
        ) : null}
        {caseContractSummary.delivery_pack_pointer_rel ? (
          <div className="mt-3 rounded-lg border border-slate-700/40 bg-slate-950/50 p-3 text-[11px] text-slate-500">
            <div className="font-medium text-slate-400">壳层摘要 · 最新交付包指针</div>
            <div className="mt-1">
              pack_id <span className="font-mono text-slate-300">{caseContractSummary.delivery_pack_id || '—'}</span>
              {' · '}
              eligible_at_pack_time: {caseContractSummary.delivery_pack_eligible_at_last_pack ? '是' : '否'}
              {caseContractSummary.delivery_pack_updated_at ? (
                <>
                  {' '}
                  · updated <span className="font-mono text-slate-400">{caseContractSummary.delivery_pack_updated_at}</span>
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
      <details className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
        <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Run / Review / Release 合同链</div>
            <div className="mt-1 text-xs text-slate-500">展开查看 triad 合同链与 bridge fallback 入口。</div>
          </div>
          <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">contract triad</span>
        </div>
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {contractChain.map((contract) => (
            <div
              key={contract.path}
              data-review-asset-path={contract.path}
              onClick={() => onSelectAsset?.(contract.path)}
              className={selectableCardClassName(contract.path)}
            >
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
              <ReviewPathActions path={contract.path} bridgePath={triadBridgePaths[contract.stage]} />
            </div>
          ))}
        </div>
      </details>
      <details className="mt-4 rounded-2xl border border-hydro-500/20 bg-hydro-500/5 p-4" open>
        <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Live 监控与验收入口</div>
            <div className="mt-1 text-xs text-slate-500">默认保持展开，确保当前案例的 live dashboard、coverage 和 verification 入口始终可见。</div>
          </div>
          <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
            pinned shell · {shellCaseId}
          </span>
        </div>
        </summary>
        <div className="mt-4 space-y-3">
          {liveMonitorAssets.map((asset) => (
            <ReviewEntityCard
              key={asset.path}
              title={asset.name}
              subtitle={asset.note}
              path={asset.path}
              data-review-asset-path={asset.path}
              cardClassName={selectableCardClassName(asset.path)}
              actions={<ReviewPathActions path={asset.path} />}
              data-testid="review-live-asset"
              data-contract-path={asset.path}
              onClick={() => onSelectAsset?.(asset.path)}
            />
          ))}
        </div>
      </details>
      {notebookAssetChain.length > 0 && (
        <details className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">Notebook / Memo / Manifest 联动</div>
              <div className="mt-1 text-xs text-slate-500">展开查看 notebook 原稿、memo 预览和 release manifest 链条。</div>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-300">
              notebook chain
            </span>
          </div>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {notebookAssetChain.map((asset) => (
              <ReviewEntityCard
                key={asset.path}
                title={asset.name}
                subtitle={asset.note}
                path={asset.path}
                data-review-asset-path={asset.path}
                cardClassName={selectableCardClassName(asset.path)}
                actions={<ReviewPathActions path={asset.path} />}
                onClick={() => onSelectAsset?.(asset.path)}
              >
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
              </ReviewEntityCard>
            ))}
          </div>
        </details>
      )}
      {standardObjectReportAssets?.length > 0 && (
        <details className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">标准对象报告</div>
                <div className="mt-1 text-xs text-slate-500">展开查看对象报告索引与标准样例文件，支持 JSON / Markdown 业务化预览。</div>
              </div>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] text-cyan-300">
                object reports
              </span>
            </div>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {standardObjectReportAssets.map((asset) => (
              <ReviewEntityCard
                key={asset.path}
                title={asset.label}
                subtitle={asset.note}
                path={asset.path}
                data-review-asset-path={asset.path}
                cardClassName={selectableCardClassName(asset.path)}
                actions={<ReviewPathActions path={asset.path} />}
                onClick={() => onSelectAsset?.(asset.path)}
              >
                <div className="mt-3">
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300">
                    {asset.previewType}
                  </span>
                </div>
              </ReviewEntityCard>
            ))}
          </div>
        </details>
      )}
      <details className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
        <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">路线图 / backlog 入口</div>
            <div className="mt-1 text-xs text-slate-500">展开查看当前案例壳层、backlog 和命令入口。</div>
          </div>
          <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">aligned</span>
        </div>
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {shellEntryPoints.map((entryPoint) => (
            <ReviewEntityCard
              key={entryPoint.path}
              title={entryPoint.title}
              subtitle={entryPoint.summary}
              path={entryPoint.path}
              data-review-asset-path={entryPoint.path}
              cardClassName={selectableCardClassName(entryPoint.path)}
              actions={<ReviewPathActions path={entryPoint.path} />}
              onClick={() => onSelectAsset?.(entryPoint.path)}
            >
              <div className="mt-3">
                <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {entryPoint.kind}
                </span>
              </div>
            </ReviewEntityCard>
          ))}
        </div>
      </details>
      <details className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/30 p-4">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">近期 artifacts</div>
              <div className="mt-1 text-xs text-slate-500">展开查看最新产物与本地打开入口。</div>
            </div>
            <span className="rounded-full border border-slate-700/50 px-3 py-1 text-[10px] text-slate-300">
              {artifacts.slice(0, 6).length} 项
            </span>
          </div>
        </summary>
      <div className="mt-4 space-y-3">
        {artifacts.slice(0, 6).map((report) => (
          <ReviewEntityCard
            key={report.name}
            title={report.name}
            subtitle={`${report.type || report.category || 'artifact'} · 更新于 ${report.updated || report.updated_at || 'unknown'}`}
            path={report.path}
            data-review-asset-path={report.path}
            cardClassName={selectableCardClassName(report.path)}
            actions={<ReviewPathActions path={report.path} />}
            onClick={() => onSelectAsset?.(report.path)}
          />
        ))}
      </div>
      </details>
    </section>
  );
}
