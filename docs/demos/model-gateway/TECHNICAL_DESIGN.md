# 模型网关：New API 源码调研与动画演示设计

## 文档状态

- 状态：首版已实现，当前验证记录见 [VERIFICATION.md](VERIFICATION.md)。研究与设计基线保留如下。
- 核对日期：2026-10-21。
- 事实基线：本地 `/root/github/new-api`，commit `206e0fa5c600127a314a97f88592c067f784f4a6`。以下源码链接固定到该提交，不代表其他版本。
- 调研方法：阅读请求路由、中间件、渠道选择、适配器、流处理、计费与相关测试/快照；未启动 New API、未调用真实上游、未运行其测试。测试文件仅作为设计意图的补充证据。
- 前期已访问官方仓库与文档；具体行为以本次本地代码为准。本文不是完整安全审计或生产部署方案。
- 遵循 [新演示开发流程](../../qb-spec/context/DEMO_DEVELOPMENT_SPEC.md)、[UI 规范](../../qb-spec/context/UI_STYLE_SPEC.md)，衔接 [Agent 演示](../agent-conversation/TECHNICAL_DESIGN.md)。调研阶段仅交付文档；后续实现记录见第 9 节。

## 1. 教学目标与范围

面向看过基础模型请求或 Agent 演示的普通用户与开发者，回答：为什么应用不直接连接每一家模型服务？一次请求经过网关时，什么被检查、什么被改写、什么被记录？

完成后应能区分：

1. 网关 API 令牌与上游服务凭据；API 令牌与文本 Token。
2. 请求模型别名、所选渠道、上游模型名、上游实际回报模型名。
3. 模型路由、模型名映射、协议转换三个不同动作。
4. 一次客户端请求、它的多个上游尝试、Agent 的多个模型请求。
5. 预估/预扣与最终用量/结算；响应完成与账务完成。
6. 请求被网关拒绝、上游返回错误、流中断三类不同失败。

首版选择 OpenAI Chat Completions 入口，以文本请求讲完整主线，再展示转 Anthropic Messages 的差异。延续 Agent 的工作台式连续演示，按步骤解释但不切换八张互不相干的页面。

首版不实现真实网关、任意提示词、真实密钥、实际计费、模型自动择优、多模态或支付后台。不画虚构内部推理。Responses/Agent 联动、自动分组、会话亲和性、插件任务作为后续扩展。

## 2. 网关需要哪些内容，以及 New API 的具体实现

“必需/生产增强/运营可选”是本项目的架构归纳，并非 New API 的官方分级。单上游代理可以不做多渠道或商业计费，但多租户模型服务通常需要这些治理能力。

| 能力 | 作用 | New API 源码证据 | 演示安排 |
| --- | --- | --- | --- |
| API 入口与校验（基础） | 接收协议，限制请求体，校验模型/参数，返回可理解错误 | [路由][S1]、[主控制器][S2] | 主线 |
| 身份与权限（基础） | 验证令牌状态/过期/额度，用户状态、IP、分组与模型权限 | [鉴权][S3]、[令牌][S4]、[分发][S5] | 主线与拒绝分支 |
| 渠道与凭据（多上游基础） | 管理上游地址、类型、可用模型、分组、密钥；按所选渠道构造认证头 | [分发][S5]、[适配器][S9] | 固定渠道卡、两种凭据 |
| 限流与容量保护（生产） | 控制请求频率，保护自身和上游 | [限流][S6]、S1 的性能检查 | 主线摘要与拒绝分支 |
| 路由与负载分配（多上游） | 从满足约束的渠道中选择；兼顾绑定、亲和性、优先级、权重 | [选择][S7]、[权重][S8] | 主线重点 |
| 模型映射（兼容） | 客户端别名转换为渠道实际模型名 | [模型映射][S10] | 字段前后对比 |
| 协议与参数适配（多协议） | 转换请求/响应/流事件，处理不兼容字段与参数覆盖 | [文本处理][S11]、[RelayKit][S12] | 单独转换分支 |
| 流式传输与终止（基础） | 增量转发、超时、客户端断开、正常终止与错误标记 | [扫描器][S13]、[流状态][S14]、[OpenAI 流][S15] | 返回主线与中断分支 |
| 重试与渠道健康（生产） | 对可重试错误重新尝试；按规则禁用渠道并记录原因 | [重试][S16]、S2 | 故障切换分支 |
| 用量与账务（多租户/运营） | 估算、预扣、差额结算、失败退款；钱包/订阅与令牌额度 | [预扣][S17]、[账务][S18]、[用量][S19] | 下方账单摘要 |
| 日志与可观测性（生产） | 关联请求、尝试、错误来源、路由决策、用量和耗时 | [策略记录][S20]、S19、S16 | 行为卡与详情 |
| 管理与持久化（生产/运营） | 配置渠道、令牌、用户和价格；保存状态；可选订阅与支付 | [管理路由][S21] | 静态配置入口，不放进每次请求动画 |

### 2.1 实际调用顺序

以 `POST /v1/chat/completions` 为范围，沿代码读取为：

```text
通用中间件（CORS、解压、请求体清理、统计等）
  → SystemPerformanceCheck
  → TokenAuth
  → ModelRequestRateLimit（启用时）
  → Distribute（模型权限检查、首个渠道选择、渠道上下文）
  → controller.Relay
      → GetAndValidateRequest / GenRelayInfo
      → PrepareRequestBilling（用量估算、价格、预扣）
      → 尝试循环
          → getChannel / 尝试轨迹 / 所选组计费准备
          → TextHelper
              → 复制请求 → 模型映射 → 适配器转换/参数处理
              → DoRequest → DoResponse（可流式输出）
              → PostTextConsumeQuota（结算与消耗记录）
          → 失败：重试决策、错误记录、渠道处理
      → 最终失败：退款路径及适用的额外费用规则
```

不能为了讲解方便把“全部计费”画在末尾：预扣在上游调用之前。也不能把完整 DTO 校验画成一定先于渠道选择；分发阶段已解析模型，完整校验在控制器内继续完成。各 API 路径不完全相同，尤其 WebSocket 与异步任务。

### 2.2 会改变动画含义的细节

- **鉴权不是换一把钥匙。** 入站令牌验证应用访问网关的资格，出站适配器用渠道的 `info.ApiKey` 构造上游认证。画为两个独立的信任边界，不能把用户密钥变形成上游密钥。
- **优先级不等于权重。** 无固定渠道/亲和性命中的普通路径，先确定优先级层，再在该层按权重抽取。缓存实现按重试索引降低优先级，超过层数停留末层；同层选择不是严格轮询，也不保证每次选到从未尝试的渠道。
- **绑定与亲和性不是权重的别名。** `SelectChannelForRequest` 先处理固定渠道，再处理首尝试的亲和性，最后普通选择；每个候选都必须满足请求过滤条件。首版固定关闭这些高级配置，详情解释其存在。
- **重试是策略，不是所有错误的统一结局。** `DecideRelayRetry` 检查严格会话、固定渠道、渠道错误、不可重试标记、预算、状态范围、系统排除与配置状态。该函数中渠道错误判断早于预算判断；真正的尝试总量还受控制器循环约束，不能只读一个判断就说“无限重试”。
- **转换可能有损。** RelayKit 支持四种文本协议的请求、响应和流转换，部分路径经中转；诊断与 `allow/safe/strict` 策略会影响处理。不能承诺“统一接口让所有模型具备相同能力”。
- **不是每次都转换。** 同协议可适配少量字段，透传配置另有分支。首版关闭透传、参数覆盖和系统提示注入，以隔离知识点。
- **预扣不是最终扣费。** `PrepareRequestBilling` 可因免费模型跳过；账务还支持信任用户等分支。普通付费示例展示一次预扣、最终按差额调整，而不是预扣和最终费用各扣一次。
- **失败不一定免费。** 已结算的会话不会再次退款；流处理可能返回已获得/估计的 usage 并结算。失败还有特定费用规则。演示必须把响应状态与结算状态分开，不能给所有错误统一显示“全额退还”。
- **HTTP 200 不等于完整成功。** 流处理另存 `ResponseOutcome`、结束原因与错误；SSE 数据片段不是文本 Token，也不是网络包的一一对应物。
- **缓存至少有两种含义。** Redis/内存中的配置和令牌缓存，与上游 prompt cache 的用量分类不同。没有据此认定网关具备通用回答缓存或语义缓存。

## 3. 教学数据与事件契约

以下全部是自主构造的示意值，不是抓包、实际价格或性能测量。模型名为占位符，凭据为不可用标记；不要求用户输入真实值。

### 3.1 一次请求

```json
{
  "model": "demo-chat",
  "messages": [{"role": "user", "content": "用一句话解释模型网关。"}],
  "max_tokens": 128,
  "stream": true,
  "stream_options": {"include_usage": true}
}
```

客户端发往教学地址 `https://gateway.example/v1/chat/completions`；入站头摘要为 `Authorization: Bearer <gateway-demo-key>`。`.example` 仅用于说明，不发送网络请求。

| 渠道 | 分组 / 模型别名 | 优先级 / 权重 | 上游协议 / 映射 | 角色 |
| --- | --- | --- | --- | --- |
| A | learning / demo-chat | 10 / 70 | OpenAI Chat / vendor-model-a | 普通主渠道 |
| B | learning / demo-chat | 10 / 30 | OpenAI Chat / vendor-model-b | 同层分流 |
| C | learning / demo-chat | 5 / 100 | OpenAI Chat / vendor-model-c | 较低优先级备用 |

默认主线使用固定教学随机值 0.20，落入 A 的区间 `[0, 0.70)`；可对照 0.85 选择 B。标注“固定教学抽样”，不是 New API 的随机实现，也不承诺十次恰好七次 A。故障场景为 A 在响应正文前返回 503，配置允许重试一次，第二次进入 C；不要画成同层 B 必定接替。

转换场景独立采用仅一个合格 Anthropic 渠道，映射 `demo-chat → vendor-claude-model`，客户端仍用 Chat 入口；上游目标为 `/v1/messages`，认证摘要显示 `x-api-key: <upstream-demo-key>` 与版本头。

```json
{
  "model": "vendor-claude-model",
  "messages": [{"role": "user", "content": "用一句话解释模型网关。"}],
  "max_tokens": 128,
  "stream": true
}
```

这是转换形状示意，非所有默认字段的逐字快照。基本 `messages` 在两种协议中都存在，不能假装必然改名；可在详情加一个 system 消息对照，解释转换为顶层 `system`。参考 RelayKit 的 `openai_to_claude.golden.json`，复杂工具和多模态不放首版。

流示例分三段正文：“模型网关”“统一接入不同模型服务，”“并管理访问、路由和用量。”。普通场景用 Chat delta；转换场景展示 Anthropic `content_block_delta` 到 Chat `choices[].delta.content` 的对应关系。开始、结束、usage 单独成事件，不把三个教学片段当成三个 Token。

### 3.2 账单示例

仅普通钱包、无缓存、无工具附加费、无分组倍率、无订阅、无信任旁路的教学配置：

- 初始可用额度 1000 单位；预扣 100，显示可用 900、预扣 100。
- 完整成功时输入 20 Token、输出 10 Token；教学单价分别为 1、2 额度单位/Token。
- 本次实际消耗 `20×1 + 10×2 = 40`；返还差额 60，最终可用 960、预扣 0、已消耗 40。
- 全部尝试在正文前失败、无可计费用量、无额外费用时，退款回 1000。
- 流中断分支显示“回答未完成；用量与结算需独立确认”，不复用成功账单的 40，也不自行宣称全额退款。首版不模拟所有适配器中断计费策略。

数量与价格均注明“示意”。New API 实际使用 quota 单位、价格配置、倍率或表达式；此公式只解释生命周期，不复刻其价格引擎。

### 3.3 状态与事件

独立的 `GatewayState`，不沿用 Agent 的 `Call`/`tool_result`：

```text
request: id, originalModel, clientProtocol, status
access: tokenStatus, group, modelAllowed, rateLimitStatus
routing: candidates, exclusions, selectedChannel, decisionReason
attempts[]: attemptId, channelId, upstreamModel, upstreamProtocol, status, error
stream: text, hasBusinessOutput, outcome, usageSource
billing: status, initial, reserved, charged, refunded, available
history[]: eventId, requestId, attemptId?, kind, summary, detail
```

演示自定义事件（不是 New API 实际 SSE 类型）：
`request.received → access.accepted → rate.accepted → channel.selected → request.validated → billing.reserved → request.adapted → upstream.started → stream.delta* → stream.completed → billing.settled → request.finished`。

失败分支为 `access.rejected`、`rate.rejected`、`routing.unavailable`、`billing.rejected`、`upstream.failed → retry.decided → channel.selected`、`stream.interrupted`、`billing.refunded`。所有终止均有明确原因。日志实际贯穿各阶段；最后的“请求报告”是汇总，不暗示此前没有记录。

一个 requestId 下的 retry 只增加 attemptId，保持客户端请求体与账务会话关联；用户重新发送创建新 requestId。回看历史只改变选中游标，不能添加事件、重试或改变余额。

## 4. 舞台与逐幕设计

采用一个连续工作台，中心网关为主体，三列固定位置；不复制 New API 管理后台，也不照搬 Agent 的文件树。

```text
┌─────────────────┬───────────────────────────┬──────────────────┐
│ 应用 / Agent     │ 模型网关                   │ 上游服务          │
│ 问题与回答       │ 访问检查 → 路由 → 协议适配 │ A / B / C 渠道卡  │
│ 请求摘要         │ 当前行为卡 + 历史卡        │ 状态 / 协议 / 模型│
└─────────────────┴───────────────────────────┴──────────────────┘
│ 请求报告：requestId · 尝试次数 · 流状态 · 预扣 / 结算             │
└─────────────────────────────────────────────────────────────────┘
```

顶部“正常请求 / 协议转换 / 故障切换 / 访问拒绝 / 流中断”为预设场景。选项可滚动但页面不得横向溢出。主线 8 步是同一舞台内的讲解进度，运行中锁定配置；提供暂停、继续、重播和历史查看，真实网关不会等待用户逐项批准。

| 步骤 | 学习目标 | 初始 → 动作 → 最终 | 动画表达与交互 |
| --- | --- | --- | --- |
| 1 发往统一入口 | 应用只需面向网关接口 | 待发送 → 请求副本进入网关 → 生成请求标识 | 蓝色摘要卡移动；客户端原文留在原位；查看 URL/模型/密钥类型 |
| 2 检查访问资格 | 能连接不代表有权限 | 令牌检查 → 分组/IP/模型限制摘要 → 允许或拒绝 | 顺序点亮检查项；拒绝只沿左侧返回错误，不连接上游；模型权限实质在分发层，详情注明 |
| 3 控制流量并选择渠道 | 合格集合、优先级、权重各司其职 | 限流通过 → 过滤候选 → 选中渠道 | 保持所有渠道卡位置，排除项变淡且附原因；同层 70/30 条带选中 A，C 标记“备用层” |
| 4 校验与预留额度 | 余额检查发生在请求上游之前 | 完整校验 → 估算/价格 → 预扣成功 | 账单卡 1000 → 900，可见预扣 100；额度不足停在网关；不显示已消费 100 |
| 5 适配后发送 | 选路、改模型名、改协议是三步 | 客户端请求 → 上游请求摘要 → 所选上游接收 | 前后字段按行对应；独立显示出站认证；只连向所选渠道，不向所有供应商广播 |
| 6 增量返回 | 网关处理流但不生成回答 | 上游 delta → 网关转发/转换 → 应用增量显示 | 绿色返回线反向绘制；转换场景在中央短暂显示事件字段差异；正文不重复追加 |
| 7 结束与结算 | 响应终止和账务终止不同 | 流完成 → usage 确认 → 差额结算 | 先点亮“回答完成”，再显示 40 消耗/60 返还；数字立即准确更新，动画不改变计算 |
| 8 请求报告 | 能解释每个决策与结果 | 汇总请求/尝试/用量 → 可回看 | 点击行为卡恢复静态快照及关联线；可展开原始数据与依据，不重新播放调用 |

首轮默认完整讲解，转换和故障由预设场景单独学习。避免在同一首次播放中叠加鉴权失败、跨协议、重试和多轮 Agent，造成因果不清。

### 4.1 异常分支

| 场景 | 触发点 | 必须呈现的结果 |
| --- | --- | --- |
| 无效令牌 / 禁止模型 | 访问阶段；分别示意 401 / 403 | 无上游尝试、无预扣；错误回到客户端 |
| 本地限流 | 渠道选择前，示意 429 | 无上游调用；不能与供应商 429 混为一谈 |
| 无合格渠道 | 路由阶段，示意 503 | 展示过滤原因；没有虚构备用服务 |
| 钱包预扣不足 | 已选渠道、尚未发送 | 标明“已选中但未调用”；不存在上游生成 |
| A 返回 503，允许重试 | 正文返回前 | 保留失败卡；显示策略原因与第 2 次尝试，转 C；客户端仍是一条请求 |
| 重试用尽 / 严格绑定 | 错误决策 | 不再画新连线；最终错误、按适用规则处理预扣 |
| 已有正文后流中断 | 返回阶段 | 保留部分正文，显示未完成；首版教学策略不自动接另一模型续写，账务标记待确认 |

最后一项是本演示的保守范围，不是对 New API 所有适配器的统一实现断言。已读 `DecideRelayRetry` 本身没有通用 `hasBusinessOutput` 检查；流处理、错误返回和结算分布于适配器，不能把架构建议写成源码已保证的行为。

### 4.2 动画规则

- 一次只强调当前传递；路径连至真实可见端点，接收卡在连线到达后突出。历史关系静态呈现。
- 复用现有教学节奏作为起点：连线约 1.15s、焦点过渡约 0.55s、内容出现约 0.45s；每步留足解释时间。仅是教学时长，不展示成请求延迟。
- 渠道过滤不挪动卡片位置；失败只更新状态，不能立即消失而掩盖尝试历史。
- 密钥只显示“网关令牌 / 上游凭据”徽标或占位符，不展示可复制的真实密钥。
- 暂停讲解与模拟取消请求不同：暂停冻结游标，继续仍是同一请求；“模拟中断”才改变请求结果。
- 详情弹窗、切后台暂停自动推进；关闭不自动继续。减少动态效果直接切换状态，保留步骤和文字解释。
- 移动端按应用、网关、上游堆叠，使用当前步骤摘要/跳转定位；不跨不可见面板画长线。320px、200% 字体下保留自然滚动和完整字段。
- 颜色沿用输入蓝、模型/适配紫、返回/完成绿、错误色；所有状态另有图标与文字。`aria-live` 只播步骤，不逐片段刷屏。

## 5. 复用 Agent 演示的评估

| 现有实现 | 结论 | 原因与改造边界 |
| --- | --- | --- |
| `FocusToolbar`、显示设置、MotionPreference、主题 token | 复用 | 保留目录、全屏、减少动态效果；工具栏当前含 `topic.id !== 'agent'` 的特判，网关接入时需显式定义连续主题的计数方式 |
| `ContentReveal` 的文本显现、内容跟随 | 小范围抽取共享 | 视觉行为可复用，但目前导入 Agent 的 timing；不要让 gateway 跨主题直接依赖 Agent 文件 |
| `flowGeometry` 的纯曲线与标签避让 | 选择性抽取 | 复用与主题无关的数学；文件树/工具轨道路径仍归 Agent |
| `FlowConnections` | 适配后复用底层机制 | 目前绑定 `.agent-stage` 和 Agent `Transfer`；不能直接换标题复用全部组件 |
| `RegionFocus` | 复用思想，抽取通用部分 | 写死 local/chat/server 与文件、工具选择器；需传入区域/锚点映射 |
| 服务端行为卡、原始数据弹窗 | 复用交互样式 | 网关卡应显示路由/attempt/账务，不把它伪装成模型响应或工具事件 |
| `replay(lesson, cursor)`、历史快照 | 复用设计模式 | 保持纯函数与确定性；建立独立 GatewayEvent/GatewayState |
| `useAgentRun` | 不直接复用业务 hook | 含 `interactionGate`、工具确认、文件结果等待、Agent task 结束条件；写轻量 `useGatewayRun`，不预建万能流程引擎 |
| `AgentDeck`、工具区、文件工作区 | 不复用业务容器 | 三列布局可借鉴，网关没有本地工具确认/写文件职责 |

设计时拟议模块（实际收敛见第 9 节）：`src/core/model-gateway/{fixtures,flow,routing,billing}.ts`，`src/features/model-gateway/` 负责舞台、渠道卡、适配对照和播放，`styles/gateway.css` 使用现有 token。纯核心不依赖网络/DOM/React，不引入 New API 后端依赖。共享提取仅针对两主题实际共用的部分，保留 Agent 回归验收。

新路由建议 `#/gateway`；按现有路由解析、目录、首页和主题挂载实际入口扩展，不把它塞入 Token 六幕的场景计数。

## 6. 与 Agent 演示的后续衔接

独立网关主题优先实现。第二阶段可把 Agent 右侧原“模型服务”入口扩展为可进入的网关详解，保留当前请求的只读摘要，不立刻把四五个窗口挤在一起。

两种编号必须同时可见：

```text
Agent 任务 T1
  ├─ 模型请求 R1 → 网关尝试 A1 / A2 → 返回 tool_call
  ├─ Agent 执行本地工具（发生在网关外）
  └─ 模型请求 R2（携带工具结果）→ 网关尝试 A1 → 返回正文
```

网关负责转发自定义工具定义、调用和结果的协议数据，不因此拥有 Agent 本地文件权限，也不代替 Agent 执行 `read_file`。上游托管工具、网关任务插件与 Agent 本地工具是不同能力，后续扩展时分别建立事实依据。

## 7. 验收标准与实施顺序

首版建议顺序：普通同协议完整请求 → 协议转换 → 正文前故障切换 → 访问拒绝/流中断 → 最小共享提取与 Agent 回归。优先验证因果与数据，再打磨动画。

核心测试应验证：

1. 无效令牌、限流、无渠道、预扣不足各自停止在正确节点；未发送的渠道不能算一次上游调用。
2. 70/30 权重只作用于最高优先级层；固定教学随机数可重播；指定故障进入备用层。
3. 重试不新增客户端请求、不累积前次请求改写、不重复预扣/结算。
4. 账务示例最终为 960，前置失败退款为 1000；重复结算事件不重复扣款。
5. 所有正文增量只追加一次；正常完成、中断、拒绝分别终止；流中断账务保持明确的未确认状态。
6. 历史查看/暂停/减少动态效果不产生业务事件；重播从同一 fixture 起点开始。
7. 转换前后文本一致；字段差异与教学样例一致，不能凭动画创造模型能力。

浏览器验收使用 BetterWright：桌面、320px、200% 字体、键盘、减少动态效果；实际查看截图与动画过程；固定操作区不因卡片更新跳动，连线端点与当前可见卡片一致，隐藏端点不画线。文档阶段不声称这些验收已完成。

编码前检查：教学目标、源码依据、主线样例、异常终止、模拟边界、逐步映射、复用边界与验收标准已定义。实现前仍需补齐可执行 fixtures 与转换快照，并复核目标提交后的代码变化。无阻碍本方案讨论的未决问题；流中断的真实结算差异、四协议完整支持、Agent 联动明确延期。调研阶段未开始编码；后续实现授权与范围见第 9 节。

## 8. 源码索引

下列均已读取；固定到研究提交。函数名用于仓库更新后的定位，测试快照代表仓库预期而非本轮执行结果。

[S1]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/router/relay-router.go
[S2]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/controller/relay.go
[S3]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/middleware/auth.go
[S4]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/model/token.go
[S5]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/middleware/distributor.go
[S6]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/middleware/model-rate-limit.go
[S7]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/service/channel_select.go
[S8]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/model/channel_cache.go
[S9]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/channel/claude/adaptor.go
[S10]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/helper/model_mapped.go
[S11]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/compatible_handler.go
[S12]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relaykit/README.md
[S13]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/helper/stream_scanner.go
[S14]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/common/stream_status.go
[S15]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/channel/openai/relay-openai.go
[S16]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/service/relay_error.go
[S17]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/relay/request_billing.go
[S18]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/service/billing_session.go
[S19]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/service/text_quota.go
[S20]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/service/request_policy.go
[S21]: https://github.com/QuantumNous/new-api/blob/206e0fa5c600127a314a97f88592c067f784f4a6/router/api-router.go


## 9. 首版实现记录（2026-10-21）

用户已授权实现。入口 `#/gateway` 已接入首页与目录，采用独立 `GatewayEvent` 和纯函数 `replayGateway`。示例与状态集中在 `src/core/model-gateway/flow.ts`，未为少量逻辑预建多层框架。普通请求与转换、故障、拒绝、中断共 11 个预设，新增单步辅助学习；网关实际运行不需要逐项人工批准。

首版通过共享 `components/flow/geometry.ts` 复用 Agent 的曲线数学，原 Agent 导出兼容保留；其余复用工具栏、概念浮层、MotionPreference 与视觉 token。网关的 DOM 锚点、连线、播放控制独立实现，不直接依赖工具执行状态。首次进入为暂停态，发送开始讲解；打开详情/目录/设置或切后台暂停，关闭不自行继续。重置后可切换场景或教学随机值。

手机堆叠布局使用固定占位的当前步骤摘要与可键盘操作的定位入口，隐藏跨屏连线。正文、账单与历史都可自然滚动。详情关闭恢复触发按钮焦点。连线在播放时绘制、暂停时冻结，单步/历史/减少动态效果直接显示静态关系；到达强调仅改变视图，不产生业务事件。

首版中断账务明确待确认；未实现真实网关、真实价格引擎、Agent 深层联动及所有协议能力。上文“本轮仅调研”描述调研阶段授权边界，本节记录后续实现授权及交付范围。

## 10. 局部动画与紧凑聊天窗调整

根据用户反馈，客户端改为收窄的虚拟聊天窗：用户气泡、助手回答、底部预设输入与发送入口；协议/凭据的完整字段保留在数据详情中。网关中心改为每步一个局部动画：请求封装、令牌检查、路由分流、额度预留、模型/协议改写、增量转发、差额结算、请求轨迹。动画由现有事件状态驱动，不新增业务步骤或改变教学事实。变换仅表示当前事件中已发生的操作，不通过 animationend 修改余额或发起请求。暂停冻结动画，历史/单步/减少动态效果显示最终静态状态。

应用—网关—各候选渠道的拓扑线持续保留，候选线使用低对比虚线；选中/尝试过的渠道使用实线，当前数据传递叠加有方向的流动标记。进入无 transfer 的内部处理步骤与结束状态不移除拓扑。切换历史恢复当时渠道样式，仍保留拓扑；窄屏保留组件内的步骤关系示意，并在聊天窗、网关、上游面板之间显示常驻的短竖线，避免长线穿过正文。

## 11. 简洁布局与步骤导航

移除底部报告、事件列表和来源页脚；原始数据详情仍保留账务、尝试与事件。八段流程条承担回看导航：只允许访问已到达的阶段，默认恢复该阶段最新已发生事件；网关内显示 Step 1 → … → Step 8 的紧凑轨迹。回看保持纯函数快照，不触发请求或重复扣费。

网关标题下常驻可用额度、预扣、实际扣除及返还，并用余额分段条表示可用/锁定/已消费占初始额度的关系。中断实际扣除仍为待确认。下一步播放一次当前事件局部动画，不启动自动连续推进；暂停、设置、后台与减少动态效果规则继续适用。

渠道以 GPT、DeepSeek、Claude 标识，模型名采用明确 demo 占位符，不代表真实型号、价格或实测权重。A/B 使用 Chat 示例，C/D 使用 Messages 示例；C 的回退复用既有 Messages 适配器。预设选路与账单规则不变。验收覆盖回看、单步动画、正常结算、失败退款、中断待确认与窄屏。
