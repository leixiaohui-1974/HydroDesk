export const executionSurfaceCatalog = {
  product: {
    label: 'Product Workflow',
    summary: '确定性、可回放、可产出合同资产的领域工作流，应该作为 HydroDesk 的主执行面。',
    whenToUse: '运行当前案例建模、率定、仿真、验证、验收与报告等产品工作流时优先使用。',
  },
  agent: {
    label: 'Agent',
    summary: '适合开放式问题，如规划、解释、差异分析、会商建议和跨工作流监督。',
    whenToUse: '当任务需要跨项目理解、生成操作建议或解释 outcome gap 时使用。',
  },
  skill: {
    label: 'Skill',
    summary: '固定编排模板，适合把重复的多步动作打包成可复用入口。',
    whenToUse: '当当前案例的常见操作要一键执行，例如“刷新验收包 + 回填证据 + 更新看板”。',
  },
  mcp: {
    label: 'MCP',
    summary: '协议总线与工具面，负责让 Agent 或 HydroDesk 调用工作流、契约校验和外部能力。',
    whenToUse: '作为调用 transport 和 capability surface，而不是替代领域产品工作流本体。',
  },
};

const externalWorkflowMap = {
  daduhe_pipedream_ext: {
    ownerProject: 'pipedream-hydrology-integration-lab',
    ownerAgent: '管线 / 运行时编排',
    primarySurface: 'product',
    supportSurfaces: ['agent', 'mcp'],
    rationale: '闭环仿真和 SuperLink 求解要保留在 pipedream 产品层，HydroDesk 只做编排与可视化。',
  },
  strict_revalidation_ext: {
    ownerProject: 'E2EControl',
    ownerAgent: '验模 / 严格复核',
    primarySurface: 'product',
    supportSurfaces: ['agent', 'mcp'],
    rationale: '严格复核属于验收 gate，应该由 E2EControl 负责执行与产出 summary。',
  },
  hil_acceptance_test_ext: {
    ownerProject: 'HIL',
    ownerAgent: '闭环 / FAT',
    primarySurface: 'product',
    supportSurfaces: ['agent'],
    rationale: '数字 FAT 是标准验收流程，HydroDesk 负责展示结果，不重写 HIL 试验逻辑。',
  },
  daduhe_ekf_mpc_ext: {
    ownerProject: 'E2EControl',
    ownerAgent: '驭控 / EKF-MPC',
    primarySurface: 'product',
    supportSurfaces: ['agent', 'mcp'],
    rationale: '控制律与校核应由控制产品层承担，Agent 只提供 supervision 与建议。',
  },
  daduhe_historical_validation_ext: {
    ownerProject: 'E2EControl',
    ownerAgent: '验模 / 历史验证',
    primarySurface: 'product',
    supportSurfaces: ['agent'],
    rationale: '历史验证是标准验证工步，适合做严格的产品化产出和回归。',
  },
  daduhe_real_validation_ext: {
    ownerProject: 'E2EControl',
    ownerAgent: '验模 / 实时验证',
    primarySurface: 'product',
    supportSurfaces: ['agent'],
    rationale: '实时验证需要和控制链、数据链保持一致，应该留在控制产品面。',
  },
  daduhe_full_pipeline_ext: {
    ownerProject: 'Hydrology',
    ownerAgent: '管线 / 全流程',
    primarySurface: 'product',
    supportSurfaces: ['agent', 'skill', 'mcp'],
    rationale: '这是跨模块但仍可重复执行的产品化主链，HydroDesk 适合一键触发与监控。',
  },
};

function familySurface(workflowName) {
  const workflow = workflowName || '';

  if (externalWorkflowMap[workflow]) {
    return externalWorkflowMap[workflow];
  }
  if (['data_audit', 'deep_record', 'registry', 'wxq_mine', 'knowledge_split'].includes(workflow)) {
    return {
      ownerProject: 'Hydrology',
      ownerAgent: '探源 / 固知',
      primarySurface: 'product',
      supportSurfaces: ['skill', 'mcp'],
      rationale: '数据发现和知识固化是标准工作流，适合封装成一键 skill，但主执行仍在产品层。',
    };
  }
  if (['section_analysis', 'source_to_delineation', 'model'].includes(workflow)) {
    return {
      ownerProject: 'Hydrology',
      ownerAgent: '识地 / 筑模',
      primarySurface: 'product',
      supportSurfaces: ['agent', 'mcp'],
      rationale: '建模链需要稳定产物与合同资产，Agent 只负责指导和解释，不接管计算。',
    };
  }
  if (['hyd_cal', 'calibrate', 'improve', 'dl_transfer', 'dl_autolearn'].includes(workflow)) {
    return {
      ownerProject: 'Hydrology',
      ownerAgent: '率定',
      primarySurface: 'product',
      supportSurfaces: ['agent', 'skill'],
      rationale: '率定和自提升可做批量 skill，但单次执行仍应走可回放的产品 workflow。',
    };
  }
  if (['cascade', 'coupled', 'hyd_sim', 'state_est', 'assimilate', 'dl_forecast', 'ensemble_forecast'].includes(workflow)) {
    return {
      ownerProject: 'Hydrology',
      ownerAgent: '推演 / 预见',
      primarySurface: 'product',
      supportSurfaces: ['agent', 'mcp'],
      rationale: '仿真、同化和预报是 E2E 主链的一部分，HydroDesk 应围绕结果解释和多项目联动组织它们。',
    };
  }
  if (['d1d4', 'autonomy_assess', 'autonomy_autorun'].includes(workflow)) {
    return {
      ownerProject: 'Hydrology',
      ownerAgent: '审评',
      primarySurface: 'product',
      supportSurfaces: ['agent', 'skill', 'mcp'],
      rationale: '自治评估和自动闭环需要产品工作流给出可审计结果，同时允许 Agent 做人机协同监督。',
    };
  }
  if (['hyd_report', 'hydro_report'].includes(workflow)) {
    return {
      ownerProject: 'Hydrology',
      ownerAgent: '撰报',
      primarySurface: 'product',
      supportSurfaces: ['agent', 'skill'],
      rationale: '报告生成应该是产品输出，Agent 负责解读和面向不同角色的二次组织。',
    };
  }

  return {
    ownerProject: 'Hydrology',
    ownerAgent: '协智 / 默认编排',
    primarySurface: 'product',
    supportSurfaces: ['agent', 'mcp'],
    rationale: '默认将 registry 中的 workflow 当作产品面，由 HydroDesk 负责选择和监控。',
  };
}

export function getWorkflowSurface(workflowName) {
  const detail = familySurface(workflowName);
  return {
    workflowName,
    ...detail,
    primarySurfaceInfo: executionSurfaceCatalog[detail.primarySurface],
    supportSurfaceInfo: detail.supportSurfaces.map((surface) => ({
      id: surface,
      ...executionSurfaceCatalog[surface],
    })),
  };
}
