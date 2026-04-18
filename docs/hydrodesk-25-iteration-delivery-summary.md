# HydroDesk 25 轮迭代结构化交付总结

## 概述

本次 25 轮迭代的目标，不是继续把 `HydroDesk` 做成“更多页面 + 更多按钮”的传统后台，而是把它推进成一套更接近工作台范式的产品：

- 以真实案例目录、真实运行产物、真实 review 资产作为工作对象
- 以业务化预览替代单纯文件浏览
- 以预览区内的上下文动作替代用户自己回忆“下一步该点哪里”
- 以动作后的自动刷新、目标切换、高亮与滚动定位形成反馈闭环

最终形成了三条主工作面：

- `ProjectCenter`：`case workspace`
- `ReviewDelivery`：`review workspace`
- `Monitor`：`runtime workspace`

并配套落出一套共享的 preview/workspace 基座，用于承接资产识别、预览渲染、业务解释、动作联动与反馈逻辑。

## 本次交付目标

本轮系列工作的目标可以概括为 4 点：

1. 把真实目录、真实产物、真实运行状态拉进 UI，而不是停留在静态 dashboard。
2. 让用户在同一工作面内完成“看资产 -> 理解资产 -> 执行动作 -> 看反馈”的连续操作。
3. 抽出共享的 preview/workspace 基座，避免三页各写一套逻辑。
4. 让三条主工作面在交互语言上逐步统一，而不是每页都像独立产品。

## 交付范围

本次交付覆盖以下页面与共享基座：

### 主工作面

- [ProjectCenter](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/pages/ProjectCenter.jsx)
- [ReviewDelivery](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/pages/ReviewDelivery.jsx)
- [Monitor](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/pages/Monitor.jsx)

### 页面分区组件

- [ProjectCenterPageSections.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/project/ProjectCenterPageSections.jsx)
- [ReviewArtifactsPanel.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/review/ReviewArtifactsPanel.jsx)
- [ReviewSharedCards.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/review/ReviewSharedCards.jsx)

### 共享 workspace / preview 基座

- [WorkspaceBusinessPreview.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/WorkspaceBusinessPreview.jsx)
- [WorkspacePreviewPanel.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/WorkspacePreviewPanel.jsx)
- [workspacePreviewUtils.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/workspacePreviewUtils.js)
- [useWorkspacePreviewLoader.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/useWorkspacePreviewLoader.js)
- [workspaceBusinessPreviewBuilders.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/workspaceBusinessPreviewBuilders.js)
- [workspaceAssetPreviewRegistry.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/workspaceAssetPreviewRegistry.js)

## 25 轮迭代的阶段划分

### 阶段一：建立三条 workspace 主线

对应大致第 1-10 轮。

这一阶段的重点不是抽象，而是先把三条主工作面立起来：

- `ProjectCenter` 先完成目录驱动的 workspace 化
- `ReviewDelivery` 开始把 review 资产纳入 preview 面板
- `Monitor` 开始把 runtime 资产纳入 preview 面板

交付结果：

- 三条页面都不再只是静态信息展示页
- 页面开始围绕“真实资产”组织内容
- 用户开始可以在页面内切换、查看和理解资产

### 阶段二：收共享 preview 基座

对应大致第 11-18 轮。

这一阶段重点是把三页中重复最多的逻辑往共享层收：

- 共享 preview 展示壳
- 共享 preview 容器
- 共享 preview 工具函数
- 共享异步加载状态流
- 共享业务 preview builders
- 共享资产识别 registry
- 共享 `kind -> builder` 分发

交付结果：

- 三页开始共享同一套 preview/workspace 实现骨架
- 常见资产类型不再分别在三页重复解释
- 预览能力从“页面级实现”过渡成“产品级基座”

### 阶段三：补动作闭环与反馈可见性

对应大致第 19-25 轮。

这一阶段重点从“能预览”提升到“预览区里可以继续工作”：

- `ProjectCenter` 增加 preview-to-action
- `ReviewDelivery` 增加 preview-to-action
- `Monitor` 增加 preview-to-action
- 三页逐步补齐动作后自动刷新
- 自动切换到更相关目标资产
- 给新目标增加高亮与滚动定位

交付结果：

- 用户不再需要离开预览区去全局动作中心找按钮
- 工作面开始具备完整的操作闭环
- 动作结果不再“隐形”，而是会主动反馈给用户

## 共享 preview/workspace 基座

本次最关键的工程成果，不是某一个页面，而是共享 preview/workspace 基座的形成。

### 1. 共享 preview 展示壳

[WorkspaceBusinessPreview.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/WorkspaceBusinessPreview.jsx)

负责统一渲染：

- 标题
- 描述
- badges
- sections
- 原始内容折叠区

价值：

- 三页不再分别维护一套 business preview 外壳
- 预览体验保持统一

### 2. 共享 preview 面板容器

[WorkspacePreviewPanel.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/WorkspacePreviewPanel.jsx)

负责统一渲染：

- eyebrow / title / description / badge
- selector chips
- loading / error / empty / preview 四态
- 目标 selector 的高亮与滚动定位

价值：

- 三页的 preview 面板壳层统一
- selector 行为逐步统一

### 3. 共享 preview 工具与状态流

- [workspacePreviewUtils.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/workspacePreviewUtils.js)
- [useWorkspacePreviewLoader.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/useWorkspacePreviewLoader.js)

职责：

- 处理 preview section 构造
- 处理 JSON 解析
- 处理 preview/loading/error 的异步状态流

价值：

- 三页不再分别手写预览加载 effect
- 大量重复状态流被收口

### 4. 共享业务 preview builders

[workspaceBusinessPreviewBuilders.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/workspaceBusinessPreviewBuilders.js)

目前已覆盖：

- `contract`
- `manifest`
- `case_manifest`
- `outcome_coverage`
- `verification`
- `live_dashboard`
- `document_note`
- `review_memo`
- `release_note`
- `runtime_log`
- `runtime_run`

价值：

- 业务解释逻辑开始真正共享
- 页面不再需要针对常见资产类型各写一套解释模板

### 5. 共享资产识别与分发

[workspaceAssetPreviewRegistry.js](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/workspace/workspaceAssetPreviewRegistry.js)

职责：

- 识别资产 kind
- 匹配 contract 路径
- 将 `kind` 分发到正确的 builder

价值：

- 三页共享同一套资产类型判断
- `kind -> builder` 不再分散在页面里手工判断

## 三条主工作面的最终状态

### ProjectCenter：case workspace

对应文件：

- [ProjectCenter.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/pages/ProjectCenter.jsx)
- [ProjectCenterPageSections.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/project/ProjectCenterPageSections.jsx)

当前能力：

- 工作目录浏览
- 文件类型感知预览
- 业务化 preview
- preview 区内 `Context Actions`
- 动作后自动 rescan workspace
- 自动切到更相关的新产物
- 目标文件高亮并滚动到 explorer 可视区域

当前定位：

- 用户在这里完成 `case` 级别的浏览、理解、推进与回看
- 不再只是打开一个案例，而是进入一个会随动作变化的工作面

### ReviewDelivery：review workspace

对应文件：

- [ReviewDelivery.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/pages/ReviewDelivery.jsx)
- [ReviewArtifactsPanel.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/components/review/ReviewArtifactsPanel.jsx)

当前能力：

- review 资产统一进入 preview 面板
- 支持合同链、coverage、verification、dashboard、memo/note 业务预览
- preview 区内 `Context Actions`
- 动作后刷新 review 数据源
- 自动切到更相关的 review 资产
- 目标资产卡高亮并滚动到视野内

当前定位：

- 用户在这里完成 review/delivery 侧的审查、摘要、导出、交付闭环
- 预览区已经不只是结果展示，而是 review 工作流的操作入口

### Monitor：runtime workspace

对应文件：

- [Monitor.jsx](file:///Users/rainfields/hydrosis-local/research/HydroDesk/src/pages/Monitor.jsx)

当前能力：

- runtime 资产统一进入 preview workspace
- 支持 `runtime_log / runtime_run / coverage / verification / live_dashboard`
- preview 区内 `Context Actions`
- 动作后刷新 runtime 状态与 preview
- 自动切到更相关 runtime 资产
- selector chips 高亮并自动滚动

当前定位：

- 用户在这里完成运行中的值守、回看、跳转和快速判断
- runtime 资产不再只是日志文件或 HTML 看板，而是值守语义下的工作对象

## 本次交付形成的统一交互链

经过这 25 轮之后，三条主工作面都已经具备相同的主链路：

1. 选择资产
2. 业务化预览
3. 预览区内执行上下文动作
4. 动作后自动刷新
5. 自动切到更相关目标
6. 目标项高亮与滚动定位

这意味着 `HydroDesk` 的核心交互已经从：

- 页面跳转
- 工具堆叠
- 手动找按钮

逐步演进为：

- 在同一工作面里围绕真实资产持续工作

## 用户价值

### 1. 减少页面切换成本

用户无需频繁在 preview 区、全局动作区和其它页面之间跳来跳去。

### 2. 降低“下一步该做什么”的思考负担

资产一旦被选中，页面会根据其业务角色给出最相关动作。

### 3. 增强动作反馈的可见性

动作执行后会主动刷新、切换、提示和高亮，而不是让用户自己猜是否成功。

### 4. 提高三条主工作面的统一性

`ProjectCenter`、`ReviewDelivery`、`Monitor` 已经不再像三个相互独立的产品。

## 工程价值

### 1. 减少重复实现

preview 壳、builder、registry、加载状态流、selector 面板都已共享。

### 2. 降低后续扩展成本

再引入新的资产类型或新的 workspace 页面时，不需要重复实现整条 preview 管线。

### 3. 强化产品一致性

交互模式开始由共享基座决定，而不是由每个页面单独决定。

## 验证结果

本次系列迭代在每轮都进行了基本验证，最终状态为：

- 关键编辑文件诊断为 `0`
- `npm run build` 持续通过

已知但非本次新增的问题：

- Vite chunk warning 仍存在
- `graphify` 相关刷新失败，原因是当前环境缺少 `graphify` Python 模块

## 已知剩余问题

尽管三条主工作面已基本成形，但仍有一些未完成的收口点：

### 1. action feedback 逻辑仍是页面级实现

目前三页已经都具备动作后反馈链，但这部分还没有进一步抽成共享 hook。

### 2. 高亮反馈是轻量版

目前是短时高亮 + 自动滚动，尚未提供更强的差异提示，例如：

- 新产物 badge
- before/after 变化提示
- 更强的视觉引导

### 3. 跨页面反馈仍未统一

当前页面内动作已经会刷新本页工作面，但还没有形成跨页面联动反馈体系。

## 后续建议

### 方向一：工程收口

建议抽一层共享 `action feedback` hook，统一三页的：

- refresh nonce
- pending focus target
- status note
- highlight 生命周期

### 方向二：体验增强

建议给新目标增加更强反馈，例如：

- `recent` / `new` 标记
- 更明确的 status diff
- 更清晰的动作完成提示

### 方向三：向其它页面扩展

可以把同一套 workspace 范式逐步扩到其它非主工作面页面，而不是继续维持页面风格割裂。

## 结论

这 25 轮迭代的结果，不是简单加了几个按钮和几个面板，而是把 `HydroDesk` 从一个多页工具集合，逐步推进成了一套围绕真实资产、业务预览、上下文动作与反馈闭环组织起来的 workspace 产品基座。

到当前为止：

- `ProjectCenter` 已经是 `case workspace`
- `ReviewDelivery` 已经是 `review workspace`
- `Monitor` 已经是 `runtime workspace`

并且三条主工作面已经在体验和工程结构上同时完成了对齐。
