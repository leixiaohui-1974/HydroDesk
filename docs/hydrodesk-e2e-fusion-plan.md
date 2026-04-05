# Daduhe E2E × HydroDesk Fusion Plan

## 目标

- 让 `HydroDesk` 成为大渡河 case 的统一运行面，而不是只展示静态 mock。
- 把 `Hydrology / pipedream / E2EControl / HIL / HydroMAS / YJDT / hydromind-contracts` 的职责边界讲清楚。
- 明确 workflow 进入 `HydroDesk` 后，什么属于 product、什么属于 agent、什么适合 skill、什么只是 MCP transport。

## 执行面原则

1. `Product Workflow` 是主执行面。
   `Hydrology`、`pipedream`、`E2EControl`、`HIL` 里的确定性工作流继续留在各自产品层执行。
2. `Agent` 是监督与解释面。
   负责计划、差异分析、跨项目会商和下一步建议，不接管确定性求解。
3. `Skill` 是复用编排面。
   负责把“刷新 baseline / 回填 evidence / 更新 coverage / 生成 release 包”打包成固定入口。
4. `MCP` 是协议与 transport 面。
   负责让桌面、Agent 和服务调用 workflow / contract / validation，但不应该承载业务本体。

## 项目群分工

- `Hydrology`: case、workflow registry、outcome contract、verification report 的统一源头。
- `HydroDesk`: 桌面壳、项目群中控、case 选择、workflow 发起与结果阅读。
- `pipedream-hydrology-integration-lab`: 闭环仿真、runtime orchestration、SuperLink 求解。
- `E2EControl`: strict revalidation、EKF-MPC、historical/real validation。
- `HIL`: 数字 FAT、SIL/HIL acceptance 和验收报告。
- `HydroMAS`: 多智能体认知层、skill layer、调度与会商编排。
- `YJDT`: 梯级控制、场景系统、数字孪生和安全分析参考面。
- `hydromind-contracts`: program-level object contracts 与 protocol contracts。

## 下一步 backlog

- 把 `daduhe` 的 contract summary 接到 `HydroDesk` 建模、审查、监控页面，而不只是在项目中心展示。
- 为“刷新大渡河验收包”提供 skill 级入口，串起 backfill、verification report、dashboard refresh。
- 在 `HydroDesk` 里给跨项目 external workflows 建立可见的 owner/project/source 映射。
- 补一层 `Run / Review / Release` 级别的 contract 视图，对齐 `hydromind-contracts`。
