import Editor, { DiffEditor } from '@monaco-editor/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, Folder, Plus, Search, TerminalSquare, Trash2, X } from 'lucide-react';
import { deletePath, openPath, renamePath, revealPath, runWorkspaceCommand } from '../api/tauri_bridge';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { studioState } from '../data/studioState';
import useTauri from '../hooks/useTauri';
import AutoRenderer from '../components/workspace/AutoRenderer';
import { IDEWorkspaceSidebar, IDEWorkspaceHeader, IDEWorkspaceEditor, IDEWorkspaceTerminal, IDEWorkspaceInspector } from '../components/workspace/IDEWorkspaceSections';


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
  { title: 'Qwen Code', detail: '支持 DashScope 兼容模式与 Coding Plan 两类服务，并按编码模型切换 Qwen3 系列。', status: '已接入配置面' },
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
      <IDEWorkspaceSidebar activeMode={activeMode} activeProject={activeProject} workspaceRoot={workspaceRoot} loadingTree={loadingTree} fileFilter={fileFilter} setFileFilter={setFileFilter} selectedTreeItem={selectedTreeItem} renameDraft={renameDraft} setRenameDraft={setRenameDraft} renamingItem={renamingItem} newItemType={newItemType} setNewItemType={setNewItemType} newItemRoot={newItemRoot} setNewItemRoot={setNewItemRoot} newItemPath={newItemPath} setNewItemPath={setNewItemPath} creatingItem={creatingItem} filteredWorkspaceTree={filteredWorkspaceTree} renderTreeNodes={renderTreeNodes} handleCreateWorkspaceItem={handleCreateWorkspaceItem} handleRenameSelectedItem={handleRenameSelectedItem} handleDeleteSelectedItem={handleDeleteSelectedItem} openPath={openPath} revealPath={revealPath} explorerRoots={explorerRoots} />
      <div className="flex min-w-0 flex-1 flex-col">
        <IDEWorkspaceHeader handleImportManifest={handleImportManifest} />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col border-r border-slate-700/50">
            <IDEWorkspaceEditor isTauri={isTauri} selectedFilePath={selectedFilePath} setSelectedFilePath={setSelectedFilePath} openTabs={openTabs} fileBuffers={fileBuffers} setFileBuffers={setFileBuffers} saving={saving} editorMode={editorMode} setEditorMode={setEditorMode} editorRef={editorRef} flatFiles={flatFiles} selectedFile={selectedFile} absoluteSelectedFilePath={absoluteSelectedFilePath} editorLanguage={editorLanguage} activeBuffer={activeBuffer} isDirty={isDirty} handleSaveFile={handleSaveFile} handleCloseTab={handleCloseTab} openPath={openPath} revealPath={revealPath} fallbackFiles={fallbackFiles} />
            <section className="h-80 border-t border-slate-700/50 bg-slate-900/40 p-4 overflow-y-auto"></section>
            <IDEWorkspaceTerminal workspaceRoot={workspaceRoot} runningCommand={runningCommand} terminalSessions={terminalSessions} activeTerminalId={activeTerminalId} setActiveTerminalId={setActiveTerminalId} currentTerminalSession={currentTerminalSession} handleRunCommand={handleRunCommand} createTerminalSession={createTerminalSession} closeTerminalSession={closeTerminalSession} updateCurrentSession={updateCurrentSession} openPath={openPath} hostCapabilities={hostCapabilities} terminals={terminals} commandPresets={commandPresets} />
          </div>
          <IDEWorkspaceInspector globalSearchQuery={globalSearchQuery} setGlobalSearchQuery={setGlobalSearchQuery} searchScope={searchScope} setSearchScope={setSearchScope} matchCase={matchCase} setMatchCase={setMatchCase} useRegex={useRegex} setUseRegex={setUseRegex} replaceQuery={replaceQuery} setReplaceQuery={setReplaceQuery} searchingGlobal={searchingGlobal} replacingGlobal={replacingGlobal} previewingReplacement={previewingReplacement} expandedSearchGroups={expandedSearchGroups} visibleSearchGroupCount={visibleSearchGroupCount} setVisibleSearchGroupCount={setVisibleSearchGroupCount} replacementSummary={replacementSummary} replacementPreview={replacementPreview} groupedSearchResults={groupedSearchResults} handleGlobalSearch={handleGlobalSearch} handleReplaceAllMatches={handleReplaceAllMatches} handlePreviewReplacement={handlePreviewReplacement} handleOpenSearchResult={handleOpenSearchResult} handleOpenReplacementPreview={handleOpenReplacementPreview} renderHighlightedText={renderHighlightedText} toggleSearchGroup={toggleSearchGroup} devPanels={devPanels} />
        </div>
      </div>
    </div>
  );
}
