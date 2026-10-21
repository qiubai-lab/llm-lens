<div align="center">

# LLM Lens

**从一个词，看懂语言模型。**

用可操作的动画，探索 Token、文本生成与 Agent 数据流。<br />
面向普通用户与开发者的中文交互科普网站。

[![Verify and deploy GitHub Pages](https://github.com/qiubai-lab/llm-lens/actions/workflows/deploy.yml/badge.svg)](https://github.com/qiubai-lab/llm-lens/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-在线体验-2563eb?logo=github)](https://qiubai-lab.github.io/llm-lens/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[在线体验](https://qiubai-lab.github.io/llm-lens/) · [Token 演示](https://qiubai-lab.github.io/llm-lens/#/token/1) · [Agent 演示](https://qiubai-lab.github.io/llm-lens/#/agent) · [模型网关](https://qiubai-lab.github.io/llm-lens/#/gateway)

</div>

---

## 这是什么？

LLM Lens 把语言模型中的抽象概念拆成可以观察、调整和回放的交互过程。你可以拖动参数，看看下一词的概率如何变化；也可以跟随一次 Agent 会话，观察请求、工具调用、文件和流式回答之间的数据传递。

无需配置模型 API 或密钥，打开网页即可体验。

| 你想了解的问题 | 可以尝试的演示 |
| --- | --- |
| 文字如何变成 Token，模型如何选择下一个词？ | 跟随 Token 六幕演示，逐步观察生成过程 |
| Temperature、Top-k、Top-p 会改变什么？ | 调整参数，比较候选概率与抽样结果 |
| 一段回答如何逐词生成？ | 追加选词、连续播放，观察上下文不断增长 |
| Agent 如何调用工具并使用结果？ | 发送预设任务，追踪工具调用与结果回传 |
| 中断或出错后发生了什么？ | 查看失败场景、历史行为卡与原始数据 |

## 在线体验

**网站地址：[https://qiubai-lab.github.io/llm-lens/](https://qiubai-lab.github.io/llm-lens/)**

### 01 · Token 与文本生成

[进入 Token 演示 →](https://qiubai-lab.github.io/llm-lens/#/token/1)

六幕串起从输入文字到循环生成的完整教学过程：

| 幕 | 主题 | 观察重点 |
| :---: | --- | --- |
| 01 | 文字与 Token | 理解文本切分与模型处理单位 |
| 02 | 下一词预测 | 观察上下文与候选词概率 |
| 03 | Temperature | 比较分布变尖或变平的效果 |
| 04 | Top-k / Top-p | 观察候选集合如何被筛选 |
| 05 | 抽样 | 理解概率与一次实际选择的关系 |
| 06 | 循环生成 | 把选词接回上下文，继续生成 |

支持重新抽样、追加选词、连续播放、暂停和重置；参数对比固定上下文与随机数，帮助观察参数本身带来的变化。

### 02 · Agent 会话与工具调用

[进入 Agent 演示 →](https://qiubai-lab.github.io/llm-lens/#/agent)

在同一工作台中，观察中央对话、左侧文件、底部工具列表与右侧服务端行为卡如何协作。

- **跟随一次任务**：发送 → 加载 Skill → 读取文件 → 回传结果 → 流式回答。
- **观察工具操作**：“整理并保存”预设还演示列出目录与写入摘要。
- **追踪数据流**：工具确认执行后，连线展示对应的文件或目录操作。
- **回看执行历史**：选择历史行为卡，查看当次调用、静态连接和文件快照；回看不会再次执行。
- **展开底层细节**：通过详情弹窗查看内容与原始数据，体验停止、重新发送、文件失败和流中断。

### 03 · 模型网关

[进入模型网关演示 →](https://qiubai-lab.github.io/llm-lens/#/gateway)

沿着一次请求，观察应用、网关与上游服务之间的数据流：访问检查 → 渠道选择 → 额度预留 → 协议适配 → 增量返回 → 用量结算。

- 11 个预设场景，覆盖正常请求、协议转换、故障切换、访问拒绝、限流、无渠道、额度不足、重试用尽、固定渠道与流中断。
- 对照模型别名与上游模型，理解网关令牌和上游凭据的区别。
- 切换教学抽样值，观察同层权重与备用优先级；账单分别展示预扣、消耗和返还。
- 支持自动讲解、单步、暂停、历史快照与原始数据详情；所有请求、用量和价格均为教学模拟。

源码依据与准确性边界见 [网关技术设计](docs/demos/model-gateway/TECHNICAL_DESIGN.md)。

### 为探索而设计

石墨灰主题与专注演示舞台，让注意力留在内容上。桌面端提供侧边参数区，手机端使用参数标签切换；概念解释支持悬停、聚焦与点击。

演示支持键盘操作、浏览器全屏和减少动态效果。打开目录或显示设置时暂停播放，关闭后由用户主动继续；切换全屏、对比或布局不会重置上下文。

## 教学边界

> [!NOTE]
> 这是教学模拟，不请求真实模型 API，不读取用户真实文件，也不展示真实模型内部思考过程。

| 内容 | 实现方式 |
| --- | --- |
| 文本切分、候选词与基础分数 | 预设教学数据，按词简化展示 |
| 温度、候选筛选与抽样 | 在浏览器中真实计算 |
| Agent 文件、工具结果、请求与 SSE 事件 | 预设教学回放与模拟状态 |
| 历史查看 | 重建当时快照，不重新执行工具 |

<details>
<summary><strong>展开采样约定与适用范围</strong></summary>

教学顺序为：分数除以温度 → softmax → Top-k → 在剩余候选重新归一化后按 Top-p 累计筛选 → 最终归一化 → 抽样。

- 保留跨过 Top-p 阈值的候选，始终至少保留一个候选。
- Top-k 为 0 表示不限制；界面温度范围为 0.2–2，核心另支持零温最优选择。
- 概率只覆盖教学候选集，不代表真实模型词表。
- 使用可复现随机数支持重播；“再抽一次”推进随机序列。
- 此顺序是教学约定，不代表所有模型 API 的实现。

</details>

## 本地开发

使用 **Node.js 24**（见 [`.nvmrc`](.nvmrc)）与 npm。

```bash
git clone https://github.com/qiubai-lab/llm-lens.git
cd llm-lens
npm ci
npm run dev
```

打开终端输出的 `/llm-lens/` 地址。应用使用 hash 路由，支持直接分享、刷新及浏览器前后导航：

| 页面 | 路由 |
| --- | --- |
| 首页 | `#/` |
| Token 六幕 | `#/token/1` 至 `#/token/6` |
| Agent 工作台 | `#/agent` |
| 模型网关工作台 | `#/gateway` |

旧的 `#/agent/1` 至 `#/agent/6` 地址兼容进入完整 Agent 演示。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run check` | TypeScript 类型检查 |
| `npm run test` | 执行 Vitest 测试 |
| `npm run build` | 构建静态网站到 `dist/` |
| `npm run check:links` | 检查构建产物中的本地链接与资源路径 |
| `npm run verify` | 依次完成类型检查、测试、构建和链接检查 |
| `npm run preview` | 预览已构建的静态网站 |

提交前运行 `npm run verify`；预览前先完成构建。前端交互与窄屏验收使用 BetterWright，相关记录见 [`docs/qb-spec/archive/`](docs/qb-spec/archive/)。

## 技术与结构

| 层次 | 技术 |
| --- | --- |
| 应用与构建 | React · TypeScript · Vite |
| 动画与交互 | Motion · Radix UI |
| 视觉系统 | CSS 变量 · Lucide 图标 |
| 验证与发布 | Vitest · GitHub Actions · GitHub Pages |

```text
llm-lens/
├── src/
│   ├── app/                 # 首页、专注演示外壳、路由与全站浮层
│   ├── features/
│   │   ├── token/           # Token 六幕与参数交互
│   │   ├── model-gateway/   # 网关工作台、渠道与账单
│   │   └── agent-conversation/ # Agent 工作台与数据流视图
│   ├── core/                # 纯计算、教学数据与模拟状态
│   ├── components/          # 共享组件与动态效果偏好
│   └── styles/              # 设计变量与页面样式
├── public/                  # 静态资源
├── docs/                    # 主题技术设计、工程规范与验收记录
├── scripts/                 # 静态产物检查
└── .github/workflows/       # CI 验证与 Pages 部署
```

核心规则位于 `src/core/`，不依赖 React、DOM、网络或具体存储。页面负责组合内容，主题模块维护自己的场景与交互，共享外壳和视觉组件。详细职责见 [目录索引](docs/qb-spec/DIRECTORY_MAP.md)。

颜色、语义色、字号与基础圆角集中在 [`src/styles/tokens.css`](src/styles/tokens.css)；上下文、候选与结果分别使用蓝色、紫色和绿色表达。

## 自动部署

项目通过 [GitHub Actions 工作流](.github/workflows/deploy.yml) 发布到 [GitHub Pages](https://qiubai-lab.github.io/llm-lens/)，仓库 Pages 来源已配置为 **GitHub Actions**。

| 触发方式 | 执行内容 |
| --- | --- |
| 向 `main` 提交 PR | 安装依赖并执行完整验证，不部署 |
| 推送或合并到 `main` | 验证成功后上传 `dist/` 并部署 |
| 手动运行工作流 | 验证、构建并部署 |

可在 [Actions 页面](https://github.com/qiubai-lab/llm-lens/actions/workflows/deploy.yml) 查看构建和部署记录。网站是纯静态应用，无需线上 Node 服务；hash 路由无需服务器 rewrite。

<details>
<summary><strong>部署到其他仓库或根路径</strong></summary>

Fork 或迁移后，在目标仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**。

工作流根据仓库名自动设置 `BASE_PATH`：普通仓库使用 `/仓库名`，以 `.github.io` 结尾的仓库使用 `/`。本地默认路径为 `/llm-lens/`。

```bash
# 验证根路径构建
BASE_PATH=/ npm run verify

# 验证其他仓库子路径构建
BASE_PATH=/你的仓库名 npm run verify
```

迁移仓库后，同步更新本文的在线地址与状态徽章。后续如接入真实 API，需另行设计权限、CORS、取消与错误处理；不要将密钥放入公开构建变量或静态文件。

</details>

## 扩展与项目文档

新增演示先遵循 [新演示开发流程](docs/qb-spec/context/DEMO_DEVELOPMENT_SPEC.md)：核对权威技术来源，在 `docs/demos/<topic>/TECHNICAL_DESIGN.md` 记录事实、样例、教学简化与边界，再补充动画设计和验收标准，通过编码前检查后实现。

| 文档 | 内容 |
| --- | --- |
| [技术文档模板](docs/demos/_TEMPLATE.md) | 新主题调研与设计的起点 |
| [Agent 技术设计](docs/demos/agent-conversation/TECHNICAL_DESIGN.md) | 当前 Agent 演示的技术依据与教学边界 |
| [模型 API 技术调研与演示设计](docs/demos/model-api/TECHNICAL_DESIGN.md) | Responses、Chat Completions、Anthropic Messages；已完成设计，尚未实现演示 |
| [工程约定](docs/qb-spec/context/ENGINEERING_STYLE_SPEC.md) | 模块边界、编码与验证要求 |
| [UI 设计规范](docs/qb-spec/context/UI_STYLE_SPEC.md) | 动态布局、可读性与验收要求 |

扩展主题时复用现有外壳与组件，并补充路由解析及对应测试。技术文档应明确区分协议事实、教学简化、预设数据和未决问题。

<details>
<summary>版本沿革</summary>

当前版本使用 Vite + React，替换了早期 Astro/MDX 课程站。旧版课程列表、测验、术语页与学习进度已移除，旧多页地址不保留；此前规格保留在文档归档中，供追溯参考。

</details>

### 三种模型协议对照

打开 `#/protocols`，分别对照 **Chat Completions / Responses / Anthropic Messages** 的完整请求与响应 JSON。点击用户输入、工具声明、工具调用、工具结果、用量等子项，三列自动定位并高亮对应字段；完整内容保留在可滚动窗口中，支持复制。

模型、ID、天气和用量均为教学样例，不发起真实 API 请求。技术事实与教学边界见 [协议演示设计](docs/demos/protocols/TECHNICAL_DESIGN.md)。
