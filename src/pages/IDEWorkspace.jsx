import Editor, { DiffEditor } from '@monaco-editor/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, Folder, Plus, Search, TerminalSquare, Trash2, X } from 'lucide-react';
import { deletePath, openPath, renamePath, revealPath, runWorkspaceCommand } from '../api/tauri_bridge';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';

const fallbackFiles = [
  { label: 'App.jsx', path: 'HydroDesk/src/App.jsx', area: '主壳路由' },
  { label: 'Layout.jsx', path: 'HydroDesk/src/components/Layout.jsx', area: '统一主壳' },
  { label: 'Simulation.jsx', path: 'HydroDesk/src/pages/Simulation.jsx', area: '执行链路' },
  { label: 'main.rs', path: 'HydroDesk/src-tauri/src/main.rs', area: '桌面桥接' },
  { label: 'workflows', path: 'Hydrology/workflows/__init__.py', area: '工作流注册表' },
  { label: 'base_skill.py', path: 'HydroMAS/skills/base_skill.py', area: 'Skill 规范' },
  { label: 'cli.py', path: 'agent-teams/agent_teams/cli.py', area: 'Agent Runtime' },
];

const explorerRoots = [
  { label: 'HydroDesk/src', path: 'HydroDesk/src' },
  { label: 'HydroDesk/src-tauri/src', path: 'HydroDesk/src-tauri/src' },
  { label: 'Hydrology/workflows', path: 'Hydrology/workflows' },
  { label: 'HydroMAS/skills', path: 'HydroMAS/skills' },
  { label: 'agent-teams/agent_teams', path: 'agent-teams/agent_teams' },
];

const terminals = [
  { name: 'studio-shell', state: 'idle', cwd: 'research/' },
  { name: 'agent-runtime', state: 'running', cwd: 'agent-teams/' },
];

const devPanels = [
  { title: 'GitNexus', detail: '影响分析、上下文、过程追踪' },
  { title: 'MCP 调试', detail: 'server、tool、资源与权限检查' },
  { title: '扩展开发', detail: 'Agent / Skill / Workflow / MCP / Model Pack' },
];

const hostCapabilities = [
  { title: 'Codex Max', detail: '在开发模式中作为插件与模型入口，承载高频编码与辅助开发。', status: '可接入' },
  { title: 'VS Code 扩展', detail: '以插件宿主形式承接编辑、补全、Diff、终端与开发者习惯。', status: '规划中' },
  { title: 'MCP / Agent 调试', detail: '统一调试工具、资源、Prompt 与工作流触发。', status: '已接入主壳' },
];

const commandPresets = [
  { label: '前端构建', command: 'npm run build', cwd: 'HydroDesk' },
  { label: '查看工作流注册', command: 'python3 - <<\'PY\'\nfrom workflows import WORKFLOW_REGISTRY\nprint("\\n".join(WORKFLOW_REGISTRY.keys()))\nPY', cwd: 'Hydrology' },
  { label: '列出项目根目录', command: 'ls -la', cwd: '.' },
];

function inferLanguage(filePath) {
  if (filePath.endsWith('.rs')) return 'rust';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.jsx')) return 'javascript';
  if (filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) return 'yaml';
  if (filePath.endsWith('.toml')) return 'toml';
  return 'plaintext';
}

function normalizeRelativePath(fullPath) {
  return fullPath.replace(`${studioState.workspace.rootPath}/`, '');
}

function mapDirectoryEntriesToTree(entries, rootPath) {
  return (entries || [])
    .map((entry) => {
      const relativePath = normalizeRelativePath(entry.path || '');
      const children = mapDirectoryEntriesToTree(entry.children || [], rootPath);
      const isDirectory = Array.isArray(entry.children);

      return {
        id: relativePath,
        label: entry.name || relativePath.split('/').pop(),
        path: relativePath,
        area: rootPath,
        isDirectory,
        children,
      };
    })
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });
}

function flattenTreeFiles(nodes) {
  const files = [];

  function walk(items) {
    items.forEach((item) => {
      if (item.isDirectory) {
        walk(item.children || []);
      } else {
        files.push(item);
      }
    });
  }

  walk(nodes);
  return files;
}

function filterTreeNodes(nodes, query) {
  if (!query) {
    return nodes;
  }

  const normalizedQuery = query.toLowerCase();

  return nodes
    .map((node) => {
      if (node.isDirectory) {
        const children = filterTreeNodes(node.children || [], query);
        if (children.length > 0 || node.label.toLowerCase().includes(normalizedQuery)) {
          return {
            ...node,
            children,
          };
        }
        return null;
      }

      if (
        node.label.toLowerCase().includes(normalizedQuery) ||
        node.path.toLowerCase().includes(normalizedQuery)
      ) {
        return node;
      }

      return null;
    })
    .filter(Boolean);
}

function escapeShellArg(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseGlobalSearchOutput(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) {
        return null;
      }
      return {
        path: match[1],
        line: Number(match[2]),
        preview: match[3].trim(),
      };
    })
    .filter(Boolean);
}

function groupSearchResults(results) {
  return results.reduce((groups, result) => {
    const existing = groups.find((group) => group.path === result.path);
    if (existing) {
      existing.matches.push(result);
      return groups;
    }
    groups.push({
      path: result.path,
      matches: [result],
    });
    return groups;
  }, []);
}

function getBasename(targetPath) {
  const normalized = targetPath.replace(/\/+$/, '');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

function buildSiblingPath(targetPath, nextName) {
  const normalized = targetPath.replace(/\/+$/, '');
  const parts = normalized.split('/');
  parts[parts.length - 1] = nextName;
  return parts.join('/');
}

function buildSearchPattern(query, useRegex) {
  return useRegex ? query : escapeRegExp(query);
}

function buildReplaceRegExp(query, useRegex, matchCase) {
  const pattern = buildSearchPattern(query, useRegex);
  return new RegExp(pattern, matchCase ? 'g' : 'gi');
}

export default function IDEWorkspace() {
  const { activeMode, activeProject } = useStudioWorkspace();
  const { isTauri, openFile, readFile, writeFile, readDirectory, createDirectory, showMessage, confirm } = useTauri();
  const workspaceRoot = studioState.workspace.rootPath;
  const [selectedFilePath, setSelectedFilePath] = useState(fallbackFiles[0].path);
  const [loadingTree, setLoadingTree] = useState(false);
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(explorerRoots.map((root) => root.path)));
  const [openTabs, setOpenTabs] = useState([fallbackFiles[0].path]);
  const [fileBuffers, setFileBuffers] = useState({});
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState('edit');
  const [fileFilter, setFileFilter] = useState('');
  const [selectedTreeItem, setSelectedTreeItem] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renamingItem, setRenamingItem] = useState(false);
  const [newItemType, setNewItemType] = useState('file');
  const [newItemRoot, setNewItemRoot] = useState(explorerRoots[0].path);
  const [newItemPath, setNewItemPath] = useState('');
  const [creatingItem, setCreatingItem] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState('workspace');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [replacingGlobal, setReplacingGlobal] = useState(false);
  const [previewingReplacement, setPreviewingReplacement] = useState(false);
  const [expandedSearchGroups, setExpandedSearchGroups] = useState(() => new Set());
  const [visibleSearchGroupCount, setVisibleSearchGroupCount] = useState(8);
  const [replacementSummary, setReplacementSummary] = useState(null);
  const [replacementPreview, setReplacementPreview] = useState([]);
  const [pendingRevealLine, setPendingRevealLine] = useState(null);
  const [runningCommand, setRunningCommand] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState([
    {
      id: 'terminal-1',
      name: '终端 1',
      cwd: 'HydroDesk',
      command: 'npm run build',
      output: '',
      history: [],
      lastCommandMeta: null,
    },
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('terminal-1');
  const editorRef = useRef(null);
  const flatFiles = useMemo(
    () => workspaceTree.flatMap((group) => flattenTreeFiles(group.nodes || [])),
    [workspaceTree]
  );
  const filteredWorkspaceTree = useMemo(
    () =>
      workspaceTree.map((group) => ({
        ...group,
        nodes: filterTreeNodes(group.nodes || [], fileFilter),
      })),
    [fileFilter, workspaceTree]
  );
  const groupedSearchResults = useMemo(
    () => groupSearchResults(globalSearchResults),
    [globalSearchResults]
  );
  const selectedFile = useMemo(
    () => flatFiles.find((file) => file.path === selectedFilePath) || fallbackFiles[0],
    [flatFiles, selectedFilePath]
  );
  const absoluteSelectedFilePath = useMemo(
    () => `${workspaceRoot}/${selectedFile.path}`,
    [selectedFile.path, workspaceRoot]
  );
  const editorLanguage = useMemo(() => inferLanguage(selectedFile.path), [selectedFile.path]);
  const activeBuffer = useMemo(
    () =>
      fileBuffers[selectedFilePath] || {
        originalContent: '',
        content: '',
        loading: true,
      },
    [fileBuffers, selectedFilePath]
  );
  const currentTerminalSession = useMemo(
    () => terminalSessions.find((session) => session.id === activeTerminalId) || terminalSessions[0],
    [activeTerminalId, terminalSessions]
  );
  const isDirty = useMemo(
    () => !activeBuffer.loading && activeBuffer.content !== activeBuffer.originalContent,
    [activeBuffer]
  );

  const loadWorkspaceTree = useRef(async () => {});

  useEffect(() => {
    let cancelled = false;

    loadWorkspaceTree.current = async () => {
      setLoadingTree(true);
      try {
        if (isTauri) {
          const groups = await Promise.all(
            explorerRoots.map(async (root) => {
              const entries = await readDirectory(`${workspaceRoot}/${root.path}`, true);
              const nodes = mapDirectoryEntriesToTree(entries, root.path);
              return {
                label: root.label,
                path: root.path,
                nodes,
              };
            })
          );
          if (!cancelled) {
            setWorkspaceTree(groups);
          }
          return;
        }

        if (!cancelled) {
          setWorkspaceTree(
            explorerRoots.map((root) => ({
              label: root.label,
              path: root.path,
              nodes: fallbackFiles
                .filter((file) => file.path.startsWith(root.path))
                .map((file) => ({
                  id: file.path,
                  label: file.label,
                  path: file.path,
                  area: file.area,
                  isDirectory: false,
                  children: [],
                })),
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          setWorkspaceTree(
            explorerRoots.map((root) => ({
              label: root.label,
              path: root.path,
              nodes: fallbackFiles
                .filter((file) => file.path.startsWith(root.path))
                .map((file) => ({
                  id: file.path,
                  label: file.label,
                  path: file.path,
                  area: file.area,
                  isDirectory: false,
                  children: [],
                })),
              error: error.message || String(error),
            }))
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTree(false);
        }
      }
    };

    loadWorkspaceTree.current();

    return () => {
      cancelled = true;
    };
  }, [isTauri, readDirectory, workspaceRoot]);

  useEffect(() => {
    if (flatFiles.length > 0 && !flatFiles.some((file) => file.path === selectedFilePath)) {
      setSelectedFilePath(flatFiles[0].path);
    }
  }, [flatFiles, selectedFilePath]);

  useEffect(() => {
    if (selectedFilePath) {
      setOpenTabs((current) => (current.includes(selectedFilePath) ? current : [...current, selectedFilePath]));
    }
  }, [selectedFilePath]);

  useEffect(() => {
    setEditorMode('edit');
  }, [selectedFilePath]);

  useEffect(() => {
    const currentFile =
      flatFiles.find((file) => file.path === selectedFilePath) ||
      fallbackFiles.find((file) => file.path === selectedFilePath);
    if (currentFile) {
      setSelectedTreeItem({
        path: currentFile.path,
        label: currentFile.label,
        isDirectory: false,
      });
    }
  }, [flatFiles, selectedFilePath]);

  useEffect(() => {
    if (selectedTreeItem?.path) {
      setRenameDraft(getBasename(selectedTreeItem.path));
    } else {
      setRenameDraft('');
    }
  }, [selectedTreeItem]);

  useEffect(() => {
    if (!pendingRevealLine || pendingRevealLine.path !== selectedFilePath || !editorRef.current) {
      return;
    }

    const editor = editorRef.current;
    editor.revealLineInCenter(pendingRevealLine.line);
    editor.setPosition({ lineNumber: pendingRevealLine.line, column: 1 });
    editor.focus();
    setPendingRevealLine(null);
  }, [pendingRevealLine, selectedFilePath]);

  useEffect(() => {
    setExpandedSearchGroups(new Set());
    setVisibleSearchGroupCount(8);
    setReplacementPreview([]);
    setReplacementSummary(null);
  }, [globalSearchQuery, globalSearchResults.length]);

  function openFileInTab(filePath) {
    setSelectedFilePath(filePath);
    setOpenTabs((current) => (current.includes(filePath) ? current : [...current, filePath]));
    const target =
      flatFiles.find((file) => file.path === filePath) ||
      fallbackFiles.find((file) => file.path === filePath);
    setSelectedTreeItem({
      path: filePath,
      label: target?.label || getBasename(filePath),
      isDirectory: false,
    });
  }

  function toggleExpanded(path) {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function renderTreeNodes(nodes, depth = 0) {
    return nodes.map((node) => {
      if (node.isDirectory) {
        const expanded = expandedPaths.has(node.path);
        return (
          <div key={node.path}>
            <button
              onClick={() => {
                toggleExpanded(node.path);
                setSelectedTreeItem({
                  path: node.path,
                  label: node.label,
                  isDirectory: true,
                });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800/60"
              style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className="text-amber-300" />
              <span className="truncate">{node.label}</span>
            </button>
            {expanded && (
              <div className="space-y-1">
                {renderTreeNodes(node.children || [], depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <button
          key={node.path}
          onClick={() => openFileInTab(node.path)}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
            selectedFilePath === node.path
              ? 'bg-hydro-500/10 text-hydro-300'
              : 'text-slate-300 hover:bg-slate-800/60'
          }`}
          style={{ paddingLeft: `${24 + depth * 14}px` }}
        >
          <FileCode2 size={14} className="text-slate-500" />
          <span className="truncate">{node.label}</span>
          {fileBuffers[node.path] && fileBuffers[node.path].content !== fileBuffers[node.path].originalContent && (
            <span className="ml-auto text-[10px] text-amber-300">●</span>
          )}
        </button>
      );
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      const existingBuffer = fileBuffers[selectedFile.path];
      if (existingBuffer && typeof existingBuffer.content === 'string' && typeof existingBuffer.originalContent === 'string') {
        return;
      }

      setFileBuffers((previous) => ({
        ...previous,
        [selectedFile.path]: {
          originalContent: previous[selectedFile.path]?.originalContent || '',
          content: previous[selectedFile.path]?.content || '',
          loading: true,
        },
      }));
      try {
        if (isTauri) {
          const content = await readFile(absoluteSelectedFilePath);
          if (!cancelled) {
            setFileBuffers((previous) => ({
              ...previous,
              [selectedFile.path]: {
                originalContent: content,
                content,
                loading: false,
              },
            }));
          }
          return;
        }
        if (!cancelled) {
          const previewContent = `浏览器预览模式\n\n当前文件：${selectedFile.path}\n\n在桌面壳中可直接读取真实文件内容、打开系统编辑器、定位目录与挂接插件宿主。`;
          setFileBuffers((previous) => ({
            ...previous,
            [selectedFile.path]: {
              originalContent: previewContent,
              content: previewContent,
              loading: false,
            },
          }));
        }
      } catch (error) {
        if (!cancelled) {
          const errorContent = `无法读取文件预览：${selectedFile.path}\n\n${error.message || String(error)}`;
          setFileBuffers((previous) => ({
            ...previous,
            [selectedFile.path]: {
              originalContent: errorContent,
              content: errorContent,
              loading: false,
            },
          }));
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [absoluteSelectedFilePath, fileBuffers, isTauri, readFile, selectedFile.path]);

  async function handleImportManifest() {
    const picked = await openFile({
      title: '选择插件或扩展清单',
      filters: [
        { name: 'Manifest', extensions: ['json', 'yaml', 'yml', 'toml'] },
      ],
    });
    if (!picked) {
      return;
    }
    setFileBuffers((previous) => ({
      ...previous,
      [selectedFile.path]: {
        originalContent: previous[selectedFile.path]?.originalContent || '',
        content: `已选择本地扩展清单：\n${picked}\n\n下一步可继续接 schema 校验、安装与启停。`,
        loading: false,
      },
    }));
  }

  async function handleSaveFile() {
    if (!isTauri) {
      setTerminalSessions((previous) =>
        previous.map((session) =>
          session.id === activeTerminalId
            ? {
                ...session,
                output: '浏览器预览模式下不支持直接保存真实文件，请在桌面壳中操作。',
              }
            : session
        )
      );
      return;
    }
    setSaving(true);
    try {
      await writeFile(absoluteSelectedFilePath, activeBuffer.content || '');
      setFileBuffers((previous) => ({
        ...previous,
        [selectedFile.path]: {
          ...(previous[selectedFile.path] || {}),
          originalContent: previous[selectedFile.path]?.content || '',
          content: previous[selectedFile.path]?.content || '',
          loading: false,
        },
      }));
      setTerminalSessions((previous) =>
        previous.map((session) =>
          session.id === activeTerminalId
            ? {
                ...session,
                output: `已保存文件：${selectedFile.path}`,
              }
            : session
        )
      );
    } catch (error) {
      setTerminalSessions((previous) =>
        previous.map((session) =>
          session.id === activeTerminalId
            ? {
                ...session,
                output: `保存失败：${error.message || String(error)}`,
              }
            : session
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRunCommand(command = currentTerminalSession?.command, cwd = currentTerminalSession?.cwd) {
    const sessionId = activeTerminalId;
    setRunningCommand(true);
    setTerminalSessions((previous) =>
      previous.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              output: '正在执行命令...',
            }
          : session
      )
    );
    try {
      const result = await runWorkspaceCommand(command, cwd, {
        command,
        cwd: `${workspaceRoot}/${cwd}`,
        status: 0,
        stdout: '浏览器预览模式下不执行真实命令。',
        stderr: '',
        success: true,
      });
      const outputText = [
        `$ ${result.command}`,
        '',
        result.stdout || '',
        result.stderr ? `stderr:\n${result.stderr}` : '',
        '',
        `exit code: ${result.status}`,
      ]
        .filter(Boolean)
        .join('\n');
      setTerminalSessions((previous) =>
        previous.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                command,
                cwd,
                output: outputText,
                lastCommandMeta: result,
                history: [
                  {
                    command,
                    cwd,
                    status: result.status,
                    success: result.success,
                    at: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                  },
                  ...session.history,
                ].slice(0, 8),
              }
            : session
        )
      );
    } catch (error) {
      setTerminalSessions((previous) =>
        previous.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                output: `命令执行失败：${error.message || String(error)}`,
              }
            : session
        )
      );
    } finally {
      setRunningCommand(false);
    }
  }

  async function handleGlobalSearch() {
    if (!globalSearchQuery.trim()) {
      setGlobalSearchResults([]);
      setReplacementSummary(null);
      return;
    }

    setSearchingGlobal(true);
    try {
      const targets =
        searchScope === 'current'
          ? escapeShellArg(selectedFile.path)
          : explorerRoots.map((root) => escapeShellArg(root.path)).join(' ');
      const flags = [
        '--line-number',
        '--no-heading',
        useRegex ? '' : '--fixed-strings',
        !matchCase ? '--ignore-case' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const command = `rg ${flags} ${escapeShellArg(globalSearchQuery)} ${targets}`;
      const result = await runWorkspaceCommand(command, '.', {
        command,
        cwd: workspaceRoot,
        status: 0,
        stdout: '浏览器预览模式下不执行真实全局搜索。',
        stderr: '',
        success: true,
      });
      setGlobalSearchResults(parseGlobalSearchOutput(result.stdout || ''));
    } catch (error) {
      setGlobalSearchResults([
        {
          path: '搜索失败',
          line: 0,
          preview: error.message || String(error),
        },
      ]);
    } finally {
      setSearchingGlobal(false);
    }
  }

  async function handleReplaceAllMatches() {
    const searchText = globalSearchQuery.trim();
    if (!searchText) {
      await showMessage('请先输入搜索关键词。', {
        title: '全局替换',
        type: 'warning',
      });
      return;
    }

    if (groupedSearchResults.length === 0) {
      await showMessage('当前没有可替换的搜索结果。', {
        title: '全局替换',
        type: 'warning',
      });
      return;
    }

    const confirmed = await confirm(
      `确定把 ${groupedSearchResults.length} 个文件中的 “${searchText}” 替换为 “${replaceQuery}” 吗？`,
      {
        title: '全局替换确认',
        type: 'warning',
      }
    );
    if (!confirmed) {
      return;
    }

    setReplacingGlobal(true);
    try {
      let filesChanged = 0;
      let replacements = 0;
      const nextBuffers = {};

      for (const group of groupedSearchResults) {
        const absolutePath = `${workspaceRoot}/${group.path}`;
        const content = isTauri
          ? await readFile(absolutePath)
          : fileBuffers[group.path]?.content ?? '';
        const matcher = buildReplaceRegExp(searchText, useRegex, matchCase);
        const matches = content.match(matcher);
        const matchCount = matches?.length || 0;
        if (matchCount === 0) {
          continue;
        }

        const updated = content.replace(matcher, replaceQuery);
        if (isTauri) {
          await writeFile(absolutePath, updated);
        }

        filesChanged += 1;
        replacements += matchCount;
        nextBuffers[group.path] = {
          originalContent: updated,
          content: updated,
          loading: false,
        };
      }

      if (Object.keys(nextBuffers).length > 0) {
        setFileBuffers((previous) => ({
          ...previous,
          ...nextBuffers,
        }));
      }

      setReplacementSummary({
        filesChanged,
        replacements,
        searchText,
        replaceText: replaceQuery,
      });

      await handleGlobalSearch();
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: '全局替换失败',
        type: 'error',
      });
    } finally {
      setReplacingGlobal(false);
    }
  }

  async function handlePreviewReplacement() {
    const searchText = globalSearchQuery.trim();
    if (!searchText) {
      await showMessage('请先输入搜索关键词。', {
        title: '替换预览',
        type: 'warning',
      });
      return;
    }

    if (groupedSearchResults.length === 0) {
      await showMessage('当前没有可预览的搜索结果。', {
        title: '替换预览',
        type: 'warning',
      });
      return;
    }

    setPreviewingReplacement(true);
    try {
      const matcher = buildReplaceRegExp(searchText, useRegex, matchCase);
      const previews = [];

      for (const group of groupedSearchResults.slice(0, 20)) {
        const absolutePath = `${workspaceRoot}/${group.path}`;
        const content = isTauri
          ? await readFile(absolutePath)
          : fileBuffers[group.path]?.content ?? '';
        const matches = content.match(matcher);
        const replacements = matches?.length || 0;
        if (replacements === 0) {
          continue;
        }

        const sampleBefore = group.matches[0]?.preview || '';
        const sampleAfter = sampleBefore.replace(matcher, replaceQuery);
        previews.push({
          path: group.path,
          replacements,
          sampleBefore,
          sampleAfter,
          firstLine: group.matches[0]?.line || 1,
        });
      }

      setReplacementPreview(previews);
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: '替换预览失败',
        type: 'error',
      });
    } finally {
      setPreviewingReplacement(false);
    }
  }

  function handleOpenSearchResult(result) {
    openFileInTab(result.path);
    if (result.line > 0) {
      setPendingRevealLine({
        path: result.path,
        line: result.line,
      });
    }
  }

  function handleOpenReplacementPreview(preview) {
    handleOpenSearchResult({
      path: preview.path,
      line: preview.firstLine,
      preview: preview.sampleBefore,
    });
    setEditorMode('diff');
  }

  function renderHighlightedText(text, query) {
    if (!query || !text) {
      return text;
    }

    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const parts = [];
    let start = 0;
    let index = normalizedText.indexOf(normalizedQuery);

    while (index !== -1) {
      if (index > start) {
        parts.push(text.slice(start, index));
      }
      parts.push(
        <mark key={`${index}-${start}`} className="rounded bg-hydro-500/20 px-1 text-hydro-200">
          {text.slice(index, index + query.length)}
        </mark>
      );
      start = index + query.length;
      index = normalizedText.indexOf(normalizedQuery, start);
    }

    if (start < text.length) {
      parts.push(text.slice(start));
    }

    return parts;
  }

  function toggleSearchGroup(path) {
    setExpandedSearchGroups((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  async function handleCreateWorkspaceItem() {
    const relativeInput = newItemPath.trim().replace(/^\/+/, '');
    if (!relativeInput) {
      await showMessage('请输入相对路径，例如 components/NewPanel.jsx 或 generated/new-pack。', {
        title: '新建工作区项',
        type: 'warning',
      });
      return;
    }

    const targetPath = `${workspaceRoot}/${newItemRoot}/${relativeInput}`;
    setCreatingItem(true);
    try {
      if (newItemType === 'directory') {
        await createDirectory(targetPath, true);
      } else {
        const normalized = relativeInput.split('/');
        if (normalized.length > 1) {
          const parentPath = `${workspaceRoot}/${newItemRoot}/${normalized.slice(0, -1).join('/')}`;
          await createDirectory(parentPath, true);
        }
        await writeFile(targetPath, '');
      }

      await loadWorkspaceTree.current();
      const relativeTargetPath = `${newItemRoot}/${relativeInput}`;
      setNewItemPath('');
      if (newItemType === 'file') {
        openFileInTab(relativeTargetPath);
      } else {
        setExpandedPaths((current) => {
          const next = new Set(current);
          next.add(newItemRoot);
          next.add(relativeTargetPath);
          return next;
        });
      }
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: '新建失败',
        type: 'error',
      });
    } finally {
      setCreatingItem(false);
    }
  }

  async function handleRenameSelectedItem() {
    if (!selectedTreeItem?.path || !renameDraft.trim()) {
      await showMessage('请先选择文件或目录，并输入新的名称。', {
        title: '重命名',
        type: 'warning',
      });
      return;
    }

    const nextPath = renameDraft.includes('/')
      ? renameDraft.trim().replace(/^\/+/, '')
      : buildSiblingPath(selectedTreeItem.path, renameDraft.trim());

    if (nextPath === selectedTreeItem.path) {
      return;
    }

    setRenamingItem(true);
    try {
      await renamePath(selectedTreeItem.path, nextPath, false);

      setOpenTabs((current) =>
        current.map((item) =>
          item === selectedTreeItem.path || item.startsWith(`${selectedTreeItem.path}/`)
            ? item.replace(selectedTreeItem.path, nextPath)
            : item
        )
      );
      setFileBuffers((previous) => {
        const nextEntries = {};
        Object.entries(previous).forEach(([key, value]) => {
          const nextKey =
            key === selectedTreeItem.path || key.startsWith(`${selectedTreeItem.path}/`)
              ? key.replace(selectedTreeItem.path, nextPath)
              : key;
          nextEntries[nextKey] = value;
        });
        return nextEntries;
      });
      if (selectedFilePath === selectedTreeItem.path || selectedFilePath.startsWith(`${selectedTreeItem.path}/`)) {
        setSelectedFilePath(selectedFilePath.replace(selectedTreeItem.path, nextPath));
      }
      setSelectedTreeItem({
        ...selectedTreeItem,
        path: nextPath,
        label: getBasename(nextPath),
      });
      await loadWorkspaceTree.current();
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: '重命名失败',
        type: 'error',
      });
    } finally {
      setRenamingItem(false);
    }
  }

  async function handleDeleteSelectedItem() {
    if (!selectedTreeItem?.path) {
      return;
    }

    const confirmed = await confirm(`确定删除 ${selectedTreeItem.path} 吗？此操作不可撤销。`, {
      title: '删除工作区项',
      type: 'warning',
    });
    if (!confirmed) {
      return;
    }

    try {
      await deletePath(selectedTreeItem.path, false);
      setOpenTabs((current) =>
        current.filter(
          (item) => item !== selectedTreeItem.path && !item.startsWith(`${selectedTreeItem.path}/`)
        )
      );
      setFileBuffers((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(
            ([key]) => key !== selectedTreeItem.path && !key.startsWith(`${selectedTreeItem.path}/`)
          )
        )
      );
      if (
        selectedFilePath === selectedTreeItem.path ||
        selectedFilePath.startsWith(`${selectedTreeItem.path}/`)
      ) {
        const nextFile = flatFiles.find(
          (file) => file.path !== selectedTreeItem.path && !file.path.startsWith(`${selectedTreeItem.path}/`)
        );
        setSelectedFilePath(nextFile?.path || fallbackFiles[0].path);
      }
      setSelectedTreeItem(null);
      await loadWorkspaceTree.current();
    } catch (error) {
      await showMessage(error.message || String(error), {
        title: '删除失败',
        type: 'error',
      });
    }
  }

  async function handleCloseTab(filePath) {
    const buffer = fileBuffers[filePath];
    const dirty = buffer && !buffer.loading && buffer.content !== buffer.originalContent;
    if (dirty) {
      const confirmed = await confirm(`文件 ${filePath} 有未保存修改，确定关闭标签吗？`, {
        title: '关闭标签',
      });
      if (!confirmed) {
        return;
      }
    }

    setOpenTabs((current) => {
      if (current.length === 1) {
        return current;
      }
      const next = current.filter((item) => item !== filePath);
      if (selectedFilePath === filePath) {
        setSelectedFilePath(next[next.length - 1]);
      }
      return next;
    });
  }

  function createTerminalSession() {
    const nextIndex = terminalSessions.length + 1;
    const nextSession = {
      id: `terminal-${Date.now()}`,
      name: `终端 ${nextIndex}`,
      cwd: currentTerminalSession?.cwd || 'HydroDesk',
      command: currentTerminalSession?.command || 'pwd',
      output: '',
      history: [],
      lastCommandMeta: null,
    };
    setTerminalSessions((current) => [...current, nextSession]);
    setActiveTerminalId(nextSession.id);
  }

  function closeTerminalSession(sessionId) {
    if (terminalSessions.length === 1) {
      return;
    }
    const next = terminalSessions.filter((session) => session.id !== sessionId);
    setTerminalSessions(next);
    if (activeTerminalId === sessionId) {
      setActiveTerminalId(next[0].id);
    }
  }

  function updateCurrentSession(patch) {
    setTerminalSessions((previous) =>
      previous.map((session) =>
        session.id === activeTerminalId
          ? {
              ...session,
              ...patch,
            }
          : session
      )
    );
  }

  return (
    <div className="flex h-full min-h-0">
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

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-700/50 bg-slate-900/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">统一 IDE 工作面</h2>
              <p className="mt-1 text-sm text-slate-400">与工作台共用同一任务、会话、artifact 和 checkpoint</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-xs text-hydro-300">
                Codex / VS Code 插件入口
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

        <div className="grid min-h-0 flex-1 grid-cols-[1.4fr,0.9fr]">
          <section className="border-r border-slate-700/50 bg-slate-950/50 p-5">
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
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
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/40">
                {activeBuffer.loading ? (
                  <div className="flex h-[420px] items-center justify-center bg-slate-950 text-sm text-slate-500">
                    正在读取真实文件预览...
                  </div>
                ) : editorMode === 'diff' ? (
                  <DiffEditor
                    height="420px"
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
                    height="420px"
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

            <div className="mt-4 grid grid-cols-2 gap-4">
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
          </section>

          <section className="bg-slate-900/40 p-5">
            <div className="text-sm font-semibold text-slate-200">终端与运行上下文</div>
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
        </div>
      </div>
    </div>
  );
}
