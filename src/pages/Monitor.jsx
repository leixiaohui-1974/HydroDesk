import { useState } from 'react';
import { openPath, revealPath } from '../api/tauri_bridge';
import { getPendingApprovals, getRunningTasks, studioState } from '../data/studioState';
import { useStudioRuntime } from '../hooks/useStudioRuntime';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';

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
  const { activeProject } = useStudioWorkspace();
  const [selectedStation, setSelectedStation] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const runningTasks = getRunningTasks();
  const { runtimeSnapshot, reload: reloadRuntime } = useStudioRuntime();
  const { logTail, checkpoints, artifacts, executionHistory, reload } = useWorkflowExecution(activeProject.caseId, studioState.artifacts);
  const currentLogFile = logTail.log_file || runtimeSnapshot.log_file;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">运行中心</h1>
          <p className="text-sm text-slate-400 mt-1">实时监测、告警、运行跟踪与回放入口 · 当前案例 {activeProject.caseId}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await Promise.all([reloadRuntime(), reload()]);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/40 text-slate-300 border border-slate-700/30 hover:bg-slate-700/40"
          >
            刷新
          </button>
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

      <div className="grid grid-cols-3 gap-4 border-b border-slate-700/50 bg-slate-900/30 px-6 py-4 shrink-0">
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-500">运行中任务</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{runningTasks.length}</div>
          <div className="text-xs text-slate-500">统一主壳直接查看执行状态</div>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-500">待人工确认</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{getPendingApprovals().length}</div>
          <div className="text-xs text-slate-500">控制断面与 review 结论</div>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-500">最新 workflow</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{runningTasks[0]?.workflow || runtimeSnapshot.task_title || 'run_watershed_delineation'}</div>
          <div className="text-xs text-slate-500">{runtimeSnapshot.resume_prompt || '事件流和回放围绕同一任务组织'}</div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
              <div className="text-xs text-slate-500">当前日志文件</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{logTail.log_file || runtimeSnapshot.log_file || '未检测到'}</div>
              {currentLogFile && (
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => openPath(currentLogFile)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    打开
                  </button>
                  <button onClick={() => revealPath(currentLogFile)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                    定位
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
              <div className="text-xs text-slate-500">真实 checkpoints</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{checkpoints.length}</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
              <div className="text-xs text-slate-500">真实 artifacts</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{artifacts.length}</div>
              {artifacts[0]?.path && (
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => openPath(artifacts[0].path)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                    打开最新产物
                  </button>
                  <button onClick={() => revealPath(artifacts[0].path)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                    定位目录
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              监测站点 ({studioState.stations.length})
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {studioState.stations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  onClick={setSelectedStation}
                  isSelected={selectedStation?.id === station.id}
                />
              ))}
            </div>
          </div>

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

          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">运行日志尾部</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{logTail.lines.length} lines</span>
                {currentLogFile && (
                  <>
                    <button onClick={() => openPath(currentLogFile)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                      打开日志
                    </button>
                    <button onClick={() => revealPath(currentLogFile)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                      定位日志
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700/40 bg-slate-950/70 p-4 font-mono text-xs leading-6 text-slate-300">
              {logTail.lines.length > 0 ? (
                <pre className="whitespace-pre-wrap break-words">{logTail.lines.join('\n')}</pre>
              ) : (
                <div className="text-slate-500">当前没有可显示的实时日志。</div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">真实执行历史</h2>
              <span className="text-xs text-slate-500">{executionHistory.length} 条</span>
            </div>
            <div className="space-y-3">
              {executionHistory.slice(0, 5).map((run) => (
                <div key={run.id} className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-200">{run.workflow}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        case {run.case_id} · pid {run.pid} · {run.status}
                      </div>
                    </div>
                    {run.log_file && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => openPath(run.log_file)} className="text-xs text-hydro-400 hover:text-hydro-300 transition-colors">
                          日志
                        </button>
                        <button onClick={() => revealPath(run.log_file)} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                          定位
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {executionHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700/50 px-4 py-6 text-sm text-slate-500">
                  还没有真实执行历史，启动新的 workflow 后会在这里显示。
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-72 border-l border-slate-700/50 overflow-y-auto bg-slate-800/20">
          <div className="p-3 border-b border-slate-700/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              告警信息 ({studioState.alerts.length})
            </h2>
          </div>
          <div className="p-2 space-y-2">
            {studioState.alerts.map((alert) => {
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
