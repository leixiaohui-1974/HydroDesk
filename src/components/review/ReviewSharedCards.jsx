import { openPath, revealPath } from '../../api/tauri_bridge';

export function ReviewActionButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function ReviewActionGroup({ title, summary, defaultOpen = false, children }) {
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

export function ReviewActionMenu({ label = '更多操作', items = [] }) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-lg border border-slate-700/50 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-300">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-700/60 bg-slate-950/95 p-2 shadow-2xl">
        <div className="space-y-2">
          {items.map((item) => (
            <ReviewActionButton
              key={item.key}
              disabled={item.disabled}
              onClick={item.onClick}
              className={`w-full text-left ${item.className || ''}`}
              title={item.title}
            >
              {item.label}
            </ReviewActionButton>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ReviewPathActions({
  path,
  bridgePath = '',
  openLabel = '打开',
  revealLabel = '定位',
  bridgeLabel = '打开 Bridge',
  bridgeTitle = '显式打开 bridge fallback（.contract.json）',
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={() => openPath(path)}
        className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300"
      >
        {openLabel}
      </button>
      <button
        onClick={() => revealPath(path)}
        className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300"
      >
        {revealLabel}
      </button>
      {bridgePath ? (
        <button
          onClick={() => openPath(bridgePath)}
          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200"
          title={bridgeTitle}
        >
          {bridgeLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ReviewEntityCard({
  title,
  subtitle = '',
  path = '',
  cardClassName = 'rounded-xl border border-slate-700/40 bg-slate-900/50 p-4',
  children,
  actions,
  ...props
}) {
  return (
    <div className={cardClassName} {...props}>
      <div className="text-sm text-slate-200">{title}</div>
      {subtitle ? <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div> : null}
      {children}
      {path ? <div className="mt-3 text-xs text-slate-500">{path}</div> : null}
      {actions}
    </div>
  );
}
