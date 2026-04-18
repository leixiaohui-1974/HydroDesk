import rolloutRegistry from '../config/playwrightRollout.generated.json';

const rolloutFirst = Array.isArray(rolloutRegistry.registry) ? rolloutRegistry.registry[0] : null;
const defaultActiveCaseIdRaw = rolloutRegistry.default_active_case_id;
const defaultActiveCaseId =
  typeof defaultActiveCaseIdRaw === 'string' && defaultActiveCaseIdRaw.trim()
    ? String(defaultActiveCaseIdRaw).trim()
    : null;
const defaultEntry =
  defaultActiveCaseId && Array.isArray(rolloutRegistry.registry)
    ? rolloutRegistry.registry.find((entry) => entry.caseId === defaultActiveCaseId)
    : null;
const rolloutEntries = Array.isArray(rolloutRegistry.registry) ? rolloutRegistry.registry : [];
const secondaryRollout = rolloutEntries[1] || null;
const tertiaryRollout = rolloutEntries[2] || null;

export const studioWorkspaceCatalog = {
  workspace: {
    id: 'workspace-research',
    name: 'research / HydroMind Studio',
    rootPath: '/Users/rainfields/hydrosis-local/research',
  },
  activeRole: 'designer',
  activeMode: 'delivery',
  activeSurfaceMode: 'agent',
  activeProjectId: 'proj-001',
};

const defaultRolloutCaseId = defaultEntry?.caseId || rolloutFirst?.caseId || '';
const defaultRolloutName = defaultEntry?.name || rolloutFirst?.name || 'Rollout 默认案例';

export const studioProjectCatalog = [
  {
    id: 'proj-001',
    name: `${defaultRolloutName} · 自主运行验收壳`,
    stage: '端到端验收',
    caseId: defaultRolloutCaseId,
    status: 'active',
  },
  {
    id: 'proj-002',
    name: `${secondaryRollout?.name || 'Rollout 候选二'} · 方案对比`,
    stage: '方案对比',
    caseId: secondaryRollout?.caseId || '',
    status: 'review',
  },
  {
    id: 'proj-003',
    name: `${tertiaryRollout?.name || 'Rollout 候选三'} · 控制断面校核`,
    stage: '控制断面校核',
    caseId: tertiaryRollout?.caseId || '',
    status: 'risk',
  },
];
