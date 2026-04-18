import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ROLLOUT_CASE_IDS } from './rolloutCaseIds.js';
import { WORKSPACE_ROOT } from './workspaceRoot.js';
import {
  artifactPathsForCase,
  assertRolloutCaseIdsAligned,
  rolloutJsonShapeGateCases,
} from './rolloutArtifactGates.js';

assertRolloutCaseIdsAligned();

const PLATFORM_GOVERNANCE_INDEX = path.join(
  WORKSPACE_ROOT,
  'Hydrology/configs/platform_governance_gates.index.json',
);

test.describe('平台治理门索引（Hydrology/configs）', () => {
  test('platform_governance_gates.index.json 存在且含三门', () => {
    expect(fs.existsSync(PLATFORM_GOVERNANCE_INDEX), '缺少治理门索引文件').toBe(true);
    const idx = JSON.parse(fs.readFileSync(PLATFORM_GOVERNANCE_INDEX, 'utf8'));
    expect(idx.schema).toBe('platform_governance_gates.index');
    expect(typeof idx.version).toBe('number');
    expect(Array.isArray(idx.gates)).toBe(true);
    expect(idx.gates.length).toBe(3);
    const keys = idx.gates.map((g) => g.key).sort();
    expect(keys).toEqual(['assimilation', 'coupling', 'hydraulics']);
    for (const g of idx.gates) {
      expect(Array.isArray(g.path_template_chain), `${g.key}: path_template_chain`).toBe(true);
      expect(g.path_template_chain.length).toBeGreaterThan(0);
      for (const tpl of g.path_template_chain) {
        expect(tpl).toContain('{case_id}');
      }
    }
  });
});

test.describe('仓库契约门禁（Node：与 HydroDesk 展示路径一致）', () => {
  for (const caseId of ROLLOUT_CASE_IDS) {
    test(`rollout · ${caseId} · 必达产物在仓库中存在`, () => {
      for (const rel of artifactPathsForCase(caseId)) {
        const abs = path.join(WORKSPACE_ROOT, rel);
        expect.soft(fs.existsSync(abs), `缺少文件（请先跑通工作流或补齐数据）: ${rel}`).toBe(true);
      }
    });
  }
});

test.describe('Rollout JSON 顶层键门禁（v2 profile，与 rollout_repo_artifact_gates.json 一致）', () => {
  for (const row of rolloutJsonShapeGateCases()) {
    test(`rollout json · ${row.caseId} · ${row.path_template}`, () => {
      const rel = row.path_template.replaceAll('{case_id}', row.caseId);
      const abs = path.join(WORKSPACE_ROOT, rel);
      expect(fs.existsSync(abs), `缺少 JSON: ${rel}`).toBe(true);
      const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
      expect(typeof data).toBe('object');
      expect(data).not.toBe(null);
      for (const k of row.required_keys || []) {
        expect.soft(Object.hasOwn(data, k), `缺少键 ${k}: ${rel}`).toBe(true);
      }
    });
  }
});
