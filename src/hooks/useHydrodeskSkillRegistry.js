import { useCallback, useState } from 'react';
import { readWorkspaceTextFile } from '../api/tauri_bridge';
import { getSkillRegistryYamlRelPath } from '../config/hydrodesk_commands';
import useTauri from './useTauri';

/** 轻量解析占位 YAML（无 js-yaml 依赖） */
export function parseSkillRegistrySummary(text) {
  if (!text || typeof text !== 'string') {
    return { version: '—', skillCount: 0, rawLines: 0 };
  }
  const vm = text.match(/^version:\s*(\d+)/m);
  const version = vm ? vm[1] : '—';
  let skillCount = 0;
  if (/\bskills:\s*\[\s*\]/s.test(text)) {
    skillCount = 0;
  } else {
    const block = text.match(/\bskills:\s*\n([\s\S]*?)(?=^\S|\z)/m);
    if (block) {
      const dashes = block[1].match(/^\s+-\s+/gm);
      skillCount = dashes ? dashes.length : 0;
    }
  }
  return {
    version,
    skillCount,
    rawLines: text.split(/\r?\n/).length,
  };
}

export function useHydrodeskSkillRegistry() {
  const { isTauri } = useTauri();
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const rel = getSkillRegistryYamlRelPath();
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
        setLoadError('未能读取注册表（非桌面端或 IPC 不可用）');
        return;
      }
      setSummary(parseSkillRegistrySummary(text));
    } catch (e) {
      setSummary(null);
      setLoadError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [isTauri]);

  return { summary, loadError, loading, reload, registryRelPath: getSkillRegistryYamlRelPath() };
}
