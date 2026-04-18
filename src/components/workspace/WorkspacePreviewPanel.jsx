import { useEffect, useRef } from 'react';

import WorkspaceBusinessPreview from './WorkspaceBusinessPreview';

export default function WorkspacePreviewPanel({
  eyebrow,
  title,
  description,
  badge,
  selectorItems = [],
  highlightedSelectorKey = '',
  onSelectItem,
  loading = false,
  loadingText = '正在读取预览...',
  error = '',
  emptyText = '请选择对象查看预览。',
  preview = null,
  renderPreview,
  wrapperClassName = '',
  cardClassName = 'rounded-2xl border border-hydro-500/20 bg-hydro-500/5 p-4',
  previewCardClassName = 'mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/50 p-4',
}) {
  const panelRef = useRef(null);
  const defaultRenderPreview = (value) => <WorkspaceBusinessPreview preview={value} />;

  useEffect(() => {
    if (!highlightedSelectorKey || !panelRef.current) return;
    const button = Array.from(panelRef.current.querySelectorAll('[data-selector-key]')).find(
      (element) => element.getAttribute('data-selector-key') === highlightedSelectorKey
    );
    button?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [highlightedSelectorKey]);

  return (
    <div ref={panelRef} className={`${cardClassName} ${wrapperClassName}`.trim()}>
      {title || description || badge || eyebrow ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow ? <div className="text-xs uppercase tracking-[0.2em] text-hydro-300/80">{eyebrow}</div> : null}
            {title ? <div className="mt-1 text-sm font-semibold text-slate-100">{title}</div> : null}
            {description ? <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div> : null}
          </div>
          {badge ? (
            <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-200">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}

      {selectorItems.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectorItems.map((item) => (
            <button
              key={item.key}
              type="button"
              data-selector-key={item.key}
              onClick={() => onSelectItem?.(item.key)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                item.selected
                  ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                  : highlightedSelectorKey === item.key
                    ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700/50 bg-slate-900/50 text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={previewCardClassName}>
        {loading ? (
          <div className="text-sm text-slate-500">{loadingText}</div>
        ) : error ? (
          <div className="text-sm text-rose-300">{error}</div>
        ) : preview ? (
          (renderPreview || defaultRenderPreview)(preview)
        ) : (
          <div className="text-sm text-slate-500">{emptyText}</div>
        )}
      </div>
    </div>
  );
}
