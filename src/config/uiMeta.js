export const TRIAD_STATUS_META = {
  real_ready: {
    label: '真实 triad 就绪',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  partial_real: {
    label: '部分真实 triad',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  placeholder_only: {
    label: '占位 triad',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
  missing: {
    label: '缺失 triad',
    className: 'border-slate-700/50 bg-slate-800/70 text-slate-300',
  },
};

export const MODEL_STRATEGY_META = {
  watershed_hydrology_hydrodynamics: {
    label: '流域水文主链',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  cascade_hydrodynamic_operation: {
    label: '梯级运行型',
    className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  },
  hydraulic_control_digital_twin: {
    label: '控制孪生型',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  hydraulic_network_structural_model: {
    label: '结构网络型',
    className: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  },
  case_entry_only: {
    label: '入口整理型',
    className: 'border-slate-700/60 bg-slate-900/80 text-slate-300',
  },
};

export function getTriadStatusMeta(status) {
  return TRIAD_STATUS_META[status] || TRIAD_STATUS_META.missing;
}

export function getModelStrategyMeta(strategyKey) {
  return MODEL_STRATEGY_META[strategyKey] || MODEL_STRATEGY_META.case_entry_only;
}
