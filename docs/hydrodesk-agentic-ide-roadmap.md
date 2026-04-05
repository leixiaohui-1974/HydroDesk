# HydroDesk Agentic IDE：演进路线图（完全体）

HydroDesk 从「流程触发器 + 看板」升维为 **Agentic IDE（水智协作工作站）**：在 **Tauri + Hydrology** 壳内完成 **案例全生命周期**（创建、编辑、运行、签发），并吸收本仓库 **`claudecode/`**（含 **claw-code Rust/Python 底座**）与 TraeX 式分层理念。对外产品表述仍用 **HydroMind / HydroDesk**；第三方源码边界见各子目录声明。

**定位**：面向涉水领域多类从业者的 **通用 AI 协作平台**（同一套壳，角色化呈现与技能不同）：

| 人群 | 关注点（示例） |
|------|----------------|
| **科研 (Research)** | 机理与算法、同化、误差与敏感性矩阵 |
| **设计 (Design)** | 可行性、地形与断面、工况与图纸链 |
| **运行 (Operations)** | 预报、调度、大坝与安全报警流、MPC |
| **教育 / 学习 (Education)** | 引导式步骤、沙盘推演、对标与验证 |

---

## 分层架构（Layer 0–4）

| 层 | 目标 | 演进要点 |
|----|------|----------|
| **L0 Workspace & 工程管理** | IDE 本职：对话式 + 可视化 **Case 全量管理** | **Scaffold MCP**：自然语言创建工程 → 生成 `manifest.yaml`、contracts 空槽、`ingest` 等；会话内热改 YAML/ReactFlow，**配置驱动**、禁止案例名硬编码。 |
| **L1 MCP / 工具** | 涉水专家「执行触手」 | 离散脚本统一为 **MCP 工具** + IDE 网关：`read_scada_stream`、`update_reactflow_node`、`run_sil_simulation`、`analyze_knowledge_links` 等；Agent 自决调用链，减少纯人工点按钮。 |
| **L2 Skills** | 行为与规范热插拔 | 科研 NSE 异常 → 加载「算法/矩阵拆解」类 Skill；运维失压 → 加载「安全响应 / 阀门策略」类 Skill。落点：`cases/{case_id}/.hydrodesk/skills/` 或 manifest 声明。 |
| **L3 Plugins & 案例隔离** | 按工程「物理基因」裁剪能力 | **`manifest.yaml` ≈ package.json**；`workflow_targets` + 扩展字段驱动 **工具/MCP 鉴权沙箱**（无流域则弱化 DEM/划分工具；纯教学可屏蔽重型在线调度，仅保留 MBD/单机套件）。已由 **`agent_loop_gateway.py`** 走出第一步（workflow_targets ∩ 工具标签）。 |
| **L4 Subagents** | 20 位水利专家并行协同 | 映射 **`agent_registry.yaml`**；结合 L3 **动态装载/卸载** Subagent；**多轨终端 + `@识地Agent → @率定Agent`** 链式委派；长期借用 claw **Team** 思路改造顺排 Pipeline。 |

---

## 技术底座：**方案 A 为正式方向，B 为同进程回退（Hybrid）**

> **核准**：以 **`claudecode/claw-code`（Rust 主实现 + 同仓生态）** 作为 **Backend 思考环** 的**目标底座**；同时承认 **当前 `claw` CLI 以 `prompt` / REPL 为主**，尚无 HydroDesk 专用长驻 JSON 服务。因此 **Phase 1 工程策略为 Hybrid**：

| 角色 | 职责 |
|------|------|
| **方案 A（claw）** | 配置与凭证就绪时，按轮 **`claw prompt "..."`**（或后续 stdin/会话协议）承担 **强模型推理 + 内置工具链**；长期目标：进程池 / 会话驻留 / Team。 |
| **方案 B（gateway）** | **`Hydrology/workflows/agent_loop_gateway.py`**（stdio NDJSON）保证 **IDE 始终有可用的工具环**（lint、trial、manifest 过滤等），**CI 与不装 claw 的环境**依赖此路径。 |

**原则**：两套后端 **工具注册表对齐**（同一 `manifest` 沙箱语义），避免「按钮一套、Agent 一套」分叉。

---

## Phase 划分

### Phase 1（进行中）：Agent Loop 驻留与 Tauri 桥接

1. **Claw 进程策略**：检测本地构建的 `claw` 二进制（见 Tauri **`probe_hydrodesk_agent_backend`**）；**不默认静默拉起**需联网与密钥的推理进程，由用户或后续「连接 claw」动作显式启用。
2. **Agent Terminal**：`<AgentWorkspace />` 绑定 **gateway 管道**（首选）+ 预留 **claw 子进程**输出区；思维链 / 工具回显结构化展示。
3. **基座 MCP 化**：Scaffold case、Read manifest、Lint links、delivery dry-run 等 **与 UI 同源**；继续扩展 `TOOL_WORKFLOW_TARGET_TAGS` 与 `mcp_server.py`。

### Phase 2：角色 Context 与场景适配

- 将 **studio 角色**、当前 manifest 切片、选中拓扑节点 **注入** claw / gateway 会话上下文，保证 Skill 与工具面一致。

### Phase 3：Subagent 动态组网

- `@Agent` 解析、`agent_registry` 实例化、与 claw **Team** 语义对齐的并发与交接。

---

## 已实现代码入口

| 产物 | 路径 |
|------|------|
| Agent 栈 UI + claudecode 深链 | `useHydrodeskAgentStack.js`、`AgentStackReferencePanel.jsx` |
| 网关（NDJSON + workflow_targets 过滤） | `Hydrology/workflows/agent_loop_gateway.py` |
| 后端探测（claw 二进制是否存在） | Tauri **`probe_hydrodesk_agent_backend`** → `tauri_bridge.probeHydrodeskAgentBackend` |
| 栈配置 JSON | `Hydrology/configs/hydrodesk_agent_stack.json` |
| 谱系说明 | `docs/claudecode-lineage-and-agent-stack.md` |

### Gateway NDJSON（摘要）

- `list_tools` / `list_tools` + `case_id`（manifest 过滤）  
- `invoke_tool`  
- 详见网关文件头注释。

---

## 合规与边界

- YAML / 拓扑 **写回** 须保留 **人工确认门**（产品化红线）。  
- claw 使用需遵守其 **License** 与本仓 **源码构建** 说明；对外勿宣称「官方 Anthropic 发行版」。
