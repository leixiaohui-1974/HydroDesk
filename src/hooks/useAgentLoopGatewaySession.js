import { useCallback, useEffect, useRef, useState } from 'react';
import {
  agentLoopGatewaySessionSend,
  agentLoopGatewaySessionStart,
  agentLoopGatewaySessionStatus,
  agentLoopGatewaySessionStop,
  hasPlaywrightBrowserFixture,
  isTauri,
} from '../api/tauri_bridge';

const MAX_LINES = 96;
const MAX_STDERR = 12;

/**
 * 常驻 agent_loop_gateway：订阅 Tauri 事件 agent-loop-gateway-line / -stderr / -session-ended。
 */
export function useAgentLoopGatewaySession() {
  const [sessionActive, setSessionActive] = useState(false);
  const [pid, setPid] = useState(null);
  const [lines, setLines] = useState([]);
  const [stderrLines, setStderrLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unsubRef = useRef([]);
  const isStoppingRef = useRef(false);
  const desktopLike = isTauri() || hasPlaywrightBrowserFixture();

  const refreshStatus = useCallback(async () => {
    if (!desktopLike) return;
    try {
      const s = await agentLoopGatewaySessionStatus();
      setSessionActive(Boolean(s?.active));
      setPid(s?.pid ?? null);
    } catch {
      setSessionActive(false);
      setPid(null);
    }
  }, [desktopLike]);

  useEffect(() => {
    if (!desktopLike) return undefined;
    let alive = true;
    unsubRef.current = [];
    void (async () => {
      try {
        const s = await agentLoopGatewaySessionStatus();
        if (alive) {
          setSessionActive(Boolean(s?.active));
          setPid(s?.pid ?? null);
        }
      } catch {
        if (alive) {
          setSessionActive(false);
          setPid(null);
        }
      }
      if (!isTauri()) {
        return;
      }
      const { listen } = await import('@tauri-apps/api/event');
      const reg = async (event, handler) => {
        const u = await listen(event, handler);
        if (!alive) {
          u();
          return;
        }
        unsubRef.current.push(u);
      };
      await reg('agent-loop-gateway-line', (e) => {
        const t = typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload);
        setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), t]);
      });
      await reg('agent-loop-gateway-stderr', (e) => {
        const t = typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload);
        setStderrLines((prev) => [...prev.slice(-(MAX_STDERR - 1)), t]);
      });
      await reg('agent-loop-gateway-session-ended', (e) => {
        setSessionActive(false);
        setPid(null);
        if (!isStoppingRef.current) {
          const reason = e.payload?.reason || 'unknown';
          setError(`Gateway session ended unexpectedly. Reason: ${reason}`);
        }
        isStoppingRef.current = false;
      });
    })();
    return () => {
      alive = false;
      unsubRef.current.forEach((u) => u());
      unsubRef.current = [];
    };
  }, [desktopLike]);

  const start = useCallback(async () => {
    if (!desktopLike) {
      setError('仅桌面端可启动常驻网关');
      return;
    }
    setBusy(true);
    setError('');
    isStoppingRef.current = false;
    try {
      const s = await agentLoopGatewaySessionStart();
      setSessionActive(Boolean(s?.active));
      setPid(s?.pid ?? null);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [desktopLike]);

  const stop = useCallback(async () => {
    if (!desktopLike) return;
    setBusy(true);
    setError('');
    isStoppingRef.current = true;
    try {
      const result = await agentLoopGatewaySessionStop();
      setSessionActive(Boolean(result?.active));
      setPid(result?.pid ?? null);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [desktopLike]);

  const sendLine = useCallback(async (line) => {
    if (!desktopLike) {
      setError('仅桌面端可发送');
      return;
    }
    const one = String(line ?? '').trim();
    if (!one || /[\r\n]/.test(one)) {
      setError('发送内容不能为空且不能含换行');
      return;
    }
    setError('');
    try {
      const result = await agentLoopGatewaySessionSend(one);
      if (typeof result?.line === 'string' && result.line.trim()) {
        setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), result.line]);
      }
      if (typeof result?.stderr === 'string' && result.stderr.trim()) {
        setStderrLines((prev) => [...prev.slice(-(MAX_STDERR - 1)), result.stderr]);
      }
      if (typeof result?.active === 'boolean') {
        setSessionActive(result.active);
      }
      if (Object.prototype.hasOwnProperty.call(result ?? {}, 'pid')) {
        setPid(result?.pid ?? null);
      }
    } catch (e) {
      setError(e?.message || String(e));
    }
  }, [desktopLike]);

  const sendPing = useCallback(() => void sendLine(JSON.stringify({ op: 'ping' })), [sendLine]);

  const sendListTools = useCallback(
    (caseId) => {
      const payload = caseId
        ? { op: 'list_tools', case_id: String(caseId).trim() }
        : { op: 'list_tools' };
      void sendLine(JSON.stringify(payload));
    },
    [sendLine],
  );

  const clearLog = useCallback(() => {
    setLines([]);
    setStderrLines([]);
  }, []);

  return {
    sessionActive,
    pid,
    lines,
    stderrLines,
    busy,
    error,
    setError,
    start,
    stop,
    sendLine,
    sendPing,
    sendListTools,
    clearLog,
    refreshStatus,
    isTauriDesktop: desktopLike,
  };
}
