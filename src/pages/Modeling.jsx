import React, { useState } from 'react';
import ComponentLibrary from '../features/modeling/ComponentLibrary';
import ModelCanvas from '../features/modeling/ModelCanvas';

/**
 * Model building workspace
 * Left: component library | Center: canvas | Right: properties | Bottom: toolbar
 */
export default function Modeling() {
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [placedComponents, setPlacedComponents] = useState([]);
  const [selectedPlaced, setSelectedPlaced] = useState(null);

  const handleComponentSelect = (component) => {
    setSelectedComponent(component);
  };

  const handleCanvasClick = (e) => {
    if (selectedComponent) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newPlaced = {
        ...selectedComponent,
        instanceId: `${selectedComponent.id}-${Date.now()}`,
        x,
        y,
        params: { ...selectedComponent.defaultParams },
      };
      setPlacedComponents((prev) => [...prev, newPlaced]);
      setSelectedPlaced(newPlaced);
      setSelectedComponent(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPlaced) {
      setPlacedComponents((prev) =>
        prev.filter((c) => c.instanceId !== selectedPlaced.instanceId)
      );
      setSelectedPlaced(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">模型构建</h1>
          <p className="text-xs text-slate-500">拖放组件构建水网模型 (Drag & drop to build water network models)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            已放置 {placedComponents.length} 个组件
          </span>
        </div>
      </div>

      {/* Main area: three panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: component library */}
        <div className="w-56 border-r border-slate-700/50 overflow-y-auto bg-slate-800/20">
          <div className="p-3 border-b border-slate-700/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">组件库 Components</h2>
          </div>
          <ComponentLibrary
            onSelect={handleComponentSelect}
            selectedId={selectedComponent?.id}
          />
        </div>

        {/* Center: canvas */}
        <div className="flex-1 overflow-hidden">
          <ModelCanvas
            components={placedComponents}
            selectedId={selectedPlaced?.instanceId}
            onCanvasClick={handleCanvasClick}
            onComponentClick={(comp) => setSelectedPlaced(comp)}
            cursorComponent={selectedComponent}
          />
        </div>

        {/* Right panel: properties */}
        <div className="w-64 border-l border-slate-700/50 overflow-y-auto bg-slate-800/20">
          <div className="p-3 border-b border-slate-700/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">属性面板 Properties</h2>
          </div>
          {selectedPlaced ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{selectedPlaced.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-200">{selectedPlaced.name}</div>
                  <div className="text-xs text-slate-500">{selectedPlaced.category}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500">实例 ID</label>
                  <div className="text-xs text-slate-400 font-mono bg-slate-800 rounded px-2 py-1 mt-0.5">
                    {selectedPlaced.instanceId}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">X 坐标</label>
                    <input
                      type="number"
                      value={Math.round(selectedPlaced.x)}
                      readOnly
                      className="w-full mt-0.5 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Y 坐标</label>
                    <input
                      type="number"
                      value={Math.round(selectedPlaced.y)}
                      readOnly
                      className="w-full mt-0.5 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
                    />
                  </div>
                </div>

                {/* Default params */}
                {selectedPlaced.params &&
                  Object.entries(selectedPlaced.params).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500">{key}</label>
                      <input
                        type="text"
                        defaultValue={value}
                        className="w-full mt-0.5 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-hydro-500 focus:outline-none"
                      />
                    </div>
                  ))}
              </div>

              <button
                onClick={handleDeleteSelected}
                className="w-full mt-3 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                删除组件
              </button>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500 text-center">
              <p className="mb-2">未选中组件</p>
              <p>从左侧选择组件，然后点击画布放置</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-700/50 bg-slate-800/30 shrink-0">
        <button className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
          运行仿真
        </button>
        <button className="px-3 py-1.5 text-xs bg-hydro-600/20 text-hydro-400 rounded-lg hover:bg-hydro-600/30 transition-colors">
          验证模型
        </button>
        <button className="px-3 py-1.5 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors">
          导出 EPANET
        </button>
        <button className="px-3 py-1.5 text-xs bg-slate-700/40 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-colors">
          导出 JSON
        </button>
        <div className="flex-1" />
        <button
          onClick={() => {
            setPlacedComponents([]);
            setSelectedPlaced(null);
          }}
          className="px-3 py-1.5 text-xs bg-slate-700/40 text-slate-400 rounded-lg hover:bg-slate-700/60 transition-colors"
        >
          清空画布
        </button>
      </div>
    </div>
  );
}
