---
schema: 1
id: QB-20261012-agent-graphite
type: design
tier: standard
status: archived
created: 2026-10-12
updated: 2026-10-12
supersedes: []
---

# Agent 石墨灰主题与区域层次

用户明确授权重新设计当前 Agent 页面，降低白色眩光并区分工作区层级。采用局部石墨灰主题，沿用既有字号、几何、圆角和蓝/紫/绿数据流含义。接口、模拟语义和状态逻辑不变。

- REQ-001：Agent 外壳、工作台与浮层统一为低亮度石墨灰；页面底、面板、卡片/编辑器、输入框和终端有明确表面层级。中央聊天比两侧突出。
- REQ-002：正文/辅助文字、选中/悬停/键盘焦点、调用/结果/错误和连线标签可读，颜色辅助含义而非唯一指示。
- REQ-003：保持发送、工具执行、卡片选择和详情交互；局部主题在离开 Agent 时解除；Token 与首页保持原风格；桌面、320px/200% 字体和弹窗保持稳定。

- AC-001 → REQ-001：查看初始、调用、完成及 dialog 截图，无大面积纯白表面，各区及终端容易分辨。
- AC-002 → REQ-002：正文和常用辅助文字相对实际背景对比 ≥4.5:1；静态连接/标签、选中卡和 focus-visible 可辨；高对比模式保留清晰层次。
- AC-003 → REQ-003：npm run verify；BetterWright 跑完整发送/两次执行/选择/详情/Escape，检查稳定窗口和320px/200%无横溢出，导航至 Token/首页时无主题残留。

## Behavior Delta

### MODIFIED

- REQ-001、REQ-002：低对比白色表面改为有语义色彩的石墨灰分层。
- REQ-003：Agent 路由挂载局部颜色变量，支持 body 中 portal 浮层，离开时清除。

## 计划

- [x] 更新主题视觉设计，定义局部颜色变量与外壳作用域。
- [x] 重绘背景、三栏、消息/卡片/编辑器/终端与浮层，保留几何和交互。
- [x] 验证全流程、对比度、稳定性、窄屏、主题隔离；记录并归档。

轻量质量检查：范围明确、可逆，用户本次请求覆盖实现；使用现有 React/CSS 边界，不引入主题切换功能或长期偏好。无需新增核心测试。


## 验证证据

- AC-001：BetterWright 在 `/llm-lens/` 真实静态构建查看初始、待执行、完整两次工具/三轮请求/历史三连线、详情 dialog。页面 #151920，中央 #242b36、本地 #1c222c、服务 #20212d、终端 #10161d，卡片/编辑器/输入/结果有独立层次。目录与显示设置 portal 同步深色，当前目录项无白色底。
- AC-002：按相对亮度公式检查正文、辅助、弱文本、蓝/紫/绿/错误语义色在12种实际实色表面下的组合，最低 4.6118:1（#9aa7ba / #2c3b56）；发送图标与底色 4.8375:1。浏览器确认实际 computed colors 一致；键盘 Tab 后详情按钮 outline 为 2px #91b3fb；prefers-contrast:more 下正文为 #e0e6ef，边框更明显。待读取虚线、箭头、标签、选中边框及结果文字保留语义。
- AC-003：npm run verify 全通过，5个测试文件/21项；最后纯颜色修正后重新 build 与 check:links 通过。发送→两次执行→完成→选择历史→dialog→Escape/焦点返回仍有效。三窗口发送前后 x/y/width/height 完全一致，高624px；320px/200%字体 clientWidth=scrollWidth=320，dialog x16/y24/width288/height802，内部滚动。离开 Agent 后 data-demo-theme 清除，Token 背景为 rgb(252,253,255)、color-scheme=normal，首页无主题残留。

截图均通过 view_image 实际查看，存放 BetterWright 本地 artifacts：
- 初始：`proof-1791787113358-bcca10.png`。
- 待读取、完成、dialog：`proof-1791787159411-bd4b6c.png`、`proof-1791787175832-5efe80.png`、`proof-1791787176138-f5cdb0.png`。
- 最终构建目录与完整历史关联：`proof-1791787245583-24c778.png`、`proof-1791787267079-4d3dc2.png`（发送按钮修正为深蓝，弱文字提高对比）。
- 最终320px/200%工作区与dialog：`proof-1791787312148-d35cef.png`、`proof-1791787312290-dca224.png`。

主题技术设计和 README 同步；模块职责未改变，无需改 Directory Map；长期 context 与偏好未更新。
