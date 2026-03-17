# HydroDesk 桌面端架构

## 概述

HydroDesk 是 HydroMind 水网智能管理系统的桌面客户端，基于 Tauri (Rust + React) 构建，提供离线能力和原生桌面体验。

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 壳层 | Tauri (Rust) | 窗口管理、系统调用、文件I/O |
| 前端 | React 18 + Vite | 用户界面 |
| 样式 | TailwindCSS | 暗色主题 UI |
| 路由 | React Router v6 | 页面导航 |
| 状态 | Zustand | 全局状态管理 |
| HTTP | Axios + Fetch | 后端通信 |
| 图表 | Recharts | 数据可视化 |

## 架构分层

```
┌──────────────────────────────────────────────┐
│                  React Frontend               │
│  ┌──────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Pages │ │Components│ │    Features       │  │
│  │      │ │          │ │ ┌──────────────┐  │  │
│  │Dash  │ │Layout    │ │ │OfflineManager│  │  │
│  │Model │ │Sidebar   │ │ │OllamaClient  │  │  │
│  │Sim   │ │TitleBar  │ │ │CloudSync     │  │  │
│  │Mon   │ │StatusBar │ │ │ModelCanvas   │  │  │
│  └──────┘ └──────────┘ │ └──────────────┘  │  │
│                         └──────────────────┘  │
├──────────────────────────────────────────────┤
│                  API Layer                    │
│  ┌─────────────┐  ┌────────────────────┐     │
│  │tauri_bridge  │  │hydromind_client    │     │
│  │(IPC wrapper) │  │(HTTP client)       │     │
│  └──────┬──────┘  └────────┬───────────┘     │
├─────────┼──────────────────┼─────────────────┤
│  Tauri  │  Rust Backend    │                  │
│  ┌──────┴──────┐           │                  │
│  │main.rs      │           │                  │
│  │- greet      │           │                  │
│  │- sys_info   │           │                  │
│  │- ollama_chk │           │                  │
│  └─────────────┘           │                  │
├────────────────────────────┼─────────────────┤
│              Network       │                  │
│  ┌─────────────────────────┴───────────┐     │
│  │  HydroMind Backend (localhost:8000) │     │
│  │  MCP Engines (8001-8004)            │     │
│  │  Ollama (localhost:11434)           │     │
│  └─────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

## 运行模式

### 在线模式 (Cloud Mode)
- 连接 HydroMind 后端获取完整功能
- MCP 引擎远程调用（HydroOS, HydroAlgo, HydroFlow, HydroQuality）
- 实时 SCADA 数据监控
- 知识库全文搜索

### 离线模式 (Offline Mode)
- 本地 LLM 推理（Qwen-2.5-7B via Ollama）
- 本地向量搜索（Chroma）
- 预缓存知识文档
- 本地 EPANET 仿真计算
- 离线变更自动队列，恢复连接后同步

## MCP 引擎集成

| 引擎 | 负责人 | 功能 | 端口 |
|------|--------|------|------|
| HydroOS | 魏家好 | 操作系统内核 | 8001 |
| HydroAlgo | 黄志峰 | 智能算法库 | 8002 |
| HydroFlow | 王孝群 | 水力学模型 | 8003 |
| HydroQuality | 施垚 | 水质冰期模型 | 8004 |

## 安全配置

- CSP 限制：仅允许 localhost 连接
- Tauri allowlist：最小权限原则
- HTTP scope：仅允许 localhost:8000-9999 和 11434
- 文件系统范围：仅 $APPDATA 和 $DOCUMENT

## 开发指南

```bash
# 前端开发（不需要 Rust）
npm install
npm run dev          # 启动 Vite 开发服务器，浏览器可访问

# 完整 Tauri 开发（需要 Rust 工具链）
npm run tauri dev    # 启动 Tauri 开发窗口

# 构建
npm run tauri build  # 构建桌面应用
```
