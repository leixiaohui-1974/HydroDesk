import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { openPath, revealPath } from '../api/tauri_bridge';
import { useStudioWorkspace } from '../context/StudioWorkspaceContext';
import { resolveShellCaseId } from '../data/case_contract_shell';
import {
  formatFullSpatialHydroEvidenceCaseListText,
  hasFullSpatialHydroEvidenceCase,
} from '../data/caseShellPresets';
import {
  caseEvidenceWorkflowOrder,
  getCaseWorkflowEvidence,
} from '../data/daduheWorkflowEvidence';
import ComponentLibrary from '../features/modeling/ComponentLibrary';
import ModelCanvas from '../features/modeling/ModelCanvas';

/**
 * Model building workspace
 * Left: component library | Center: canvas | Right: properties | Bottom: toolbar
 */
export default function Modeling() {
  const { activeProject } = useStudioWorkspace();
  const shellCaseId = resolveShellCaseId(activeProject.caseId);
  const showFullHydroEvidence = hasFullSpatialHydroEvidenceCase(shellCaseId);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [placedComponents, setPlacedComponents] = useState([]);
  const [selectedPlaced, setSelectedPlaced] = useState(null);
  const [selectedEvidenceWorkflow, setSelectedEvidenceWorkflow] = useState(caseEvidenceWorkflowOrder[0]);
  const workflowEvidence = useMemo(() => {
    if (!showFullHydroEvidence) return null;
    return getCaseWorkflowEvidence(shellCaseId, selectedEvidenceWorkflow);
  }, [showFullHydroEvidence, shellCaseId, selectedEvidenceWorkflow]);

  useEffect(() => {
    if (!showFullHydroEvidence) return;
    setSelectedEvidenceWorkflow(caseEvidenceWorkflowOrder[0]);
  }, [shellCaseId, showFullHydroEvidence]);

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
          <h1 className="text-lg font-semibold text-slate-100">拓扑与 GIS 建模</h1>
          <p className="text-xs text-slate-500">拖放组件构建水网拓扑，并作为后续 GIS 与工作流执行的图形入口</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-2 py-1 text-[10px] text-hydro-300">
            case {activeProject.caseId}
          </span>
          <span className="text-xs text-slate-500">
            已放置 {placedComponents.length} 个组件
          </span>
        </div>
      </div>

      {showFullHydroEvidence && workflowEvidence ? (
        <section className="border-b border-slate-700/50 bg-slate-900/40 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.28em] text-hydro-300">
                {shellCaseId} · 流域 / 水文主链 · workflow 证据导航
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-100">把 workflow 结果回链到拓扑 / GIS / 审查证据</h2>
              <p className="mt-2 text-xs leading-6 text-slate-400">{workflowEvidence.headline}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/simulation"
                className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
              >
                工作流执行
              </Link>
              <Link
                to="/review"
                className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
              >
                审查交付
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {caseEvidenceWorkflowOrder.map((workflow) => {
              const evidence = getCaseWorkflowEvidence(shellCaseId, workflow);
              const selected = workflow === selectedEvidenceWorkflow;
              return (
                <button
                  key={workflow}
                  onClick={() => setSelectedEvidenceWorkflow(workflow)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selected
                      ? 'border-hydro-500/40 bg-hydro-500/10 text-hydro-300'
                      : 'border-slate-700/50 bg-slate-900/60 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  {evidence.label}
                </button>
              );
            })}
          </div>

          {workflowEvidence.adjacentWorkflows?.length ? (
            <div className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">adjacent workflows</div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {workflowEvidence.adjacentWorkflows.map((item) => {
                  const adjacentEvidence = getCaseWorkflowEvidence(shellCaseId, item.workflow);
                  return (
                    <div key={item.workflow} className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{item.relationship}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">{adjacentEvidence.label}</div>
                        </div>
                        <button
                          onClick={() => setSelectedEvidenceWorkflow(item.workflow)}
                          className="rounded-full border border-hydro-500/30 bg-hydro-500/10 px-3 py-1 text-[10px] text-hydro-300 transition-colors hover:bg-hydro-500/20"
                        >
                          切换到该 workflow
                        </button>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</div>
                      <div className="mt-2 break-all text-[11px] leading-5 text-slate-500">{item.contractPath}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPath(item.contractPath)}
                          className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                        >
                          打开合同
                        </button>
                        <button
                          type="button"
                          onClick={() => revealPath(item.contractPath)}
                          className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                        >
                          定位路径
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-4">
            {workflowEvidence.groups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-700/40 bg-slate-950/50 p-4">
                <div className="text-sm font-medium text-slate-100">{group.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{group.summary}</div>
                <div className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <div key={item.path} className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-100">{item.title}</div>
                          <div className="mt-1 text-[11px] text-hydro-300">{item.focus}</div>
                        </div>
                        <Link
                          to={item.route}
                          className="rounded-full border border-slate-700/50 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:bg-slate-800/60"
                        >
                          {item.routeLabel}
                        </Link>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</div>
                      <div className="mt-2 break-all text-[11px] leading-5 text-slate-500">{item.path}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPath(item.path)}
                          className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
                        >
                          打开资产
                        </button>
                        <button
                          type="button"
                          onClick={() => revealPath(item.path)}
                          className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                        >
                          定位路径
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="border-b border-slate-700/50 bg-slate-900/40 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-2">
              <div className="text-xs uppercase tracking-[0.28em] text-amber-300/90">
                {shellCaseId || '当前案例'} · 拓扑 / GIS（无全链水文证据树）
              </div>
              <h2 className="text-base font-semibold text-slate-100">当前 rollout 数据深度说明</h2>
              <p className="text-xs leading-6 text-slate-400">
                当前在闭环中声明为全链空间水文的案例为{' '}
                <span className="font-mono text-slate-300">{formatFullSpatialHydroEvidenceCaseListText()}</span>
                ——它们具备完整的
                <span className="text-slate-200"> 流域划分、水文模拟 </span>
                与探源—source_selection 全链 contracts 产物。其它 rollout 案例以 manifest、contracts 壳层与 E2E
                编排为主；请勿在此期待与上述参考案例同构的断面/流域 JSON 树。补齐数据与产物后，在闭环 YAML 的{' '}
                <span className="font-mono text-slate-500">hydrodesk_shell.full_spatial_hydro_evidence_case_ids</span>{' '}
                中加入该 id，并运行{' '}
                <span className="font-mono text-slate-500">export_playwright_rollout_registry.py</span>{' '}
                更新生成 JSON 即可启用同款导航。
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <Link
                to="/projects"
                className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
              >
                项目中心
              </Link>
              <Link
                to="/simulation"
                className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
              >
                工作流执行
              </Link>
              <Link
                to="/review"
                className="rounded-lg border border-hydro-500/30 bg-hydro-500/10 px-3 py-1.5 text-xs text-hydro-300 transition-colors hover:bg-hydro-500/20"
              >
                审查交付
              </Link>
              {shellCaseId ? (
                <>
                  <button
                    type="button"
                    onClick={() => openPath(`cases/${shellCaseId}/contracts`)}
                    className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                  >
                    打开 contracts
                  </button>
                  <button
                    type="button"
                    onClick={() => openPath(`cases/${shellCaseId}/manifest.yaml`)}
                    className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800/60"
                  >
                    打开 manifest
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </section>
      )}

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
