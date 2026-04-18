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

def humanize_case_id(cid):
    text = str(cid or '').strip().replace('_', ' ').replace('-', ' ')
    return text or 'unknown-case'

def manifest_name_from_case_dir(case_dir):
    for rel in ('manifest.yaml', 'contracts/case_manifest.json'):
        p = case_dir / rel
        if not p.exists():
            continue
        try:
            if p.suffix == '.yaml':
                doc = yaml.safe_load(p.read_text(encoding='utf-8')) or {}
                case = doc.get('case') or {}
                for key in ('display_name', 'name'):
                    val = case.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip()
            else:
                doc = json.loads(p.read_text(encoding='utf-8')) or {}
                for key in ('display_name', 'name'):
                    val = doc.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip()
        except Exception:
            continue
    return None

def pipedream_display_name(path, stem):
    try:
        doc = yaml.safe_load(path.read_text(encoding='utf-8')) or {}
    except Exception:
        return humanize_case_id(stem)
    meta = doc.get('meta') or {}
    for key in ('display_name', 'name'):
        val = doc.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    val = meta.get('name')
    if isinstance(val, str) and val.strip():
        return val.strip()
    return humanize_case_id(stem)

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
        nm = manifest_name_from_case_dir(mf.parent) or humanize_case_id(cid)
        push_case(cid, nm, True, 'cases_manifest')

if pipedream_cases.exists():
    for f in pipedream_cases.glob('*.yaml'):
        stem = f.stem
        if stem not in found_ids:
            push_case(stem, pipedream_display_name(f, stem), False, 'pipedream_yaml')

if hydrology_know.exists():
    for d in hydrology_know.iterdir():
        if d.is_dir() and d.name not in found_ids:
            push_case(d.name, manifest_name_from_case_dir(workspace_cases / d.name) or humanize_case_id(d.name), True, 'hydrology_knowledge')

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
