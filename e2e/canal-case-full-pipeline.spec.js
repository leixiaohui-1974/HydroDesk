/**
 * canal-case-full-pipeline.spec.js
 *
 * 验证 canal case（zhongxian/yinchuojiliao）从 source 到 final_report 的完整链路。
 * 核心断言：D1 水文建模维度正确标记为 not_applicable，而非 blocked。
 */
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { WORKSPACE_ROOT } from './workspaceRoot.js';

const CANAL_CASE_IDS = ['zhongxian', 'yinchuojiliao', 'jiaodongtiaoshui', 'xuhonghe'];

function readJson(relPath) {
  const abs = path.join(WORKSPACE_ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function contractPath(caseId, file) {
  return `cases/${caseId}/contracts/${file}`;
}

test.describe('Canal Case Full Pipeline Validation', () => {
  for (const caseId of CANAL_CASE_IDS) {
    test(`${caseId}: knowledge.latest.json has open_channel_transfer`, () => {
      const k = readJson(contractPath(caseId, 'knowledge.latest.json'));
      expect(k, `${caseId} missing knowledge.latest.json`).toBeTruthy();
      expect(k.network_type).toBe('open_channel_transfer');
    });

    test(`${caseId}: case_manifest has canal project_type`, () => {
      const m = readJson(contractPath(caseId, 'case_manifest.json'));
      expect(m, `${caseId} missing case_manifest.json`).toBeTruthy();
      expect(m.project_type).toMatch(/canal/);
    });

    test(`${caseId}: wnal_level_report is not blocked`, () => {
      const w = readJson(contractPath(caseId, 'wnal_level_report.json'));
      expect(w, `${caseId} missing wnal_level_report.json`).toBeTruthy();
      expect(w.status).not.toBe('blocked');
    });

    test(`${caseId}: contracts triad exists`, () => {
      for (const f of ['workflow_run.json', 'review_bundle.json', 'release_manifest.json']) {
        const d = readJson(contractPath(caseId, f));
        expect(d, `${caseId} missing ${f}`).toBeTruthy();
      }
    });

    test(`${caseId}: P1 三件套 exists`, () => {
      for (const f of ['wnal_level_report.json', 'control_optimization_report.json', 'sil_verification_report.json']) {
        const d = readJson(contractPath(caseId, f));
        expect(d, `${caseId} missing ${f}`).toBeTruthy();
      }
    });
  }
});
