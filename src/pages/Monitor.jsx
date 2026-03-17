import React, { useState } from 'react';

const mockStations = [
  { id: 'st-001', name: '陶岔渠首', status: 'normal', flow: 350.2, level: 147.5, pressure: 0.42, region: '南阳' },
  { id: 'st-002', name: '方城垭口', status: 'normal', flow: 342.8, level: 145.2, pressure: 0.40, region: '南阳' },
  { id: 'st-003', name: '鲁山段', status: 'warning', flow: 298.5, level: 142.1, pressure: 0.35, region: '平顶山' },
  { id: 'st-004', name: '郑州分水口', status: 'normal', flow: 280.0, level: 138.8, pressure: 0.38, region: '郑州' },
  { id: 'st-005', name: '焦作段', status: 'normal', flow: 265.3, level: 136.5, pressure: 0.37, region: '焦作' },
  { id: 'st-006', name: '安阳段', status: 'error', flow: 0.0, level: 130.2, pressure: 0.0, region: '安阳' },
  { id: 'st-007', name: '邯郸段', status: 'normal', flow: 220.1, level: 128.7, pressure: 0.34, region: '邯郸' },
  { id: 'st-008', name: '石家庄分水口', status: 'normal', flow: 195.6, level: 125.3, pressure: 0.32, region: '石家庄' },
];

const mockAlerts = [
  { id: 'a-001', level: 'error', message: '安阳段流量异常：检测到流量为0，可能存在闸门故障', time: '10:23', station: '安阳段' },
  { id: 'a-002', level: 'warning', message: '鲁山段压力偏低：当前0.35MPa，低于阈值0.38MPa', time: '09:45', station: '鲁山段' },
  { id: 'a-003', level: 'info', message: '郑州分水口日供水量达标：28万m³/日', time: '08:00', station: '郑州分水口' },
];

const StationCard = ({ station, onClick, isSelected }) => {
  const statusStyles = {
    normal: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    error: 'border-red-500/30 bg-red-500/5 animate-pulse',
  };
  const statusLabels = { normal: '正常', warning: '警告', error: '异常' };
  const statusDots = { normal: 'bg-green-400', warning: 'bg-amber-400', error: 'bg-red-400' };

  return (
    <button
      onClick={() => onClick(station)}
      className={`text-left p-3 rounded-xl border transition-all ${
        isSelected ? 'ring-1 ring-hydro-500' : ''
      } ${statusStyles[station.status]} hover:brightness-110`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-200">{station.name}</div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDots[station.status]}`} />
          <span className="text-[10px] text-slate-500">{statusLabels[station.status]}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-slate-500">流量</div>
          <div className="text-sm font-semibold text-slate-300">{station.flow}</div>
          <div className="text-[10px] text-slate-600">m³/s</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">水位</div>
          <div className="text-sm font-semibold text-slate-300">{station.level}</div>
          <div className="text-[10px] text-slate-600">m</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">压力</div>
          <div className="text-sm font-semibold text-slate-300">{station.pressure}</div>
          <div className="text-[10px] text-slate-600">MPa</div>
        </div>
      </div>
    </button>
  );
};

export default function Monitor() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">实时监控</h1>
          <p className="text-sm text-slate-400 mt-1">SCADA 数据实时监控与告警</p>
        </div>
        <div className="flex items-center gap-2">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-hydro-600/20 text-hydro-400 border border-hydro-500/30'
                  : 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:bg-slate-700/40'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Station grid + trend chart */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Station grid */}
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              监测站点 ({mockStations.length})
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {mockStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  onClick={setSelectedStation}
                  isSelected={selectedStation?.id === station.id}
                />
              ))}
            </div>
          </div>

          {/* Trend chart placeholder */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">
                趋势图 {selectedStation ? `- ${selectedStation.name}` : ''}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">时间范围: {timeRange}</span>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-slate-800/60 rounded-lg border border-slate-700/30">
              {selectedStation ? (
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2">{selectedStation.name} - 流量趋势</div>
                  {/* Simulated chart bars */}
                  <div className="flex items-end gap-1 h-32 px-8">
                    {Array.from({ length: 24 }, (_, i) => {
                      const height = 30 + Math.random() * 70;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-hydro-500/40 hover:bg-hydro-500/60 rounded-t transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${i}:00 - ${(selectedStation.flow * (0.8 + Math.random() * 0.4)).toFixed(1)} m³/s`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between px-8 mt-1">
                    <span className="text-[10px] text-slate-600">00:00</span>
                    <span className="text-[10px] text-slate-600">06:00</span>
                    <span className="text-[10px] text-slate-600">12:00</span>
                    <span className="text-[10px] text-slate-600">18:00</span>
                    <span className="text-[10px] text-slate-600">24:00</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">请选择一个站点查看趋势图</div>
              )}
            </div>
          </div>
        </div>

        {/* Alert panel */}
        <div className="w-72 border-l border-slate-700/50 overflow-y-auto bg-slate-800/20">
          <div className="p-3 border-b border-slate-700/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              告警信息 ({mockAlerts.length})
            </h2>
          </div>
          <div className="p-2 space-y-2">
            {mockAlerts.map((alert) => {
              const levelColors = {
                error: 'border-l-red-500 bg-red-500/5',
                warning: 'border-l-amber-500 bg-amber-500/5',
                info: 'border-l-blue-500 bg-blue-500/5',
              };
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-r-lg border-l-2 ${levelColors[alert.level]}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-300">{alert.station}</span>
                    <span className="text-[10px] text-slate-500">{alert.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
