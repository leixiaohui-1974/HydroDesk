/**
 * 将 agent_loop_gateway stdout NDJSON 行解析为简短轨迹项（工具调用时间线）。
 * @param {string} raw
 * @returns {{ kind: string, ok?: boolean, label: string, detail?: string }|null}
 */
export function parseGatewayNdjsonLine(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const line = raw.trim();
  if (!line) return null;
  let j;
  try {
    j = JSON.parse(line);
  } catch {
    return { kind: 'raw', label: '非 JSON', detail: line.slice(0, 160) };
  }
  if (!j || typeof j !== 'object') {
    return { kind: 'raw', label: '非对象', detail: line.slice(0, 120) };
  }
  if (j.pong === true) {
    return { kind: 'ping', ok: true, label: 'ping → pong' };
  }
  if (Array.isArray(j.tools)) {
    const n = j.tools.length;
    const mode = j.policy?.filter_mode || '';
    return {
      kind: 'list_tools',
      ok: j.ok !== false,
      label: `list_tools (${n} 个工具)`,
      detail: mode ? `policy: ${mode}` : undefined,
    };
  }
  if (j.tool) {
    const rc = j.result?.returncode;
    return {
      kind: 'invoke_tool',
      ok: j.ok === true,
      label: `invoke_tool · ${j.tool}`,
      detail: rc != null ? `returncode=${rc}` : j.error || undefined,
    };
  }
  if (j.error) {
    return { kind: 'error', ok: false, label: String(j.error), detail: j.detail ? String(j.detail).slice(0, 200) : undefined };
  }
  return { kind: 'reply', ok: j.ok !== false, label: 'reply', detail: JSON.stringify(j).slice(0, 120) };
}
