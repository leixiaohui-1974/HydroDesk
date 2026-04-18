import { useCallback, useState } from 'react';
import { readWorkspaceTextFile } from '../api/tauri_bridge';
import { getPluginRegistryYamlRelPath } from '../config/hydrodesk_commands';
import useTauri from './useTauri';

/** 轻量解析 plugin_registry 占位 YAML（无 js-yaml 依赖） */
export function parsePluginRegistrySummary(text) {
  if (!text || typeof text !== 'string') {
    return { version: '—', pluginCount: 0, enabledCount: 0, highPermissionCount: 0, rawLines: 0 };
  }
  const vm = text.match(/^version:\s*(\d+)/m);
  const version = vm ? vm[1] : '—';
  let pluginCount = 0;
  const enabledMatches = text.match(/^\s+status:\s*enabled\s*$/gm);
  const highPermissionMatches = text.match(/^\s+permission_profile:\s*high\s*$/gm);
  if (/\bplugins:\s*\[\s*\]/s.test(text)) {
    pluginCount = 0;
  } else {
    const block = text.match(/\bplugins:\s*\n([\s\S]*?)(?=^\S|\z)/m);
    if (block) {
      const dashes = block[1].match(/^\s+-\s+/gm);
      pluginCount = dashes ? dashes.length : 0;
    }
  }
  return {
    version,
    pluginCount,
    enabledCount: enabledMatches ? enabledMatches.length : 0,
    highPermissionCount: highPermissionMatches ? highPermissionMatches.length : 0,
    rawLines: text.split(/\r?\n/).length,
  };
}

export function useHydrodeskPluginRegistry() {
  const { isTauri } = useTauri();
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const rel = getPluginRegistryYamlRelPath();
    setLoading(true);
    setLoadError('');
    try {
      if (!isTauri) {
        setSummary(null);
        setLoadError('浏览器预览无法读取仓库文件；请使用桌面端。');
        return;
      }
      const text = await readWorkspaceTextFile(rel);
      if (text == null || typeof text !== 'string') {
        setLoadError('未能读取插件注册表（非桌面端或 IPC 不可用）');
        return;
      }
      setSummary(parsePluginRegistrySummary(text));
    } catch (e) {
      setSummary(null);
      setLoadError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [isTauri]);

  return { summary, loadError, loading, reload, registryRelPath: getPluginRegistryYamlRelPath() };
}
