# HydroDesk 水网桌面端

> Desktop application for HydroMind — 水利水网智能管理系统桌面客户端

基于 **Tauri (Rust + React)** 构建的跨平台桌面工作台，为水利工程人员提供本地化的水网管理界面，并为离线场景预留降级与本地接入能力。

## 功能特性

- **系统概览** - 引擎状态、系统资源、快捷操作
- **模型构建** - 拖拽式水网模型构建（水库、管道、泵站、阀门、闸门等）
- **仿真模拟** - 稳态/瞬态/水质模拟工作面，可对接本地或 MCP 引擎；实际计算能力取决于后端接入状态
- **实时监控** - SCADA 数据实时展示、趋势图、告警面板
- **数据分析** - 时间序列、空间分析、预测、报表生成
- **知识库** - 规范标准、运行手册、应急预案等资料工作面；检索能力取决于后端或本地组件接入状态
- **离线模式** - 支持离线降级；可接本地 LLM（如 Ollama），并预留本地知识检索/向量能力接入口

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | Tauri 1.5.x (Rust) |
| 前端框架 | React 18 + Vite 5 |
| UI 样式 | TailwindCSS 3.4 (Dark Theme) |
| 状态管理 | Zustand |
| 本地推理 | 可接 Ollama 等本地模型 |
| 本地知识检索 | 预留接入口（当前 README 不再宣称已内置 Chroma） |

## HydroDesk 与 smart CLI 的关系

这两个东西不是重复产品，而是分工不同：

- **Hydrology smart CLI** = 确定性执行引擎
  - 负责 `plan / run / refresh-reports`
  - 负责真实 workflow 编排、contract 写入、报告链刷新
  - 适合批处理、自动化、CI、Claude Code / gateway 接入
- **HydroDesk** = 桌面工作台 / Agent 操作面
  - 负责可视化、案例浏览、状态查看、Agent 页、离线体验
  - 适合业务人员日常操作，而不是直接替代底层 workflow 引擎

建议理解为：

> **Hydrology 负责“跑”，HydroDesk 负责“看、管、协同”。**

因此，业务人员常见使用方式是：

1. 底层由 smart CLI 或 gateway 生成计划、执行建模、刷新报告；
2. HydroDesk 负责展示结果、组织交互、承接 Agent 工作流。

## 与仓库内 `claudecode/` 的关系

HydroDesk 的早期 Agent / 编排思路对齐本仓库 **`claudecode/`**（Claude Code 还原源码、官方插件示例、Claw harness 参考）：工具层对应 Hydrology **MCP + workflows**，技能与规则对应 **Cursor rules / 案例知识壳**，多角色对应 **studio 角色与工作面**。  
谱系说明与分层对照见：**[docs/claudecode-lineage-and-agent-stack.md](./docs/claudecode-lineage-and-agent-stack.md)**。路径常量见 **`src/config/claudecodeReference.js`**。  
Agent 栈机器可读配置：**`../Hydrology/configs/hydrodesk_agent_stack.json`**（HydroDesk Agent 页左侧面板加载；可用 `VITE_HYDRODESK_AGENT_STACK_CONFIG` 覆盖路径）。  
Agentic IDE **完全体路线**（Layer 0–4、多角色、**方案 A claw 底座 + gateway Hybrid**）见 **[docs/hydrodesk-agentic-ide-roadmap.md](./docs/hydrodesk-agentic-ide-roadmap.md)**。桌面壳内 Agent 页可查看 **claw / gateway 探测状态**（`probe_hydrodesk_agent_backend`）。

## 快速开始

### 前端开发（无需 Rust）

```bash
npm install
npm run dev
# 在浏览器中访问 http://localhost:1420
```

### 完整 Tauri 开发

```bash
# 需要安装 Rust 工具链
# https://www.rust-lang.org/tools/install

npm install
npm run tauri dev
```

### 构建桌面应用

```bash
npm run tauri build
```

## 离线模式

HydroDesk 当前定位是**离线可降级的工作台**：在线时承接完整结果查看与交互；离线时根据本地接入能力逐级退化，不默认宣称已内置完整本地仿真或本地知识检索执行栈。

| 级别 | 网络状态 | 工作台可承接能力 |
|------|----------|------------------|
| L0 | 完全在线 | 全部页面、远程引擎接入、结果查看与交互 |
| L2 | 无后端，存在本地能力接入 | 可接本地 AI / 缓存资料 / 本地计算组件，具体能力取决于实际接入状态 |
| L3 | 完全离线 | 预缓存文档、应急 SOP、模型浏览/编辑等本地工作台能力 |

## MCP 引擎

| 引擎 | 负责人 | 功能 |
|------|--------|------|
| HydroOS | 魏家好 | 操作系统内核 |
| HydroAlgo | 黄志峰 | 智能算法库 |
| HydroFlow | 王孝群 | 水力学模型 |
| HydroQuality | 施垚 | 水质冰期模型 |

## 项目结构

```
HydroDesk/
├── src-tauri/          # Tauri Rust 后端
│   ├── src/main.rs     # Rust 入口 + 自定义命令
│   └── tauri.conf.json # Tauri 配置
├── src/                # React 前端
│   ├── pages/          # 页面组件
│   ├── components/     # 布局组件
│   ├── features/       # 功能模块（离线、建模、同步）
│   ├── hooks/          # React Hooks
│   └── api/            # API 客户端
├── docs/               # 设计文档
└── package.json
```

## 许可证

MIT License
