/**
 * Rollout：必达路径与 JSON 形状门禁的数据源为
 * Hydrology/configs/rollout_repo_artifact_gates.json（v2：artifact_profiles + case_artifact_profile）。
 * 无案例分支代码；Playwright 案例列表与 JSON 表、rolloutCaseIds.js 须一致。
 */
import fs from 'fs';
import path from 'path';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';
import { WORKSPACE_ROOT } from './workspaceRoot.js';

const GATES_PATH = path.join(WORKSPACE_ROOT, 'Hydrology/configs/rollout_repo_artifact_gates.json');

let _gatesCache = null;

function loadRolloutGates() {
  if (!_gatesCache) {
    const raw = fs.readFileSync(GATES_PATH, 'utf8');
    _gatesCache = JSON.parse(raw);
  }
  if (_gatesCache.version !== 2) {
    throw new Error(`rollout_repo_artifact_gates.json: expected version 2, got ${_gatesCache.version}`);
  }
  return _gatesCache;
}

function profileForCase(caseId, gates) {
  const d = gates.default_artifact_profile || 'rollout_baseline';
  const m = gates.case_artifact_profile || {};
  return m[caseId] != null ? String(m[caseId]).trim() : d;
}

/**
 * @returns {string[]}
 */
export function artifactPathsForCase(caseId) {
  const gates = loadRolloutGates();
  const templates = gates.path_templates || [];
  const prof = profileForCase(caseId, gates);
  const profBody = gates.artifact_profiles?.[prof];
  const extras = profBody?.extra_path_templates || [];
  const base = templates.map((t) => t.replaceAll('{case_id}', caseId));
  const extra = extras.map((t) => t.replaceAll('{case_id}', caseId));
  return [...base, ...extra];
}

export function assertRolloutCaseIdsAligned() {
  const gates = loadRolloutGates();
  const cmap = gates.case_artifact_profile || {};
  const keys = Object.keys(cmap).sort();
  const expected = [...ROLLOUT_CASE_IDS].sort();
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    throw new Error(
      `case_artifact_profile keys must match ROLLOUT_CASE_IDS exactly.\n  map: ${keys.join(',')}\n  ids: ${expected.join(',')}`,
    );
  }
  for (const cid of ROLLOUT_CASE_IDS) {
    const p = profileForCase(cid, gates);
    if (!gates.artifact_profiles?.[p]) {
      throw new Error(`unknown artifact_profile ${p} for case ${cid}`);
    }
  }
}

/**
 * 展开为「每案例 × 每条规则」，供 Playwright 逐条断言。
 * @returns {{ caseId: string, path_template: string, required_keys: string[] }[]}
 */
export function rolloutJsonShapeGateCases() {
  const gates = loadRolloutGates();
  const shared = gates.shared_json_shape_gates || [];
  const out = [];
  for (const caseId of ROLLOUT_CASE_IDS) {
    const prof = profileForCase(caseId, gates);
    const profRules = gates.artifact_profiles?.[prof]?.json_shape_gates || [];
    for (const rule of [...shared, ...profRules]) {
      if (!rule?.path_template || !Array.isArray(rule.required_keys)) continue;
      out.push({
        caseId,
        path_template: rule.path_template,
        required_keys: rule.required_keys,
      });
    }
  }
  return out;
}
