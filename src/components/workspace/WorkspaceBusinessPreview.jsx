export default function WorkspaceBusinessPreview({ preview, containerClassName = 'space-y-4' }) {
  if (!preview) return null;

  return (
    <div className={containerClassName}>
      <div>
        <div className="text-lg font-semibold text-slate-100">{preview.title}</div>
        {preview.description ? <div className="mt-2 text-sm leading-6 text-slate-400">{preview.description}</div> : null}
      </div>
      {Array.isArray(preview.badges) && preview.badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {preview.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-200"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      {Array.isArray(preview.sections) && preview.sections.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {preview.sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
              <div className="text-xs font-semibold text-slate-200">{section.title}</div>
              <div className="mt-3 space-y-2">
                {section.rows.map((row) => (
                  <div key={`${section.title}-${row.label}`} className="rounded-lg border border-slate-700/30 bg-slate-950/60 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{row.label}</div>
                    <div className="mt-1 break-all text-[11px] leading-5 text-slate-200">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <details className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
        <summary className="cursor-pointer list-none text-xs text-slate-300">查看原始内容</summary>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[11px] leading-6 text-slate-300">{preview.rawContent}</pre>
      </details>
    </div>
  );
}
