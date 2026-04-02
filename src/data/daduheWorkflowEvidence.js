const WORKFLOW_EVIDENCE = {
  source_to_delineation: {
    label: 'source_to_delineation',
    headline: '把候选数据源、控制站映射和流域出口闭合到同一条空间证据链。',
    adjacentWorkflows: [
      {
        workflow: 'section_analysis',
        relationship: '上游 workflow',
        detail: '先回看断面检查与候选对象，再确认本条流域闭合链路没有脱离同一套空间对象。',
        contractPath: 'cases/daduhe/contracts/outcomes/section_analysis.latest.json',
      },
      {
        workflow: 'model',
        relationship: '下游 workflow',
        detail: '流域边界、控制站映射和 data pack 会继续供 full modeling 主链读取。',
        contractPath: 'cases/daduhe/contracts/outcomes/model.latest.json',
      },
    ],
    groups: [
      {
        id: 'topology',
        title: '拓扑锚点',
        summary: '先确认 outlet、控制站和流域闭合对象是否已经对齐。',
        items: [
          {
            title: 'Outlets ready',
            focus: '出口闭合对象',
            detail: '用于确认入模出口、主河道节点与后续流域划分结果使用的是同一批 outlet。',
            path: 'cases/daduhe/source_selection/product_outputs/outlets.delineation_ready.json',
            route: '/modeling',
            routeLabel: '回到拓扑/GIS',
          },
          {
            title: 'Control station mapping',
            focus: '控制站 ↔ 拓扑节点',
            detail: '把控制站、outlet IDs 和梯级拓扑节点统一到一张映射表里，避免后续结果只剩文件路径。',
            path: 'cases/daduhe/source_selection/product_outputs/control_station_mapping.json',
            route: '/modeling',
            routeLabel: '查看建模面',
          },
          {
            title: 'Watershed delineation result',
            focus: '流域边界 / 断面闭合',
            detail: '确认最终流域边界和断面闭合结果已经接到本条链路的空间对象上。',
            path: 'cases/daduhe/contracts/watershed_delineation_result.latest.json',
            route: '/review',
            routeLabel: '查看审查面',
          },
        ],
      },
      {
        id: 'gis',
        title: 'GIS 证据',
        summary: '验证空间输入质量，而不是只看 JSON/HTML 文件名。',
        items: [
          {
            title: 'Source reliability',
            focus: '数据源可信度',
            detail: '解释当前 DEM / 河网 / 输入对象为什么能作为正式空间输入证据。',
            path: 'cases/daduhe/source_selection/product_outputs/source_reliability.json',
            route: '/review',
            routeLabel: '查看结论',
          },
          {
            title: 'Coordinate validation',
            focus: '坐标 / 投影校核',
            detail: '核对控制站、河网和候选输入的空间位置一致性。',
            path: 'cases/daduhe/source_selection/product_outputs/coordinate_validation.json',
            route: '/modeling',
            routeLabel: '回到 GIS 面',
          },
          {
            title: 'Source selection map',
            focus: '图层叠加观测',
            detail: '在浏览器地图中对比 DEM、河网和候选数据源覆盖范围。',
            path: 'cases/daduhe/source_selection/index.html',
            route: '/simulation',
            routeLabel: '切到工作流页',
          },
        ],
      },
      {
        id: 'results',
        title: '结果 / 合同',
        summary: '从空间证据直接跳到可交付的 workflow 结果资产。',
        items: [
          {
            title: 'Outcome contract',
            focus: 'workflow 正式合同',
            detail: 'source_to_delineation 的正式 outcome 合同，适合和 pipeline report / data pack 对照阅读。',
            path: 'cases/daduhe/contracts/outcomes/source_to_delineation.latest.json',
            route: '/simulation',
            routeLabel: '查看 workflow',
          },
          {
            title: 'Pipeline report',
            focus: '链路结果摘要',
            detail: '把 source discovery 到 delineation 的结果收口为可审查结果资产。',
            path: 'cases/daduhe/contracts/pipeline_report.latest.json',
            route: '/review',
            routeLabel: '审查交付',
          },
          {
            title: 'Data pack',
            focus: '入模数据包',
            detail: '查看当前链路最终提供给后续 workflow 的正式数据包对象。',
            path: 'cases/daduhe/contracts/data_pack.latest.json',
            route: '/review',
            routeLabel: '查看交付',
          },
        ],
      },
    ],
  },
  section_analysis: {
    label: 'section_analysis',
    headline: '把断面成果回链到流域边界、GIS 选择面和断面检查结果。',
    adjacentWorkflows: [
      {
        workflow: 'source_to_delineation',
        relationship: '下游 workflow',
        detail: '断面检查后的候选对象会继续流向 source_to_delineation 做边界闭合与 data pack 固化。',
        contractPath: 'cases/daduhe/contracts/outcomes/source_to_delineation.latest.json',
      },
    ],
    groups: [
      {
        id: 'topology',
        title: '拓扑锚点',
        summary: '断面分析先看边界闭合对象，再确认断面检查结果。',
        items: [
          {
            title: 'Watershed result',
            focus: '断面闭合对象',
            detail: '确认断面分析引用的是当前主线流域划分结果，而不是旧的 false-green 产物。',
            path: 'cases/daduhe/contracts/watershed_delineation_result.latest.json',
            route: '/review',
            routeLabel: '查看审查面',
          },
          {
            title: 'Inspection bundle',
            focus: '断面检查结论',
            detail: '用 inspection.json 追踪断面检查和候选对象的来源、命中情况与说明。',
            path: 'cases/daduhe/source_selection/product_outputs/inspection.json',
            route: '/review',
            routeLabel: '查看 review',
          },
        ],
      },
      {
        id: 'gis',
        title: 'GIS 证据',
        summary: '断面结果需要回到地图与候选图层，而不只是留在 Excel/JSON 中。',
        items: [
          {
            title: 'Source selection map',
            focus: '断面候选图层',
            detail: '用 GIS 叠图核对断面候选、河网与控制范围的空间关系。',
            path: 'cases/daduhe/source_selection/index.html',
            route: '/modeling',
            routeLabel: '回到拓扑/GIS',
          },
        ],
      },
      {
        id: 'results',
        title: '结果 / 合同',
        summary: '断面分析结果要能直接打开正式产物和上游检查对象。',
        items: [
          {
            title: 'Outcome contract',
            focus: 'workflow 正式合同',
            detail: 'section_analysis 的正式 outcome 合同，便于和审查面/地图对象做一致性核对。',
            path: 'cases/daduhe/contracts/outcomes/section_analysis.latest.json',
            route: '/simulation',
            routeLabel: '查看 workflow',
          },
          {
            title: 'Section analysis contract',
            focus: '断面工作流结果',
            detail: '当前 section_analysis 的正式结果合同，用于和 GIS/拓扑证据联读。',
            path: 'cases/daduhe/contracts/section_analysis.latest.json',
            route: '/simulation',
            routeLabel: '切到工作流页',
          },
          {
            title: 'Inspection support',
            focus: '辅助检查资产',
            detail: '结合 inspection 结果确认断面成果的空间来源和补充证据。',
            path: 'cases/daduhe/source_selection/product_outputs/inspection.json',
            route: '/review',
            routeLabel: '查看交付',
          },
        ],
      },
    ],
  },
  model: {
    label: 'model',
    headline: '把建模主链结果回链到 upstream 空间证据和耦合结果合同。',
    adjacentWorkflows: [
      {
        workflow: 'source_to_delineation',
        relationship: '上游 workflow',
        detail: '建模主链的空间基础面仍然来自 source_to_delineation 固化的边界、控制站映射与 data pack。',
        contractPath: 'cases/daduhe/contracts/outcomes/source_to_delineation.latest.json',
      },
      {
        workflow: 'section_analysis',
        relationship: '并排检查 workflow',
        detail: '需要复核断面/河道检查结论时，可直接回跳到 section_analysis 对照 inspection 证据。',
        contractPath: 'cases/daduhe/contracts/outcomes/section_analysis.latest.json',
      },
    ],
    groups: [
      {
        id: 'topology',
        title: '拓扑锚点',
        summary: '模型结果虽然是耦合/仿真合同，但仍要能回到控制站和流域闭合对象。',
        items: [
          {
            title: 'Control station mapping',
            focus: '模型控制点',
            detail: '确认 full pipeline / coupled 结果仍然对应当前控制站与梯级节点映射。',
            path: 'cases/daduhe/source_selection/product_outputs/control_station_mapping.json',
            route: '/modeling',
            routeLabel: '回到建模面',
          },
          {
            title: 'Watershed result',
            focus: '空间基础面',
            detail: '模型链路需要回到这份边界/断面闭合结果来解释输入空间范围。',
            path: 'cases/daduhe/contracts/watershed_delineation_result.latest.json',
            route: '/review',
            routeLabel: '查看证据',
          },
        ],
      },
      {
        id: 'gis',
        title: 'GIS 证据',
        summary: '从模型主链回到空间输入质量，避免结果解释脱离地图对象。',
        items: [
          {
            title: 'Source reliability',
            focus: '输入可信度',
            detail: '在解释仿真主链结果前，先确认 DEM / 河网 / 输入对象的可靠性。',
            path: 'cases/daduhe/source_selection/product_outputs/source_reliability.json',
            route: '/review',
            routeLabel: '查看审查',
          },
          {
            title: 'Coordinate validation',
            focus: '空间位置校核',
            detail: '模型结果回看时优先检查站点与河网位置是否仍然匹配当前空间输入。',
            path: 'cases/daduhe/source_selection/product_outputs/coordinate_validation.json',
            route: '/modeling',
            routeLabel: '查看 GIS',
          },
        ],
      },
      {
        id: 'results',
        title: '结果 / 合同',
        summary: '把 full pipeline / coupled 结果和空间证据绑在一起读。',
        items: [
          {
            title: 'Outcome contract',
            focus: 'workflow 正式合同',
            detail: 'model workflow 的正式 outcome 合同，适合与 full pipeline / coupled 结果一起联读。',
            path: 'cases/daduhe/contracts/outcomes/model.latest.json',
            route: '/simulation',
            routeLabel: '查看 workflow',
          },
          {
            title: 'Full pipeline report',
            focus: '建模主链结果',
            detail: '模型链主报告，适合和 upstream 空间证据同屏核对。',
            path: 'cases/daduhe/contracts/full_pipeline_report.latest.json',
            route: '/simulation',
            routeLabel: '切到工作流页',
          },
          {
            title: 'Coupled hydro-hydraulic',
            focus: '耦合结果',
            detail: '查看耦合建模结果，并把结论回链到控制站与边界对象。',
            path: 'cases/daduhe/contracts/coupled_hydro_hydraulic.latest.json',
            route: '/review',
            routeLabel: '查看交付',
          },
          {
            title: 'Hydrology simulation',
            focus: '水文仿真结果',
            detail: '从水文仿真结果回看空间输入与控制面是否一致。',
            path: 'cases/daduhe/contracts/hydrology_sim.latest.json',
            route: '/review',
            routeLabel: '查看结论',
          },
        ],
      },
    ],
  },
};

export const daduheEvidenceWorkflowOrder = ['source_to_delineation', 'section_analysis', 'model'];

export function getDaduheWorkflowEvidence(workflowName) {
  return WORKFLOW_EVIDENCE[workflowName] || WORKFLOW_EVIDENCE.source_to_delineation;
}
