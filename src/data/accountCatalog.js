export const studioAccounts = {
  manager_lead: {
    key: 'manager_lead',
    label: '管理账号',
    userName: 'lead.manager',
    role: 'manager',
    mode: 'delivery',
    defaultRoute: '/review',
    surfaceMode: 'agent',
    visibleViewKeys: ['workbench', 'simulation', 'monitor', 'review', 'docs', 'settings'],
    description: '面向签发、风险总览与交付完整性。',
  },
  designer_zhongxian: {
    key: 'designer_zhongxian',
    label: '设计账号',
    userName: 'zhongxian.designer',
    role: 'designer',
    mode: 'development',
    defaultRoute: '/projects',
    surfaceMode: 'agent',
    visibleViewKeys: ['workbench', 'projects', 'simulation', 'monitor', 'review', 'modeling', 'analysis', 'agent', 'knowledge', 'docs', 'settings'],
    description: '面向拓扑建模、GIS 校核与交付审查。',
  },
  researcher_lab: {
    key: 'researcher_lab',
    label: '科研账号',
    userName: 'lab.researcher',
    role: 'researcher',
    mode: 'development',
    defaultRoute: '/notebook',
    surfaceMode: 'notebook',
    visibleViewKeys: ['workbench', 'projects', 'simulation', 'monitor', 'review', 'analysis', 'notebook', 'knowledge', 'agent', 'docs', 'settings'],
    description: '面向实验追踪、参数对比与证据链整理。',
  },
  dispatcher_ops: {
    key: 'dispatcher_ops',
    label: '调度账号',
    userName: 'dispatch.ops',
    role: 'dispatcher',
    mode: 'delivery',
    defaultRoute: '/monitor',
    surfaceMode: 'agent',
    visibleViewKeys: ['workbench', 'simulation', 'monitor', 'review', 'analysis', 'docs', 'settings'],
    description: '面向态势、告警与调度处置。',
  },
  operator_duty: {
    key: 'operator_duty',
    label: '运行账号',
    userName: 'duty.operator',
    role: 'operator',
    mode: 'delivery',
    defaultRoute: '/monitor',
    surfaceMode: 'agent',
    visibleViewKeys: ['workbench', 'simulation', 'monitor', 'review', 'projects', 'docs', 'settings'],
    description: '面向值守、巡检与异常处置。',
  },
};

export const defaultStudioAccountKey = 'designer_zhongxian';

export function getStudioAccount(accountKey) {
  return studioAccounts[accountKey] || studioAccounts[defaultStudioAccountKey];
}
