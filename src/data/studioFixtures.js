export const demoTasks = [
  {
    id: 'task-001',
    title: '控制断面候选复核',
    detail: '2 个候选断面需要人工确认，之后可继续生成 review bundle。',
    priority: 'high',
    status: 'pending-approval',
    workflow: 'build_control_section_candidates',
    backend: 'agent-teams-local',
    checkpoint: 'cp-20260402-1023',
  },
  {
    id: 'task-002',
    title: '河网提取任务继续运行',
    detail: '当前进度 72%，预计生成新的对比产物与 GIS 结果图层。',
    priority: 'medium',
    status: 'running',
    workflow: 'run_watershed_delineation',
    backend: 'agent-teams-local',
    checkpoint: 'cp-20260402-0946',
  },
  {
    id: 'task-003',
    title: '生成 review bundle',
    detail: '等待空间校验结果进入下一步，并固化 release 前置结论。',
    priority: 'medium',
    status: 'queued',
    workflow: 'generate_review_bundle',
    backend: 'hm + workflow',
    checkpoint: 'cp-20260401-1730',
  },
  {
    id: 'task-004',
    title: '更新 source inventory',
    detail: '新导入 survey_reports 后需要重扫资料目录与可信度。',
    priority: 'medium',
    status: 'ready',
    workflow: 'scan_source_inventory',
    backend: 'hm + workflow',
    checkpoint: 'cp-20260401-1655',
  },
];

export const demoEvents = [
  { time: '10:24', title: 'artifact_created', detail: '生成 review_bundle 草稿', view: 'review' },
  { time: '10:20', title: 'gis_job_progress', detail: '河网提取进度 72%', view: 'modeling' },
  { time: '10:16', title: 'approval_required', detail: '控制断面候选需要人工确认', view: 'monitor' },
];

export const demoArtifacts = [
  { name: 'source_inventory.json', type: 'contract', updated: '10:08' },
  { name: 'control_section_candidates.geojson', type: 'gis', updated: '10:11' },
  { name: 'review_bundle.md', type: 'review', updated: '10:21' },
];

export const demoAssets = [
  { name: 'survey_reports/', records: '124 files', size: '2.3 GB', updated: '2026-03-16', status: '可靠' },
  { name: 'hydro_stations.csv', records: '525,600', size: '145 MB', updated: '2026-03-17', status: '待复核' },
  { name: 'reference_river_network.geojson', records: '43,200', size: '12 MB', updated: '2026-03-01', status: '可靠' },
];

export const demoWorkflowRuns = [
  { id: 'wf-001', name: 'run_watershed_delineation', type: '流域划分', status: 'completed', duration: '2m 34s', created: '2026-03-15 14:30' },
  { id: 'wf-002', name: 'build_control_section_candidates', type: '断面候选', status: 'running', duration: '--', created: '2026-03-17 09:15' },
  { id: 'wf-003', name: 'generate_review_bundle', type: '审查交付', status: 'queued', duration: '--', created: '2026-03-17 10:00' },
];

export const demoReviewChecks = [
  { name: '资料来源完整性', status: 'passed', note: 'source_inventory 与 reliability 已同步' },
  { name: '控制断面适用性', status: 'review', note: '2 个候选断面需要人工确认' },
  { name: '提取水系一致性', status: 'warning', note: '局部支流偏移仍需复核' },
  { name: 'release 前置条件', status: 'passed', note: '运行记录与 artifacts 已齐备' },
];

export const demoReports = [
  { name: 'review_bundle.md', type: 'Review Bundle', updated: '10:21' },
  { name: 'watershed_delineation_report.html', type: 'HTML 报告', updated: '10:18' },
  { name: 'control_section_candidates.geojson', type: 'GIS 产物', updated: '10:11' },
];

export const demoStations = [
  { id: 'st-001', name: '陶岔渠首', status: 'normal', flow: 350.2, level: 147.5, pressure: 0.42, region: '南阳' },
  { id: 'st-002', name: '方城垭口', status: 'normal', flow: 342.8, level: 145.2, pressure: 0.4, region: '南阳' },
  { id: 'st-003', name: '鲁山段', status: 'warning', flow: 298.5, level: 142.1, pressure: 0.35, region: '平顶山' },
  { id: 'st-004', name: '郑州分水口', status: 'normal', flow: 280.0, level: 138.8, pressure: 0.38, region: '郑州' },
  { id: 'st-005', name: '焦作段', status: 'normal', flow: 265.3, level: 136.5, pressure: 0.37, region: '焦作' },
  { id: 'st-006', name: '安阳段', status: 'error', flow: 0.0, level: 130.2, pressure: 0.0, region: '安阳' },
  { id: 'st-007', name: '邯郸段', status: 'normal', flow: 220.1, level: 128.7, pressure: 0.34, region: '邯郸' },
  { id: 'st-008', name: '石家庄分水口', status: 'normal', flow: 195.6, level: 125.3, pressure: 0.32, region: '石家庄' },
];

export const demoAlerts = [
  { id: 'a-001', level: 'error', message: '安阳段流量异常：检测到流量为0，可能存在闸门故障', time: '10:23', station: '安阳段' },
  { id: 'a-002', level: 'warning', message: '鲁山段压力偏低：当前0.35MPa，低于阈值0.38MPa', time: '09:45', station: '鲁山段' },
  { id: 'a-003', level: 'info', message: '郑州分水口日供水量达标：28万m³/日', time: '08:00', station: '郑州分水口' },
];
