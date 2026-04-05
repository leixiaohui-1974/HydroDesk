import React from 'react';

// 通用卡片外壳，根据实体类型匹配不同的特效光污染（赛博暗黑极简风）
function EntityShell({ title, id, typeBorder, typeBg, icon, children }) {
  return (
    <div className={`p-4 rounded-xl border ${typeBorder} ${typeBg} shadow-lg backdrop-blur-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <h4 className="font-bold text-slate-100">{title}</h4>
        </div>
        <span className="text-[10px] text-slate-500 font-mono absolute top-2 right-3 opacity-50">{id}</span>
      </div>
      <div className="space-y-2 relative z-10 text-sm">
        {children}
      </div>
    </div>
  );
}

// 通用组件：极简 SVG 迷你折线图火花线 (Sparkline)；导出供 ReactFlow 节点等复用
export function MiniSparkline({ data, color, label }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100, h = 20;
  const denom = data.length > 1 ? data.length - 1 : 1;

  const points = data.map((val, i) => {
    const x = data.length <= 1 ? w / 2 : (i / denom) * w;
    const y = h - ((val - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col mt-1 mb-1">
      <div className="flex justify-between text-[8px] opacity-60 mb-0.5">
        <span>{label}</span>
        <span>Max: {max.toFixed(2)}</span>
      </div>
      <svg viewBox={`0 -2 ${w} ${h + 4}`} className="w-full h-8 overflow-visible opacity-80" preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {/* Glow Filter */}
        <polyline fill="none" stroke={color} strokeWidth="4" className="opacity-20 blur-[1px]" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
}

// 1. 闸泵阀 (Hydraulic Structures) — supports both static and MPC simulation data
export function SluicePumpValveCard({ entity }) {
  const s = entity.state;
  // MPC simulation mode: has q_in_series
  const hasMpcData = s.q_in_series && Array.isArray(s.q_in_series);

  return (
    <EntityShell title={entity.name} id={entity.id} typeBorder="border-rose-500/30" typeBg="bg-rose-950/20" icon="⚙️">
      {hasMpcData ? (
        <>
          {/* MPC Optimal Control Results */}
          <div className="flex justify-between text-rose-200/70 border-b border-rose-500/20 pb-1">
            <span>当前进流 (Q_in)</span>
            <span className="font-mono text-rose-300 font-bold">{s.current_q?.toFixed?.(1) ?? s.current_q} m³/s</span>
          </div>
          <div className="flex justify-between text-rose-200/70">
            <span>控制模式</span>
            <span className={`font-bold ${s.status === 'OPTIMAL' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {s.status === 'OPTIMAL' ? '✓ MPC 最优' : s.status}
            </span>
          </div>
          {s.control_profile && (
            <div className="text-[9px] text-rose-300/60 font-mono border border-rose-500/20 rounded px-1 py-0.5">
              profile: {s.control_profile}
            </div>
          )}
          <MiniSparkline data={s.q_in_series} color="#f43f5e" label="进流时程线 (Q_in)" />
          <div className="flex justify-between text-[10px] text-rose-200/50 mt-1 pt-1 border-t border-rose-500/10">
            <span>最小: {Math.min(...s.q_in_series).toFixed(1)} m³/s</span>
            <span>最大: {Math.max(...s.q_in_series).toFixed(1)} m³/s</span>
          </div>
        </>
      ) : (
        <>
          {/* Static topology mode (original) */}
          <div className="flex justify-between text-rose-200/70 border-b border-rose-500/20 pb-1">
            <span>状态</span>
            <span className={s.status === 'OPEN' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{s.status}</span>
          </div>
          {s.opening_pct !== undefined && (
            <div className="flex justify-between items-center text-rose-200/70">
              <span>开度控制</span>
              <div className="w-1/2 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${s.opening_pct}%` }}></div>
              </div>
              <span className="text-xs">{s.opening_pct}%</span>
            </div>
          )}
          <div className="flex justify-between text-rose-200/70 mt-1">
            <span>泄流 / 抽水</span>
            <span className="font-mono text-rose-300">{s.q_out}</span>
          </div>
          
          {/* Deep Algo Specs Panel */}
          {s.algorithmic_parameters && (
            <div className="mt-3 pt-2 border-t border-rose-500/30 text-[10px] space-y-1 bg-rose-900/10 p-1.5 rounded">
              <div className="text-rose-300/80 font-bold mb-1">■ 高级自控系统参数 (MPC/FOPDT)</div>
              {s.algorithmic_parameters.mpc_controller && (
                <div className="flex justify-between text-rose-200/50">
                  <span>预测域(Np)/控制域(Nc):</span>
                  <span className="text-rose-300">{s.algorithmic_parameters.mpc_controller.Np} / {s.algorithmic_parameters.mpc_controller.Nc}</span>
                </div>
              )}
              {s.algorithmic_parameters.timeseries_q && (
                <MiniSparkline data={s.algorithmic_parameters.timeseries_q} color="#f43f5e" label="流量阶跃响应 (Q_out)" />
              )}
            </div>
          )}
        </>
      )}
    </EntityShell>
  );
}

// 2. 水轮发电机 (Turbine)
export function TurbineCard({ entity }) {
  const { status, power_mw, head_m, algorithmic_parameters } = entity.state;
  return (
    <EntityShell title={entity.name} id={entity.id} typeBorder="border-cyan-500/30" typeBg="bg-cyan-950/20" icon="⚡">
       <div className="flex justify-between text-cyan-200/70 border-b border-cyan-500/20 pb-1">
        <span>机组运行状况</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> {status}
        </span>
      </div>
      <div className="flex justify-between text-cyan-200/70 mt-1">
        <span>有功功率 / 预估装机</span>
        <span className="font-mono text-cyan-300 font-bold">{entity.state.capacity || power_mw + " MW"}</span>
      </div>
      {head_m && (
        <div className="flex justify-between text-cyan-200/70">
          <span>发电水头</span>
          <span className="font-mono text-cyan-400">{head_m} m</span>
        </div>
      )}
      {entity.state.power_series && Array.isArray(entity.state.power_series) && (
        <MiniSparkline data={entity.state.power_series} color="#22d3ee" label="出力时程 (MW)" />
      )}
      
      {/* Deep Algo Specs Panel */}
      {algorithmic_parameters && (
        <div className="mt-3 pt-2 border-t border-cyan-500/30 text-[10px] space-y-1 bg-cyan-900/10 p-1.5 rounded">
          <div className="text-cyan-300/80 font-bold mb-1">■ EnKF & 联调算法</div>
          {algorithmic_parameters.kalman_filter && (
            <div className="flex justify-between text-cyan-200/50">
              <span>状态观测器 (n_states):</span>
              <span className="text-cyan-300">{algorithmic_parameters.kalman_filter.n_states} 维</span>
            </div>
          )}
          
          {algorithmic_parameters.timeseries_h && (
            <MiniSparkline data={algorithmic_parameters.timeseries_h} color="#06b6d4" label="上下游边界水头变幅 (H)" />
          )}
        </div>
      )}
    </EntityShell>
  );
}

// 3. 库湖池 (Reservoir/Lake) — supports both static topology and MPC simulation data
export function ReservoirCard({ entity }) {
  const s = entity.state;
  // MPC simulation mode: has time-series arrays
  const hasMpcData = s.level_series && Array.isArray(s.level_series);

  return (
    <EntityShell title={entity.name} id={entity.id} typeBorder="border-blue-500/30" typeBg="bg-blue-950/20" icon="🌊">
      {hasMpcData ? (
        <>
          {/* MPC Simulation Results */}
          <div className="flex justify-between text-blue-200/70 border-b border-blue-500/20 pb-1">
            <span>当前水位 (Z)</span>
            <span className="font-mono text-blue-300 font-bold">{s.current_level?.toFixed?.(2) ?? s.current_level} m</span>
          </div>
          <div className="flex justify-between text-blue-200/70">
            <span>控制状态</span>
            <span className={`font-bold ${s.status === 'CONTROLLED' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {s.status === 'CONTROLLED' ? '✓ MPC 受控' : s.status}
            </span>
          </div>
          {s.control_profile === 'cascade_reservoir' && (
            <div className="text-[9px] text-sky-300/80 font-mono">梯级库湖 · cascade_reservoir</div>
          )}

          {/* Water Level Sparkline with target overlay */}
          <MiniSparkline data={s.level_series} color="#3b82f6" label="水位时程线 (Z)" />
          {s.target_series && <MiniSparkline data={s.target_series} color="#22c55e" label="目标水位 (Z_ref)" />}

          {/* Level range stats */}
          <div className="flex justify-between text-[10px] text-blue-200/50 mt-1 pt-1 border-t border-blue-500/10">
            <span>最低: {Math.min(...s.level_series).toFixed(1)}m</span>
            <span>最高: {Math.max(...s.level_series).toFixed(1)}m</span>
            <span>终态: {s.level_series[s.level_series.length - 1].toFixed(1)}m</span>
          </div>
        </>
      ) : (
        <>
          {/* Static topology mode (original) */}
          <div className="flex justify-between text-blue-200/70 border-b border-blue-500/20 pb-1">
            <span>实时水位(Z)</span>
            <span className="font-mono text-blue-300 font-bold">{s.level} m</span>
          </div>
          <div className="flex justify-between text-blue-200/70">
            <span>库容利用率</span>
            <span className="font-mono text-blue-300">{s.current_capacity_pct}% / {s.max_capacity}</span>
          </div>
          {/* 水位可视化条 */}
          <div className="mt-2 h-4 w-full bg-slate-900 rounded border border-blue-900 relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-600/80 to-blue-400/50 transition-all duration-1000" style={{ height: `${s.current_capacity_pct}%` }}></div>
          </div>
        </>
      )}
    </EntityShell>
  );
}

// 3b. 闸/执行器边界元数据（YAML actuators / control_assets，无 MPC 时序）
export function GateActuatorCard({ entity }) {
  const s = entity.state || {};
  return (
    <EntityShell title={entity.name} id={entity.id} typeBorder="border-violet-500/30" typeBg="bg-violet-950/20" icon="🚧">
      <div className="flex justify-between text-violet-200/70 border-b border-violet-500/20 pb-1">
        <span>契约边界</span>
        <span className="font-mono text-violet-300 font-bold">{s.status || '—'}</span>
      </div>
      {s.max_flow_m3s != null && (
        <div className="flex justify-between text-violet-200/70 text-xs">
          <span>max Q (m³/s)</span>
          <span className="font-mono">{Number(s.max_flow_m3s).toFixed(2)}</span>
        </div>
      )}
      {s.max_opening_m != null && (
        <div className="flex justify-between text-violet-200/70 text-xs">
          <span>max 开度 (m)</span>
          <span className="font-mono">{Number(s.max_opening_m).toFixed(2)}</span>
        </div>
      )}
    </EntityShell>
  );
}

// 4. 河管渠 (Channel)
export function ChannelCard({ entity }) {
  const s = entity.state || {};
  const { manning, flow_velocity, status } = s;
  const mpcCanalPool =
    s.control_profile === 'canal_actuators' &&
    Array.isArray(s.level_series) &&
    s.level_series.length > 0;

  if (mpcCanalPool) {
    return (
      <EntityShell title={entity.name} id={entity.id} typeBorder="border-amber-500/30" typeBg="bg-amber-950/20" icon="🚰">
        <div className="text-[9px] text-amber-300/90 font-mono mb-1 border border-amber-500/25 rounded px-1 py-0.5">
          渠系等效蓄量段 · canal_actuators · MPC
        </div>
        <div className="flex justify-between text-amber-200/70 border-b border-amber-500/20 pb-1">
          <span>等效水位 (Z)</span>
          <span className="font-mono text-amber-300 font-bold">
            {s.current_level?.toFixed?.(2) ?? s.current_level} m
          </span>
        </div>
        <div className="flex justify-between text-amber-200/70">
          <span>控制状态</span>
          <span className={`font-bold ${s.status === 'CONTROLLED' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {s.status === 'CONTROLLED' ? '✓ MPC 受控' : s.status}
          </span>
        </div>
        <MiniSparkline data={s.level_series} color="#f59e0b" label="水位时程 (等效池)" />
        {s.target_series && <MiniSparkline data={s.target_series} color="#84cc16" label="目标水位" />}
        <div className="flex justify-between text-[10px] text-amber-200/50 mt-1 pt-1 border-t border-amber-500/10">
          <span>最低: {Math.min(...s.level_series).toFixed(2)}m</span>
          <span>最高: {Math.max(...s.level_series).toFixed(2)}m</span>
        </div>
      </EntityShell>
    );
  }

  return (
    <EntityShell title={entity.name} id={entity.id} typeBorder="border-amber-500/30" typeBg="bg-amber-950/20" icon="🚰">
      <div className="flex justify-between text-amber-200/70 border-b border-amber-500/20 pb-1">
        <span>断面过流线速</span>
        <span className="font-mono text-amber-300 font-bold">{flow_velocity}</span>
      </div>
      <div className="flex justify-between text-amber-200/70">
        <span>Manning糙率</span>
        <span className="font-mono text-amber-500">{manning}</span>
      </div>
      <div className="flex justify-between text-amber-200/70">
        <span>流态诊断</span>
        <span className="text-emerald-500 uppercase">{status}</span>
      </div>
      {(entity.state.flow_series || entity.state.q_out_series) &&
        Array.isArray(entity.state.flow_series || entity.state.q_out_series) && (
        <MiniSparkline
          data={entity.state.flow_series || entity.state.q_out_series}
          color="#f59e0b"
          label="流量时序 (Q)"
        />
      )}
      {entity.state.depth_series && Array.isArray(entity.state.depth_series) && (
        <MiniSparkline data={entity.state.depth_series} color="#fcd34d" label="水深时序 (h)" />
      )}
      <div className="w-full h-1 mt-2 bg-slate-900 overflow-hidden relative">
         <div className="absolute top-0 bottom-0 w-1/4 bg-amber-500/50 animate-[translate_2s_linear_infinite]" style={{ animationName: 'marquee', animationDuration: '2s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}></div>
      </div>
    </EntityShell>
  );
}

// 5. 子流域/参数分区 (Spatial Zone)
export function SpatialZoneCard({ entity }) {
  const { precipitation, runoff_coeff } = entity.state;
  return (
    <EntityShell title={entity.name} id={entity.id} typeBorder="border-emerald-500/30" typeBg="bg-emerald-950/20" icon="🌧️">
      <div className="flex justify-between text-emerald-200/70 border-b border-emerald-500/20 pb-1">
        <span>区间降水迫源</span>
        <span className="font-mono text-emerald-300 font-bold">{precipitation}</span>
      </div>
      <div className="flex justify-between text-emerald-200/70">
        <span>径流系数 (RC)</span>
        <span className="font-mono text-emerald-400">{runoff_coeff}</span>
      </div>
      {entity.state.precip_series && Array.isArray(entity.state.precip_series) && (
        <MiniSparkline data={entity.state.precip_series} color="#34d399" label="面雨量时序 (P)" />
      )}
      <div className="text-[10px] text-emerald-500/50 mt-2 text-center border border-dashed border-emerald-900 rounded py-1">
         集水区汇流参数矩阵加载完毕
      </div>
    </EntityShell>
  );
}

// 总控分发组件：根据类型匹配
export default function EntityCardRenderer({ entity, onClick }) {
  const props = { entity };
  return (
    <div className="cursor-pointer" onClick={() => onClick && onClick(entity)}>
      {entity.type === 'gate' && <GateActuatorCard {...props} />}
      {entity.type === 'valve_pump' && <SluicePumpValveCard {...props} />}
      {entity.type === 'turbine' && <TurbineCard {...props} />}
      {entity.type === 'reservoir' && <ReservoirCard {...props} />}
      {entity.type === 'channel' && <ChannelCard {...props} />}
      {entity.type === 'zone' && <SpatialZoneCard {...props} />}
    </div>
  );
}
