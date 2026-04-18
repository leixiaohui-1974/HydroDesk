import Editor, { DiffEditor } from '@monaco-editor/react';
import { ChevronDown, ChevronRight, FileCode2, Folder, Plus, Search, TerminalSquare, Trash2, X } from 'lucide-react';
import AutoRenderer from './AutoRenderer';

export function IDEWorkspaceSidebar({ activeMode, activeProject, workspaceRoot, loadingTree, fileFilter, setFileFilter, selectedTreeItem, renameDraft, setRenameDraft, renamingItem, newItemType, setNewItemType, newItemRoot, setNewItemRoot, newItemPath, setNewItemPath, creatingItem, filteredWorkspaceTree, renderTreeNodes, handleCreateWorkspaceItem, handleRenameSelectedItem, handleDeleteSelectedItem, openPath, revealPath, explorerRoots }) {
  return (
    <aside className="w-72 border-r border-slate-700/50 bg-slate-900/50 p-4">
            <div className="text-sm font-semibold text-slate-200">工作区文件</div>
            <div className="mt-2 rounded-xl border border-slate-700/40 bg-slate-950/50 p-3 text-xs text-slate-400">
              当前模式 {activeMode === 'development' ? '开发模式' : '发布模式'} · 工程 {activeProject.caseId}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => openPath(workspaceRoot)}
                className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
              >
                打开工作区
              </button>
              <button
                onClick={() => revealPath(workspaceRoot)}
                className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
              >
                定位目录
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/50 p-3">
              <div className="flex items-center gap-2">
                <Search size={14} className="text-slate-500" />
                <input
                  value={fileFilter}
                  onChange={(event) => setFileFilter(event.target.value)}
                  placeholder="过滤文件与目录"
                  className="w-full bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/50 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">新建工作区项</div>
              <div className="mt-3 flex items-center gap-2">
                <select
                  value={newItemType}
                  onChange={(event) => setNewItemType(event.target.value)}
                  className="rounded-lg border border-slate-700/50 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none"
                >
                  <option value="file">文件</option>
                  <option value="directory">目录</option>
                </select>
                <select
                  value={newItemRoot}
                  onChange={(event) => setNewItemRoot(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700/50 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none"
                >
                  {explorerRoots.map((root) => (
                    <option key={root.path} value={root.path}>
                      {root.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={newItemPath}
                onChange={(event) => setNewItemPath(event.target.value)}
                placeholder={newItemType === 'file' ? 'components/NewPanel.jsx' : 'generated/new-pack'}
                className="mt-3 w-full rounded-lg border border-slate-700/50 bg-slate-900 px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-500"
              />
              <button
                onClick={handleCreateWorkspaceItem}
                disabled={creatingItem}
                className="mt-3 w-full rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300 disabled:opacity-50"
              >
                {creatingItem ? '创建中...' : `新建${newItemType === 'file' ? '文件' : '目录'}`}
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/50 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">树动作</div>
              <div className="mt-3 text-xs text-slate-400">
                {selectedTreeItem ? selectedTreeItem.path : '请选择一个文件或目录'}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => selectedTreeItem && openPath(selectedTreeItem.path)}
                  disabled={!selectedTreeItem}
                  className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300 disabled:opacity-50"
                >
                  打开
                </button>
                <button
                  onClick={() => selectedTreeItem && revealPath(selectedTreeItem.path)}
                  disabled={!selectedTreeItem}
                  className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
                >
                  定位
                </button>
              </div>
              <input
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                placeholder="输入新名称"
                disabled={!selectedTreeItem}
                className="mt-3 w-full rounded-lg border border-slate-700/50 bg-slate-900 px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={handleRenameSelectedItem}
                  disabled={!selectedTreeItem || renamingItem}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 disabled:opacity-50"
                >
                  {renamingItem ? '重命名中...' : '重命名'}
                </button>
                <button
                  onClick={handleDeleteSelectedItem}
                  disabled={!selectedTreeItem}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  删除
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {loadingTree && (
                <div className="rounded-lg border border-slate-700/40 bg-slate-800/60 px-3 py-2 text-xs text-slate-500">
                  正在扫描真实工作区文件...
                </div>
              )}
              {filteredWorkspaceTree.map((group) => (
                <div key={group.path} className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{group.label}</div>
                  <div className="space-y-1">
                    {renderTreeNodes(group.nodes || [])}
                    {group.error && (
                      <div className="px-3 text-[11px] text-amber-300">{group.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
  );
}
export function IDEWorkspaceHeader({ handleImportManifest }) {
  return (
    <div className="border-b border-slate-700/50 bg-slate-900/40 px-5 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">统一 IDE 工作面</h2>
                  <p className="mt-1 text-sm text-slate-400">与工作台共用同一任务、会话、artifact 和 checkpoint</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
                    Qwen Code / Codex / VS Code 插件入口
                  </span>
                  <button className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300">
                    打开扩展开发
                  </button>
                  <button
                    onClick={handleImportManifest}
                    className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
                  >
                    导入清单
                  </button>
                </div>
              </div>
            </div>
  );
}
export function IDEWorkspaceEditor({ isTauri, selectedFilePath, setSelectedFilePath, openTabs, fileBuffers, setFileBuffers, saving, editorMode, setEditorMode, editorRef, flatFiles, selectedFile, absoluteSelectedFilePath, editorLanguage, activeBuffer, isDirty, handleSaveFile, handleCloseTab, openPath, revealPath, fallbackFiles }) {
  return (
    <section className="flex-1 min-h-0 bg-slate-950/50 p-4 overflow-y-auto flex flex-col">
                <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4 flex flex-col flex-1 min-h-0">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto border-b border-slate-700/40 pb-3">
                    {openTabs.map((tabPath) => {
                      const tabFile = flatFiles.find((file) => file.path === tabPath) || fallbackFiles.find((file) => file.path === tabPath);
                      if (!tabFile) {
                        return null;
                      }
                      return (
                        <div
                          key={tabPath}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                            selectedFilePath === tabPath
                              ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                              : 'border-slate-700/40 bg-slate-950/60 text-slate-300'
                          }`}
                        >
                          <button onClick={() => setSelectedFilePath(tabPath)} className="truncate">
                            {tabFile.label}
                            {fileBuffers[tabPath] && fileBuffers[tabPath].content !== fileBuffers[tabPath].originalContent ? ' ●' : ''}
                          </button>
                          <button onClick={() => handleCloseTab(tabPath)} className="text-slate-500 hover:text-slate-200">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">Editor</div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500">{selectedFile.path}</span>
                      <span className="text-[11px] text-slate-500">{isDirty ? '未保存修改' : '已同步'}</span>
                                        <button
                        onClick={() => setEditorMode('edit')}
                        className={`text-xs transition-colors ${editorMode === 'edit' ? 'text-hydro-300' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setEditorMode('diff')}
                        className={`text-xs transition-colors ${editorMode === 'diff' ? 'text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        Diff
                      </button>
                      <button
                        onClick={() => setEditorMode('preview')}
                        className={`text-xs transition-colors ${editorMode === 'preview' ? 'text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        预览
                      </button>
                      <button onClick={() => openPath(absoluteSelectedFilePath)} className="text-xs text-hydro-300 hover:text-hydro-200 transition-colors">
                        打开文件
                      </button>
                      <button onClick={() => revealPath(absoluteSelectedFilePath)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                        定位文件
                      </button>
                      <button
                        onClick={handleSaveFile}
                        disabled={!isTauri || saving}
                        className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/40 flex-1 flex flex-col min-h-[420px]">
                    {activeBuffer.loading ? (
                      <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-950 text-sm text-slate-500">
                        正在读取真实文件预览...
                      </div>
                                    ) : editorMode === 'preview' ? (
                      <div className="h-full min-h-[420px] flex-1">
                        <AutoRenderer path={selectedFile.path} content={activeBuffer.content} />
                      </div>
                    ) : editorMode === 'diff' ? (
                      <DiffEditor
                        height="100%" className="flex-1 min-h-[420px]"
                        original={activeBuffer.originalContent ?? ''}
                        modified={activeBuffer.content ?? ''}
                        language={editorLanguage}
                        theme="vs-dark"
                        options={{
                          readOnly: false,
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                        onMount={(editor) => {
                          editorRef.current = editor.getModifiedEditor();
                        }}
                        onChange={(value) =>
                          setFileBuffers((previous) => ({
                            ...previous,
                            [selectedFile.path]: {
                              ...(previous[selectedFile.path] || {
                                originalContent: '',
                                loading: false,
                              }),
                              content: value ?? '',
                              loading: false,
                            },
                          }))
                        }
                      />
                    ) : (
                      <Editor
                        height="100%" className="flex-1 min-h-[420px]"
                        path={selectedFile.path}
                        defaultLanguage={editorLanguage}
                        language={editorLanguage}
                        value={activeBuffer.content ?? ''}
                        onMount={(editor) => {
                          editorRef.current = editor;
                        }}
                        onChange={(value) =>
                          setFileBuffers((previous) => ({
                            ...previous,
                            [selectedFile.path]: {
                              ...(previous[selectedFile.path] || {
                                originalContent: '',
                                loading: false,
                              }),
                              content: value ?? '',
                              loading: false,
                            },
                          }))
                        }
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    )}
                  </div>
                </div>
    
              </section>
  );
}
export function IDEWorkspaceTerminal({ workspaceRoot, runningCommand, terminalSessions, activeTerminalId, setActiveTerminalId, currentTerminalSession, handleRunCommand, createTerminalSession, closeTerminalSession, updateCurrentSession, openPath, hostCapabilities, terminals, commandPresets }) {
  return (
    <section className="bg-slate-900/40 p-5">
                <div className="text-sm font-semibold text-slate-200">终端与运行上下文</div>
    
                <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto border-b border-slate-700/40 pb-3">
                    {terminalSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                          activeTerminalId === session.id
                            ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                            : 'border-slate-700/40 bg-slate-950/60 text-slate-300'
                        }`}
                      >
                        <button onClick={() => setActiveTerminalId(session.id)} className="truncate">
                          <span className="inline-flex items-center gap-1">
                            <TerminalSquare size={12} />
                            {session.name}
                          </span>
                        </button>
                        <button onClick={() => closeTerminalSession(session.id)} className="text-slate-500 hover:text-slate-200">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={createTerminalSession}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700/40 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300"
                    >
                      <Plus size={12} />
                      新终端
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">命令终端</div>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentTerminalSession?.cwd || 'HydroDesk'}
                        onChange={(event) => updateCurrentSession({ cwd: event.target.value })}
                        className="rounded-lg border border-slate-700/50 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none"
                      >
                        {['.', 'HydroDesk', 'Hydrology', 'HydroMAS', 'agent-teams'].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRunCommand()}
                        disabled={runningCommand}
                        className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300 disabled:opacity-50"
                      >
                        {runningCommand ? '执行中...' : '运行命令'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={currentTerminalSession?.command || ''}
                    onChange={(event) => updateCurrentSession({ command: event.target.value })}
                    className="mt-3 h-24 w-full rounded-xl border border-slate-700/40 bg-slate-950 p-3 font-mono text-xs leading-6 text-slate-300 outline-none focus:border-hydro-500/40"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {commandPresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          updateCurrentSession({
                            command: preset.command,
                            cwd: preset.cwd,
                          });
                          handleRunCommand(preset.command, preset.cwd);
                        }}
                        className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-hydro-500/30 hover:text-hydro-300"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-300">
                    <pre className="whitespace-pre-wrap break-words">
                      {currentTerminalSession?.output || '在这里运行工作区命令，查看 stdout / stderr 与退出码。'}
                    </pre>
                  </div>
                  {currentTerminalSession?.lastCommandMeta && (
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>cwd: {currentTerminalSession.lastCommandMeta.cwd}</span>
                      <span>{currentTerminalSession.lastCommandMeta.success ? 'success' : 'failed'}</span>
                    </div>
                  )}
                  {currentTerminalSession?.history?.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/80 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">最近命令</div>
                      <div className="mt-3 space-y-2">
                        {currentTerminalSession.history.map((item, index) => (
                          <div key={`${item.command}-${index}`} className="flex items-center justify-between gap-3 text-xs text-slate-400">
                            <div className="truncate">
                              {item.at} · {item.cwd} · {item.command}
                            </div>
                            <span className={item.success ? 'text-emerald-300' : 'text-amber-300'}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {terminals.map((terminal) => (
                    <div key={terminal.name} className="rounded-xl border border-slate-700/40 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-200">{terminal.name}</div>
                        <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                          {terminal.state}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{terminal.cwd}</div>
                    </div>
                  ))}
                </div>
    
                <div className="mt-5">
                  <div className="text-sm font-semibold text-slate-200">插件宿主状态</div>
                  <div className="mt-3 space-y-3">
                    {hostCapabilities.map((capability) => (
                      <div key={capability.title} className="rounded-xl border border-slate-700/40 bg-slate-950/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-slate-200">{capability.title}</div>
                          <span className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                            {capability.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs leading-5 text-slate-500">{capability.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
    
                <div className="mt-5 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
                  <div className="text-sm font-semibold text-slate-200">开发者动作</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openPath(`${workspaceRoot}/HydroDesk`)}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300"
                    >
                      打开 HydroDesk
                    </button>
                    <button
                      onClick={() => openPath(`${workspaceRoot}/Hydrology`)}
                      className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
                    >
                      打开 Hydrology
                    </button>
                    <button
                      onClick={() => openPath(`${workspaceRoot}/HydroMAS`)}
                      className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
                    >
                      打开 HydroMAS
                    </button>
                    <button
                      onClick={() => openPath(`${workspaceRoot}/agent-teams`)}
                      className="rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-slate-300"
                    >
                      打开 agent-teams
                    </button>
                  </div>
                </div>
              </section>
  );
}
export function IDEWorkspaceInspector({ globalSearchQuery, setGlobalSearchQuery, searchScope, setSearchScope, matchCase, setMatchCase, useRegex, setUseRegex, replaceQuery, setReplaceQuery, searchingGlobal, replacingGlobal, previewingReplacement, expandedSearchGroups, visibleSearchGroupCount, setVisibleSearchGroupCount, replacementSummary, replacementPreview, groupedSearchResults, handleGlobalSearch, handleReplaceAllMatches, handlePreviewReplacement, handleOpenSearchResult, handleOpenReplacementPreview, renderHighlightedText, toggleSearchGroup, devPanels }) {
  return (
    <aside className="w-80 bg-slate-900/30 p-4 border-l border-slate-700/50 overflow-y-auto flex flex-col gap-4">
              <div className="text-sm font-semibold text-slate-200">Inspector 属性面板</div>
                          <div className="mt-3 rounded-2xl border border-slate-700/40 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">全局搜索</div>
                    <button
                      onClick={handleGlobalSearch}
                      disabled={searchingGlobal}
                      className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-2 text-xs text-hydro-300 disabled:opacity-50"
                    >
                      {searchingGlobal ? '搜索中...' : '搜索'}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-950 p-3">
                    <Search size={14} className="text-slate-500" />
                    <input
                      value={globalSearchQuery}
                      onChange={(event) => setGlobalSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleGlobalSearch();
                        }
                      }}
                      placeholder="搜索整个工作区代码与配置"
                      className="w-full bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSearchScope('workspace')}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        searchScope === 'workspace'
                          ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                          : 'border-slate-700/40 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      全工作区
                    </button>
                    <button
                      onClick={() => setSearchScope('current')}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        searchScope === 'current'
                          ? 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300'
                          : 'border-slate-700/40 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      当前文件
                    </button>
                    <button
                      onClick={() => setMatchCase((value) => !value)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        matchCase
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          : 'border-slate-700/40 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      区分大小写
                    </button>
                    <button
                      onClick={() => setUseRegex((value) => !value)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        useRegex
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700/40 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      正则
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-950 p-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Replace</span>
                    <input
                      value={replaceQuery}
                      onChange={(event) => setReplaceQuery(event.target.value)}
                      placeholder="替换为"
                      className="w-full bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-500"
                    />
                    <button
                      onClick={handlePreviewReplacement}
                      disabled={previewingReplacement || !globalSearchQuery.trim() || groupedSearchResults.length === 0}
                      className="rounded-lg border border-slate-700/40 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
                    >
                      {previewingReplacement ? '预览中...' : '预览替换'}
                    </button>
                    <button
                      onClick={handleReplaceAllMatches}
                      disabled={replacingGlobal || !globalSearchQuery.trim() || groupedSearchResults.length === 0}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 disabled:opacity-50"
                    >
                      {replacingGlobal ? '替换中...' : '全部替换'}
                    </button>
                  </div>
                  {replacementSummary && (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
                      已将 {replacementSummary.filesChanged} 个文件中的 {replacementSummary.replacements} 处
                      “{replacementSummary.searchText}” 替换为 “{replacementSummary.replaceText}”。
                    </div>
                  )}
                  {replacementPreview.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-amber-300">替换预览</div>
                        <div className="text-[10px] text-slate-500">{replacementPreview.length} 个文件</div>
                      </div>
                      <div className="mt-3 max-h-52 space-y-3 overflow-auto">
                        {replacementPreview.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => handleOpenReplacementPreview(item)}
                            className="w-full rounded-xl border border-slate-700/40 bg-slate-950/70 p-3 text-left transition-colors hover:border-amber-500/30"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-xs text-slate-200">{renderHighlightedText(item.path, globalSearchQuery)}</div>
                              <span className="text-[10px] text-amber-300">{item.replacements} 处</span>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              Before: {renderHighlightedText(item.sampleBefore || '无预览内容', globalSearchQuery)}
                            </div>
                            <div className="mt-2 text-[11px] text-emerald-300">
                              After: {renderHighlightedText(item.sampleAfter || '无替换内容', replaceQuery)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 max-h-56 space-y-2 overflow-auto">
                    {groupedSearchResults.length > 0 ? (
                      groupedSearchResults.slice(0, visibleSearchGroupCount).map((group) => (
                        <div key={group.path} className="rounded-xl border border-slate-700/40 bg-slate-950/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="truncate text-xs text-slate-200">{renderHighlightedText(group.path, globalSearchQuery)}</div>
                            <button
                              onClick={() => toggleSearchGroup(group.path)}
                              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {expandedSearchGroups.has(group.path) ? '收起' : '展开'} · {group.matches.length} 条
                            </button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {group.matches
                              .slice(0, expandedSearchGroups.has(group.path) ? group.matches.length : 4)
                              .map((result, index) => (
                              <button
                                key={`${result.path}-${result.line}-${index}`}
                                onClick={() => handleOpenSearchResult(result)}
                                className="w-full rounded-lg border border-slate-700/30 bg-slate-900/60 px-3 py-2 text-left transition-colors hover:border-hydro-500/30 hover:bg-slate-900/90"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] text-slate-500">L{result.line}</span>
                                  <span className="truncate text-xs text-slate-400">
                                    {renderHighlightedText(result.preview || '无预览内容', globalSearchQuery)}
                                  </span>
                                </div>
                              </button>
                            ))}
                            {group.matches.length > 4 && !expandedSearchGroups.has(group.path) && (
                              <div className="text-[10px] text-slate-500">还有 {group.matches.length - 4} 条结果未展开</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-700/40 px-3 py-4 text-xs text-slate-500">
                        输入关键词后可在工作区内做全局搜索，并跳转到对应文件和行号。
                      </div>
                    )}
                    {groupedSearchResults.length > visibleSearchGroupCount && (
                      <button
                        onClick={() => setVisibleSearchGroupCount((count) => count + 8)}
                        className="w-full rounded-xl border border-slate-700/40 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 hover:border-hydro-500/30 hover:text-hydro-300 transition-colors"
                      >
                        展开更多结果组
                      </button>
                    )}
                    {visibleSearchGroupCount > 8 && groupedSearchResults.length > 0 && (
                      <button
                        onClick={() => setVisibleSearchGroupCount(8)}
                        className="w-full rounded-xl border border-slate-700/40 bg-slate-950/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        收起额外结果组
                      </button>
                    )}
                  </div>
                </div>
                          <div className="mt-4 flex flex-col gap-4">
                  {devPanels.map((panel) => (
                    <div key={panel.title} className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
                      <div className="text-sm font-medium text-slate-200">{panel.title}</div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">{panel.detail}</div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4">
                    <div className="text-sm font-medium text-slate-200">插件宿主</div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">面向作者保留扩展宿主、订阅能力与本地调试入口，支持把产品本身作为开发工作台。</div>
                  </div>
                </div>
            </aside>
  );
}
