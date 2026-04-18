import { useCallback, useEffect, useState } from 'react';
import {
  hasPlaywrightBrowserFixture,
  readWorkspaceTextFile,
  resolveFirstExistingWorkspacePath,
} from '../api/tauri_bridge';
import useTauri from './useTauri';
import {
  PLATFORM_GOVERNANCE_GATE_DEFS,
  summarizeGovernanceGatePayload,
} from '../data/platform_governance_gates';

/**
 * 读取三道治理门对应 contracts JSON（若存在），供 ReviewDelivery 等平台面展示。
 */
export function usePlatformGovernanceGates(caseId) {
  const { isTauri } = useTauri();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const cid = (caseId || '').trim();
    if (!cid) {
      setRows([]);
      setError('');
      return;
    }
    if (!isTauri && !hasPlaywrightBrowserFixture()) {
      setRows([]);
      setError('浏览器预览无法读取契约；请使用桌面端。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = [];
      for (const def of PLATFORM_GOVERNANCE_GATE_DEFS) {
        const paths = def.pathTemplates(cid);
        const resolved = await resolveFirstExistingWorkspacePath(paths, null);
        if (!resolved) {
          next.push({
            key: def.key,
            label: def.label,
            short: def.short,
            description: def.description,
            resolvedPath: null,
            status: 'missing',
            hint: '文件不存在',
            pathsTried: paths,
          });
          continue;
        }
        const text = await readWorkspaceTextFile(resolved, null);
        if (text == null || text === '') {
          next.push({
            key: def.key,
            label: def.label,
            short: def.short,
            description: def.description,
            resolvedPath: resolved,
            status: 'empty',
            hint: '文件为空',
            pathsTried: paths,
          });
          continue;
        }
        let obj = null;
        try {
          obj = JSON.parse(text);
        } catch {
          next.push({
            key: def.key,
            label: def.label,
            short: def.short,
            description: def.description,
            resolvedPath: resolved,
            status: 'invalid_json',
            hint: 'JSON 解析失败',
            pathsTried: paths,
          });
          continue;
        }
        const sum = summarizeGovernanceGatePayload(obj);
        next.push({
          key: def.key,
          label: def.label,
          short: def.short,
          description: def.description,
          resolvedPath: resolved,
          status: sum.status,
          hint: sum.hint,
          pathsTried: paths,
        });
      }
      setRows(next);
    } catch (e) {
      setError(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, isTauri]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
