# HydroDesk Agentic IDE 平台化实施方案

> 文档类型：新增规划文档  
> 文档路径：`HydroDesk/docs/hydrodesk-agentic-ide-platform-plan.md`  
> 说明：**本文件为新增，不覆盖现有任何 roadmap / fusion plan / lineage 文档。**

---

## 1. 目标定义

HydroDesk 的目标不再只是“流程触发器 + 结果看板”，而是演进成一个 **Agentic IDE（水智协作工作站）**：

- 以 **case = project** 为基本工程单元
- 以 **Hydrology 的确定性 workflow / outcome / verification / review / release** 为业务内核
- 以 **HydroDesk** 为统一桌面 IDE 壳
- 以仓库内 **`claudecode/` / `claw-code`** 为 Agent Runtime 与工程体系参考
- 面向 **水利 / 水电 / 水务 / 水运** 不同从业者角色，提供不同工作面、技能注入与结果模板

最终目标是建设一个：

> **自主运行水网建模与调参优化 Agent 平台**

它既能完成案例创建、资料接入、建模推演、验证审查、签发发布，也能让多角色 Agent 协同工作。

---

## 2. 现状判断

当前项目已经具备较强基础，但仍处于“产品骨架成型、平台内核待统一”的阶段。

### 2.1 已有基础

- `Hydrology/`
  - 已承接确定性 workflow 主链
  - 已承接 outcome contract / verification / review / release 资产
  - 已能围绕 `daduhe` 形成阶段性验收链

- `HydroDesk/`
  - 已具备桌面壳能力（Tauri + React）
  - 已具备 `delivery / development` 双层模式
  - 开发模式下已具备：
    - `Terminal`
    - `Agent`
    - `Notebook`
    - `Review`
  - 已开始形成 `Notebook -> Review Memo -> Release Note -> ReviewDelivery` 的签发链

- `claudecode/`
  - 仓库内已有完整谱系参考
  - 包含：
    - `claudecode/claude-code-sourcemap/`
    - `claudecode/claude-code-official/`
    - `claudecode/claw-code/`
  - 可为 Agent Runtime、Skills、Plugins、Subagents 提供工程实现参考

### 2.2 当前主要短板

- Agent Runtime 还未真正统一为平台内核
- Skills / Plugins / Subagents 仍偏“说明化”，未完全 registry 化
- Case 壳层虽然已开始泛化，但多行业、多角色模板还未系统成型
- Review / Release 资产链已出现，但状态机、权限、版本演进、回填 manifest 仍未完成

---

## 3. 平台总体架构

建议把 HydroDesk 正式定义为 **五层结构**：

### Layer 0：Workspace & Project Management

目标：让 HydroDesk 像真正的 IDE 一样管理“项目”，但项目不是代码仓，而是 **case 工程**。

核心要求：

- 每个 case 都有独立工程根
- 支持对话式 scaffold case
- 支持 manifest 热编辑
- 支持 contracts / ingest / workflows / release 资产阅读与写回

对应目录与代码：

- `cases/{case_id}/`
- `cases/{case_id}/manifest.yaml`
- `cases/{case_id}/contracts/`
- `HydroDesk/src/pages/ProjectCenter.jsx`
- `HydroDesk/src/data/case_contract_shell.js`
- `HydroDesk/src/config/hydrodesk_commands.js`

### Layer 1：MCP Servers

目标：给 Agent 装上可执行的“工具手”。

能力范围：

- 文件读写
- workspace command
- 流程触发
- 合同资产读取
- 自然语言到 workflow/MCP 的桥接

对应目录与代码：

- `Hydrology/mcp_server.py`
- `Hydrology/workflows/nl_mcp_gateway.py`
- `Hydrology/workflows/agent_loop_gateway.py`
- `HydroDesk/src/api/tauri_bridge.js`
- `HydroDesk/src-tauri/src/main.rs`

### Layer 2：Skills

目标：给不同角色和场景注入“怎么做”的行为规范。

典型技能：

- 规划与拆解
- 质量门禁
- 审查与签发
- 调参与误差拆解
- 运维安全响应
- 教学引导式推演

对应目录：

- `.cursor/rules/`
- `Hydrology/scripts/`
- `Hydrology/configs/`
- 后续建议新增：
  - `HydroDesk/skills/`
  - `cases/{case_id}/.hydrodesk/skills/`

### Layer 3：Plugins & Case Isolation

目标：让不同 case、不同项目基因加载不同能力集合。

核心原则：

- `manifest.yaml` 相当于行业 IDE 的 `package.json`
- 不同 case 的 workflow target、数据边界、行业类型决定可见能力
- 纯教学 case 不应展示重型在线调度功能
- 无空间资料 case 不应默认暴露 DEM/流域划分重型入口

对应目录与代码：

- `cases/{case_id}/manifest.yaml`
- `HydroDesk/src/pages/Extensions.jsx`
- `HydroDesk/src/config/studioViews.js`
- `HydroDesk/src/hooks/useHydrodeskAgentStack.js`
- `Hydrology/configs/hydrodesk_agent_stack.json`

### Layer 4：Subagents

目标：让 20 位涉水专家不再只是注册表，而是可被调用、可协同的角色网络。

能力方向：

- 探源
- 识地
- 筑模
- 率定
- 预见
- 审评
- 调度
- 驭控
- 验模
- 协智

对应目录与代码：

- `Hydrology/configs/agent_registry.yaml`
- `Hydrology/AGENTS.md`
- `HydroDesk/src/data/studioState.js`
- `HydroDesk/src/pages/AgentWorkspace.jsx`

---

## 4. 角色导向产品模型

平台最终要面向多类涉水用户，而不只是“开发者”。

### 4.1 科研人员 Research

关注点：

- 机理算法
- 数据同化
- 误差矩阵
- 参数敏感性
- 实验可复现

推荐工作面：

- `Agent`
- `Notebook`
- `Terminal`

### 4.2 设计人员 Design

关注点：

- 地形断面
- 工况方案
- 图纸链
- 可行性比较

推荐工作面：

- `ProjectCenter`
- `Notebook`
- `ReviewDelivery`

### 4.3 运行人员 Operations

关注点：

- 预报
- 调度排期
- 大坝安全
- 报警流
- MPC/闭环

推荐工作面：

- `Agent`
- `Monitor`
- `ReviewDelivery`

### 4.4 教育 / 学习者 Education

关注点：

- 引导式步骤
- 沙盘推演
- 对标验证
- 知识壳阅读

推荐工作面：

- `Notebook`
- `Agent`
- `Workbench`

---

## 5. 关键案例体系

当前平台不应被理解为“大渡河专用工具”，而是一个多案例平台。

### 重点案例

- `cases/daduhe/`
  - 当前最完整、最深的验收壳
  - 用于打磨全链路

- 其他案例索引：
  - `cases/` 根目录下各工程目录
  - 以及 `CASES_INDEX.md`

### 原则

- `daduhe` 是 MVP 主线，不是唯一产品对象
- 所有 case 逻辑必须继续走：
  - manifest
  - workflow registry
  - outcome contract
  - verification/report
- 禁止写单 case 特供脚本

---

## 6. 目录级规划落点

下面是建议明确承担平台职责的目录：

### 顶层与平台规则

- `README.md`
- `PRODUCTIZATION_PRINCIPLES.md`
- `WATER_AUTOMODELING_PRODUCT_ARCHITECTURE.md`
- `AGENTS.md`
- `.planning/ROADMAP.md`

### 建模与 workflow 核心

- `Hydrology/`
- `Hydrology/workflows/`
- `Hydrology/configs/`
- `Hydrology/tests/`

### 桌面壳与 IDE 工作面

- `HydroDesk/src/pages/`
- `HydroDesk/src/components/`
- `HydroDesk/src/config/`
- `HydroDesk/src/data/`
- `HydroDesk/src/hooks/`
- `HydroDesk/src/api/`
- `HydroDesk/src-tauri/src/`

### Agent Runtime 参考谱系

- `claudecode/claude-code-sourcemap/`
- `claudecode/claude-code-official/`
- `claudecode/claw-code/`

### 多智能体 / 控制 / 仿真扩展

- `HydroMAS/`
- `E2EControl/`
- `HIL/`
- `YJDT/`

### 案例与交付资产

- `cases/{case_id}/manifest.yaml`
- `cases/{case_id}/contracts/`
- `cases/{case_id}/ingest/`

---

## 7. 分阶段实施计划

## Phase 1：Agent Runtime 驻留与平台入口统一

目标：先把“Agentic IDE”做成真实平台入口，而不是停留在多页面。

重点：

- 在 HydroDesk 中显化 Agent Stack
- 挂接 `claw-code` / `agent_loop_gateway`
- 展示 Runtime 状态、当前 case、当前角色 context、当前挂载层
- 打通 NL -> MCP -> workflow 的执行回显

建议落点：

- `HydroDesk/src/pages/AgentWorkspace.jsx`
- `HydroDesk/src/pages/Extensions.jsx`
- `HydroDesk/src/components/AgentStackReferencePanel.jsx`
- `HydroDesk/src/hooks/useHydrodeskAgentStack.js`
- `HydroDesk/src-tauri/src/main.rs`

## Phase 2：Case Project 工程化

目标：让 case 真正成为项目工程。

重点：

- 对话式创建 case
- scaffold `manifest.yaml`
- 生成 contracts 空槽
- 热编辑 case 基因
- workflow feasibility / readiness 在项目中心显式可见

建议落点：

- `HydroDesk/src/pages/ProjectCenter.jsx`
- `Hydrology/scripts/scaffold_new_case.py`
- `Hydrology/scripts/export_case_workflow_feasibility.py`
- `Hydrology/scripts/export_case_platform_readiness.py`

## Phase 3：Skills Registry 与角色 Context

目标：让“技能”从说明走向可配置、可装配。

重点：

- 建立 skills registry
- 按角色注入不同 skill pack
- 按 case manifest 限制 skill 可见性
- 审查 / 签发 / 调参 / 教学技能分层

建议新增目录：

- `HydroDesk/skills/`
- `HydroDesk/src/data/roleSkillPacks.js`
- `Hydrology/configs/skill_registry.yaml`

## Phase 4：Plugin Lifecycle 与能力隔离

目标：把扩展中心从“展示页”升级成真正的平台中控。

重点：

- 插件注册
- 启停
- 版本
- 权限
- 来源
- case 级别隔离

建议落点：

- `HydroDesk/src/pages/Extensions.jsx`
- `HydroDesk/src/hooks/useHydrodeskAgentStack.js`
- `Hydrology/configs/hydrodesk_agent_stack.json`
- 后续可新增：
  - `Hydrology/configs/plugin_registry.yaml`

## Phase 5：20 位涉水专家协同编排

目标：把 Agent 注册表从文档资产推进成协作运行时。

重点：

- `@agent` 路由
- 子代理挂载
- 多代理协同
- 上下文交接
- Manager Agent 汇总签发结论

建议落点：

- `HydroDesk/src/pages/AgentWorkspace.jsx`
- `Hydrology/configs/agent_registry.yaml`
- `HydroMAS/`
- `claudecode/claw-code/`

## Phase 6：行业域模板包

目标：从单案例平台升级成多行业模板平台。

优先顺序：

1. 水利 / 调水
2. 水电 / 梯级
3. 城市水务
4. 水运 / 航运

建议新增目录：

- `Hydrology/configs/domain_packs/`
- `HydroDesk/src/data/domainShellPresets/`

---

## 8. 近期优先级建议

### P0

- 统一 Agent Runtime 状态展示
- 扩展中心继续平台化
- 明确 claudecode / gateway / MCP 的分工

### P1

- 做 ProjectCenter 的对话式 scaffold 入口
- 让 case 工程创建从命令拼接升级成 IDE 流程

### P2

- 做 Skills Registry
- 做 Role Pack
- 先从：
  - Research
  - Review
  - Signoff
  三类开始

### P3

- 做 Plugin Lifecycle
- 做 manifest 驱动的能力隔离

### P4

- 做多 Agent 协同
- 让 20 位涉水专家真正可编排

---

## 9. 与现有文件关系

本规划文档与现有文档的关系如下：

- `HydroDesk/docs/hydrodesk-e2e-fusion-plan.md`
  - 侧重 Daduhe E2E × HydroDesk 融合主线

- `HydroDesk/docs/claudecode-lineage-and-agent-stack.md`
  - 侧重说明仓库内 `claudecode/` 的谱系与代码参考关系

- `HydroDesk/docs/hydrodesk-agentic-ide-roadmap.md`
  - 可视为已有 Agentic IDE 路线图草案

- `HydroDesk/docs/hydrodesk-agentic-ide-platform-plan.md`
  - **本文件**
  - 作为更完整的平台化实施方案
  - 明确：
    - 分层架构
    - 用户角色
    - 目录落点
    - 实施阶段
    - 近期优先级

---

## 10. 下一步建议

建议按以下顺序继续开发：

1. 先做 `Agent Runtime Status` 面板
   - 落点：`HydroDesk/src/pages/AgentWorkspace.jsx`

2. 再做 `ProjectCenter` 的对话式 Case Scaffold
   - 落点：`HydroDesk/src/pages/ProjectCenter.jsx`

3. 接着做 `Skills Registry`
   - 落点：`HydroDesk/src/pages/Extensions.jsx`
   - 配置：`Hydrology/configs/skill_registry.yaml`

4. 最后推进 `Subagents` 运行时协同
   - 落点：`Hydrology/configs/agent_registry.yaml` + `HydroDesk/src/pages/AgentWorkspace.jsx`

---

## 11. 结论

HydroDesk 的正确方向不是“再做一个聊天框”，而是：

> **把 Hydrology 的确定性建模内核、claudecode 的 Agent 工程体系、以及行业角色化工作面，统一成一个 case-project 驱动的 Agentic IDE 平台。**

从当前仓库现状看，这条路已经具备基础，接下来重点不是推翻，而是 **收束、配置化、平台化、角色化、行业化**。
