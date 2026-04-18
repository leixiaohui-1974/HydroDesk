import { useEffect, useRef } from 'react';

import WorkspaceBusinessPreview from '../workspace/WorkspaceBusinessPreview';
import WorkspacePreviewPanel from '../workspace/WorkspacePreviewPanel';

export function ProjectCenterActionButton({ children, className = '', ...props }) {
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

export function ProjectCenterActionGroup({ title, summary, defaultOpen = false, children }) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-zinc-800 bg-zinc-900"
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-zinc-200">{title}</div>
            <div className="mt-1 text-[10px] leading-4 text-zinc-500">{summary}</div>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
            展开
          </span>
        </div>
      </summary>
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </details>
  );
}

export function ProjectCenterActionMenu({ label = '更多操作', items = [] }) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[11px] text-zinc-300">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-zinc-800/60 bg-zinc-950/95 p-2 shadow-2xl">
        <div className="space-y-2">
          {items.map((item) => (
            <ProjectCenterActionButton
              key={item.key}
              disabled={item.disabled}
              onClick={item.onClick}
              className={`w-full text-left ${item.className}`}
              title={item.title}
            >
              {item.label}
            </ProjectCenterActionButton>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ProjectCenterTopTabs({
  caseSummary,
  gateLabel,
  projectCenterPageTab,
  setProjectCenterPageTab,
  shellCaseId,
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'work', label: '当前工作' },
          { key: 'catalog', label: '案例目录' },
          { key: 'analysis', label: '平台分析' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`project-center-page-tab-${tab.key}`}
            aria-pressed={projectCenterPageTab === tab.key}
            onClick={() => setProjectCenterPageTab(tab.key)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              projectCenterPageTab === tab.key
                ? 'border-zinc-700 bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                : 'border-zinc-800/50 bg-zinc-900/50 text-zinc-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <details className="rounded-full border border-zinc-800/50 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300">
        <summary className="cursor-pointer list-none">状态摘要</summary>
        <div className="mt-2 text-[11px] text-zinc-400">
          案例 {shellCaseId || '—'} · Gate {gateLabel} · 证据 {caseSummary.evidence_bound_count}
        </div>
      </details>
    </div>
  );
}

export function ProjectCenterWorkspaceHero({
  navigate,
  projectCenterPrimaryActions,
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">自主运行水网建模 Agent 平台 · 全案例闭环</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">
            配置驱动闭环：原始数据契约 → 建模链 → HTML / release；细节规则与批量工具已后置到分析区。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/docs#page-projectcenter')}
          className="rounded-lg border border-zinc-800/50 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300"
        >
          查看本页说明
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-zinc-100">主操作</div>
            <div className="mt-1 text-[10px] leading-4 text-zinc-500">先看 readiness，再执行主动作。</div>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
            高频保留
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {projectCenterPrimaryActions.slice(0, 2).map((action) => (
            <ProjectCenterActionButton
              key={action.key}
              disabled={action.disabled}
              onClick={action.onClick}
              className={action.className}
            >
              {action.label}
            </ProjectCenterActionButton>
          ))}
          <ProjectCenterActionMenu label="更多入口" items={projectCenterPrimaryActions.slice(2)} />
        </div>
        <details className="mt-3 rounded-lg border border-zinc-800/40 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">入口重组说明</summary>
          <div className="mt-2 text-[10px] leading-5 text-zinc-500">
            默认保留当前工作；新增、编辑和批量诊断已后置。
          </div>
        </details>
      </div>
    </section>
  );
}

function getWorkspacePreviewKind(filePath = '') {
  const lowerPath = String(filePath).toLowerCase();
  if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) return 'markdown';
  if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) return 'html';
  if (lowerPath.endsWith('.json')) return 'json';
  if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 'yaml';
  return 'text';
}

function renderMarkdownBlocks(markdown = '') {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let codeLines = [];
  let inCode = false;
  let keyIndex = 0;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${keyIndex++}`} className="text-sm leading-7 text-zinc-300">
        {paragraph.join(' ')}
      </p>
    );
    paragraph = [];
  }

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${keyIndex++}`} className="ml-5 list-disc space-y-2 text-sm leading-6 text-zinc-300">
        {listItems.map((item, index) => (
          <li key={`li-${keyIndex}-${index}`}>{item}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function flushCode() {
    if (codeLines.length === 0) return;
    blocks.push(
      <pre
        key={`code-${keyIndex++}`}
        className="overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-3 text-xs leading-6 text-emerald-200"
      >
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
    codeLines = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      }
      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeLines.push(trimmed);
      return;
    }

    if (!trimmed.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h1 key={`h1-${keyIndex++}`} className="text-2xl font-semibold text-slate-100">
          {trimmed.slice(2)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={`h2-${keyIndex++}`} className="text-xl font-semibold text-slate-100">
          {trimmed.slice(3)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h3-${keyIndex++}`} className="text-lg font-semibold text-zinc-200">
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      return;
    }

    paragraph.push(trimmed.trim());
  });

  flushParagraph();
  flushList();
  flushCode();

  if (blocks.length === 0) {
    return <div className="text-sm text-zinc-500">当前 Markdown 为空。</div>;
  }

  return <div className="space-y-4">{blocks}</div>;
}

function renderWorkspaceTreeNodes(nodes, selectedFilePath, highlightedFilePath, onSelectFile, level = 0) {
  return nodes.map((node) => {
    const isSelected = !node.isDirectory && node.path === selectedFilePath;
    const paddingLeft = 10 + level * 14;

    if (node.isDirectory) {
      return (
        <details key={node.id} open={level < 1} className="rounded-lg border border-slate-800/60 bg-zinc-950/25">
          <summary
            className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-300"
            style={{ paddingLeft }}
          >
            {node.label}
          </summary>
          <div className="space-y-1 border-t border-slate-800/60 py-2">
            {node.children?.length ? (
              renderWorkspaceTreeNodes(node.children, selectedFilePath, highlightedFilePath, onSelectFile, level + 1)
            ) : (
              <div className="px-4 py-1 text-[11px] text-slate-600" style={{ paddingLeft: paddingLeft + 10 }}>
                空目录
              </div>
            )}
          </div>
        </details>
      );
    }

    return (
      <button
        key={node.id}
        type="button"
        data-workspace-file-path={node.path}
        onClick={() => onSelectFile(node.path)}
        className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
          isSelected
            ? 'border border-hydro-500/30 bg-hydro-500/10 text-hydro-200'
            : highlightedFilePath === node.path
              ? 'border border-amber-400/50 bg-amber-500/10 text-amber-200'
            : 'border border-transparent bg-zinc-950/20 text-zinc-400 hover:border-zinc-800/60 hover:bg-zinc-900/60 hover:text-zinc-200'
        }`}
        style={{ paddingLeft }}
      >
        <div className="truncate">{node.label}</div>
        <div className="truncate text-[10px] text-zinc-500">{node.path}</div>
      </button>
    );
  });
}

export function ProjectCenterWorkspaceSection({
  shellCaseId,
  isDesktop,
  workspaceRootRel,
  workspaceStatusNote,
  workspaceIntelligence,
  workspaceSuggestedActions,
  workspaceLoading,
  workspaceError,
  workspaceNodes,
  selectedFilePath,
  highlightedFilePath,
  onSelectFile,
  workspacePreview,
  workspacePreviewLoading,
  workspacePreviewError,
  workspacePreviewActions,
  onSelectDirectory,
  onOpenWorkspace,
  onRevealWorkspace,
  onOpenSelectedFile,
  onRevealSelectedFile,
  liveOutputLogFile,
  liveOutputLines,
  liveOutputHistory,
  onOpenLiveOutputLog,
  onRevealLiveOutputLog,
  liveOutputEntries,
}) {
  const treePanelRef = useRef(null);
  const previewKind = workspacePreview?.kind || getWorkspacePreviewKind(selectedFilePath);
  useEffect(() => {
    if (!highlightedFilePath || !treePanelRef.current) return;
    const target = Array.from(treePanelRef.current.querySelectorAll('[data-workspace-file-path]')).find(
      (element) => element.getAttribute('data-workspace-file-path') === highlightedFilePath
    );
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedFilePath]);
  const renderWorkspacePreviewContent = (preview) => {
    if (previewKind === 'business') {
      return <WorkspaceBusinessPreview preview={preview} containerClassName="h-[420px] overflow-y-auto p-5 space-y-4" />;
    }
    if (previewKind === 'html') {
      return (
        <iframe
          title={preview.path}
          sandbox=""
          srcDoc={preview.content}
          className="h-[420px] w-full bg-white"
        />
      );
    }
    if (previewKind === 'markdown') {
      return <div className="h-[420px] overflow-y-auto p-5">{renderMarkdownBlocks(preview.content)}</div>;
    }
    return <pre className="h-[420px] overflow-auto p-4 text-xs leading-6 text-zinc-300">{preview.content}</pre>;
  };
  const workspaceStageClassName =
    workspaceIntelligence?.stage === 'continuation'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : workspaceIntelligence?.stage === 'model-update'
        ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-200'
        : workspaceIntelligence?.stage === 'model-bootstrap'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          : 'border-zinc-800/50 bg-zinc-950/60 text-zinc-300';

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Case Workspace</div>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">{shellCaseId || '当前案例'} 目录工作面</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            左侧浏览真实文件，中间自动预览内容，右侧跟随最近输出；桌面端读取真实目录，浏览器预览只保留只读说明。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-zinc-800/50 bg-zinc-950/60 px-3 py-1 text-[10px] text-zinc-400">
            {isDesktop ? '桌面真实目录' : '浏览器只读预览'}
          </span>
          <ProjectCenterActionButton
            disabled={!isDesktop || !onSelectDirectory}
            onClick={onSelectDirectory}
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          >
            选择目录
          </ProjectCenterActionButton>
          <ProjectCenterActionButton onClick={onOpenWorkspace} className="border-zinc-700 bg-zinc-800 text-zinc-100 font-medium shadow-sm">
            打开当前目录
          </ProjectCenterActionButton>
          <ProjectCenterActionButton onClick={onRevealWorkspace} className="border-zinc-800/50 bg-zinc-900/50 text-zinc-300">
            定位目录
          </ProjectCenterActionButton>
        </div>
      </div>
      {workspaceStatusNote ? (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200">
          {workspaceStatusNote}
        </div>
      ) : null}
      {workspaceIntelligence ? (
        <div className="mt-3 rounded-2xl border border-zinc-800/40 bg-zinc-950/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-zinc-200">Workspace Intelligence</div>
              <div className="mt-1 text-xs text-zinc-400">{workspaceIntelligence.recommendation}</div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[10px] ${workspaceStageClassName}`}>
              {workspaceIntelligence.headline}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-zinc-800/50 bg-zinc-950/60 px-2 py-0.5 text-zinc-400">
              文件 {workspaceIntelligence.counts.files}
            </span>
            <span className="rounded-full border border-zinc-800/50 bg-zinc-950/60 px-2 py-0.5 text-zinc-400">
              Markdown {workspaceIntelligence.counts.markdown}
            </span>
            <span className="rounded-full border border-zinc-800/50 bg-zinc-950/60 px-2 py-0.5 text-zinc-400">
              HTML {workspaceIntelligence.counts.html}
            </span>
            {workspaceIntelligence.flags.hasModelAssets ? (
              <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-0.5 text-hydro-200">模型资产</span>
            ) : null}
            {workspaceIntelligence.flags.hasContracts ? (
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-zinc-300">contracts</span>
            ) : null}
            {workspaceIntelligence.flags.hasRunArtifacts ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">运行产物</span>
            ) : null}
            {workspaceIntelligence.flags.hasSourceData ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">原始数据</span>
            ) : null}
          </div>
        </div>
      ) : null}
      {Array.isArray(workspaceSuggestedActions) && workspaceSuggestedActions.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-hydro-500/20 bg-hydro-500/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-slate-100">Next Actions</div>
              <div className="mt-1 text-xs text-zinc-400">基于当前目录状态，优先执行这几个动作。</div>
            </div>
            <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-0.5 text-[10px] text-hydro-200">
              recommended
            </span>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {workspaceSuggestedActions.map((action) => (
              <div key={action.key} className="rounded-xl border border-zinc-800/40 bg-zinc-950/60 p-3">
                <div className="text-[11px] font-medium text-zinc-200">{action.label}</div>
                <div className="mt-1 text-[10px] leading-5 text-zinc-500">{action.summary}</div>
                <ProjectCenterActionButton
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={`mt-3 ${action.className || 'border-zinc-700 bg-zinc-800 text-zinc-100 font-medium shadow-sm'}`}
                >
                  {action.ctaLabel || action.label}
                </ProjectCenterActionButton>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr,1.4fr,0.75fr]">
        <aside className="rounded-2xl border border-zinc-800/40 bg-zinc-950/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-zinc-200">Workspace Explorer</div>
              <div className="mt-1 text-[10px] text-zinc-500">{workspaceRootRel || '当前案例目录'}</div>
            </div>
            {workspaceLoading ? <span className="text-[10px] text-zinc-500">扫描中...</span> : null}
          </div>
          {workspaceError ? (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
              {workspaceError}
            </div>
          ) : null}
          <div ref={treePanelRef} className="mt-3 space-y-2">
            {workspaceNodes.length > 0 ? (
              renderWorkspaceTreeNodes(workspaceNodes, selectedFilePath, highlightedFilePath, onSelectFile)
            ) : (
              <div className="rounded-lg border border-zinc-800/40 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-500">
                当前目录暂无可浏览文件。
              </div>
            )}
          </div>
        </aside>

        <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/60 pb-3">
            <div>
              <div className="text-[11px] font-medium text-zinc-200">Task / File Canvas</div>
              <div className="mt-1 text-[10px] text-zinc-500">{selectedFilePath || '请选择文件查看预览'}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                {previewKind}
              </span>
              <ProjectCenterActionButton
                disabled={!selectedFilePath}
                onClick={onOpenSelectedFile}
                className="border-zinc-700 bg-zinc-800 text-zinc-100 font-medium shadow-sm"
              >
                打开文件
              </ProjectCenterActionButton>
              <ProjectCenterActionButton
                disabled={!selectedFilePath}
                onClick={onRevealSelectedFile}
                className="border-zinc-800/50 bg-zinc-900/50 text-zinc-300"
              >
                定位文件
              </ProjectCenterActionButton>
            </div>
          </div>

          {Array.isArray(workspacePreviewActions) && workspacePreviewActions.length > 0 ? (
            <div className="mt-3 rounded-xl border border-hydro-500/20 bg-hydro-500/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-hydro-300/80">Context Actions</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {workspacePreviewActions.map((action) => (
                  <ProjectCenterActionButton
                    key={action.key}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={action.className || 'border-zinc-700 bg-zinc-800 text-zinc-100 font-medium shadow-sm'}
                  >
                    {action.label}
                  </ProjectCenterActionButton>
                ))}
              </div>
            </div>
          ) : null}

          <WorkspacePreviewPanel
            loading={workspacePreviewLoading}
            loadingText="正在读取文件预览..."
            error={workspacePreviewError}
            preview={workspacePreview?.content ? workspacePreview : null}
            emptyText="请选择目录中的文件，自动渲染 Markdown、HTML、JSON、YAML 或文本内容。"
            renderPreview={renderWorkspacePreviewContent}
            cardClassName=""
            previewCardClassName="mt-4 min-h-[420px] overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/60"
          />
          {workspacePreview?.truncated ? (
            <div className="mt-2 text-[10px] text-amber-300">预览已截断，完整内容请用“打开文件”查看。</div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-zinc-800/40 bg-zinc-950/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-zinc-200">Live Output</div>
              <div className="mt-1 text-[10px] text-zinc-500">跟随当前日志尾部、执行历史和最近动作摘要</div>
            </div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
              live
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-zinc-200">实时日志尾部</div>
                  <div className="mt-1 break-all text-[10px] leading-5 text-zinc-500">
                    {liveOutputLogFile || '尚未检测到日志文件'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{liveOutputLines.length} lines</span>
                  {liveOutputLogFile ? (
                    <>
                      <button
                        type="button"
                        onClick={onOpenLiveOutputLog}
                        className="text-[10px] text-hydro-400 transition-colors hover:text-hydro-300"
                      >
                        打开
                      </button>
                      <button
                        type="button"
                        onClick={onRevealLiveOutputLog}
                        className="text-[10px] text-zinc-400 transition-colors hover:text-zinc-300"
                      >
                        定位
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-zinc-800/40 bg-zinc-950/70 p-3 font-mono text-[10px] leading-5 text-zinc-300">
                {liveOutputLines.length > 0 ? (
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words">{liveOutputLines.join('\n')}</pre>
                ) : (
                  <div className="text-zinc-500">启动 workflow 或运行动作后，这里会自动刷新最新日志输出。</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-medium text-zinc-200">最近执行历史</div>
                <span className="text-[10px] text-zinc-500">{liveOutputHistory.length} 条</span>
              </div>
              <div className="mt-3 space-y-2">
                {liveOutputHistory.length > 0 ? (
                  liveOutputHistory.map((run) => (
                    <div key={run.id || `${run.workflow}-${run.pid}-${run.started_at || ''}`} className="rounded-lg border border-zinc-800/40 bg-zinc-950/60 p-3">
                      <div className="text-[11px] font-medium text-zinc-200">{run.workflow || run.name || 'workflow'}</div>
                      <div className="mt-1 text-[10px] leading-5 text-zinc-500">
                        case {run.case_id || '—'} · pid {run.pid || '—'} · {run.status || 'unknown'}
                      </div>
                      {run.started_at ? (
                        <div className="mt-1 text-[10px] text-slate-600">{run.started_at}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-800/50 px-3 py-3 text-[11px] text-zinc-500">
                    暂无真实执行记录，启动 workflow 后这里会持续累积。
                  </div>
                )}
              </div>
            </div>

            {liveOutputEntries.length > 0 ? (
              liveOutputEntries.map((entry) => (
                <div key={entry.key} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-medium text-zinc-200">{entry.title}</div>
                    <span className="text-[10px] text-zinc-500">{entry.level}</span>
                  </div>
                  {entry.summary ? <div className="mt-1 text-[10px] leading-5 text-zinc-500">{entry.summary}</div> : null}
                  {entry.body ? <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-zinc-300">{entry.body}</pre> : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 px-3 py-3 text-[11px] text-zinc-500">
                先执行当前工作动作，这里会持续显示最近输出和产物摘要。
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ProjectCenterCatalogSection({
  caseSummary,
  caseSummaryLoading,
  contractChain,
  hydroPortfolioCatalog,
  openPath,
  pipelineTruthClassName,
  primarySurfaceLabels,
  reviewAssets,
  revealPath,
  shellCaseId,
  triadBridgePaths,
  triadMeta,
}) {
  return (
    <>
      <section
        data-testid="project-center-catalog-overview"
        className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">项目群中控</h2>
            <p className="mt-1 text-xs text-zinc-500">把端到端链路拆到真实项目：谁拥有 workflow、谁负责验收、谁是协议面。</p>
          </div>
          <span className="text-xs text-zinc-500">HydroDesk 作为统一编排壳</span>
        </div>
        <details className="mt-4 rounded-xl border border-zinc-800/30 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开查看项目群目录、文件与集成说明</summary>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {hydroPortfolioCatalog.map((project) => (
              <div key={project.id} className="rounded-2xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{project.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">{project.path}</div>
                  </div>
                  <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                    {primarySurfaceLabels[project.primarySurface]}
                  </span>
                </div>
                <div className="mt-3 text-sm text-zinc-300">{project.role}</div>
                <div className="mt-2 text-xs leading-5 text-zinc-500">{project.summary}</div>
                <div className="mt-3 text-xs text-zinc-400">目录: {project.directories.join(' · ')}</div>
                <div className="mt-2 text-xs text-zinc-400">文件: {project.files.join(' · ')}</div>
                <div className="mt-3 rounded-xl border border-zinc-800/40 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-400">
                  {project.integrationNote}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section
        data-testid="project-center-catalog-contract-chain"
        className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Run / Review / Release 合同链</h2>
            <p className="mt-1 text-xs text-zinc-500">把当前案例运行、审查和交付 contract 固定成 HydroDesk 可追踪的三段式链路。</p>
            <p className="mt-1 text-[10px] text-slate-600">
              统一签发 Gate（审查页 P2）：triad {caseSummaryLoading ? '…' : `${caseSummary.triad_count ?? 0}/3`}
              {!caseSummaryLoading ? ` · ${triadMeta.label}` : ''}
              {!caseSummaryLoading ? ` · pipeline ${caseSummary.pipeline_contract_ready ? 'ready' : 'not_ready'}` : ''}
              {caseSummary.release_gate_eligible ? ' · 无阻断项' : ' · 见审查页 blockers'}
              {caseSummary.delivery_pack_pointer_rel ? ` · 交付包 ${caseSummary.delivery_pack_id || 'latest'}` : ''}
            </p>
          </div>
          <span className="text-xs text-zinc-500">hydromind-contracts aligned</span>
        </div>
        <details className="mt-4 rounded-xl border border-zinc-800/30 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开查看 triad 合同链、状态与文件入口</summary>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {contractChain.map((contract) => (
              <div key={contract.path} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-500">{contract.stage}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">{contract.contractName}</div>
                  </div>
                  <span className="rounded-full border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-300">
                    {contract.status}
                  </span>
                </div>
                <div className="mt-3 text-xs leading-5 text-zinc-400">{contract.note}</div>
                {contract.stage === 'Run' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${triadMeta.className}`}>{triadMeta.label}</span>
                    <span className="text-[10px] text-zinc-500">
                      real {caseSummary.triad_real_count ?? 0} · placeholder {caseSummary.triad_placeholder_count ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      canonical {caseSummary.triad_canonical_count ?? 0} · bridge {caseSummary.triad_bridge_fallback_count ?? 0}
                    </span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${pipelineTruthClassName}`}>
                      pipeline {caseSummary.pipeline_contract_ready ? 'ready' : 'not_ready'}
                    </span>
                  </div>
                ) : null}
                <div className="mt-3 text-[10px] leading-5 text-zinc-500">{contract.path}</div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => openPath(contract.path)} className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300">
                    打开
                  </button>
                  <button onClick={() => revealPath(contract.path)} className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300">
                    定位
                  </button>
                  {triadBridgePaths[contract.stage] ? (
                    <button
                      onClick={() => openPath(triadBridgePaths[contract.stage])}
                      className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200"
                      title="显式打开 bridge fallback（.contract.json）"
                    >
                      打开 Bridge
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section
        data-testid="project-center-catalog-review-assets"
        className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">验收资产面板</h2>
            <p className="mt-1 text-xs text-zinc-500">`md/html/json` 是案例 E2E 的真实进度源，HydroDesk 用它们做产品化展示。</p>
          </div>
          <span className="text-xs text-zinc-500">固定验收壳 · {shellCaseId}</span>
        </div>
        <details className="mt-4 rounded-xl border border-zinc-800/30 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开查看验收资产与本地打开入口</summary>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {reviewAssets.map((artifact) => (
              <div key={artifact.path} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-100">{artifact.name}</div>
                  <span className="rounded-full border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-300">{artifact.category}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-zinc-500">{artifact.path}</div>
                <div className="mt-3 text-[10px] text-zinc-500">updated_at {artifact.updated_at || 'pinned entry point'}</div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => openPath(artifact.path)} className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300">
                    打开
                  </button>
                  <button onClick={() => revealPath(artifact.path)} className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300">
                    定位
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>
    </>
  );
}

export function ProjectCenterAnalysisSection({
  activeProject,
  checkpoints,
  executionSurfaceCatalog,
  openPath,
  reloadRuntime,
  revealPath,
  shellEntryPoints,
  studioDeliveryWavePlan,
}) {
  return (
    <>
      <section className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">后续开发任务</h2>
            <p className="mt-1 text-xs text-zinc-500">围绕自主运行主链和 HydroDesk 端到端测试壳，按波次推进。</p>
          </div>
          <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300">
            roadmap / backlog 已对齐到 case shell
          </span>
        </div>
        <details className="mt-4 rounded-xl border border-zinc-800/30 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开查看开发波次规划与 shell 入口</summary>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {studioDeliveryWavePlan.map((wave) => (
              <div key={wave.title} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="text-sm font-semibold text-slate-100">{wave.title}</div>
                <div className="mt-3 space-y-2">
                  {wave.items.map((item) => (
                    <div key={item} className="text-xs leading-5 text-zinc-400">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-4">
            {shellEntryPoints.map((entryPoint) => (
              <div key={entryPoint.path} className="rounded-xl border border-zinc-800/40 bg-zinc-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">{entryPoint.title}</div>
                  <span className="rounded-full border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-300">{entryPoint.kind}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-zinc-400">{entryPoint.summary}</div>
                <div className="mt-3 text-[10px] leading-5 text-zinc-500">{entryPoint.path}</div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => openPath(entryPoint.path)} className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300">
                    打开
                  </button>
                  <button onClick={() => revealPath(entryPoint.path)} className="rounded-lg border border-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300">
                    定位
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">执行面分层</h2>
        <details className="mt-4 rounded-xl border border-zinc-800/30 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开查看执行面分层与使用说明</summary>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {Object.entries(executionSurfaceCatalog).map(([surfaceId, surface]) => (
              <div key={surfaceId} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="text-sm font-medium text-slate-100">{surface.label}</div>
                <div className="mt-2 text-xs leading-5 text-zinc-500">{surface.summary}</div>
                <div className="mt-3 text-xs text-zinc-400">{surface.whenToUse}</div>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="rounded-2xl border border-zinc-800/50 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">最近 checkpoints</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{activeProject.caseId}</span>
            <button onClick={reloadRuntime} className="rounded-lg border border-zinc-800/50 px-2 py-1 text-[10px] text-zinc-300 hover:bg-slate-800/60">
              刷新
            </button>
          </div>
        </div>
        <details className="mt-4 rounded-xl border border-zinc-800/30 bg-zinc-950/30 p-3">
          <summary className="cursor-pointer list-none text-[11px] text-zinc-300">展开查看最近 checkpoints</summary>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {checkpoints.slice(0, 6).map((checkpoint) => (
              <div key={checkpoint.path} className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-200">{checkpoint.name}</div>
                  {checkpoint.current ? (
                    <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
                      current
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-zinc-500">{checkpoint.path}</div>
              </div>
            ))}
          </div>
        </details>
      </section>
    </>
  );
}
