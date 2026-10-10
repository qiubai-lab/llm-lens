# Directory Map

## Root Directories

- `src/`：浏览器应用与纯计算；不含服务器实现。
- `public/`：随构建原样发布的静态资源；不放源码或密钥。
- `scripts/`：静态产物验证；不含教学计算。
- `.github/`：CI 与 Pages 发布流程。
- `docs/qb-spec/`：规格、技术上下文及归档；不参与产品运行。
- `docs/demos/`：各演示的权威来源调研、协议/数据样例与技术设计；不承载运行时代码或凭据。

## Important Files

- `index.html` / `src/main.tsx`：浏览器入口及根组合。
- `src/app/App.tsx`：网站外壳、主题挂载与浮层。
- `src/app/FocusToolbar.tsx`：专注页工具栏、显示设置与浏览器全屏。
- `src/app/route.ts`：hash 路由契约。
- `src/core/sampling.ts`：候选、参数、分布与抽样契约。
- `src/features/token/ContextSentence.tsx`：上下文展示与教学分支换行占位。
- `docs/qb-spec/context/UI_STYLE_SPEC.md`：动态布局、可读字体尺度与验证规范。
- `docs/qb-spec/context/DEMO_DEVELOPMENT_SPEC.md`：新演示先调研落文档、再设计实现的工作流入口。
- `docs/demos/_TEMPLATE.md`：主题技术调研与演示设计的起草模板。
- `src/styles/tokens.css`：颜色、字号语义尺度与共享组件基础样式。
- `src/core/lesson.ts`：Token 主题与场景元数据、教学分支。
- `vite.config.ts`：静态部署 base。

## Module Responsibilities

- `src/app/` 负责首页与专注页导航、全站浮层；不实现采样规则。
- `src/features/token/` 负责 Token 场景组合、局部状态、舞台对比与响应式操作区；不承载其他主题。
- `src/core/` 负责纯计算与预设数据；不控制视图和时间。
- `src/components/` 负责复用的 UI 和动效偏好；不拥有主题状态。
- `src/styles/` 负责设计变量、网站外壳和演示样式；不通过样式隐藏业务状态。

## Forbidden Contents By Directory

- `src/core/` 禁止 React、DOM、网络和具体存储依赖。
- `src/app/` 与 `src/components/` 不复制概率计算和主题分支规则。
- `public/` 禁止私有数据或构建时密钥。
- `dist/`、`node_modules/` 是生成内容，不作为源码事实源。
- `docs/demos/` 禁止存放真实密钥；文档中的未实施方案不得描述为已有运行能力。
