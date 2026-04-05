import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import EntityCardRenderer, { MiniSparkline } from './EntityCards';

const edgeStyle = {
  animated: true,
  style: { stroke: '#06b6d4', strokeWidth: 2 },
  labelStyle: { fill: '#cbd5e1', fontWeight: 700 },
  labelBgStyle: { fill: '#0f172a', color: '#fff', fillOpacity: 0.8 }
};

function mapEdgesFromPayload(rawEdges) {
  if (!Array.isArray(rawEdges)) return [];
  return rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    ...edgeStyle
  }));
}

function mapEntitiesToNodes(entities, prevById) {
  return entities.map((e, idx) => {
    const prev = prevById.get(e.id);
    return {
      id: e.id,
      type: 'custom',
      position: prev?.position ?? { x: (idx % 3) * 250, y: Math.floor(idx / 3) * 150 },
      data: {
        label: e.name,
        type: e.type,
        state: e.state ?? {},
        fullEntity: e,
        liveStamp: prev?.data?.liveStamp
      }
    };
  });
}

function mergeTopologyPayload(payload, setNodes, setEdges) {
  if (!payload || typeof payload !== 'object') return;

  if (payload.mode === 'replace' && Array.isArray(payload.entities)) {
    const nodes = mapEntitiesToNodes(payload.entities, new Map());
    setNodes(nodes);
    if (Array.isArray(payload.edges)) {
      setEdges(mapEdgesFromPayload(payload.edges));
    }
    return;
  }

  if (Array.isArray(payload.entities)) {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      const next = prev.map((n) => {
        const ent = payload.entities.find((x) => x.id === n.id);
        if (!ent) return n;
        return {
          ...n,
          data: {
            ...n.data,
            label: ent.name ?? n.data.label,
            type: ent.type ?? n.data.type,
            state: ent.state ?? n.data.state,
            fullEntity: ent,
            liveStamp: Date.now()
          }
        };
      });
      let idx = next.length;
      for (const ent of payload.entities) {
        if (!prevById.has(ent.id)) {
          const pos = { x: (idx % 3) * 250, y: Math.floor(idx / 3) * 150 };
          idx += 1;
          next.push({
            id: ent.id,
            type: 'custom',
            position: pos,
            data: {
              label: ent.name,
              type: ent.type,
              state: ent.state ?? {},
              fullEntity: ent,
              liveStamp: Date.now()
            }
          });
        }
      }
      return next;
    });
  }

  if (Array.isArray(payload.edges)) {
    setEdges(mapEdgesFromPayload(payload.edges));
  }
}

const CustomNode = ({ data, selected }) => {
  const fe = data.fullEntity;
  const s = fe?.state || {};
  const spark =
    (Array.isArray(s.level_series) && s.level_series) ||
    (Array.isArray(s.q_in_series) && s.q_in_series) ||
    (Array.isArray(s.flow_series) && s.flow_series) ||
    (Array.isArray(s.q_out_series) && s.q_out_series) ||
    (Array.isArray(s.power_series) && s.power_series) ||
    null;
  const fresh = data.liveStamp && Date.now() - data.liveStamp < 2500;

  const getStyle = () => {
    switch (data.type) {
      case 'gate':
        return 'border-violet-500 bg-violet-950/80 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.45)]';
      case 'valve_pump':
        return 'border-rose-500 bg-rose-950/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      case 'turbine':
        return 'border-cyan-500 bg-cyan-950/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]';
      case 'reservoir':
        return 'border-blue-500 bg-blue-950/80 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      case 'channel':
        return 'border-amber-500 bg-amber-950/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
      case 'zone':
        return 'border-emerald-500 bg-emerald-950/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      default:
        return 'border-slate-500 bg-slate-800 text-slate-300';
    }
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 ${getStyle()} ${
        selected ? 'ring-2 ring-white scale-110' : ''
      } ${fresh ? 'ring-1 ring-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.35)]' : ''} transition-all`}
    >
      <div className="text-xs font-bold font-mono text-white mb-1">{data.label}</div>
      <div className="text-[10px] opacity-70 uppercase tracking-widest">{data.type}</div>
      {s.control_profile && (
        <div className="text-[8px] opacity-60 font-mono mt-0.5 text-slate-300">{s.control_profile}</div>
      )}
      {spark && (
        <div className="mt-1 max-w-[140px]">
          <MiniSparkline data={spark} color="#e2e8f0" label="τ" />
        </div>
      )}
    </div>
  );
};

export default function ReactFlowEditor({ entities = [], initialEdges = [] }) {
  const initialNodes = useMemo(() => {
    const prevById = new Map();
    return mapEntitiesToNodes(entities, prevById);
  }, [entities]);

  const mappedEdges = useMemo(() => mapEdgesFromPayload(initialEdges), [initialEdges]);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(mappedEdges);
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return mapEntitiesToNodes(entities, prevById);
    });
  }, [entities]);

  useEffect(() => {
    setEdges(mapEdgesFromPayload(initialEdges));
  }, [initialEdges]);

  useEffect(() => {
    let unlisten = () => {};
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('../api/tauri_bridge');
        if (!mod.subscribeTopologyLive) return;
        unlisten = await mod.subscribeTopologyLive((payload) => {
          if (!cancelled) {
            mergeTopologyPayload(payload, setNodes, setEdges);
          }
        });
      } catch (e) {
        console.warn('[ReactFlowEditor] subscribeTopologyLive', e);
      }
    })();
    return () => {
      cancelled = true;
      if (typeof unlisten === 'function') unlisten();
    };
  }, []);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onNodeClick = (_, node) => {
    setSelectedEntity(node.data.fullEntity);
  };

  const handleRemodel = () => {
    alert(
      'MCP MCP 发射重演命令 (Version Saved: v' +
        new Date().toISOString().replace(/[:.]/g, '') +
        ')\n\n' +
        JSON.stringify(nodes.map((n) => n.id))
    );
  };

  return (
    <div className="h-[600px] w-full bg-[#0b1120] relative rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="hydro-flow-theme"
      >
        <Background color="#1e293b" gap={16} />
        <Controls className="fill-slate-400" />

        <Panel position="top-left" className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50 backdrop-blur-md">
          <h2 className="text-cyan-400 font-bold text-sm tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            HYDRO_MIND_OS: LOGICAL CANVAS
          </h2>
        </Panel>

        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 backdrop-blur-md shadow-2xl flex flex-col gap-2">
            <div className="text-xs text-slate-400 font-bold tracking-widest border-b border-slate-700 pb-1 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              COMMAND HUB
            </div>

            <button
              onClick={handleRemodel}
              className="w-full bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 border border-emerald-400/50 rounded shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all flex items-center justify-between text-xs"
            >
              <span>💾 固化资产拓扑</span>
            </button>

            <button
              onClick={async () => {
                try {
                  const { runWorkspaceCommand } = await import('../api/tauri_bridge');
                  const { buildNlMcpGatewayCommand } = await import('../config/hydrodesk_commands');
                  await runWorkspaceCommand(
                    buildNlMcpGatewayCommand('激活此工程 MPC 控制闭环测算'),
                    '.'
                  );
                  alert('MPC 控制指令已成功透过网关下发定型');
                } catch (e) {
                  console.error('API Error', e);
                  alert('API 掉线，请确保 Layer 2 服务运转正常');
                }
              }}
              className="w-full bg-blue-600/80 hover:bg-blue-500 text-white font-bold py-1.5 px-3 border border-blue-400/50 rounded shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all flex items-center justify-between text-xs"
            >
              <span>🚀 激活 MPC 自控巡航</span>
            </button>

            <button
              onClick={async () => {
                try {
                  const { runWorkspaceCommand } = await import('../api/tauri_bridge');
                  const { buildNlMcpGatewayCommand } = await import('../config/hydrodesk_commands');
                  await runWorkspaceCommand(
                    buildNlMcpGatewayCommand('发起 ODD 极端压力注入诊断'),
                    '.'
                  );
                  alert('ODD 极限负荷指令已成功透过网关下发定型');
                } catch (e) {
                  console.error('API Error', e);
                  alert('API 掉线，请确保 Layer 2 服务运转正常');
                }
              }}
              className="w-full bg-rose-600/80 hover:bg-rose-500 text-white font-bold py-1.5 px-3 border border-rose-400/50 rounded shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all flex items-center justify-between text-xs"
            >
              <span>🔥 ODD 极压流量注入</span>
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {selectedEntity && (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-slate-900/95 border-l border-slate-700/50 backdrop-blur-md p-4 shadow-2xl z-50 transform transition-transform animate-in slide-in-from-right">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="text-slate-200 font-bold">Node Properties</h3>
            <button onClick={() => setSelectedEntity(null)} className="text-slate-500 hover:text-white">
              ✕
            </button>
          </div>

          <div className="mb-4">
            <EntityCardRenderer entity={selectedEntity} />
          </div>

          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800">
            <h4 className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Manual Override Form</h4>
            <div className="space-y-3">
              {Object.entries(selectedEntity.state || {}).map(([key, val]) => (
                <div key={key} className="flex flex-col">
                  <label className="text-[10px] text-slate-400 mb-1 font-mono">{key}</label>
                  <input
                    type="text"
                    defaultValue={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ))}
              <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded border border-slate-600 text-xs">
                Update Local State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
