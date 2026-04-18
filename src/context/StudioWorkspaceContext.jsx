import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { studioState } from '../data/studioState';
import { defaultStudioAccountKey, getStudioAccount } from '../data/accountCatalog';

const StudioWorkspaceContext = createContext(null);
const ACCOUNT_STORAGE_KEY = 'hydrodesk.activeAccountKey';

export function StudioWorkspaceProvider({ children }) {
  const [activeProjectId, setActiveProjectId] = useState(studioState.activeProjectId);
  const [activeAccountKey, setActiveAccountKey] = useState(() => {
    if (typeof window === 'undefined') return defaultStudioAccountKey;
    return window.localStorage.getItem(ACCOUNT_STORAGE_KEY) || defaultStudioAccountKey;
  });
  const [activeSurfaceMode, setActiveSurfaceMode] = useState(getStudioAccount(defaultStudioAccountKey).surfaceMode || studioState.activeSurfaceMode);

  useEffect(() => {
    const activeAccount = getStudioAccount(activeAccountKey);
    setActiveSurfaceMode(activeAccount.surfaceMode || studioState.activeSurfaceMode);
  }, [activeAccountKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, activeAccountKey);
  }, [activeAccountKey]);

  const value = useMemo(() => {
    const fromStudio = studioState.projects.find((project) => project.id === activeProjectId);
    const activeProject =
      fromStudio ||
      (activeProjectId &&
      typeof activeProjectId === 'string' &&
      !/^proj-/i.test(activeProjectId)
        ? {
            id: activeProjectId,
            name: activeProjectId,
            stage: 'workspace',
            caseId: activeProjectId,
            status: 'active',
          }
        : null) ||
      studioState.projects[0];

    const activeAccount = getStudioAccount(activeAccountKey);
    const activeRole = activeAccount.role;
    const activeMode = activeAccount.mode || studioState.activeMode;

    return {
      activeProjectId,
      activeProject,
      activeAccountKey,
      activeAccount,
      activeRole,
      activeMode,
      activeSurfaceMode,
      setActiveProjectId,
      loginAsAccount: setActiveAccountKey,
      setActiveSurfaceMode,
    };
  }, [activeAccountKey, activeProjectId, activeSurfaceMode]);

  return (
    <StudioWorkspaceContext.Provider value={value}>
      {children}
    </StudioWorkspaceContext.Provider>
  );
}

export function useStudioWorkspace() {
  const context = useContext(StudioWorkspaceContext);
  if (!context) {
    throw new Error('useStudioWorkspace 必须在 StudioWorkspaceProvider 内使用');
  }
  return context;
}
