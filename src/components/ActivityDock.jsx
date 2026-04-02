import React from 'react';
import { getRunningTasks, studioState } from '../data/studioState';

export default function ActivityDock({ view }) {
  const runningTasks = getRunningTasks();
  const runtimeSummary = [
    { label: '当前任务', value: runningTasks[0]?.workflow || studioState.tasks[0]?.workflow },
    { label: '运行后端', value: runningTasks[0]?.backend || studioState.tasks[0]?.backend },
    { label: '最近 checkpoint', value: studioState.tasks[0]?.checkpoint },
  ];

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/85 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-0">
        <section className="border-r border-slate-700/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">事件流</h3>
            <span className="text-[10px] text-slate-500">{view.label}</span>
          </div>
          <div className="space-y-2">
            {studioState.events.map((event) => (
              <div key={`${event.time}-${event.title}`} className="rounded-lg border border-slate-700/40 bg-slate-800/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">{event.title}</span>
                  <span className="text-[10px] text-slate-500">{event.time}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{event.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-r border-slate-700/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">最新产物</h3>
            <span className="text-[10px] text-slate-500">Artifacts</span>
          </div>
          <div className="space-y-2">
            {studioState.artifacts.map((artifact) => (
              <div key={artifact.name} className="rounded-lg border border-slate-700/40 bg-slate-800/60 p-3">
                <div className="text-sm text-slate-300">{artifact.name}</div>
                <div className="mt-1 text-[11px] text-slate-500">{artifact.type}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">运行摘要</h3>
            <span className="text-[10px] text-slate-500">Runtime</span>
          </div>
          <div className="space-y-3">
            {runtimeSummary.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/60 px-3 py-2">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-sm text-slate-300">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
