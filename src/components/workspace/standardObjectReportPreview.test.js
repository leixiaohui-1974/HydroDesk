import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStandardObjectReportWorkspaceAssets,
  buildStandardObjectReportPreviewModel,
  buildStandardObjectReportIndexPreviewModel,
} from './standardObjectReportPreview.js';
import {
  buildWorkspaceBusinessPreviewByKind,
  getWorkspaceAssetPreviewKind,
} from './workspaceAssetPreviewRegistry.js';

test('getWorkspaceAssetPreviewKind recognizes standard object report index and samples', () => {
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/standard_object_reports.index.json',
    }),
    'standard_object_report_index',
  );
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.json',
    }),
    'standard_object_report',
  );
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.md',
    }),
    'standard_object_report',
  );
  assert.equal(
    getWorkspaceAssetPreviewKind({
      path: 'cases/daduhe/contracts/delivery_pack.latest.json',
    }),
    null,
  );
});

test('buildStandardObjectReportWorkspaceAssets includes index and available sample assets only', () => {
  const assets = buildStandardObjectReportWorkspaceAssets({
    caseId: 'daduhe',
    indexPayload: {
      case_id: 'daduhe',
      reports: [
        {
          object_type: 'Reservoir',
          status: 'available',
          object_id: 's1',
          display_name: '瀑布沟',
          json_path: 'object_reports/reservoir__s1.sample.json',
          markdown_path: 'object_reports/reservoir__s1.sample.md',
        },
        {
          object_type: 'PumpStation',
          status: 'missing',
          reason: 'not declared',
        },
      ],
    },
  });

  assert.deepEqual(
    assets.map((asset) => [asset.previewType, asset.path]),
    [
      ['standard_object_report_index', 'cases/daduhe/contracts/standard_object_reports.index.json'],
      ['standard_object_report', 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.json'],
      ['standard_object_report', 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.md'],
    ],
  );
  assert.match(assets[1].note, /Reservoir/);
  assert.match(assets[2].label, /Markdown/);
});

test('buildStandardObjectReportIndexPreviewModel summarizes available and missing object reports', () => {
  const preview = buildStandardObjectReportIndexPreviewModel({
    previewContent: JSON.stringify({
      case_id: 'daduhe',
      generated_at: '2026-04-11T11:14:58',
      generated_from_existing_artifacts: true,
      hydroclaw_or_hydroclaude_touched: false,
      reports: [
        {
          object_type: 'Reservoir',
          status: 'available',
          object_id: 's1',
          display_name: '瀑布沟',
          template_id: 'reservoir_object_template',
        },
        {
          object_type: 'PumpStation',
          status: 'missing',
          reason: 'not declared',
        },
      ],
    }),
  });

  assert.equal(preview.title, '标准对象报告索引');
  assert.equal(preview.badges.includes('object-index'), true);
  assert.equal(preview.sections[0].rows.find((row) => row.label === 'case_id').value, 'daduhe');
  assert.equal(preview.sections[1].rows.find((row) => row.label === 'available').value, '1');
  assert.match(
    preview.sections[2].rows.find((row) => row.label === 'Reservoir').value,
    /瀑布沟/,
  );
  assert.match(
    preview.sections[3].rows.find((row) => row.label === 'PumpStation').value,
    /not declared/,
  );
});

test('buildStandardObjectReportPreviewModel renders structured json samples', () => {
  const preview = buildStandardObjectReportPreviewModel({
    previewContent: JSON.stringify({
      object_id: 's1',
      object_type: 'Reservoir',
      display_name: '瀑布沟',
      status: 'available',
      summary: '代表性水库对象样本',
      location: { case_id: 'daduhe', river: '大渡河' },
      upstream_ids: [],
      downstream_ids: ['s2'],
      storage_capacity: 5339000000,
      normal_level: 850,
      sections: {
        overview: '样本概览',
        results_and_risks: '存在占位字段',
      },
    }),
    path: 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.json',
  });

  assert.equal(preview.title, '瀑布沟');
  assert.equal(preview.badges.includes('Reservoir'), true);
  assert.equal(
    preview.sections[0].rows.find((row) => row.label === 'object_id').value,
    's1',
  );
  assert.match(
    preview.sections[2].rows.find((row) => row.label === 'storage_capacity').value,
    /5339000000/,
  );
  assert.match(
    preview.sections[3].rows.find((row) => row.label === '概览').value,
    /样本概览/,
  );
});

test('buildStandardObjectReportPreviewModel renders markdown samples while preserving legacy fallback safety', () => {
  const preview = buildStandardObjectReportPreviewModel({
    previewContent: [
      '# 瀑布沟 标准对象报告',
      '',
      '- 对象类型: Reservoir',
      '- 对象 ID: s1',
      '- 状态: available',
      '',
      '基于现有产物抽取。',
      '',
      '## 概览',
      '',
      '样本取首个具备完整站点配置的梯级水库。',
      '',
      '## 关键参数',
      '',
      '{"storage_capacity": 5339000000.0}',
    ].join('\n'),
    path: 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.md',
  });

  assert.equal(preview.title, '瀑布沟 标准对象报告');
  assert.equal(preview.badges.includes('Reservoir'), true);
  assert.equal(
    preview.sections[0].rows.find((row) => row.label === 'object_id').value,
    's1',
  );
  assert.match(
    preview.sections[2].rows.find((row) => row.label === '概览').value,
    /梯级水库/,
  );
});

test('buildWorkspaceBusinessPreviewByKind routes standard object report kinds to business previews', () => {
  const indexPreview = buildWorkspaceBusinessPreviewByKind('standard_object_report_index', {
    previewContent: JSON.stringify({
      case_id: 'daduhe',
      reports: [],
    }),
  });
  const samplePreview = buildWorkspaceBusinessPreviewByKind('standard_object_report', {
    previewContent: JSON.stringify({
      object_id: 's1',
      object_type: 'Reservoir',
      display_name: '瀑布沟',
      status: 'available',
      sections: {},
    }),
    path: 'cases/daduhe/contracts/object_reports/reservoir__s1.sample.json',
  });

  assert.equal(indexPreview.kind, 'business');
  assert.equal(samplePreview.kind, 'business');
  assert.equal(samplePreview.badges.includes('standard-object-report'), true);
});
