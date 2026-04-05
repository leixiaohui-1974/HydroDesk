import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import EntityCardRenderer from './EntityCards';
import ReactFlowEditor from './ReactFlowEditor';

// Fix leaflet icon issue in dynamic React builds
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export default function NLReportRenderer({ report }) {
  if (!report) return null;

  const roleColors = {
    planner: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    designer: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    operator: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    researcher: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    teacher: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    student: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    manager: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  const activeRoleBadge = roleColors[report.role] || roleColors.manager;
  
  const [activeEntity, setActiveEntity] = useState(null);

  // default map center if entities have coordinates
  const validEntities = report.entities?.filter(e => e.lat && e.lng) || [];
  const mapCenter = validEntities.length > 0 
    ? [validEntities[0].lat, validEntities[0].lng] 
    : [30.12, 102.50]; // Fallback to Daduhe roughly around there

  // Render sub-sections dynamically based on the NLP/MCP outcome object
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-200">
      
      {/* Template Header Badge */}
      <div className="flex items-center justify-between px-2">
        <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${activeRoleBadge} flex items-center shadow shadow-black/50`}>
           <span className="mr-2">✦</span> MCP 动态输出模版：{String(report.role).toUpperCase()}
        </span>
        <span className="text-xs text-slate-600 font-mono tracking-widest">{report.case_id}</span>
      </div>
      
      {/* 1. Background & Problem */}
      <div className="grid grid-cols-2 gap-6">
        {report.background && (
          <section className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 shadow-lg">
            <h3 className="text-hydro-400 font-bold mb-3 border-b border-hydro-500/20 pb-2">背景设定</h3>
            <div className="text-sm prose prose-invert" dangerouslySetInnerHTML={{ __html: report.background }} />
          </section>
        )}
        
        {report.problem && (
          <section className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 shadow-lg">
            <h3 className="text-rose-400 font-bold mb-3 border-b border-rose-500/20 pb-2">问题描述</h3>
            <div className="text-sm prose prose-invert" dangerouslySetInnerHTML={{ __html: report.problem }} />
          </section>
        )}
      </div>

      {/* 2. Methodology & MCP Tool Path */}
      {report.methodology && (
        <section className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 shadow-lg">
          <h3 className="text-cyan-400 font-bold mb-3 border-b border-cyan-500/20 pb-2">解题思路与 MCP 算法调用链</h3>
          <div className="text-sm prose prose-invert mb-3" dangerouslySetInnerHTML={{ __html: report.methodology }} />
          <div className="flex gap-2 text-[10px]">
             {report.mcp_tools_called?.map(tool => (
               <span key={tool} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-md">
                 MCP ⚙️ {tool}
               </span>
             ))}
          </div>
        </section>
      )}

      {/* 3. GIS & Topology with Entity Fusion */}
      {(report.gis_topology || report.entities?.length > 0) && (
        <section className="bg-slate-900 overflow-hidden rounded-2xl border border-slate-700/50 shadow-lg relative">
          <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50 flex justify-between items-center z-10 relative">
            <h3 className="text-emerald-400 font-bold">数字孪生拓扑沙盘 (Interactive Canvas)</h3>
            <span className="text-[10px] text-slate-500">
              映射节点: {report.entities?.length || 0} 项 | 连线: {report.edges?.length || 0}
            </span>
          </div>
          
          {/* Editor Layer (Conditionally Switch between ReactFlow vs React-Leaflet based on edges presence) */}
          <div className="w-full z-0 relative border-b border-slate-700/50">
             {report.edges && report.edges.length > 0 ? (
                <ReactFlowEditor entities={report.entities} initialEdges={report.edges} />
             ) : (
                <div className="h-80 w-full relative">
                  <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                        url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                    />
                    {validEntities.map(entity => (
                        <Marker 
                          key={entity.id} 
                          position={[entity.lat, entity.lng]}
                          eventHandlers={{ click: () => setActiveEntity(entity) }}
                        >
                          <Popup>
                            <div className="text-slate-900 font-bold">{entity.name}</div>
                            <div className="text-xs text-slate-500">[{entity.type}]</div>
                          </Popup>
                        </Marker>
                    ))}
                  </MapContainer>
                  {activeEntity && (
                    <div className="absolute top-4 right-4 z-[400] w-72 pointer-events-auto">
                      <div className="relative">
                        <button onClick={() => setActiveEntity(null)} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full w-6 h-6 flex items-center justify-center z-50 hover:bg-rose-500">✕</button>
                        <EntityCardRenderer entity={activeEntity} />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-black/80 to-transparent px-4 text-[10px] text-emerald-500 z-[400] pointer-events-none">
                     Layer Connected: React-Leaflet GIS Overlay
                  </div>
                </div>
             )}
          </div>
        </section>
      )}

      {/* 4. Results (Tables/Charts) & AI Interpretation */}
      {report.results && (
        <section className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 shadow-lg">
          <h3 className="text-fuchsia-400 font-bold mb-3 border-b border-fuchsia-500/20 pb-2">成果展示与 AI 深层研判</h3>
          
          {report.results.ai_interpretation && (
             <div className="mb-4 bg-fuchsia-950/30 border-l-4 border-fuchsia-500 p-3 text-sm text-fuchsia-200/90 rounded-r shadow-inner">
               {report.results.ai_interpretation}
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div className="border border-slate-700/50 rounded-lg p-3 bg-slate-900/50">
               <table className="w-full text-left text-sm">
                 <thead>
                   <tr className="text-slate-400 border-b border-slate-700/50"><th className="pb-2">Metric</th><th className="pb-2">Value</th></tr>
                 </thead>
                 <tbody>
                   {report.results.tables?.map((t, idx) => (
                     <tr key={idx}><td className="py-1">{t.metric}</td><td className="py-1 text-fuchsia-300 font-bold">{t.value}</td></tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <div className="border border-slate-700/50 rounded-lg p-3 bg-slate-900/50 flex items-center justify-center text-xs text-slate-500 border-dashed">
                {report.results.charts?.map((c, i) => <span key={i}> {c} 图表占位符 </span>)}
             </div>
          </div>
        </section>
      )}

      {/* 5. Conclusion & Recommendation */}
      {report.conclusion && (
        <section className="bg-amber-900/10 p-5 rounded-2xl border border-amber-500/30 shadow-lg">
          <h3 className="text-amber-400 font-bold mb-3 border-b border-amber-500/20 pb-2">结论与建议</h3>
          <div className="text-sm prose prose-invert" dangerouslySetInnerHTML={{ __html: report.conclusion }} />
        </section>
      )}

    </div>
  );
}
