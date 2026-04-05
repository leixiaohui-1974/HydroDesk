import { useCallback, useEffect, useState } from 'react';
import { readWorkspaceTextFile, isTauri } from '../api/tauri_bridge';
import scadaReplayContract from '../config/scadaReplayContract.json';

function relPath(caseId, template) {
  return template.replaceAll('{caseId}', caseId);
}

/**
 * 只读加载当前案例 SCADA 回放契约（摘要 JSON + NDJSON 尾部）。
 * 浏览器模式无仓库读盘能力：返回空摘要与空事件，由 UI 提示使用桌面端。
 */
export function useScadaReplayPreview(caseId, { maxStreamLines = 48 } = {}) {
  const [summary, setSummary] = useState(null);
  const [streamEvents, setStreamEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) {
      setSummary(null);
      setStreamEvents([]);
      return;
    }
    if (!isTauri()) {
      setSummary(null);
      setStreamEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const sumRel = relPath(caseId, scadaReplayContract.summary_relative);
      const sumText = await readWorkspaceTextFile(sumRel, null);
      if (sumText && typeof sumText === 'string') {
        setSummary(JSON.parse(sumText));
      } else {
        setSummary(null);
      }

      const streamRel = relPath(caseId, scadaReplayContract.stream_ndjson_relative);
      const streamText = await readWorkspaceTextFile(streamRel, null);
      if (streamText && typeof streamText === 'string') {
        const lines = streamText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(-maxStreamLines);
        const parsed = [];
        for (const line of lines) {
          try {
            parsed.push(JSON.parse(line));
          } catch {
            parsed.push({ _parse_error: true, _raw: line.slice(0, 120) });
          }
        }
        setStreamEvents(parsed);
      } else {
        setStreamEvents([]);
      }
    } catch (e) {
      setError(e?.message || String(e));
      setSummary(null);
      setStreamEvents([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, maxStreamLines]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    summary,
    streamEvents,
    error,
    loading,
    reload: load,
    browserOnly: !isTauri(),
    contractMeta: scadaReplayContract,
  };
}
