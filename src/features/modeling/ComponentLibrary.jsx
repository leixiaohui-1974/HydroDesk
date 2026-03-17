import React from 'react';

/**
 * Water network component definitions
 * Each component has: id, name, icon, category, defaultParams
 */
export const componentTypes = [
  {
    id: 'tank',
    name: '水库/水池',
    nameEn: 'Tank',
    icon: '🏗️',
    category: '节点 Nodes',
    defaultParams: {
      '容量 (m³)': '10000',
      '初始水位 (m)': '5.0',
      '最低水位 (m)': '0.5',
      '最高水位 (m)': '10.0',
      '直径 (m)': '20',
    },
  },
  {
    id: 'reservoir',
    name: '水源',
    nameEn: 'Reservoir',
    icon: '💧',
    category: '节点 Nodes',
    defaultParams: {
      '总水头 (m)': '100.0',
      '水头模式': 'FIXED',
    },
  },
  {
    id: 'junction',
    name: '节点',
    nameEn: 'Junction',
    icon: '⚫',
    category: '节点 Nodes',
    defaultParams: {
      '高程 (m)': '0.0',
      '需水量 (m³/s)': '0.0',
      '需水模式': 'DEFAULT',
    },
  },
  {
    id: 'pipe',
    name: '管道',
    nameEn: 'Pipe',
    icon: '📏',
    category: '管段 Links',
    defaultParams: {
      '长度 (m)': '1000',
      '直径 (mm)': '500',
      '粗糙系数': '100',
      '状态': 'OPEN',
    },
  },
  {
    id: 'channel',
    name: '渠道',
    nameEn: 'Channel',
    icon: '🌊',
    category: '管段 Links',
    defaultParams: {
      '长度 (m)': '5000',
      '底宽 (m)': '8.0',
      '边坡系数': '1.5',
      '糙率': '0.015',
    },
  },
  {
    id: 'pump',
    name: '水泵',
    nameEn: 'Pump',
    icon: '⚡',
    category: '设备 Equipment',
    defaultParams: {
      '额定流量 (m³/s)': '1.0',
      '额定扬程 (m)': '30.0',
      '额定功率 (kW)': '100',
      '效率 (%)': '85',
      '状态': 'ON',
    },
  },
  {
    id: 'valve',
    name: '阀门',
    nameEn: 'Valve',
    icon: '🔧',
    category: '设备 Equipment',
    defaultParams: {
      '类型': 'PRV',
      '设定值': '50.0',
      '直径 (mm)': '500',
      '状态': 'ACTIVE',
    },
  },
  {
    id: 'gate',
    name: '闸门',
    nameEn: 'Gate',
    icon: '🚧',
    category: '设备 Equipment',
    defaultParams: {
      '宽度 (m)': '5.0',
      '高度 (m)': '3.0',
      '开度 (%)': '100',
      '流量系数': '0.62',
    },
  },
  {
    id: 'sensor',
    name: '传感器',
    nameEn: 'Sensor',
    icon: '📡',
    category: '监测 Monitoring',
    defaultParams: {
      '类型': '流量计',
      '精度 (%)': '0.5',
      '采样间隔 (s)': '60',
    },
  },
  {
    id: 'controller',
    name: '控制器',
    nameEn: 'Controller',
    icon: '🎛️',
    category: '监测 Monitoring',
    defaultParams: {
      '控制模式': 'PID',
      '目标参数': '水位',
      '目标值': '5.0',
      'Kp': '1.0',
      'Ki': '0.1',
      'Kd': '0.01',
    },
  },
];

/**
 * Group components by category
 */
function groupByCategory(components) {
  const groups = {};
  for (const comp of components) {
    if (!groups[comp.category]) {
      groups[comp.category] = [];
    }
    groups[comp.category].push(comp);
  }
  return groups;
}

/**
 * ComponentLibrary - Draggable component palette for model building
 */
export default function ComponentLibrary({ onSelect, selectedId }) {
  const grouped = groupByCategory(componentTypes);

  return (
    <div className="p-2 space-y-3">
      {Object.entries(grouped).map(([category, components]) => (
        <div key={category}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
            {category}
          </div>
          <div className="space-y-0.5">
            {components.map((comp) => (
              <button
                key={comp.id}
                onClick={() => onSelect(comp)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left ${
                  selectedId === comp.id
                    ? 'bg-hydro-600/20 text-hydro-400 border border-hydro-500/30'
                    : 'text-slate-300 hover:bg-slate-700/40 border border-transparent'
                }`}
                title={`${comp.name} (${comp.nameEn})`}
              >
                <span className="text-base shrink-0">{comp.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{comp.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{comp.nameEn}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Usage hint */}
      <div className="px-2 pt-2 border-t border-slate-700/30">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          选择组件后点击画布放置。放置后可在右侧属性面板编辑参数。
        </p>
      </div>
    </div>
  );
}
