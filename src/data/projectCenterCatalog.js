export const projectCenterFeasibilityTierLabels = {
  no_case_config: '无 case YAML',
  registry_only: '注册表级（规则未覆盖）',
  data_ok: '数据信号 ∩ 规则',
  data_gap: '缺规则所需数据信号',
};

export const projectCenterSignalLabels = {
  case_config_file: 'case YAML',
  dem_file: 'DEM 文件',
  river_network_file: '河网文件',
  topology_files: '拓扑 JSON',
  sqlite_files: 'SQLite',
  case_manifest_file: 'case_manifest',
  source_bundle_file: 'source_bundle',
  source_import_session_file: 'source_import_session',
  scan_dirs_data: 'scan_dirs 有数据',
  contracts_dir: 'contracts 目录',
  hydrology_outputs_hint: '水文类 contracts 线索',
};

export const projectCenterModelStrategyEvidenceLabels = {
  has_catchment_truth: 'catchment 真相',
  has_station_control_area_truth: '站点控制面积',
  has_dem_truth: 'DEM/地形',
  has_river_network_truth: '河网',
  has_control_topology: '控制拓扑',
  has_actuators: '执行器',
  has_reservoirs: '梯级/水库',
};

export const projectCenterStatusMeta = {
  active: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    label: '进行中',
  },
  review: {
    className: 'border-hydro-500/30 bg-hydro-500/10 text-hydro-300',
    label: '审查中',
  },
  risk: {
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    label: '需关注',
  },
};
