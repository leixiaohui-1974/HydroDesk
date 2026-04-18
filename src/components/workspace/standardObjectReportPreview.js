import { buildPreviewSection, tryParsePreviewJson } from './workspacePreviewUtils.js';

const STANDARD_OBJECT_REPORT_INDEX_FILENAME = 'standard_object_reports.index.json';
const STANDARD_OBJECT_REPORT_SECTION_TITLES = {
  overview: '概览',
  topology_context: '拓扑上下文',
  key_parameters: '关键参数',
  process_and_method: '过程与方法',
  results_and_risks: '结果与风险',
  recommendations_and_evidence: '建议与证据',
};
const STANDARD_OBJECT_REPORT_COMMON_KEYS = new Set([
  'object_id',
  'object_type',
  'display_name',
  'summary',
  'location',
  'status',
  'description',
  'upstream_ids',
  'downstream_ids',
  'evidence_refs',
  'metadata',
  'sections',
]);

function normalizeCaseId(caseId = '') {
  return String(caseId || '').trim();
}

function normalizeRelativePath(path = '') {
  return String(path || '')
    .replace(/^\.?\/*/, '')
    .replace(/\\/g, '/')
    .trim();
}

function getObjectReportsBaseDir(caseId = '') {
  const normalizedCaseId = normalizeCaseId(caseId);
  return normalizedCaseId ? `cases/${normalizedCaseId}/contracts` : '';
}

function joinContractPath(caseId = '', relativePath = '') {
  const baseDir = getObjectReportsBaseDir(caseId);
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  if (!baseDir) return normalizedRelativePath;
  if (!normalizedRelativePath) return baseDir;
  return `${baseDir}/${normalizedRelativePath}`;
}

function stringifyValue(value) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function deriveReportNameFromPath(path = '') {
  const filename = String(path || '').split('/').pop() || '标准对象报告';
  return filename
    .replace(/\.sample\.(json|md)$/i, '')
    .replace(/__/g, ' ')
    .trim();
}

function extractObjectReportMarkdownMetadata(markdown = '') {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const title = lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '').trim() || '';
  const bulletMap = {};
  const introLines = [];
  const sections = [];
  let currentSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^- ([^:]+):\s*(.+)$/);
    if (bulletMatch) {
      bulletMap[bulletMatch[1].trim()] = bulletMatch[2].trim();
      continue;
    }

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (currentSection) {
        currentSection.content = currentSection.content.trim();
        sections.push(currentSection);
      }
      currentSection = {
        title: headingMatch[1].trim(),
        content: '',
      };
      continue;
    }

    if (line.startsWith('# ')) continue;

    if (currentSection) {
      currentSection.content += `${line}\n`;
    } else if (line.trim()) {
      introLines.push(line.trim());
    }
  }

  if (currentSection) {
    currentSection.content = currentSection.content.trim();
    sections.push(currentSection);
  }

  return {
    title,
    bulletMap,
    intro: introLines.join(' ').trim(),
    sections,
  };
}

function isStandardObjectReportPayload(payload) {
  return !!(
    payload &&
    typeof payload === 'object' &&
    typeof payload.object_id === 'string' &&
    typeof payload.object_type === 'string'
  );
}

function isStandardObjectReportIndexPayload(payload) {
  return !!(
    payload &&
    typeof payload === 'object' &&
    Array.isArray(payload.reports)
  );
}

export function getStandardObjectReportIndexPath(caseId = '') {
  return joinContractPath(caseId, STANDARD_OBJECT_REPORT_INDEX_FILENAME);
}

export function buildStandardObjectReportWorkspaceAssets({ caseId = '', indexPayload = null }) {
  const normalizedCaseId = normalizeCaseId(caseId);
  if (!normalizedCaseId) return [];

  const indexPath = getStandardObjectReportIndexPath(normalizedCaseId);
  const assets = [
    {
      key: `object-index:${indexPath}`,
      label: '标准对象报告索引',
      note: '汇总当前 case 的标准对象报告样例、缺失对象和模板装配状态。',
      path: indexPath,
      tryPaths: [indexPath],
      previewType: 'standard_object_report_index',
      kind: 'standard_object_report_index',
    },
  ];
  const seenPaths = new Set([indexPath]);
  const reports = Array.isArray(indexPayload?.reports) ? indexPayload.reports : [];

  reports.forEach((report) => {
    if (String(report?.status || '').toLowerCase() !== 'available') return;

    const objectType = String(report?.object_type || 'Object');
    const displayName = String(report?.display_name || report?.object_id || objectType);

    [
      ['JSON', report?.json_path],
      ['Markdown', report?.markdown_path],
    ].forEach(([format, relativePath]) => {
      const resolvedPath = joinContractPath(normalizedCaseId, relativePath);
      if (!resolvedPath || seenPaths.has(resolvedPath)) return;
      seenPaths.add(resolvedPath);
      assets.push({
        key: `object-report:${resolvedPath}`,
        label: `${displayName} ${format} 样例`,
        note: `${objectType} 标准对象报告样例（${format}）。`,
        path: resolvedPath,
        tryPaths: [resolvedPath],
        previewType: 'standard_object_report',
        kind: 'standard_object_report',
        objectType,
        objectId: report?.object_id || '',
        status: report?.status || 'available',
      });
    });
  });

  return assets;
}

export function buildStandardObjectReportIndexPreviewModel({
  previewContent,
  title = '标准对象报告索引',
  description = '汇总标准对象报告样例、缺失策略与模板装配状态。',
  path = '',
}) {
  const parsed = tryParsePreviewJson(previewContent);
  if (!isStandardObjectReportIndexPayload(parsed)) {
    return {
      kind: 'business',
      title,
      description,
      badges: ['object-index', 'unparsed'],
      sections: [
        buildPreviewSection('索引状态', [
          { label: 'path', value: path || '—' },
          { label: 'status', value: 'unparsed' },
        ]),
      ].filter(Boolean),
      rawContent: previewContent,
    };
  }

  const availableReports = parsed.reports.filter((report) => String(report?.status || '').toLowerCase() === 'available');
  const missingReports = parsed.reports.filter((report) => String(report?.status || '').toLowerCase() !== 'available');

  return {
    kind: 'business',
    title,
    description,
    badges: [
      'object-index',
      parsed.case_id || 'case',
      `${availableReports.length} available`,
      `${missingReports.length} missing`,
    ],
    sections: [
      buildPreviewSection('索引摘要', [
        { label: 'case_id', value: parsed.case_id || '—' },
        { label: 'generated_at', value: parsed.generated_at || '—' },
        {
          label: 'source_mode',
          value: parsed.generated_from_existing_artifacts ? 'existing_artifacts_adapter' : 'unknown',
        },
        {
          label: 'HydroClaude',
          value: parsed.hydroclaw_or_hydroclaude_touched ? 'touched' : 'not_touched',
        },
      ]),
      buildPreviewSection('覆盖情况', [
        { label: 'available', value: String(availableReports.length) },
        { label: 'missing', value: String(missingReports.length) },
        { label: 'templates', value: String(parsed.reports.length) },
      ]),
      buildPreviewSection(
        '可用样例',
        availableReports.map((report) => ({
          label: String(report?.object_type || 'Object'),
          value: `${report?.display_name || report?.object_id || 'unknown'} · ${report?.template_id || 'template'}`,
        })),
      ),
      buildPreviewSection(
        '缺失对象',
        missingReports.map((report) => ({
          label: String(report?.object_type || 'Object'),
          value: `${report?.reason || report?.default_strategy || 'missing'}`,
        })),
      ),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}

export function buildStandardObjectReportPreviewModel({
  previewContent,
  title = '',
  description = '',
  path = '',
}) {
  const parsed = tryParsePreviewJson(previewContent);
  if (isStandardObjectReportPayload(parsed)) {
    const keyParameterRows = Object.entries(parsed)
      .filter(([key]) => !STANDARD_OBJECT_REPORT_COMMON_KEYS.has(key))
      .slice(0, 8)
      .map(([key, value]) => ({
        label: key,
        value: stringifyValue(value),
      }));

    const sectionRows = Object.entries(parsed.sections || {}).map(([key, value]) => ({
      label: STANDARD_OBJECT_REPORT_SECTION_TITLES[key] || key,
      value: stringifyValue(value),
    }));

    return {
      kind: 'business',
      title: parsed.display_name || title || deriveReportNameFromPath(path),
      description: description || parsed.summary || parsed.description || '标准对象报告样例预览。',
      badges: ['standard-object-report', parsed.object_type, parsed.status || 'unknown'],
      sections: [
        buildPreviewSection('对象信息', [
          { label: 'object_type', value: parsed.object_type },
          { label: 'object_id', value: parsed.object_id },
          { label: 'status', value: parsed.status || '—' },
          { label: 'path', value: path || '—' },
        ]),
        buildPreviewSection('定位 / 拓扑', [
          { label: 'case_id', value: parsed.location?.case_id || '—' },
          { label: 'location', value: stringifyValue(parsed.location) },
          { label: 'upstream_ids', value: stringifyValue(parsed.upstream_ids) },
          { label: 'downstream_ids', value: stringifyValue(parsed.downstream_ids) },
        ]),
        buildPreviewSection('关键参数', keyParameterRows),
        buildPreviewSection('模板章节', sectionRows),
      ].filter(Boolean),
      rawContent: previewContent,
    };
  }

  const markdownMeta = extractObjectReportMarkdownMetadata(previewContent);
  const parsedKeyParameterSection = markdownMeta.sections.find((section) => section.title === '关键参数');
  const parsedKeyParameterJson = tryParsePreviewJson(parsedKeyParameterSection?.content || '');

  return {
    kind: 'business',
    title: markdownMeta.title || title || deriveReportNameFromPath(path),
    description: description || markdownMeta.intro || '标准对象报告样例预览。',
    badges: [
      'standard-object-report',
      markdownMeta.bulletMap['对象类型'] || 'unknown',
      markdownMeta.bulletMap['状态'] || 'unknown',
    ],
    sections: [
      buildPreviewSection('对象信息', [
        { label: 'object_type', value: markdownMeta.bulletMap['对象类型'] || '—' },
        { label: 'object_id', value: markdownMeta.bulletMap['对象 ID'] || '—' },
        { label: 'status', value: markdownMeta.bulletMap['状态'] || '—' },
        { label: 'path', value: path || '—' },
      ]),
      buildPreviewSection('摘要', [
        { label: 'summary', value: markdownMeta.intro || '—' },
      ]),
      buildPreviewSection(
        '模板章节',
        markdownMeta.sections
          .filter((section) => section.title !== '关键参数')
          .map((section) => ({
            label: section.title,
            value: section.content || '—',
          })),
      ),
      buildPreviewSection(
        '关键参数',
        parsedKeyParameterJson && typeof parsedKeyParameterJson === 'object'
          ? Object.entries(parsedKeyParameterJson).map(([key, value]) => ({
              label: key,
              value: stringifyValue(value),
            }))
          : parsedKeyParameterSection?.content
            ? [{ label: 'raw', value: parsedKeyParameterSection.content }]
            : [],
      ),
    ].filter(Boolean),
    rawContent: previewContent,
  };
}
