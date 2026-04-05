import { useState, useEffect, useCallback } from 'react';
import { runWorkspaceCommand } from '../api/tauri_bridge';
import { isPlaywrightBrowserFixtureEnabled } from '../config/playwrightEnvGate';
import { PLAYWRIGHT_CASE_REGISTRY } from '../config/playwrightCaseRegistry';

/**
 * Retrieves the available dynamically loaded cases from the filesystem
 * using a zero-code pipeline (reading cases/ directory directly).
 */
export function useDynamicCaseRegistry() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      if (isPlaywrightBrowserFixtureEnabled()) {
        setCases([...PLAYWRIGHT_CASE_REGISTRY]);
        return;
      }

      // Inline Python snippet to authentically scan pipedream yamls and Hydrology cases without fabrication.
      const pythonScript = `
import json, pathlib, yaml

workspace_cases = pathlib.Path('cases')
pipedream_cases = pathlib.Path('pipedream-hydrology-integration-lab/hydromind_control_server/configs/cases')
hydrology_know = pathlib.Path('Hydrology/knowledge')

results = []
found_ids = set()

names_fallback = {
  'daduhe': '大渡河梯级',
  'yinchuo': '引绰济辽',
  'jiaodong': '胶东调水',
  'xuhonghe': '徐洪河',
  'zhongxian': '南水北调中线',
  'yjdt': '雅鲁藏布江下游(YJDT)',
  'yinchuojiliao': '引绰济辽',
  'jiaodongtiaoshui': '胶东调水',
}

def e2e_summary_exists(cid):
    if not pipedream_cases.exists():
        return False
    root = pipedream_cases.parent.parent.parent / 'research' / 'e2e_reports' / cid
    return (root / f'{cid}_pipeline_summary.json').is_file()

def push_case(cid, name, prefer_active, source):
    if cid in found_ids:
        return
    found_ids.add(cid)
    active = prefer_active or e2e_summary_exists(cid)
    status_flag = 'active' if active else 'awaiting_data'
    results.append({
        'id': cid,
        'name': name,
        'caseId': cid,
        'status': status_flag,
        'stage': 'V2_E2E',
        'source': source,
    })

if workspace_cases.exists():
    for mf in sorted(workspace_cases.glob('*/manifest.yaml')):
        cid = mf.parent.name
        try:
            doc = yaml.safe_load(mf.read_text(encoding='utf-8')) or {}
            c = doc.get('case') or {}
            nm = c.get('display_name') or names_fallback.get(cid, cid)
        except Exception:
            nm = names_fallback.get(cid, cid)
        push_case(cid, nm, True, 'cases_manifest')

if pipedream_cases.exists():
    for f in pipedream_cases.glob('*.yaml'):
        stem = f.stem
        if stem not in found_ids:
            push_case(stem, names_fallback.get(stem, stem.upper()), False, 'pipedream_yaml')

if hydrology_know.exists():
    for d in hydrology_know.iterdir():
        if d.is_dir() and d.name not in found_ids:
            push_case(d.name, d.name, True, 'hydrology_knowledge')

for yj_path in (pathlib.Path('YJDT/src/yjdt'), pathlib.Path('src/yjdt')):
    if yj_path.exists() and 'yjdt' not in found_ids:
        push_case('yjdt', names_fallback.get('yjdt', 'yjdt'), False, 'yjdt_src')
        break

print(json.dumps(results))
      `.trim();

      const result = await runWorkspaceCommand(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, '.');
      if (result && result.stdout) {
        const parsed = JSON.parse(result.stdout);
        setCases(parsed);
      } else {
        // 与 playwrightRollout.generated.json 同源，避免 Python 扫描失败时写死单一案例 id
        setCases([...PLAYWRIGHT_CASE_REGISTRY]);
      }
    } catch (err) {
      setError(err);
      console.error("Failed to load cases", err);
      setCases([...PLAYWRIGHT_CASE_REGISTRY]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return { cases, loading, error, refresh: fetchCases };
}
