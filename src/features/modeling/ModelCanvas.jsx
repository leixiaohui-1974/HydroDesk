import React, { useRef, useState } from 'react';

/**
 * ModelCanvas - Drag-and-drop model building canvas
 *
 * Displays placed components and allows interaction.
 * Future: will integrate with Zhang Pengfei's modeling tool for full drag-and-drop.
 */
export default function ModelCanvas({
  components = [],
  selectedId,
  onCanvasClick,
  onComponentClick,
  cursorComponent,
}) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(2, Math.max(0.25, prev + delta)));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Canvas toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/30 bg-slate-800/30 text-xs shrink-0">
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          className="px-2 py-1 bg-slate-700/40 text-slate-400 rounded hover:bg-slate-700/60 transition-colors"
          title="放大"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          className="px-2 py-1 bg-slate-700/40 text-slate-400 rounded hover:bg-slate-700/60 transition-colors"
          title="缩小"
        >
          -
        </button>
        <span className="text-slate-500">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(1)}
          className="px-2 py-1 bg-slate-700/40 text-slate-400 rounded hover:bg-slate-700/60 transition-colors"
        >
          重置
        </button>
        <div className="w-px h-4 bg-slate-700/50" />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-2 py-1 rounded transition-colors ${
            showGrid ? 'bg-hydro-600/20 text-hydro-400' : 'bg-slate-700/40 text-slate-400'
          }`}
        >
          网格
        </button>
        <div className="flex-1" />
        {cursorComponent && (
          <span className="text-hydro-400">
            放置模式: {cursorComponent.icon} {cursorComponent.name} — 点击画布放置
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden ${
          cursorComponent ? 'cursor-crosshair' : 'cursor-default'
        }`}
        onClick={onCanvasClick}
        onWheel={handleWheel}
        style={{
          backgroundImage: showGrid
            ? `radial-gradient(circle, rgba(100, 116, 139, 0.15) 1px, transparent 1px)`
            : 'none',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundColor: '#0d1117',
        }}
      >
        {/* Transform group for zoom */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            position: 'relative',
          }}
        >
          {/* Placed components */}
          {components.map((comp) => (
            <div
              key={comp.instanceId}
              className={`absolute flex flex-col items-center cursor-pointer group transition-all ${
                selectedId === comp.instanceId
                  ? 'z-10'
                  : 'z-0'
              }`}
              style={{
                left: comp.x - 20,
                top: comp.y - 20,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onComponentClick(comp);
              }}
            >
              {/* Selection ring */}
              {selectedId === comp.instanceId && (
                <div className="absolute -inset-2 border-2 border-hydro-400 rounded-xl animate-pulse" />
              )}

              {/* Component icon */}
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl transition-colors ${
                  selectedId === comp.instanceId
                    ? 'bg-hydro-600/30 ring-2 ring-hydro-400'
                    : 'bg-slate-800/80 ring-1 ring-slate-600/50 group-hover:ring-hydro-500/50'
                }`}
              >
                {comp.icon}
              </div>

              {/* Component label */}
              <div
                className={`mt-1 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap transition-colors ${
                  selectedId === comp.instanceId
                    ? 'bg-hydro-600/20 text-hydro-300'
                    : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {comp.name}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl opacity-10 mb-4">🌐</div>
                <div className="text-slate-500 text-sm mb-1">Model Canvas</div>
                <div className="text-slate-600 text-xs">
                  从左侧组件库选择组件，然后点击画布放置
                </div>
                <div className="text-slate-700 text-[10px] mt-2">
                  Ctrl + 滚轮缩放 | 将集成张鹏飞建模工具
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
