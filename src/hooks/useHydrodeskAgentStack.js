import { useCallback, useEffect, useState } from 'react';
import { readWorkspaceTextFile } from '../api/tauri_bridge';
import { getHydrodeskAgentStackConfigRelPath } from '../config/hydrodesk_commands';

/** 与 Hydrology/configs/hydrodesk_agent_stack.json 同构；浏览器或非 Tauri 时作回退 */
export const HYDRODESK_AGENT_STACK_FALLBACK = {
  version: 1,
  claudecode_reference: {
    sourcemap_src: 'claudecode/claude-code-sourcemap/restored-src/src',
    deep_links: {
      coordinator: 'claudecode/claude-code-sourcemap/restored-src/src/coordinator',
      tools: 'claudecode/claude-code-sourcemap/restored-src/src/tools',
      plugins_restored: 'claudecode/claude-code-sourcemap/restored-src/src/plugins',
      skills_restored: 'claudecode/claude-code-sourcemap/restored-src/src/skills',
      official_plugins: 'claudecode/claude-code-official/plugins',
      claw_code: 'claudecode/claw-code',
    },
  },
  hydrodesk_layers: {
    mcp: {
      label: '工具 / MCP',
      hint: 'Hydrology MCP、工作流与自然语言网关',
      paths: ['Hydrology/mcp_server.py', 'Hydrology/workflows/nl_mcp_gateway.py'],
    },
    skills: {
      label: '技能与规则',
      hint: '编辑器规则、案例知识壳与 Markdown 链接 lint',
      paths: ['.cursor/rules', 'Hydrology/scripts/lint_case_knowledge_links.py'],
    },
    plugins: {
      label: '扩展壳层',
      hint: 'Tauri 命令与 HydroDesk 页面能力',
      paths: ['HydroDesk/src-tauri/src/main.rs'],
    },
    subagents: {
      label: '角色 / 编排',
      hint: 'Studio 角色面与 Hydrology agent 注册表',
      paths: ['HydroDesk/src/data/studioState.js', 'Hydrology/configs/agent_registry.yaml'],
    },
  },
  case_project: {
    manifest_rel: 'cases/{case_id}/manifest.yaml',
    contracts_rel: 'cases/{case_id}/contracts',
  },
};

function deepMergeStack(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const next = { ...base, ...patch };
  if (patch.claudecode_reference && typeof patch.claudecode_reference === 'object') {
    next.claudecode_reference = {
      ...base.claudecode_reference,
      ...patch.claudecode_reference,
      deep_links: {
        ...(base.claudecode_reference?.deep_links || {}),
        ...(patch.claudecode_reference.deep_links || {}),
      },
    };
  }
  if (patch.hydrodesk_layers && typeof patch.hydrodesk_layers === 'object') {
    next.hydrodesk_layers = { ...base.hydrodesk_layers, ...patch.hydrodesk_layers };
  }
  if (patch.case_project && typeof patch.case_project === 'object') {
    next.case_project = { ...base.case_project, ...patch.case_project };
  }
  return next;
}

/**
 * 加载 Hydrology/configs/hydrodesk_agent_stack.json（Tauri）；否则使用内存默认。
 */
export function useHydrodeskAgentStack() {
  const [stack, setStack] = useState(HYDRODESK_AGENT_STACK_FALLBACK);
  const [loadError, setLoadError] = useState('');
  const [configSource, setConfigSource] = useState('default');

  const reload = useCallback(async () => {
    setLoadError('');
    const rel = getHydrodeskAgentStackConfigRelPath();
    const text = await readWorkspaceTextFile(rel, null);
    if (text == null || String(text).trim() === '') {
      setStack(HYDRODESK_AGENT_STACK_FALLBACK);
      setConfigSource('default');
      return;
    }
    try {
      const parsed = JSON.parse(String(text));
      setStack(deepMergeStack(HYDRODESK_AGENT_STACK_FALLBACK, parsed));
      setConfigSource('file');
    } catch (e) {
      setLoadError(e?.message || String(e));
      setStack(HYDRODESK_AGENT_STACK_FALLBACK);
      setConfigSource('default');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { stack, loadError, configSource, reload };
}
