import { useEffect, useMemo, useState } from 'react';
import { readWorkspaceTextFileFirstOf } from '../api/tauri_bridge';
import {
  contractJsonPathAlternates,
  getCaseRunReviewReleaseContracts,
  resolveShellCaseId,
} from '../data/case_contract_shell';

function deriveContractStatus(contract, payload) {
  if (!payload || typeof payload !== 'object') {
    return contract.status;
  }
  if (contract.stage === 'Run') {
    return String(payload.status || contract.status || 'pending');
  }
  if (contract.stage === 'Review') {
    return String(payload.status || payload.verdict || contract.status || 'pending');
  }
  if (contract.stage === 'Release') {
    return String(payload.status || contract.status || 'pending');
  }
  return contract.status;
}

export function useCaseRunReviewReleaseContracts(caseId) {
  const shellCaseId = resolveShellCaseId(caseId);
  const baseContracts = useMemo(() => getCaseRunReviewReleaseContracts(shellCaseId), [shellCaseId]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadStatuses() {
      const entries = await Promise.all(
        baseContracts.map(async (contract) => {
          try {
            const text = await readWorkspaceTextFileFirstOf(
              contractJsonPathAlternates(contract.path),
              null,
            );
            if (!text) return [contract.path, contract.status];
            const parsed = JSON.parse(text);
            return [contract.path, deriveContractStatus(contract, parsed)];
          } catch {
            return [contract.path, contract.status];
          }
        }),
      );
      if (!cancelled) {
        setStatusMap(Object.fromEntries(entries));
      }
    }

    void loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [baseContracts]);

  return useMemo(
    () =>
      baseContracts.map((contract) => ({
        ...contract,
        status: statusMap[contract.path] || contract.status,
      })),
    [baseContracts, statusMap],
  );
}
