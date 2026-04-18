import { reviewRoleTemplates } from './roleProfiles';

export { reviewRoleTemplates };

export const reviewBadgeStyles = {
  passed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  review: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
};

export const reviewHeroStatsMeta = [
  { key: 'pendingApprovals', label: '待确认', note: '人工确认点' },
  { key: 'artifacts', label: '交付物', note: '真实 artifacts' },
  { key: 'checkpoints', label: '上下文包', note: 'checkpoint / packet' },
  { key: 'executionHistory', label: '运行记录', note: '真实执行历史' },
];

export const reviewSignoffSummaryMeta = [
  { key: 'version', label: '版本号', note: 'Notebook chain 当前版本' },
  { key: 'updatedBy', label: '最后更新人', note: '当前签发资产责任人' },
  { key: 'pendingApprovals', label: '待确认', note: '人工确认点数量' },
  { key: 'liveGateCount', label: 'Gate 资产', note: 'coverage / verification 等关键验收资产' },
  { key: 'memoCount', label: 'Memo 数量', note: 'review memo 与 release note' },
  { key: 'manifestPath', label: 'Manifest', note: '正式签发清单入口' },
];

export const reviewModelCapabilityMeta = [
  { key: 'watershed', label: '流域划分', field: 'should_build_watershed_model' },
  { key: 'hydrology', label: '水文模型', field: 'should_build_hydrology_model' },
  { key: 'control', label: '控制/运行模型', field: 'should_build_control_model' },
];

export const reviewBacklogSectionMeta = [
  {
    key: 'ready',
    title: 'Ready To Migrate',
    note: '主链真相已 ready，但 triad 仍在使用 bridge fallback；优先处理这组，收益最高。',
    emptyText: '当前没有“可直接迁移”的案例。',
  },
  {
    key: 'blocked',
    title: 'Blocked By Pipeline Truth',
    note: '这组不只是 bridge 问题，主链真相本身还没闭合；需先补 pipeline contracts。',
    emptyText: '当前没有被 pipeline truth 阻断的案例。',
  },
];

export const reviewSpotlightEffects = [
  '成果摘要自动滚动到对应章节',
  '拓扑图高亮上下游关联节点',
  'GIS 图同步切换相关图层与视口',
  '交付物区自动过滤对应 artifact',
];
