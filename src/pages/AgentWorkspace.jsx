import { useEffect, useMemo, useState } from 'react';
import {
  openPath,
  openPathWithAlternates,
  probeHydrodeskAgentBackend,
  revealPath,
  revealPathWithAlternates,
} from '../api/tauri_bridge';
import hydromindClient from '../api/hydromind_client';
import useTauri from '../hooks/useTauri';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import {
  appendNotebookSection,
  buildDefaultNotebookMetadata,
  buildDefaultNotebookSections,
  buildNotebookMarkdown,
  buildNotebookPayload,
  getNotebookArtifactPaths,
  getNotebookStorageKey,
} from '../data/notebookArtifacts';
import {
  getCaseReviewAssets,
  getCaseRunReviewReleaseContracts,
  getCaseShellEntryPoints,
  resolveShellCaseId,
} from '../data/case_contract_shell';
import OmniBar from '../components/OmniBar';
import NLReportRenderer from '../components/NLReportRenderer';
import { getClaudecodeLineageDocRelPath } from '../config/claudecodeReference';
import AgentStackReferencePanel from '../components/AgentStackReferencePanel';
import AgentRuntimeStatusPanel from '../components/AgentRuntimeStatusPanel';
import { useHydrodeskAgentStack } from '../hooks/useHydrodeskAgentStack';

const quickPrompts = [
  '解释当前案例 outcome gate 是否可以签发',
  '总结 strict_revalidation_ext 的下一步修复动作',
  '把当前 review 资产整理成 release 检查清单',
  '说明 Terminal / Agent / Notebook 三工作面的职责边界',
];

function normalizeAgentReply(payload) {
  if (!payload) {
    return '未收到响应。';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload.reply === 'string') {
    return payload.reply;
  }
  if (typeof payload.message === 'string') {
    return payload.message;
  }
  if (typeof payload.content === 'string') {
    return payload.content;
  }
  if (Array.isArray(payload.messages)) {
    return payload.messages.map((item) => item.content || item.message || JSON.stringify(item)).join('\n');
  }
  return JSON.stringify(payload, null, 2);
}

export default function AgentWorkspace() {
  const { activeProject, activeRole, activeMode, activeSurfaceMode } = useStudioWorkspace();
  const { isTauri, readFile, writeFile, showMessage } = useTauri();
  const { stack: agentStack, loadError: agentStackError, configSource: agentStackSource, reload: reloadAgentStack } =
    useHydrodeskAgentStack();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const reviewAssets = useMemo(() => getCaseReviewAssets(shellCaseId).slice(0, 4), [shellCaseId]);
  const runReviewContracts = useMemo(() => getCaseRunReviewReleaseContracts(shellCaseId), [shellCaseId]);
  const shellEntryPoints = useMemo(() => getCaseShellEntryPoints(shellCaseId).slice(0, 4), [shellCaseId]);
  const notebookPaths = useMemo(() => getNotebookArtifactPaths(shellCaseId), [shellCaseId]);
  const [sessionId, setSessionId] = useState(`hydrodesk-${shellCaseId}`);
  const [input, setInput] = useState(`请基于 ${shellCaseId} 当前 outcome gate 和 review 资产，给出下一步建议。`);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '这里是 Agent 工作面，适合灵活 AI 调用、解释 outcome、整理下一步动作与签发建议。',
    },
  ]);
  const [engines, setEngines] = useState([]);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [sending, setSending] = useState(false);
  const [notebookSection, setNotebookSection] = useState('evidence');
  const [notebookWriteMode, setNotebookWriteMode] = useState('append');
  const [agentBackendProbe, setAgentBackendProbe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await probeHydrodeskAgentBackend();
        if (!cancelled) setAgentBackendProbe(p);
      } catch {
        if (!cancelled) setAgentBackendProbe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function buildContextPrompt(question) {
    const contextBlock = [
      `case_id=${shellCaseId}`,
      `project=${activeProject.name}`,
      `review_assets=${reviewAssets.map((item) => item.path).join(', ')}`,
      `contracts=${runReviewContracts.map((item) => item.path).join(', ')}`,
      `notebook_json=${notebookPaths.json}`,
      `notebook_md=${notebookPaths.markdown}`,
    ].join('\n');
    return `[HydroDesk Agent Context]\n${contextBlock}\n\n[User Request]\n${question}`;
  }

  async function handleWriteToNotebook(sectionKey, content, mode = notebookWriteMode) {
    const normalizedContent = content?.trim();
    if (!normalizedContent) {
      return;
    }

    try {
      const storageKey = getNotebookStorageKey(shellCaseId);
      let sections = buildDefaultNotebookSections(shellCaseId, activeProject.name);
      let metadata = buildDefaultNotebookMetadata();

      if (isTauri) {
        try {
          const raw = await readFile(notebookPaths.notebookJsonPath);
          const parsed = JSON.parse(raw);
          if (parsed?.sections) {
            sections = { ...sections, ...parsed.sections };
          }
          if (parsed?.metadata && typeof parsed.metadata === 'object') {
            metadata = { ...metadata, ...parsed.metadata };
          }
        } catch (error) {
          sections = buildDefaultNotebookSections(shellCaseId, activeProject.name);
        }
      } else {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              sections = { ...sections, ...(parsed.sections || parsed) };
              if (parsed.metadata && typeof parsed.metadata === 'object') {
                metadata = { ...metadata, ...parsed.metadata };
              }
            }
          } catch (error) {
            window.localStorage.removeItem(storageKey);
          }
        }
      }

      const stampedContent = `- Agent @ ${new Date().toLocaleString('zh-CN')}\n${normalizedContent}`;
      const nextSections =
        mode === 'replace'
          ? {
              ...sections,
              [sectionKey]: stampedContent,
            }
          : appendNotebookSection(sections, sectionKey, stampedContent);

      const nextPayload = buildNotebookPayload(shellCaseId, activeProject.name, nextSections, metadata);
      window.localStorage.setItem(storageKey, JSON.stringify(nextPayload));

      if (isTauri) {
        await writeFile(
          notebookPaths.notebookJsonPath,
          JSON.stringify(nextPayload, null, 2)
        );
        await writeFile(
          notebookPaths.notebookMarkdownPath,
          buildNotebookMarkdown(shellCaseId, activeProject.name, nextSections, metadata)
        );
      }

      await showMessage(
        `${mode === 'replace' ? '已覆盖写入' : '已追加写入'} Notebook 的${
          sectionKey === 'release' ? '签发备注' : sectionKey === 'baseline' ? '基线与上下文' : '证据摘录'
        }章节。`,
        {
          title: 'Agent 已写入 Notebook',
          type: 'info',
        }
      );
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: '写入 Notebook 失败',
        type: 'error',
      });
    }
  }

  async function handleLoadEngines() {
    setLoadingEngines(true);
    try {
      const payload = await hydromindClient.listEngines();
      const items = Array.isArray(payload) ? payload : payload.engines || payload.items || [];
      setEngines(items);
    } catch (error) {
      setEngines([
        {
          name: 'HydroDesk 引擎列表（回退）',
          status: 'fallback',
          summary: error.message || String(error),
        },
      ]);
    } finally {
      setLoadingEngines(false);
    }
  }

  async function handleSendMessage(promptText = input) {
    const question = promptText.trim();
    if (!question) {
      return;
    }

    setSending(true);
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setInput('');
    try {
      const payload = await hydromindClient.chat(buildContextPrompt(question), sessionId);
      const reply = normalizeAgentReply(payload);
      const nextSessionId = payload?.session_id || payload?.sessionId || sessionId;
      setSessionId(nextSessionId);
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `当前未连上 HydroMind 后端，已回退为本地建议：\n- 先看 outcome_coverage_report.latest.json\n- 再核 review bundle 与 release gate\n- 最后把结论写入 Notebook 模式\n\n错误：${error.message || String(error)}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // MCP Handle for Natural Language Reports
  const handleMCPReportGenerated = (parsedReport) => {
    setMessages((current) => [
      ...current,
      { role: 'assistant', content: "MCP 架构生成富文本解析任务完毕：", report: parsedReport.report }
    ]);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[0.9fr,1.4fr,0.9fr] gap-0">
      <section className="border-r border-slate-700/50 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">会话与模式说明</div>
        <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4 text-xs leading-6 text-slate-400">
          HydroDesk 将桌面工作面拆成 Terminal / Agent / Notebook；Agent 侧对齐本仓 <code className="text-slate-500">claudecode/</code>{' '}
          的编排与工具分层思路，并绑定当前 case 作为「打开的工程」。
        </div>
        <AgentRuntimeStatusPanel
          caseId={shellCaseId}
          activeRole={activeRole}
          activeMode={activeMode}
          activeSurfaceMode={activeSurfaceMode}
          activeProjectName={activeProject?.name}
          agentBackendProbe={agentBackendProbe}
          agentStack={agentStack}
          agentStackError={agentStackError}
          agentStackSource={agentStackSource}
          onReloadStack={reloadAgentStack}
        />
        <AgentStackReferencePanel
          stack={agentStack}
          loadError={agentStackError}
          configSource={agentStackSource}
          onReload={reloadAgentStack}
          caseId={shellCaseId}
        />
        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-200">快捷提问</div>
          <div className="mt-3 space-y-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="w-full rounded-xl border border-slate-700/40 bg-slate-950/60 px-3 py-3 text-left text-xs text-slate-300 transition-colors hover:border-hydro-500/30 hover:text-hydro-300"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-200">Notebook 协作</div>
          <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
            <div className="text-xs leading-6 text-slate-400">
              Agent 回答默认会带上当前 case、review assets、run/review/release contracts 和 notebook 路径，方便直接把结论转写到 Notebook 模式。
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={notebookSection}
                onChange={(event) => setNotebookSection(event.target.value)}
                className="rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="baseline">写入基线与上下文</option>
                <option value="evidence">写入证据摘录</option>
                <option value="release">写入签发备注</option>
              </select>
              <select
                value={notebookWriteMode}
                onChange={(event) => setNotebookWriteMode(event.target.value)}
                className="rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="append">追加写入</option>
                <option value="replace">覆盖写入</option>
              </select>
            </div>
            <div className="mt-3 text-[11px] text-slate-500">{notebookPaths.json}</div>
            <div className="mt-1 text-[11px] text-slate-500">{notebookPaths.markdown}</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-200">可用引擎</div>
            <button
              onClick={handleLoadEngines}
              disabled={loadingEngines}
              className="rounded-lg border border-slate-700/40 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
            >
              {loadingEngines ? '读取中...' : '刷新'}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {(engines.length > 0 ? engines : shellEntryPoints).map((item, index) => (
              <div key={item.name || item.title || index} className="rounded-xl border border-slate-700/40 bg-slate-950/60 p-3">
                <div className="text-sm text-slate-200">{item.name || item.title}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  {item.summary || item.status || item.path}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col bg-slate-950/40 p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Agent 工作面</div>
            <div className="mt-1 text-xs text-slate-500">
              当前项目 {activeProject.name} · case {activeProject.caseId} · session {sessionId}
            </div>
            <div className="mt-1 text-[10px] text-slate-600">
              编排谱系与 <code className="text-slate-500">claudecode/</code> 对照见{' '}
              <button
                type="button"
                onClick={() => openPath(getClaudecodeLineageDocRelPath())}
                className="text-amber-400/90 underline decoration-dotted decoration-amber-500/40 hover:text-amber-300"
              >
                {getClaudecodeLineageDocRelPath()}
              </button>
            </div>
          </div>
          <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            HydroDesk Agent · 案例即项目 · NL→MCP 网关
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl border p-4 text-sm leading-6 ${
                  message.role === 'assistant'
                    ? 'border-slate-700/40 bg-slate-950/70 text-slate-300'
                    : 'border-hydro-500/30 bg-hydro-500/10 text-hydro-100'
                }`}
              >
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {message.role === 'assistant' ? 'Agent' : 'User'}
                </div>
                {message.report ? (
                  <div className="mt-2 text-sm text-slate-300">
                     <p className="mb-3 font-semibold text-emerald-400">{message.content}</p>
                     <NLReportRenderer report={message.report} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-sans">{message.content}</pre>
                )}
                {message.role === 'assistant' && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleWriteToNotebook(notebookSection, message.content)}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300"
                    >
                      {notebookWriteMode === 'replace' ? '覆盖写入当前章节' : '写入当前章节'}
                    </button>
                    <button
                      onClick={() => handleWriteToNotebook('release', message.content)}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300"
                    >
                      直写签发备注
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
           {/* Direct OmniBar injection handling MCP NLP routing */}
           <OmniBar onReportGenerated={handleMCPReportGenerated} />
        </div>
      </section>

      <section className="border-l border-slate-700/50 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">证据与上下文</div>
        <div className="mt-3 space-y-3">
          {runReviewContracts.map((contract) => (
            <div key={contract.path} className="rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-200">{contract.contractName}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{contract.note}</div>
              <div className="mt-3 text-[11px] text-slate-500">{contract.path}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setInput(`请基于 ${contract.contractName} (${contract.path}) 解释当前结论和下一步动作。`)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                >
                  引用到输入
                </button>
                <button
                  onClick={() => openPathWithAlternates(contract.pathAlternates || [contract.path])}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
                >
                  打开
                </button>
                <button
                  onClick={() => revealPathWithAlternates(contract.pathAlternates || [contract.path])}
                  className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-xs text-slate-300"
                >
                  定位
                </button>
              </div>
            </div>
          ))}
          {reviewAssets.map((asset) => (
            <div key={asset.path} className="rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-200">{asset.name}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{asset.note}</div>
              <div className="mt-3 text-[11px] text-slate-500">{asset.path}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setInput(`请解释资产 ${asset.name} (${asset.path}) 与当前 outcome gate 的关系。`)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                >
                  引用到输入
                </button>
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
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
