# Engineering baseline

用户批准的重建技术方案：Vite、React、TypeScript、Motion、CSS 变量，Radix 基础交互组件。Node/npm 要求及命令以 `package.json`、`.nvmrc`、锁文件和 CI 为准。

- TypeScript strict；类型检查独立于 Vite 构建。
- `npm ci` 复现依赖；`npm run verify` 作为交付入口。
- 核心采样规则与教学分支测试就近维护，重点覆盖概率、筛选边界和生成结束。
- 首页与主题共享词卡、解释气泡和设计变量；主题自行组织舞台布局。
- 动态内容遵循 [UI 设计规范](UI_STYLE_SPEC.md)，预留可预期变化的空间，保持操作与导航锚点稳定；字号复用 tokens.css 的语义变量。
- 动画由状态驱动；短过渡可中断，减少动态效果时所有操作仍可完成。
- 前端变更使用 BetterWright 验证相关交互与窄屏，截图必须查看。
- 概念解释支持 hover、focus、tap；对话框支持 Escape、焦点约束和返回。
- 教学模拟明确标注；不把预设分词、概率、向量或文本描述成真实模型内部过程。
- 不预建全局状态库、通用动画 DSL、API 适配层或大型 UI 组件库。
- 当源码文件职责显著增加时复查边界；不因行数机械拆成无意义转发模块。

AGENTS.md 中残留的 Astro/MDX、旧 DemoShell 与 sitePath 指令由用户当前明确批准的重建方案覆盖；本次未获刷新 Agent 指令的独立请求，故保留该入口原文。
