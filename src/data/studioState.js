import { roleAgents } from './roleProfiles';
import { studioWorkspaceCatalog, studioProjectCatalog } from './studioCatalog';
import { studioRuntimeFixtureState } from './studioRuntimeFixtures';

export const studioState = {
  workspace: studioWorkspaceCatalog.workspace,
  activeRole: studioWorkspaceCatalog.activeRole,
  activeMode: studioWorkspaceCatalog.activeMode,
  activeSurfaceMode: studioWorkspaceCatalog.activeSurfaceMode,
  roleAgents,
  projects: studioProjectCatalog,
  activeProjectId: studioWorkspaceCatalog.activeProjectId,
  ...studioRuntimeFixtureState,
};

export const getActiveProject = () =>
  studioState.projects.find((project) => project.id === studioState.activeProjectId) || studioState.projects[0];

export const getActiveRoleAgent = (viewPath, activeRole = studioState.activeRole) =>
  viewPath === '/monitor' ? studioState.roleAgents.dispatcher : studioState.roleAgents[activeRole];

export const getPendingApprovals = () =>
  studioState.tasks.filter((task) => task.status === 'pending-approval');

export const getRunningTasks = () =>
  studioState.tasks.filter((task) => task.status === 'running');
