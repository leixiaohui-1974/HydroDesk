export function getNotebookStorageKey(caseId) {
  return `hydrodesk-notebook-${caseId}`;
}

export function getNotebookArtifactPaths(caseId) {
  return {
    json: `cases/${caseId}/contracts/hydrodesk_notebook.latest.json`,
    markdown: `cases/${caseId}/contracts/hydrodesk_notebook.latest.md`,
    reviewMemo: `cases/${caseId}/contracts/hydrodesk_review_memo.latest.md`,
    releaseNote: `cases/${caseId}/contracts/hydrodesk_release_note.latest.md`,
    notebookJsonPath: `cases/${caseId}/contracts/hydrodesk_notebook.latest.json`,
    notebookMarkdownPath: `cases/${caseId}/contracts/hydrodesk_notebook.latest.md`,
    reviewMemoPath: `cases/${caseId}/contracts/hydrodesk_review_memo.latest.md`,
    releaseNotePath: `cases/${caseId}/contracts/hydrodesk_release_note.latest.md`,
  };
}

export function buildDefaultNotebookMetadata() {
  return {
    version: 'v0.1.0',
    signoffStatus: 'draft',
    updatedBy: 'Manager Agent',
  };
}

export function buildDefaultNotebookSections(caseId, projectName) {
  return {
    baseline: `项目：${projectName}\n案例：${caseId}\n\n- 记录本次 North Star、run_id、coverage gate 和 review 范围\n- 把关键 contracts 与 live dashboard 锚定到同一笔记页`,
    evidence: '- Outcome Coverage Report\n- Verification Report\n- ReviewBundle / ReleaseManifest\n\n在这里整理证据路径、差异和人工确认结论。',
    release: '- 当前结论：\n- 待签发风险：\n- Release gate：\n- 下一步：',
  };
}

export function appendNotebookSection(sections, sectionKey, text) {
  return {
    ...sections,
    [sectionKey]: `${sections[sectionKey] || ''}\n${text}`.trim(),
  };
}

export function buildNotebookMarkdown(caseId, projectName, notes, metadata = buildDefaultNotebookMetadata()) {
  return `# HydroDesk Evidence Notebook

- 项目: ${projectName}
- 案例: ${caseId}
- 版本: ${metadata.version || 'v0.1.0'}
- 签发状态: ${metadata.signoffStatus || 'draft'}
- 最后更新人: ${metadata.updatedBy || 'Manager Agent'}

## 基线与上下文

${notes.baseline || ''}

## 证据摘录

${notes.evidence || ''}

## 签发备注

${notes.release || ''}
`;
}

export function buildReviewMemoMarkdown(caseId, projectName, notes, contracts, reviewAssets, metadata = buildDefaultNotebookMetadata()) {
  return `# HydroDesk Review Memo

- 项目: ${projectName}
- 案例: ${caseId}
- 版本: ${metadata.version || 'v0.1.0'}
- 签发状态: ${metadata.signoffStatus || 'draft'}
- 最后更新人: ${metadata.updatedBy || 'Manager Agent'}

## 基线与范围

${notes.baseline || ''}

## 证据摘要

${notes.evidence || ''}

## 审查合同链

${contracts.map((item) => `- ${item.stage} / ${item.contractName}: ${item.path}`).join('\n')}

## 关键审查资产

${reviewAssets.map((item) => `- ${item.name}: ${item.path}`).join('\n')}

## 人工审查结论

${notes.release || ''}
`;
}

export function buildReleaseNoteMarkdown(caseId, projectName, notes, contracts, metadata = buildDefaultNotebookMetadata(), releaseEvidenceAssets = []) {
  return `# HydroDesk Release Note

- 项目: ${projectName}
- 案例: ${caseId}
- 版本: ${metadata.version || 'v0.1.0'}
- 签发状态: ${metadata.signoffStatus || 'draft'}
- 最后更新人: ${metadata.updatedBy || 'Manager Agent'}

## Release Scope

${notes.baseline || ''}

## Evidence Snapshot

${notes.evidence || ''}

## Contract Triad

${contracts.map((item) => `- ${item.contractName}: ${item.path}`).join('\n')}

## Release Gate Evidence

${releaseEvidenceAssets.map((item) => `- ${item.name}: ${item.path}`).join('\n')}

## Sign-off Draft

${notes.release || ''}
`;
}

export function buildNotebookPayload(caseId, projectName, sections, metadata = buildDefaultNotebookMetadata()) {
  return {
    case_id: caseId,
    project_name: projectName,
    updated_at: new Date().toISOString(),
    sections,
    metadata,
    _auto_generated: true,
  };
}
