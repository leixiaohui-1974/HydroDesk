# HydroDesk 水网桌面端

> Desktop application for HydroMind — 水利水网智能管理系统桌面客户端

基于 **Tauri (Rust + React)** 构建的跨平台桌面应用，为水利工程人员提供本地化、离线可用的水网管理工具。

## 功能特性

- **系统概览** - 引擎状态、系统资源、快捷操作
- **模型构建** - 拖拽式水网模型构建（水库、管道、泵站、阀门、闸门等）
- **仿真模拟** - 稳态/瞬态/水质模拟，支持本地和 MCP 引擎计算
- **实时监控** - SCADA 数据实时展示、趋势图、告警面板
- **数据分析** - 时间序列、空间分析、预测、报表生成
- **知识库** - 规范标准、运行手册、应急预案检索
- **离线模式** - 本地 LLM (Ollama) + 向量数据库，断网可用

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | Tauri 1.6 (Rust) |
| 前端框架 | React 18 + Vite 5 |
| UI 样式 | TailwindCSS 3.4 (Dark Theme) |
| 状态管理 | Zustand |
| 本地推理 | Ollama + Qwen-2.5-7B |
| 向量搜索 | Chroma (本地) |

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

HydroDesk 支持多级离线降级：

| 级别 | 网络状态 | 可用功能 |
|------|----------|----------|
| L0 | 完全在线 | 全部功能 |
| L2 | 无后端，有 Ollama | 本地 AI + 缓存知识 + 本地仿真 |
| L3 | 完全离线 | 预缓存文档 + 应急 SOP + 模型编辑 |

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
