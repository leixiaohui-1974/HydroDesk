import { useCallback, useEffect, useState } from 'react';
import { readWorkspaceTextFile } from '../api/tauri_bridge';
import { getAgentRegistryYamlRelPath } from '../config/hydrodesk_commands';
import useTauri from './useTauri';

/** 统计 agent_registry.yaml 中 agents 下的条目数（顶层 `  key:`） */
export function countAgentsInRegistryYaml(text) {
  if (!text || typeof text !== 'string') return 0;
  const idx = text.indexOf('\nagents:\n');
  if (idx < 0) return 0;
  const rest = text.slice(idx);
  const matches = rest.match(/^  [a-z][a-z0-9_]*:\s*$/gm);
  return matches ? matches.length : 0;
}

export function useAgentRegistryRollup() {
  const { isTauri } = useTauri();
  const [agentCount, setAgentCount] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const relPath = getAgentRegistryYamlRelPath();

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (!isTauri) {
        setAgentCount(null);
        setLoadError('浏览器预览无法读取注册表；请使用桌面端。');
        return;
      }
      const text = await readWorkspaceTextFile(relPath, null);
      if (text == null) {
        setAgentCount(null);
        setLoadError('未能读取 agent_registry.yaml');
        return;
      }
      setAgentCount(countAgentsInRegistryYaml(text));
    } catch (e) {
      setAgentCount(null);
      setLoadError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [isTauri, relPath]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { agentCount, loadError, loading, reload, registryRelPath: relPath };
}
