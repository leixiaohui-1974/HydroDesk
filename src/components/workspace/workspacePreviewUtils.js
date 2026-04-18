export function buildPreviewSection(title, rows = []) {
  const normalizedRows = rows.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== '');
  if (normalizedRows.length === 0) return null;
  return { title, rows: normalizedRows };
}

export function tryParsePreviewJson(previewContent) {
  try {
    return JSON.parse(previewContent);
  } catch {
    return null;
  }
}
