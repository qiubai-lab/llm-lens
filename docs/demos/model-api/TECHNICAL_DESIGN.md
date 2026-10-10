# 一次模型 API 调用：技术调研与演示设计

## 文档状态

- 状态：技术调研与演示方案已落地，演示代码未实现。
- 官方来源核对日期：2026-10-10。
- 受众：普通用户及开发者；前置内容为当前 Token 生成演示，不要求掌握 HTTP 或 JSON。
- 范围：OpenAI Responses、OpenAI Chat Completions、Anthropic Messages 的直接 HTTP 文本调用与 SSE 流式响应。`chatcompetition` 按 Chat Completions 理解。
- 本文是后续演示的技术与教学事实源，不是运行时解析器或完整 API Schema。
- 开发顺序遵循 [新演示开发流程](../../qb-spec/context/DEMO_DEVELOPMENT_SPEC.md)，布局遵循 [UI 设计规范](../../qb-spec/context/UI_STYLE_SPEC.md)。

## 1. 目标与首版范围

用户完成后能够解释：应用如何组装并发送模型请求、响应正文位于哪里、流式事件怎样累积成回答、应用如何知道结束、第二轮对话如何携带上下文。

贯穿示例为“用一句话解释什么是 Token”，示意回答为“Token 是模型处理文本的基本单位。”。同一教学内容用于协议比较，不表示不同模型实际生成相同答案。

首版为一个主题、六幕、三种协议，使用本地预设请求/响应/事件回放。包含正常完成、输出上限截断，以及流意外结束的状态处理。只制作一个可操作的输出上限异常演示，其他异常作为解释与验证边界。

暂不实现真实模型请求、API Key 输入、多模态、工具执行、Agent、WebSocket、后台任务、自动重试和计费估算。工具与推理内容仅说明“响应还可能有其他类型”，不制作完整流程。

## 2. 来源与适用范围

以下来源已实际打开并读取；结论与样例以 HTTP 原始结构为主。接口文档可持续变化，未来实现前需重新核对模型支持与相关字段。模型 ID 使用明确占位符，不指定未核实能力的实际型号。

| 来源 | 主要核对内容 |
| --- | --- |
| [OpenAI Responses 创建接口](https://developers.openai.com/api/reference/python/resources/responses/methods/create) | input、instructions、输出上限、上下文引用及响应结构 |
| [OpenAI Responses 流式事件](https://developers.openai.com/api/reference/resources/responses/streaming-events) | 生命周期、输出项、内容块、文本增量和终止状态 |
| [OpenAI Chat Completions 创建接口](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) | 请求、响应、消息、输出上限及流式示例 |
| [OpenAI Chat Completions 流式对象](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events) | delta、finish_reason、空 choices 的用量块 |
| [OpenAI Responses 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses) | Messages 与 Items、SDK helper、上下文管理区别 |
| [Anthropic Messages 创建接口](https://platform.claude.com/docs/en/api/messages/create) | Headers、system、messages、max_tokens、内容块 |
| [Anthropic 流式消息](https://platform.claude.com/docs/en/build-with-claude/streaming) | 消息/内容块生命周期、增量类型、累计用量、ping/error |
| [Anthropic 停止原因](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) | 自然完成、达到上限与其他停止原因 |
| [WHATWG SSE 标准](https://html.spec.whatwg.org/multipage/server-sent-events.html) | UTF-8、事件字段、空行分隔与事件解析 |

这些是不同 API 契约，文本请求使用 HTTP + JSON，本文流式模式使用 SSE。不要将三者讲成三种不同的底层网络协议。

## 3. 应用调用链

教学调用链：用户操作 → 应用组装请求 → 服务商 API → 模型推理 → API 响应 → 应用解析 → 界面展示。

API 是应用访问模型服务的接口，不是模型本体。API 返回的数据不等于 UI 已渲染的内容；客户端逐字显示也不能单独证明服务使用流式输出。服务内部推理只画成抽象过程，不展示虚构的真实思考或完整候选概率。

动画中的“应用”代表应用逻辑，可部署在客户端或服务器。生产场景可使用服务端代理持有服务凭据；当前 GitHub Pages 演示只有浏览器回放，不把示意调用链冒充真实请求。未来接入需另行确定 CORS、代理、凭据生命周期、取消与错误处理。

## 4. 请求结构

| 内容 | Responses | Chat Completions | Messages |
| --- | --- | --- | --- |
| URL | `https://api.openai.com/v1/responses` | `https://api.openai.com/v1/chat/completions` | `https://api.anthropic.com/v1/messages` |
| 方法与请求类型 | POST，`application/json` | POST，`application/json` | POST，`application/json` |
| 鉴权示例 | `Authorization: Bearer <API_KEY>` | `Authorization: Bearer <API_KEY>` | `x-api-key: <API_KEY>` |
| 版本头 | 首版不展开 | 首版不展开 | 示例使用 `anthropic-version: 2023-06-01` |
| 模型 | `model` | `model` | `model` |
| 输入 | `input`：文本或输入项数组 | `messages` 消息数组 | `messages` 消息数组 |
| 指令 | 顶层 `instructions`，也可采用适用的消息项 | 适用模型的 `developer` / `system` 消息 | 顶层 `system`，不塞进 system 角色消息 |
| 输出上限 | `max_output_tokens` | `max_completion_tokens` | 必填 `max_tokens` |
| 流式开关 | `stream: true` | `stream: true` | `stream: true` |

输出上限不是期望字数，也不保证输出达到设定值；OpenAI 上述上限还包含推理 Token。参数支持取决于模型，不能把现有教学采样控件照搬为所有 API 都接受的参数。Chat Completions 的旧 `max_tokens` 已标为 deprecated，本章使用 `max_completion_tokens`。

以下为自主编写的基础教学请求；模型 ID 与凭据是占位符，不能原样调用。`stream` 先关闭，第四幕再开启。

Responses：

```json
{
  "model": "<openai-model-id>",
  "instructions": "使用简短的中文回答。",
  "input": "用一句话解释什么是 Token。",
  "max_output_tokens": 128,
  "stream": false
}
```

Chat Completions（选择支持 developer 消息的模型）：

```json
{
  "model": "<openai-model-id>",
  "messages": [
    { "role": "developer", "content": "使用简短的中文回答。" },
    { "role": "user", "content": "用一句话解释什么是 Token。" }
  ],
  "max_completion_tokens": 128,
  "stream": false
}
```

Messages：

```json
{
  "model": "<claude-model-id>",
  "system": "使用简短的中文回答。",
  "messages": [
    { "role": "user", "content": "用一句话解释什么是 Token。" }
  ],
  "max_tokens": 128,
  "stream": false
}
```

`role` 表示消息在上下文中的身份；`content` 不总是字符串，也可能是内容块数组。JSON 字段顺序不决定语义。Headers、Body、URL 应在画面上分开，模型名称与 API 路径应有独立解释。

## 5. 完整响应结构

| 内容 | Responses | Chat Completions | Messages |
| --- | --- | --- | --- |
| 响应身份 | `id`、`object`、`model` 等 | `id`、`object`、`model` 等 | `id`、`type`、`role`、`model` 等 |
| 正文 | `output` 中 `type: message` 的内容块，读取 `type: output_text` 的 `text` | 基础单候选文本示例为 `choices[0].message.content` | `content` 中 `type: text` 的 `text` |
| 结束状态 | `status`，以及 `incomplete_details` / `error` | 每个 choice 的 `finish_reason` | `stop_reason`、相关 `stop_sequence` |
| 基础统计 | `usage.input_tokens`、`output_tokens`、`total_tokens` | `usage.prompt_tokens`、`completion_tokens`、`total_tokens` | `usage.input_tokens`、`output_tokens` |

Responses 的 `output` 是有类型的输出项数组，不保证第一项就是正文。SDK 支持的 `output_text` helper 是便利访问方式，不将它虚构成 HTTP 原始对象的固定顶层字段。Messages 也需区分内容块类型，不能把所有内容块都当成 text。

以下为响应结构摘录，省略无关字段；ID、文本与用量均为教学预设，并非来自真实请求。用量不代表实际 tokenizer 的计数，也不能据此估价。

Responses：

```json
{
  "id": "resp_demo",
  "object": "response",
  "model": "<openai-model-id>",
  "status": "completed",
  "output": [{
    "id": "msg_demo",
    "type": "message",
    "role": "assistant",
    "status": "completed",
    "content": [{ "type": "output_text", "text": "Token 是模型处理文本的基本单位。", "annotations": [] }]
  }],
  "usage": { "input_tokens": 16, "output_tokens": 12, "total_tokens": 28 }
}
```

Chat Completions：

```json
{
  "id": "chatcmpl_demo",
  "object": "chat.completion",
  "model": "<openai-model-id>",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Token 是模型处理文本的基本单位。" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 16, "completion_tokens": 12, "total_tokens": 28 }
}
```

Messages：

```json
{
  "id": "msg_demo",
  "type": "message",
  "role": "assistant",
  "model": "<claude-model-id>",
  "content": [{ "type": "text", "text": "Token 是模型处理文本的基本单位。" }],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": { "input_tokens": 16, "output_tokens": 12 }
}
```

## 6. SSE 与流式响应

### 6.1 三个必须区分的层次

1. 网络读取到的字节片段：边界由传输与缓冲影响。
2. SSE 事件：UTF-8 文本，以空行分隔；可能包含 `event:` 和一个或多个 `data:` 行。
3. 应用内容增量：解析事件数据后，识别正文 delta 并累积到对应内容块。

这些边界都不保证对应一个词或一个 Token。事件可以被拆到多次读取中，一次读取也可以包含多个事件。首版动画以已解析的 SSE 事件为播放单位；不伪装成真实网络抓包。

API 流式请求通过 POST Body 开启，不能直接将浏览器原生 `EventSource` 当成能携带相同 POST Body 和自定义鉴权头的替代品。未来真实接入可使用 SDK，或 fetch + 流读取 + SSE 解码；当前只设计契约，不实现传输层。

### 6.2 Responses：有类型的生命周期事件

典型纯文本完整路径：

`response.created` → `response.in_progress` → `response.output_item.added` → `response.content_part.added` → 多个 `response.output_text.delta` → `response.output_text.done` → `response.content_part.done` → `response.output_item.done` → `response.completed`。

这是本章选用的正常路径，不要求所有能力或异常路径都具有完全相同的事件序列。使用 `item_id`、`output_index`、`content_index` 定位正文；`sequence_number` 展示事件顺序。不要将它讲成自动重连恢复机制。

```text
event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_demo","output_index":0,"content_index":0,"delta":"Token 是","sequence_number":5}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_demo","output_index":0,"content_index":0,"delta":"模型处理文本的","sequence_number":6}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_demo","output_index":0,"content_index":0,"delta":"基本单位。","sequence_number":7}

```

以上为文本增量摘录，不是完整事件流；实现回放样例必须补齐所选路径的生命周期和终止事件。done 事件或 completed 响应携带最终内容时，应核对或替换相应结果，不能将完整文本再追加一次。`response.output_text.done` 不是整次响应完成。用量从相应最终响应读取；`response.incomplete`、`response.failed`、`error` 分别处理，不等待不存在的正常 completed。

### 6.3 Chat Completions：chunk 中的 delta

```text
data: {"id":"chatcmpl_demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl_demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Token 是"},"finish_reason":null}]}

data: {"id":"chatcmpl_demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"模型处理文本的"},"finish_reason":null}]}

data: {"id":"chatcmpl_demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"基本单位。"},"finish_reason":null}]}

data: {"id":"chatcmpl_demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: {"id":"chatcmpl_demo","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":16,"completion_tokens":12,"total_tokens":28}}

data: [DONE]

```

本例省略 created/model 等外层字段，教学模拟使用一个 choice。最后的用量块以请求设置 `stream_options: {"include_usage": true}` 为前提；普通增量的 usage 可以为空。流中断时不能保证收到最终用量。

应用按 `choices[].index` 归并 `delta.content`，角色块不增加正文。`finish_reason` 表示候选生成停止原因；`[DONE]` 是流结束哨兵，不是 JSON。不能遇到 finish_reason 就立即丢弃后续用量块，也不能无条件访问 `choices[0]`。

### 6.4 Messages：消息和内容块分别结束

```text
event: message_start
data: {"type":"message_start","message":{"id":"msg_demo","type":"message","role":"assistant","model":"<claude-model-id>","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":16,"output_tokens":1}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Token 是"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"模型处理文本的"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"基本单位。"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":12}}

event: message_stop
data: {"type":"message_stop"}

```

按 `index` 定位内容块，并按 `delta.type` 区分文本与其他增量。本例的 output_tokens 为累计值，更新统计时覆盖对应计数，不与起始计数相加。`content_block_stop` 只结束一块内容，`message_stop` 才结束消息。`ping` 不生成正文；`error` 单独改变状态；未知事件保留原始数据，不当成文字追加，也不直接判定正常完成。

## 7. 对话上下文与终止状态

### 第二轮上下文

第二轮问题为“再举个例子”。Messages 与 Chat Completions 的教学请求重新携带 user → assistant → user 的消息历史，指令按各自结构保留。只传追问不会自动让服务知道演示中的上一轮。

Responses 演示两种方式：显式传入历史输入项；或使用可访问的前一响应 ID 设置 `previous_response_id`，并发送新输入。不要同时把全部历史和已引用历史重复传入。引用依赖服务端可用响应，不是应用本地任意 ID。前一轮的 `instructions` 不会随 `previous_response_id` 自动继承，需要按本轮意图重新提供。

“携带历史”开关只比较请求和解释，不声称无历史模型必定回答错误。Responses 不扩展独立 Conversations API 操作。

### 正常完成、截断、错误与中断

| 教学状态 | Responses | Chat Completions | Messages |
| --- | --- | --- | --- |
| 正常完成 | `status: completed` / `response.completed` | 示例 `finish_reason: stop`，随后流结束 | `stop_reason: end_turn`，随后 message_stop |
| 达到输出上限 | `status: incomplete`，相关原因 `max_output_tokens` | `finish_reason: length` | `stop_reason: max_tokens` |
| 服务错误 | 请求错误，或流中的 failed/error | 请求错误或流异常，不能用空正文代替判断 | 请求错误，或流中的 error |
| 未收到预期结束信号 | 保留部分正文，标记中断 | 保留部分正文，标记中断 | 保留部分正文，标记中断 |

HTTP 请求成功不等于回答完整；空正文也不必然是错误。错误、截断、连接中断与用户取消分别记录。最终状态不靠打字动画播完、固定延迟或网络关闭猜测。重播只重放教学数据，不重发真实请求。

首版“输出上限”按钮切换预设完整/截断分支，不按可见字符数计算所谓真实 Token 计数。达到上限仍可能收到正常的流结束信号，界面同时呈现“传输结束”和“内容未完整生成”。

## 8. 教学与动画设计

### 8.1 六幕故事板

| 幕 | 目标与状态变化 | 动画主角 | 交互与解释 |
| --- | --- | --- | --- |
| 1 调用链 | 输入待发送 → 请求进入应用 → 服务抽象处理 → 响应返回界面 | 问题/响应沿调用链移动 | 发送并重播；解释应用、API、模型、教学回放 |
| 2 请求 | 中文意图卡片 → 选定协议请求的字段 | 模型、指令、用户输入卡片进入 JSON 的对应位置 | 切换协议；切换简短指令；展开 Headers/Body |
| 3 响应 | 原始结构到达 → 找到正文类型/路径 → 渲染气泡 | 正文字段从响应容器进入回答区 | 高亮正文路径、ID、用量、结束状态；切换协议 |
| 4 流式 | 同一输出分别完整返回/分片接收 → 两种展示结束 | 时间轴上的完整响应和增量事件 | 开关 stream，重播对比；说明时间与分片为示意 |
| 5 事件解析 | 事件进入 → 类型判断 → 累积正文或更新状态/用量 → 结束 | 接收事件 → 应用解析 → 回答三段画布 | 播放、暂停、单步；查看完整教学事件列表；完整/截断分支 |
| 6 第二轮 | 追问输入 → 带/不带历史的请求 → 解释上下文来源 | 历史消息进入请求或由响应 ID 关联 | 携带历史开关；Responses 显式历史/引用切换 |

### 8.2 界面与交互约束

- 协议选择是同一主题的配置，不创建三套独立课程或外壳；保留当前上一幕/下一幕、标题重播、目录与显示设置。
- 默认先用 Chat Completions 理解消息结构，可切换另两种协议。文字说明同时告知 Responses 是 OpenAI 当前推荐的新项目接口，不暗示讲解顺序是选型优先级。
- 默认显示简短语义标签；原始 JSON/SSE 按需展开。模型、API、Headers、Body、role、delta、usage、结束原因支持 hover/focus/tap 解释。
- 同一字段颜色与路径高亮保持一致：输入沿用蓝色、服务输出沿用紫色、已展示结果沿用绿色；颜色不是唯一信息载体。
- 事件列表限制在舞台内滚动，详情不挤动主动画与底部导航；预设分支按最大合理内容预留空间，未知内容允许滚动，不缩小正文补救。
- 切换协议时暂停并重置当前幕的局部回放，保留幕次与兼容的教学意图。协议 ID、请求形态与事件时间线随之更新，不混入前一协议事件。
- 暂停阻止回放推进，重播清空当前幕结果/统计并回到起点。目录/设置打开暂停，关闭不自动恢复；离开主题清理定时器。
- 窄屏使用流程/数据视图切换，不把 JSON、事件和回答强行三栏并列。减少动态效果时直接推进到可读状态，全部操作仍可完成。

### 8.3 简化说明

省略非教学重点的 Schema 字段、多 choice、多内容类型完整流程以及真实网络时延。开发者展开视图仍显示选定教学路径的完整事件列表，正文只展示被正确识别的文本块。动画时长、片段划分、示例输出及用量标为预设，不模拟模型真实内部过程。

## 9. 代码实现方案（待实施）

当前架构为 Vite + React + TypeScript + Motion，Node 仅用于开发/构建；不改变 GitHub Pages 静态部署。

- `src/app/`：扩展主题入口、hash 路由、首页和目录；必要时提取现有专注外壳的共享组合，不改变 Token 主题内部采样规则。
- 建议 `src/features/model-api/`：本主题故事板、局部状态、请求/响应结构展示、事件回放控件；未创建此目录。
- 建议 `src/core/model-api/`：协议教学数据与纯解析/归并逻辑，无 React/DOM/网络/时钟依赖；未创建此目录。
- `src/components/` 和 `src/styles/`：复用解释气泡、动态偏好、视觉令牌；只抽取实际被两个主题使用的组件。

最小归一化语义包含 response-start、text-delta、usage-update、content-end、response-end、error。事件保留协议、原始类型和 item/choice/block 定位信息；response-end 携带正常/截断原因。内容结束不能提前结束整条响应。回放控制另有 idle/playing/paused/finished，不与服务响应状态混为一谈。

协议映射保持本主题局部，不建设全站 API 适配框架。明确区分原始事件、正文聚合与播放游标；视图读取状态，Motion 只表达变化。最终完整响应与逐事件归并的正文和统计应一致。

后续真实接入只替换数据输入来源，仍需单独验证具体模型契约、SDK/传输、错误与安全边界。这里定义扩展方向，不承诺回放解析已可用于生产。

## 10. 验收与验证方案

### 技术正确性

- 三种请求分别映射到正确路径、指令和输出上限字段；不存在跨协议字段拼装。
- 原始 JSON/SSE、中文解释和画面高亮对应同一个协议状态；所有预设数据有模拟标记。
- 纯文本普通响应与流式回放最终回答一致；done/completed 携带完整文本不会重复追加。
- Chat Completions 的角色/空 delta/空 choices 用量块与 `[DONE]` 正确处理。
- Responses 文本完成不提前结束响应；Messages 内容块完成不提前结束消息；累计统计不重复相加。
- 多内容块定位契约有纯逻辑验证，即使首版 UI 只重点讲解一个文本块；非文本、ping 与未知事件不会变成正文。
- 截断保留已生成内容并显示原因；未收到结束信号不能显示正常完成；错误与取消不冒充截断。
- 第二轮历史与 Responses 引用请求符合第 7 节，不自动继承 instructions，不重复历史。

### 用户体验与框架

- 暂停、单步、重播、切幕及协议切换均可复现，没有遗留事件污染新状态。
- 原有 Token 六幕与路由继续可用，主题目录可从首页与演示访问。
- 桌面、390px、320px、200% 字体缩放下无页面水平溢出，JSON 可在局部滚动。
- 可预期内容变化时，非教学运动的按钮、导航与主要锚点变化不超过 1 CSS px；不能只用 CLS 判定。
- 键盘访问、气泡、对话框焦点、减少动态效果与系统动效偏好可用。
- GitHub Pages 仓库子路径刷新/分享可用，构建不含凭据，不发生模型网络请求。

实现时运行 `npm run verify`，并用 BetterWright 实际验证上述受影响流程；截图查看后再记录证据。核心测试重点保护协议归并与终止语义，不为每个视图元素机械写测试。本次只有文档落地，以上均为未来验收要求，尚未作为演示行为验证。

## 11. 编码前检查与延期事项

技术来源、输入输出、事件/结束契约、教学简化、六幕设计、模块边界与验收标准已落地；没有阻塞当前本地教学回放方案的问题。实施前重新核对变化中的接口事实，并在对应任务规格中引用本文。

延期：实际模型 ID 与可用参数、真实 Token 计数、SDK 版本、真实接入方式、工具/多模态、完整异常场景交互。以上不阻塞本地预设演示，不应据此提前建设服务或通用执行框架。

维护：接口或教学范围变化时更新来源核对日期、样例和对应验收项；代码完成后补充实现入口与验证证据，之后才能修改文档状态。2026-10-10 首次落地调研与方案，未实施演示代码。
