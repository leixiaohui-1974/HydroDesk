import { useEffect, useMemo, useState } from 'react';
import { openPath, revealPath } from '../api/tauri_bridge';
import useTauri from '../hooks/useTauri';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import {
  buildDefaultNotebookMetadata,
  buildNotebookMarkdown as buildSharedNotebookMarkdown,
  buildNotebookPayload,
  buildReleaseNoteMarkdown as buildSharedReleaseNoteMarkdown,
  buildReviewMemoMarkdown as buildSharedReviewMemoMarkdown,
} from '../data/notebookArtifacts';
import {
  getCaseReviewAssets,
  getCaseShellEntryPoints,
  resolveShellCaseId,
} from '../data/case_contract_shell';
import { useCaseRunReviewReleaseContracts } from '../hooks/useCaseRunReviewReleaseContracts';
import { usePlatformGovernanceGates } from '../hooks/usePlatformGovernanceGates';

const notebookSections = [
  { key: 'baseline', title: '基线与上下文' },
  { key: 'evidence', title: '证据摘录' },
  { key: 'release', title: '签发备注' },
];

function buildDefaultNotes(caseId, projectName) {
  return {
    baseline: `项目：${projectName}\n案例：${caseId}\n\n- 记录本次 North Star、run_id、coverage gate 和 review 范围\n- 把关键 contracts 与 live dashboard 锚定到同一笔记页`,
    evidence: `- Outcome Coverage Report\n- Verification Report\n- ReviewBundle / ReleaseManifest\n\n在这里整理证据路径、差异和人工确认结论。`,
    release: `- 当前结论：\n- 待签发风险：\n- Release gate：\n- 下一步：`,
  };
}

export default function NotebookWorkspace() {
  const { activeProject } = useStudioWorkspace();
  const { isTauri, readFile, writeFile, showMessage } = useTauri();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const storageKey = `hydrodesk-notebook-${shellCaseId}`;
  const notebookJsonPath = `cases/${shellCaseId}/contracts/hydrodesk_notebook.latest.json`;
  const notebookMarkdownPath = `cases/${shellCaseId}/contracts/hydrodesk_notebook.latest.md`;
  const reviewMemoPath = `cases/${shellCaseId}/contracts/hydrodesk_review_memo.latest.md`;
  const releaseNotePath = `cases/${shellCaseId}/contracts/hydrodesk_release_note.latest.md`;
  const reviewAssets = useMemo(() => getCaseReviewAssets(shellCaseId), [shellCaseId]);
  const contracts = useCaseRunReviewReleaseContracts(shellCaseId);
  const entryPoints = useMemo(() => getCaseShellEntryPoints(shellCaseId).slice(0, 4), [shellCaseId]);
  const releaseEvidenceAssets = useMemo(
    () => [
      ...reviewAssets.filter((asset) => asset.category === 'gate' || asset.name === 'HydroDesk Release Note'),
      contracts.find((contract) => contract.contractName === 'ReleaseManifest'),
      { name: 'HydroDesk Notebook JSON', path: notebookJsonPath },
      { name: 'HydroDesk Notebook Markdown', path: notebookMarkdownPath },
      { name: 'HydroDesk Review Memo', path: reviewMemoPath },
    ].filter(Boolean),
    [contracts, notebookJsonPath, notebookMarkdownPath, releaseNotePath, reviewAssets, reviewMemoPath]
  );
  const { rows: governanceGates } = usePlatformGovernanceGates(shellCaseId);
  const [activeSection, setActiveSection] = useState('baseline');
  const [notes, setNotes] = useState(() => buildDefaultNotes(shellCaseId, activeProject.name));
  const [metadata, setMetadata] = useState(() => buildDefaultNotebookMetadata());
  const [storageState, setStorageState] = useState('未保存');
  const [saving, setSaving] = useState(false);
  const [generatingMemo, setGeneratingMemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      if (isTauri) {
        try {
          const content = await readFile(notebookJsonPath);
          const parsed = JSON.parse(content);
          if (!cancelled && parsed && typeof parsed === 'object' && parsed.sections) {
            setNotes((current) => ({ ...current, ...parsed.sections }));
            setMetadata((current) => ({ ...current, ...(parsed.metadata || {}) }));
            setStorageState('已从 contracts 载入');
            return;
          }
        } catch (error) {
          if (!cancelled) {
            setStorageState('本地草稿模式');
          }
        }
      }
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!cancelled && parsed && typeof parsed === 'object') {
            setNotes((current) => ({ ...current, ...(parsed.sections || parsed) }));
            if (parsed.metadata && typeof parsed.metadata === 'object') {
              setMetadata((current) => ({ ...current, ...parsed.metadata }));
            }
            setStorageState('已从本地草稿载入');
            return;
          }
        } catch (error) {
          window.localStorage.removeItem(storageKey);
        }
      }
      if (!cancelled) {
        setNotes(buildDefaultNotes(shellCaseId, activeProject.name));
        setStorageState(isTauri ? '待写入 contracts' : '本地草稿模式');
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, [activeProject.name, isTauri, notebookJsonPath, readFile, shellCaseId, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(buildNotebookPayload(shellCaseId, activeProject.name, notes, metadata))
    );
  }, [activeProject.name, metadata, notes, shellCaseId, storageKey]);

  function appendNote(text) {
    setNotes((current) => ({
      ...current,
      [activeSection]: `${current[activeSection] || ''}\n${text}`.trim(),
    }));
  }

  const activeText = notes[activeSection] || '';

  async function handleSaveNotebook() {
    setSaving(true);
    try {
      if (isTauri) {
        await writeFile(
          notebookJsonPath,
          JSON.stringify(buildNotebookPayload(shellCaseId, activeProject.name, notes, metadata), null, 2)
        );
        await writeFile(
          notebookMarkdownPath,
          buildSharedNotebookMarkdown(shellCaseId, activeProject.name, notes, metadata)
        );
        setStorageState('已写入 contracts');
        await showMessage(`已保存到\n${notebookJsonPath}\n${notebookMarkdownPath}`, {
          title: 'Notebook 已保存',
          type: 'info',
        });
      } else {
        setStorageState('已保存到本地草稿');
      }
    } catch (error) {
      setStorageState('保存失败');
      await showMessage(error.message || String(error), {
        title: 'Notebook 保存失败',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateMemo(kind) {
    const targetPath = kind === 'review' ? reviewMemoPath : releaseNotePath;
    const content =
      kind === 'review'
        ? buildSharedReviewMemoMarkdown(shellCaseId, activeProject.name, notes, contracts, reviewAssets, metadata)
        : buildSharedReleaseNoteMarkdown(shellCaseId, activeProject.name, notes, contracts, metadata, releaseEvidenceAssets, governanceGates);

    setGeneratingMemo(true);
    try {
      if (isTauri) {
        await writeFile(targetPath, content);
        await showMessage(`已生成\n${targetPath}`, {
          title: kind === 'review' ? 'Review Memo 已生成' : 'Release Note 已生成',
          type: 'info',
        });
      } else {
        await showMessage(content, {
          title: kind === 'review' ? 'Review Memo 预览' : 'Release Note 预览',
          type: 'info',
        });
      }
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: 'Memo 生成失败',
        type: 'error',
      });
    } finally {
      setGeneratingMemo(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[0.9fr,1.4fr,1fr] gap-0">
      <section className="border-r border-slate-700/50 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Notebook 工作面</div>
        <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4 text-xs leading-6 text-slate-400">
          这里聚焦 evidence notebook：把 outcome、coverage、review bundle、release gate 与人工签发备注放在同一工作面。
        </div>
        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-200">笔记章节</div>
          <div className="mt-3 space-y-2">
            {notebookSections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                  activeSection === section.key
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-slate-700/40 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-200">关键入口</div>
          <div className="mt-3 space-y-2">
            {entryPoints.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-700/40 bg-slate-950/60 p-3">
                <div className="text-sm text-slate-200">{item.title}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{item.summary}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
          <div className="text-sm font-semibold text-slate-200">签发元数据</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[11px] text-slate-500">版本号</div>
              <input
                value={metadata.version}
                onChange={(event) => setMetadata((current) => ({ ...current, version: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 outline-none"
              />
            </div>
            <div>
              <div className="text-[11px] text-slate-500">签发状态</div>
              <select
                value={metadata.signoffStatus}
                onChange={(event) => setMetadata((current) => ({ ...current, signoffStatus: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="draft">draft</option>
                <option value="reviewing">reviewing</option>
                <option value="ready_for_signoff">ready_for_signoff</option>
                <option value="signed_off">signed_off</option>
              </select>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">最后更新人</div>
              <input
                value={metadata.updatedBy}
                onChange={(event) => setMetadata((current) => ({ ...current, updatedBy: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col bg-slate-950/40 p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Evidence Notebook</div>
            <div className="mt-1 text-xs text-slate-500">
              当前项目 {activeProject.name} · case {activeProject.caseId} · {storageState}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span>版本 {metadata.version}</span>
              <span>状态 {metadata.signoffStatus}</span>
              <span>更新人 {metadata.updatedBy}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerateMemo('review')}
              disabled={generatingMemo}
              className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300 disabled:opacity-50"
            >
              {generatingMemo ? '生成中...' : '生成 Review Memo'}
            </button>
            <button
              onClick={() => handleGenerateMemo('release')}
              disabled={generatingMemo}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"
            >
              {generatingMemo ? '生成中...' : '生成 Release Note'}
            </button>
            <button
              onClick={handleSaveNotebook}
              disabled={saving}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存到 Contracts'}
            </button>
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
              Notebook Mode
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {reviewAssets.slice(0, 3).map((asset) => (
            <button
              key={asset.path}
              onClick={() => appendNote(`- ${asset.name}: ${asset.path}`)}
              className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-amber-500/30 hover:text-amber-300"
            >
              插入 {asset.name}
            </button>
          ))}
          <button
            onClick={() => appendNote(`- Notebook JSON: ${notebookJsonPath}\n- Notebook Markdown: ${notebookMarkdownPath}`)}
            className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-amber-500/30 hover:text-amber-300"
          >
            插入 Notebook 路径
          </button>
          <button
            onClick={() => appendNote(`- Review Memo: ${reviewMemoPath}\n- Release Note: ${releaseNotePath}`)}
            className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-amber-500/30 hover:text-amber-300"
          >
            插入 Memo 路径
          </button>
          <button
            onClick={() => appendNote(releaseEvidenceAssets.map((asset) => `- ${asset.name}: ${asset.path}`).join('\n'))}
            className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-amber-500/30 hover:text-amber-300"
          >
            插入签发证据链
          </button>
        </div>

        <textarea
          value={activeText}
          onChange={(event) =>
            setNotes((current) => ({
              ...current,
              [activeSection]: event.target.value,
            }))
          }
          className="mt-4 min-h-0 flex-1 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4 text-sm leading-7 text-slate-300 outline-none"
        />
      </section>

      <section className="border-l border-slate-700/50 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Contracts 与证据</div>
        <div className="mt-3 space-y-3">
          {contracts.map((contract) => (
            <div key={contract.path} className="rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-200">{contract.contractName}</div>
              <div className="mt-1 text-xs text-slate-500">{contract.note}</div>
              <div className="mt-3 text-[11px] text-slate-500">{contract.path}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => openPath(contract.path)}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPath(contract.path)}
                  className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300"
                >
                  定位
                </button>
                {contract.bridgePath ? (
                  <button
                    onClick={() => openPath(contract.bridgePath)}
                    className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                  >
                    打开 Bridge
                  </button>
                ) : null}
                <button
                  onClick={() => appendNote(`- ${contract.stage} / ${contract.contractName}: ${contract.path}`)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                >
                  插入笔记
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-200">Review Assets</div>
          <div className="mt-3 space-y-3">
            {reviewAssets.map((asset) => (
              <div key={asset.path} className="rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
                <div className="text-sm text-slate-200">{asset.name}</div>
                <div className="mt-1 text-xs text-slate-500">{asset.note}</div>
                <div className="mt-3 text-[11px] text-slate-500">{asset.path}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => openPath(asset.path)}
                    className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
                  >
                    打开
                  </button>
                  <button
                    onClick={() => revealPath(asset.path)}
                    className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300"
                  >
                    定位
                  </button>
                  <button
                    onClick={() => appendNote(`- ${asset.name}: ${asset.path}`)}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                  >
                    插入笔记
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
