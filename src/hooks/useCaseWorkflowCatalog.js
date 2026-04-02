import { useCallback, useEffect, useState } from 'react';
import { getCaseWorkflowCatalog } from '../api/tauri_bridge';

export function useCaseWorkflowCatalog(caseId, pollMs = 10000) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCaseWorkflowCatalog(caseId, []);
      setCatalog(Array.isArray(result) ? result : []);
    } catch (error) {
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  return {
    catalog,
    loading,
    reload: load,
  };
}
