export function parseGraphifyReportSummary(markdown) {
  const text = String(markdown || '');
  if (!text.trim()) return null;

  const lines = text.split(/\r?\n/);
  const summary = {
    corpusCheck: [],
    summaryBullets: [],
    godNodes: [],
  };

  let section = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      section = line.slice(3).trim();
      continue;
    }
    if (section === 'Corpus Check' && line.startsWith('- ')) {
      summary.corpusCheck.push(line.slice(2).trim());
      continue;
    }
    if (section === 'Summary' && line.startsWith('- ')) {
      summary.summaryBullets.push(line.slice(2).trim());
      continue;
    }
    if (section.startsWith('God Nodes') && /^\d+\.\s+`/.test(line)) {
      summary.godNodes.push(line.replace(/^\d+\.\s+/, '').trim());
      continue;
    }
  }

  return summary;
}
