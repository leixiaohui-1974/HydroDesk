import { createContext, useContext, useMemo, useState } from 'react';
import { studioState } from '../data/studioState';

const StudioWorkspaceContext = createContext(null);

export function StudioWorkspaceProvider({ children }) {
  const [activeProjectId, setActiveProjectId] = useState(studioState.activeProjectId);
  const [activeRole, setActiveRole] = useState(studioState.activeRole);
  const [activeMode, setActiveMode] = useState(studioState.activeMode);
  const [activeSurfaceMode, setActiveSurfaceMode] = useState(studioState.activeSurfaceMode);

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

    return {
      activeProjectId,
      activeProject,
      activeRole,
      activeMode,
      activeSurfaceMode,
      setActiveProjectId,
      setActiveRole,
      setActiveMode,
      setActiveSurfaceMode,
    };
  }, [activeProjectId, activeRole, activeMode, activeSurfaceMode]);

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
