/**
 * P0 A-03～A-05：三道治理门 — 路径模板来自 Hydrology 单一索引；摘要启发式在下方。
 */
import platformGovernanceGatesIndex from '../../../Hydrology/configs/platform_governance_gates.index.json';

function expandPathTemplates(templates, caseId) {
  const cid = String(caseId || '').trim();
  return templates.map((t) => t.replaceAll('{case_id}', cid));
}

const rawGates = platformGovernanceGatesIndex?.gates;
if (!Array.isArray(rawGates) || rawGates.length === 0) {
  throw new Error('platform_governance_gates.index.json: missing or empty gates[]');
}

export const PLATFORM_GOVERNANCE_GATE_DEFS = rawGates.map((g) => {
  const chain = g.path_template_chain;
  if (!Array.isArray(chain) || chain.length === 0) {
    throw new Error(`platform_governance_gates.index.json: gate ${g.key} needs path_template_chain[]`);
  }
  return {
    key: g.key,
    label: g.label,
    short: g.short,
    description: g.description,
    pathTemplates: (caseId) => expandPathTemplates(chain, caseId),
  };
});

export const PLATFORM_GOVERNANCE_INDEX_META = {
  schema: platformGovernanceGatesIndex.schema,
  version: platformGovernanceGatesIndex.version,
  indexRelPath: 'Hydrology/configs/platform_governance_gates.index.json',
};

/**
 * @param {Record<string, unknown>|null} obj
 * @returns {{ status: string, hint: string }}
 */
export function summarizeGovernanceGatePayload(obj) {
  if (!obj || typeof obj !== 'object') {
    return { status: 'missing', hint: '无有效 JSON' };
  }
  if (typeof obj.outcome_status === 'string' && obj.outcome_status) {
    return { status: obj.outcome_status, hint: 'outcome_status' };
  }
  if (typeof obj.gate_status === 'string' && obj.gate_status) {
    return { status: obj.gate_status, hint: 'gate_status' };
  }
  if (obj.quality_gate_passed === false) {
    return { status: 'quality_failed', hint: 'quality_gate_passed' };
  }
  if (obj.quality_gate_passed === true) {
    return { status: 'quality_passed', hint: 'quality_gate_passed' };
  }
  if (typeof obj.ok === 'boolean') {
    return { status: obj.ok ? 'ok' : 'failed', hint: 'ok' };
  }
  if (typeof obj.status === 'string' && obj.status) {
    return { status: obj.status, hint: 'status' };
  }
  if (obj.execution_status && typeof obj.execution_status === 'string') {
    return { status: obj.execution_status, hint: 'execution_status' };
  }
  return { status: 'present', hint: '已加载，无标准门控字段' };
}
