# HydroDesk 与仓库内 `claudecode/` 的谱系与 Agent 栈对照

本文说明：**HydroDesk 在设计与交互上吸收了同仓库 `claudecode/` 目录下的 Claude Code 系谱系**（源码还原、官方插件与 harness 参考），并映射到「**每个 case 即一个项目**」的水网桌面 IDE 模型。  
**不等同**于把其他独立目录（例如业务子项目）当作 HydroDesk 的前置依赖；谱系关系以**本仓库相对路径**为准。

## `claudecode/` 里有什么（吸收时优先看的入口）

| 路径 | 用途（给 HydroDesk / 本仓开发参考） |
|------|--------------------------------------|
| `claudecode/claude-code-sourcemap/` | 基于 npm 包 source map **还原的 TS 源码树**（研究用）。`restored-src/src/` 下 **`tools/`、`commands/`、`services/`、`coordinator/`、`plugins/`、`skills/`** 等，对应「工具层 / 命令层 / 多 Agent 协调 / 插件与技能」的分层思路。 |
| `claudecode/claude-code-official/` | **官方插件与命令示例**（`plugins/`、`/.claude/commands/`），用于对照 **Skill、Hook、Plugin manifest** 等产品化形态。 |
| `claudecode/claw-code/` | **Harness / 运行时** 的另一套参考（含 Rust workspace 说明），对照「会话状态、工具 manifest、插件管道」等工程化实现。 |

> 还原版 README 声明：非 Anthropic 官方内部仓库结构，仅供研究；版权与使用边界见各子目录声明。

## Claude Code 式分层 → HydroDesk（案例 IDE）落地映射

| 层次（概念） | `claudecode` 中典型落点 | HydroDesk / 本仓对应 |
|--------------|-------------------------|----------------------|
| **工具（手）** | `restored-src/src/tools/`（Bash、文件、Grep、MCP…） | **`Hydrology/mcp_server.py` + workflows**；自然语言入口 **`Hydrology/workflows/nl_mcp_gateway.py`**；桌面侧 **`run_workspace_command` / `OmniBar`**。 |
| **命令与流程** | `commands/` | **案例壳命令**（`hydrodesk_commands.js` 工厂）、**`hydrodesk_e2e_actions.py`**、各 `run_*` workflow CLI。 |
| **技能 / 规则** | `skills/`、官方插件内 `SKILL.md` | **`.cursor/rules/*.mdc`**、**`hydrodesk_shell.knowledge_lint`**、案例 **README / contracts Markdown** 可审计层。 |
| **插件** | `plugins/`、`plugin.json`、hooks | **Tauri command 扩展**、HydroDesk 页面与 **`studioViews`**；长期可与「HydroDesk 插件目录」对齐（与官方插件结构类比，非二进制兼容承诺）。 |
| **多 Agent / 协调** | `coordinator/` | **`studioState.roleAgents`**、多角色工作面（审查 / 运行 / Agent 等）；与 **Hydrology `agent_registry.yaml`** 业务能力对齐。 |
| **项目边界** | 单仓库 / 工作区 | **每个 `case_id` 即一个项目根**：`cases/{case_id}/manifest.yaml` + `contracts/` + `ingest/`；HydroDesk **当前案例**即当前「打开的工程」。 |

## 后续实施建议（保持产品化、零案例硬编码）

1. **单一配置源**：已增加 **`Hydrology/configs/hydrodesk_agent_stack.json`**（MCP/技能/插件/角色分层路径 + `claudecode` 深链）。HydroDesk **Agent 工作面**左侧 **「Agent 栈与 claudecode 参考」** 面板在 Tauri 下会 `read_workspace_text_file` 加载；浏览器开发回退为内置默认。可通过 **`VITE_HYDRODESK_AGENT_STACK_CONFIG`** 覆盖相对路径。案例占位统一 **`{case_id}`**，禁止在 UI 写死案例名分支。  
2. **对照阅读顺序**（新人）：`restored-src/src/coordinator` → `tools` → `plugins`，再回到 **HydroDesk `AgentWorkspace.jsx` + `OmniBar.jsx` + Tauri `main.rs`**。  
3. **合规**：对外分发时勿将还原源码当作「官方 Claude Code」；本对照文档仅描述**本 monorepo 内**工程关系。

## 相关代码入口（HydroDesk）

- `HydroDesk/src/pages/AgentWorkspace.jsx` — Agent 工作面、上下文拼装、Notebook 回写  
- `HydroDesk/src/components/OmniBar.jsx` — NL → `nl_mcp_gateway`  
- `HydroDesk/src/components/AgentStackReferencePanel.jsx` — Agent 栈面板、claudecode 深链定位  
- `HydroDesk/src/hooks/useHydrodeskAgentStack.js` — 加载 `hydrodesk_agent_stack.json`  
- `Hydrology/configs/hydrodesk_agent_stack.json` — 分层路径与深链（单一配置源）  
- `HydroDesk/src/config/hydrodesk_commands.js` — 与 Hydrology 脚本的安全命令拼接、`getHydrodeskAgentStackConfigRelPath`  
- `HydroDesk/src/config/claudecodeReference.js` — **本仓库**内 `claudecode/` 相对路径常量（供文档链接与后续工具使用）

完整 **Agentic IDE** 分阶段路线与 Phase 1 技术选型（方案 A/B）见：**[hydrodesk-agentic-ide-roadmap.md](./hydrodesk-agentic-ide-roadmap.md)**。
