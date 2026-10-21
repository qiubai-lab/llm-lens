# 三种模型协议：同一任务，不同信封

核对日期：2026-10-21。对照 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 的官方 HTTP 数据结构。演示不是网关兼容性承诺，也不比较模型质量、速度和费用。

## 教学目标与范围

普通用户通过形状理解封装差异，开发者通过 JSON 检查字段。前置知识仅为用户消息、模型回答、应用执行工具。四个对照主题：请求封装、文本流、客户端函数工具、下一轮上下文，同一教学任务（三列都查询上海天气），结果为固定示意数据。

不含真实网络请求、密钥、推理内容、音视频、服务端托管工具、并行工具或所有错误事件；模型名和 ID 为 demo 占位。三个分栏同步仅便于比较，不表示实际耗时相同。各幕为独立协议片段，不伪装成一次完整 HTTP 流。

## 已核对的官方来源

通过 BetterWright 打开并读取正文（不是搜索摘要）：

- [S1 OpenAI 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)：messages 与 typed Items、工具定义、流式事件、上下文延续、SDK output_text。
- [S2 OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling)：应用执行自定义函数、arguments JSON 字符串、call_id 与 function_call_output。
- [S3 Chat 创建接口](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)：messages、developer 示例、choices.message、stream。
- [S4 Chat 流式接口](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)：chunk、choices.delta、最后 usage chunk 可为空 choices、断流不保证 usage。
- [S5 Anthropic Messages](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)：顶层 system、max_tokens、content 块、手工提交历史。部分较新模型支持中途 system 消息，本例不讲该扩展，也不宣称 system 角色永远禁止。
- [S6 Anthropic Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)：message_start、content_block_start/delta/stop、message_delta、message_stop；text_delta、input_json_delta；错误与未知事件。
- [S7 Anthropic 工具处理](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)：tool_use.input 对象，user.content 的 tool_result，tool_use_id 关联；工具结果紧随调用。

## 技术契约与可复核样例

| 内容 | Chat Completions | Responses | Anthropic Messages |
|---|---|---|---|
| POST 路径 | /v1/chat/completions | /v1/responses | /v1/messages |
| 指令示例 | messages 中 developer | instructions | 顶层 system |
| 用户输入 | messages 的 user | input 的 message Item | messages 的 user |
| 正文输出 | choices[0].message.content | output 中 message 的 content 中 output_text.text | content 中 text.text |
| 文本增量 | choices[0].delta.content | response.output_text.delta 的 delta | content_block_delta 的 delta.text，类型 text_delta |
| 工具定义 | tools[].function.parameters | tools[].parameters，与 name 同层 | tools[].input_schema |
| 调用 | assistant.tool_calls，function.arguments 为 JSON 字符串 | function_call Item，arguments 为 JSON 字符串 | assistant.content 的 tool_use，input 为对象 |
| 工具结果 | role:tool + tool_call_id | function_call_output + call_id | user.content 的 tool_result + tool_use_id |
| 本例续聊 | 重发所需消息历史 | previous_response_id + 新 input，重新发送 instructions | 重发所需消息历史 |

Responses 的 output_text 是 SDK 聚合便利属性，不展示为原始 HTTP 顶层返回字段。Responses 可选手工传递上下文或 Conversations，本例只演示可用且存储的 response 引用；引用不免除上下文计费，不保证无限记忆。Chat 与 Messages 的存储/缓存不等于自动携带对话上下文。

工具统一为 get_weather(city:string)，参数 {"city":"上海"}，结果 {"temperature_c":22,"condition":"晴"}；调用 ID 在每种协议内必须匹配。本例只演示客户端函数：收到调用后由应用执行，再发第二次请求。不能把函数调用等同于模型已执行工具。

流式示例省略无关字段及部分生命周期事件，正文三段为“上海”“ 22°C”“，晴。”；每段不等于 Token。Chat 终止以 finish_reason=stop 与 SSE [DONE] 表示；Responses 以 response.completed；Messages 以 stop_reason=end_turn 及 message_stop。异常/截断不是成功，本例只展示成功文本流。以 JSON 信封节选展示关键结束帧，但明确为节选，不作为通用解析器。

## 当前交互设计：JSON 直接对照

用户最新要求简化为直接 JSON 比较，取代此前四幕动画方案。保留全部已核对的技术事实，移除播放、单步、动画舞台及 JSON 弹窗。

- 三列始终展示 Chat Completions、Responses、Anthropic Messages。每列包含端点、一句差异解释、语法着色的 JSON，关键字段行明确强调。
- 四个主切换项：请求、流式事件、工具调用、继续对话。流式子选项为文本增量/结束信号；工具子选项为声明/模型调用/结果回传。
- 流式正文只展示一个增量事件的 JSON；终止样例以事件信封数组记录多个 SSE 帧。SSE 的 [DONE] 是非 JSON 标记，展示为信封 data 字符串仅为表达终止帧，明确说明。
- 工具调用展示响应的关键结构；结果回传展示第二次请求及所需历史/引用，不能只发送孤立结果。所有样例是字段节选，模型/ID 为占位符，无实际请求。
- 核心样例与选择函数位于 src/core/protocols，视图只负责 JSON 着色和切换。复用全站工具栏、语义 token；窄屏堆叠并自动换行，保留原字号。来源折叠放在对照下方。
- 首页、目录和 #/protocols 路由不变。没有计时器、后台执行或动画副作用。

## 编码前检查

[x] 教学目标、范围与模拟边界明确；[x] 七份官方原文已核对；[x] 字段/终止/关联 ID 契约明确；[x] 没有影响本例的未解决事实；[x] 用户已明确调整为 JSON 对照；[x] 纯数据与视图分离；[x] 验收标准如下。

## 验收

验证三种请求与续聊结构、工具 ID/参数类型及流正文提取一致；验证所有主/子选项返回正确片段。浏览器验证三列 JSON、切换与键盘、首页/目录入口、320px 和 200% 字体无横向溢出；旧播放控制不存在。通过 verify，不要求生产部署。

## 最新调整：请求 / 响应完整对象与字段定位

用户要求两个演示、完整 JSON、子演示自动定位字段。本节取代此前四个主题和片段切换的交互设计。

- 两个主入口为请求、响应；三个协议窗口始终展示对应方向的完整教学样例对象，无省略号/截断替代。完整指这一场景的对象，不是填入所有可选参数；模型、ID、时间与 token 用量仍为模拟值。
- 场景：用户询问上海并要求再查杭州。请求携带上海的历史调用和结果，响应先描述上海，再发出杭州调用。Responses 采用 S1/S2 已核对的手工 input 历史模式，保留 function_call 与 function_call_output；不使用 previous_response_id，以便同一 JSON 展示用户输入及工具结果。
- 请求明确 stream:false；响应为非流式 HTTP JSON，不再把 SSE 信封数组当作完整响应。Chat 响应包含 id/object/created/model/choices/usage；Messages 包含 id/type/role/model/content/stop_reason/stop_sequence/usage；Responses 包含完整示例响应骨架与配置、output、usage。
- 补充核对来源：[S8 OpenAI Response 对象参考](https://developers.openai.com/api/reference/cli/resources/responses/methods/retrieve)，2026-10-21 通过 BetterWright 阅读字段与完整返回样例。Responses 的 completed 表示本次生成完成，仍可能等待应用执行 function_call，不代表用户任务完成。
- 请求定位：用户输入、指令、工具声明、历史调用、工具结果、模型。响应定位：正文、工具调用、结束状态、用量、响应 ID。每个定位项保存三个协议各自的精确 JSON 路径，不能靠字段名称全文搜索（同一名称可能出现多次）。
- 纯函数序列化生成完整 JSON 行及路径；选中容器高亮整个子树，三列滚动到各自对应路径，保持页面/控件位置。重复点击再次定位。切换请求/响应回到顶部；全部按钮清除定位。不存在目标不得伪装定位成功。
- 每列固定阅读窗口高度、独立滚动；完整文本仍可复制。窄屏堆叠，定位同步更新三个窗口但不连续滚动整个页面。键盘与减少动态效果可用。

验收补充：所有路径必须存在，带路径序列化可还原原对象，定位高亮不修改 JSON；浏览器逐项检查三列实际滚动与定位可见，重复定位、切换复位、完整 JSON 可解析、320px 和200%字体、复制按钮、键盘操作。

### 布局精简（2026-10-21）

请求 / 响应改为标题后的卡片选项；样例与官方依据改为同一标题行的标签按钮，通过 Radix Dialog 展示，支持 Escape、焦点约束及关闭后返回触发按钮。字段入口采用原主导航的横向顶部线条样式，窄屏换行。移除主页面的场景说明及字段解释段落，完整 JSON、精确路径定位与复制行为保持不变。本次只调整展示层，不改变样例事实。

### Responses 增量开关

Responses 卡片标题行右侧提供仅作用于 Responses 的增量开关，跨请求 / 响应保持状态。依据已读取的官方 [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state) 与 [Create Response](https://developers.openai.com/api/reference/resources/responses/methods/create)（2026-10-21）：previous_response_id 引用服务端可用的先前响应；顶层 instructions 需重新提供；历史仍计入上下文及输入计费。

本场景前一响应 resp_shanghai_demo 已保存用户问题与上海工具调用 call_demo；本轮增量 input 只上传上海 function_call_output。继续提供 instructions、tools 和本轮配置，store:true 保存本轮以供续接。本轮响应仍是完整 Response 对象，output 只含本轮新输出（默认模式本来也如此），previous_response_id 指向上海响应，id 为 resp_hangzhou_demo。不得将增量误作 SSE 流式增量或只返回 ID。

用户输入 / 历史调用定位在增量请求下指向 previous_response_id，并标注“历史由 ID 关联”；工具结果定位改为 input[0]。其他协议不变。行旁教学注释与 JSON 数据分离，复制只复制合法完整 JSON。验收包括工具结果 ID 配对、全部定位路径、模式切换、请求响应共享开关、键盘与窄屏。

### read 场景与字段提示

改用先读取 /workspace/README.md、再读取 /workspace/package.json 的自定义 read 工具。参数 file_path:string、offset:integer、limit:integer 均必填，offset 从 1 开始，limit 为最大读取行数；这是本演示定义的工具契约，不是三家供应商内置工具。沿用已核对的 Function calling / Messages 工具输入结构，Chat 与 Responses arguments 仍为 JSON 字符串，Messages input 为对象。

模型按用户指定显示 deepseek / gpt6 / claude-ops，属于演示配置名称，不声称为官方可调用型号。ID 使用各对象常见前缀及不含 demo 的不透明后缀，所有调用 / 结果 / 前后响应关联保持一致；这些是合成教学 ID，不是线上记录，格式不作为接口校验规则。

原行内注释改为字段名上的可聚焦 hover 提示，180ms 显示，离开后 400ms 关闭；进入气泡取消关闭，Escape 即时关闭，卸载清理定时器。触屏点击同样可打开。复制和代码内容不含注释，模式切换清除旧提示。验收覆盖气泡延迟及悬停保持、键盘、样例读文件参数与关联一致性、窄屏。

### 普通会话 / 工具调用独立演示

右上角增加两个场景选项，默认普通会话。场景切换清除字段定位并回到请求视图，保留 Responses 增量偏好。普通会话使用“什么是模型网关？”及“用一个生活中的例子解释”的连续对话，不包含工具定义、调用或结果；请求导航为用户输入、历史消息、指令、模型，响应导航为文本回答、结束状态、用量、响应 ID。工具调用沿用 read 场景及工具导航。

普通会话增量仅上传新的追问，previous_response_id 指向上一轮解释网关的响应；当前用户输入定位 input[0].content，历史消息定位 previous_response_id。普通会话 Chat finish_reason=stop、Messages stop_reason=end_turn、Responses status=completed 且 output 只有本轮文本。保留完整场景 JSON，所有模式中的注释及导航路径都必须存在，模型、ID 与 Token 值仍为教学值。依据沿用已读取的 Conversation state、Chat、Messages 官方来源；不引入新的协议能力。
