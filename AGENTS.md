<!-- qb-spec:project-guidance:start -->
# LLM Lens 项目指令

面向普通用户和开发者的中文交互科普站。Astro 静态页面、React 实验、MDX 课程，最终部署到 GitHub Pages。

## 入口与命令

- 安装：`npm ci`；Node 版本见 `.nvmrc`。
- 开发：`npm run dev`，默认路径 `/llm-lens/`。
- 验证：`npm run verify`；分项为 `check`、`test`、`build`、`check:links`。
- 预览：`npm run preview`，使用真实静态构建。
- 模块入口与归属见 `docs/qb-spec/DIRECTORY_MAP.md`。

## 边界与维护

- 页面组合内容；核心规则在 `src/core/`，不依赖 React/DOM/网络或具体存储。
- 复用 `DemoShell`、课程布局和 `styles/` 令牌；不为每章复制一套 UI。
- 核心行为测试就近维护，前端修改用 BetterWright 验证实际交互和窄屏，截图必须查看后再作结论。
- 遵守现有用户提供的 BetterWright 浏览器操作规则。
- 路径使用 `sitePath`，验证仓库子路径。不要将密钥加入公开环境变量或静态文件。
- 模拟、回放与实时执行分别标明；回看历史不能触发再次执行。
- 生成目录 `dist/`、`.astro/` 和 `node_modules/` 不提交。部署配置与启动方法见 README。
<!-- qb-spec:project-guidance:end -->

<!-- qb-spec:context-routing:start -->
## qb-spec 长期上下文

按任务需要读取已存在的文件，不默认全量加载：

- `docs/qb-spec/context/ARCHITECTURE_SPEC.md`：模块职责与依赖边界。
- `docs/qb-spec/context/ENGINEERING_STYLE_SPEC.md`：工程约定和验证入口。
- `docs/qb-spec/DIRECTORY_MAP.md`：结构索引。

文件不存在时跳过。只有用户明确要求或批准时，才更新长期上下文和新推断出的风格偏好。
<!-- qb-spec:context-routing:end -->

## 新演示开发约束

新增演示或扩展核心知识解释时，必须先读取并遵守 [新演示开发流程](docs/qb-spec/context/DEMO_DEVELOPMENT_SPEC.md)：先核对权威技术来源，在 `docs/demos/<topic>/TECHNICAL_DESIGN.md` 落地事实、样例、教学简化和边界，再补充动画设计与验收标准；通过编码前检查后才实现演示。已有实现授权不需重复批准，仅调研请求不进入编码。相关变更必须引用主题技术文档；实现改变事实或范围时先更新文档。
