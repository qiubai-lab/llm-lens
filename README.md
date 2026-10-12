# LLM Lens

从一个词，看懂语言模型。面向普通用户与开发者的中文交互科普网站，用可操作的动画讲解 Token、自回归生成和 Agent 数据流。

## 当前 MVP

- 首页：项目介绍、可操作的下一词生成预览。
- Token 六幕演示：文字与 Token → 下一词预测 → Temperature → Top-k / Top-p → 抽样 → 循环生成。
- Agent 六幕演示：发送请求 → 流式回答 → 工具调用 → 文件与结果 → Skill 加载 → 完整循环。中央仿真对话、左侧文件管理/编辑器/工具终端、右侧服务端行为卡；通过发送与场景内执行读取启动交互，逐步连线解释数据流，支持停止、重新发送、文件失败与流中断。
- 参数实时作用于候选概率；按词简化展示；预设上下文与完整教学分支。
- 重新抽样保持上下文；追加把选词接回上下文；连续播放、暂停、重置与同随机数参数对比。
- 首页保留浮动目录与项目说明；演示使用独立专注外壳：轻工具栏、舞台和固定底部进程导航。
- 桌面参数在舞台侧边；手机以参数标签切换滑杆并显示各参数值。参数对比替换舞台内容，不向页面下方堆叠。
- 目录和显示设置打开时暂停播放，关闭后由用户主动继续；全屏、对比与响应式布局切换不重置上下文。
- hover / focus / tap 概念解释；键盘、移动端和减少动态效果支持。

这是**教学模拟**。切分、候选及基础分数为预设；温度、筛选与抽样在浏览器真实计算。Agent 文件、工具结果、请求与 SSE 事件同样为预设回放，不读取用户真实文件。不请求模型 API，不展示真实模型内部思考过程。

## 本地运行

Node 24（见 `.nvmrc`），npm，单一锁文件。

```bash
npm ci
npm run dev
```

访问终端输出的 `/llm-lens/` 地址。首页 `#/`，场景地址 `#/token/1` 至 `#/token/6`、`#/agent/1` 至 `#/agent/6`，支持直接分享、刷新和浏览器前后导航。

```bash
npm run verify
npm run preview
```

`verify` 执行 TypeScript 检查、核心测试、Vite 构建和静态资产路径检查。浏览器行为验收记录在 `docs/qb-spec/archive/` 对应 change 中。构建目录为 `dist/`，不需要线上 Node 服务。

## 技术与职责

Vite + React + TypeScript + Motion；CSS 变量定义视觉；Radix Dialog / Popover / Tooltip / Slider 提供基础交互；Lucide 提供图标。

- `src/app/`：首页与专注演示外壳（`FocusToolbar`）、hash 路由、目录与说明弹窗。
- `src/features/token/`：六幕演示、紧凑参数、舞台内对比、概率图、生成操作与播放状态。
- `src/features/agent-conversation/`：Agent 会话、文件/工具终端、服务端行为卡、发送与读取交互、SVG 连线视图。
- `src/core/`：纯采样计算与预设教学内容，不依赖 React / DOM / 网络。
- `src/components/`：词卡、解释气泡、动态效果偏好。
- `src/styles/`：`tokens.css` 视觉变量和基础组件，`shell.css` 首页与外壳，`deck.css` 演示舞台。

新增主题时沿用外壳和视觉组件，在主题模块维护自己的场景和数据。不要将新主题写入 Token 采样计算中。当前路由明确支持首页、Token 与 Agent 主题；新增主题时扩展路由解析及其测试。

## 新演示开发

遵循 [新演示开发流程](docs/qb-spec/context/DEMO_DEVELOPMENT_SPEC.md)：先调研权威技术资料并落地到 `docs/demos/<topic>/TECHNICAL_DESIGN.md`，再设计逐幕动画、交互与验收，通过编码前检查后实现。文档必须区分协议事实、教学简化、预设数据和未决问题；已有实现授权无需重复确认。

起草使用 [技术文档模板](docs/demos/_TEMPLATE.md)。Agent 已按 [技术设计](docs/demos/agent-conversation/TECHNICAL_DESIGN.md) 实现。另一个主题已完成 [模型 API 调用技术调研与演示设计](docs/demos/model-api/TECHNICAL_DESIGN.md)，涵盖 Responses、Chat Completions、Anthropic Messages 的请求、响应、流式事件及上下文；目前尚未实现演示代码。

## 采样约定

教学顺序：分数除以温度 → softmax → Top-k → 在剩余候选重新归一化后按 Top-p 累计筛选 → 最终归一化 → 抽样。包含跨过 Top-p 阈值的候选，始终至少保留一个候选。Top-k 为 0 表示不限制。界面温度范围 0.2–2；核心另支持零温最优选择。

本顺序是教学约定，不代表所有模型 API 都采用相同实现。概率只覆盖完整的教学候选集，不代表真实模型词表。可复现随机数用于重播；“再抽一次”推进随机序列。比较面板固定上下文与随机数，只比较参数变化。

## GitHub Pages

仓库自带 `.github/workflows/deploy.yml`：PR 运行验证；合并到 `main` 或手动运行后，构建并部署。需要在 GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

工作流根据仓库名称设置 `BASE_PATH`。默认本地和构建路径为 `/llm-lens/`。根路径部署可执行：

```bash
BASE_PATH=/ npm run verify
```

其他仓库名使用 `BASE_PATH=/你的仓库名`。路由在 URL hash 中，不需要服务器 rewrite。后续真实 API 接入需要单独设计浏览器权限、CORS、取消和错误处理；不要把密钥放入公开构建变量。

## 设计调整

全站颜色、语义色及基础圆角在 `tokens.css`。上下文蓝色、候选紫色、结果绿色；内容与动画共用这套语义。首版只提供浅色主题。首页顶部闪电按钮或演示工具栏的“显示设置”可减少动态效果，也自动遵循系统偏好。演示页提供可选浏览器全屏，默认保持普通窗口。

与旧版的关系：本版替换 Astro/MDX 课程站，移除了课程列表、测验、术语页、学习进度等旧演示；旧多页地址不保留。当前 Agent 主题重新以数据流教学仿真实现。此前规格仍保留在归档中，便于追溯。
