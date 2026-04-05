# HydroDesk 架构演进与多模型协作（摘要）

## 协作模型（当前约定）

- **Gemini**：规划、总体实现与文档收口。  
- **Codex CLI**：后台测试、算法深挖、批量 pytest。  
- **Claude**：前端/组件细化（与 Cursor 内助手衔接）。  
- **Grok**：本阶段不纳入主链路。

## 案例名称（书写约定）

- **雅江**：雅鲁藏布江下游水电场景。  
- **徐洪河**、**中线**：与兄弟对话中约定的工程名，配置与回归勿写错字。

## 阶段一（本次落地）：Tauri → ReactFlow 拓扑刷新

### 问题

Python/MPC 侧仿真可产出 JSON，但 **ReactFlow 节点** 未随 IPC 更新，`setNodes` 未吃到动态数据，画布与侧栏「闪烁/火花线」不同步。

### 方案

1. **Rust**（`src-tauri/src/main.rs`）  
   `run_workspace_command` 执行完成后，优先从 **stderr** 解析下列包裹块（其次兼容 **stdout** 旧行为），再 **`emit_all("hydrodesk-topology-live", payload)`**：

   ```
   <<<HYDRODESK_TOPOLOGY_JSON
   { "entities": [ ... ], "edges": [ ... ], "mode": "merge" }
   >>>HYDRODESK_TOPOLOGY_JSON
   ```

   - **`mode`**：`merge`（默认，按 `id` 更新/追加节点）或 `replace`（整表替换）。  
   - **`entities`**：与现有 MCP 拓扑一致，`{ id, name, type, state }`。  
   - **`edges`**：可选，`{ id, source, target, label }`。

2. **前端**（`src/api/tauri_bridge.js`）  
   `subscribeTopologyLive(handler)` 使用 `@tauri-apps/api/event` 订阅 `hydrodesk-topology-live`。

3. **ReactFlow**（`src/components/ReactFlowEditor.jsx`）  
   - `useEffect` 订阅事件，`mergeTopologyPayload` → **`setNodes` / `setEdges`**。  
   - `entities` / `initialEdges` props 变化时同步合并（保留已有 **position**）。  
   - **CustomNode**：根据 `state` 中的 `level_series` / `q_in_series` / `flow_series` / `power_series` 挂载 **MiniSparkline**；`liveStamp` 新鲜时高亮描边。

4. **EntityCards**  
   渠道 **Channel** / **机组 Turbine** / **分区 Zone** 在 `state` 含 `flow_series`、`depth_series`、`power_series`、`precip_series` 时显示 Sparkline（与水库/闸泵 MPC 形态对齐）。

### Python / 网关侧（已接入）

`Hydrology/workflows/nl_mcp_gateway.py`：主结果 **`print(json.dumps(result))` 独占 stdout**；若 `result["report"]` 含 **`entities`**，拓扑块写入 **stderr**（`print_hydrodesk_topology_live`，`mode: merge`），便于 `python ... | jq .` 解析单行 JSON。  
仿真路径下 **channel** 实体的 `state` 同时带 **`q_out_series`** 与 **`flow_series`**，与画布/卡片 Sparkline 字段对齐。

**案例别名**：查询串中含 **雅江 / 雅鲁藏布** → `yjdt`；**徐洪河** → `xuhonghe`；**中线** → `zhongxian`（由 `_resolve_case_id_from_query` 解析）。

### 浏览器下调试

无 Tauri 时事件不触发；可在后续加 `CustomEvent` 桥接，当前以桌面端为准。

---

*文档随阶段迭代更新；与仓库根 monorepo CI（`ci_monorepo_smoke.sh` 等）正交。*
