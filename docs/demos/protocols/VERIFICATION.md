# 请求 / 响应 JSON 对照验收（2026-10-21）

交付依据 [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) 的“最新调整：请求 / 响应完整对象与字段定位”；旧四段演示已替换。

- `npm run verify` 通过：10 个测试文件、63 项测试、TypeScript、生产构建和 `/llm-lens/` 子路径资源检查。
- 新增测试覆盖六份完整 JSON 的序列化往返、全部定位路径、重复字段与转义路径、历史工具结果关联，以及响应中新工具调用与历史调用的区分。
- BetterWright 使用生产预览 `/llm-lens/#/protocols`。遍历请求 / 响应共 11 个字段入口及两处“全部 JSON”：三列定位内容均可见，全文均可 JSON.parse，切换字段不改变完整 JSON。
- 正常动画模式下，点击“工具结果”使三个代码窗口滚动到对应字段；减少动态效果模式下直接定位。再次点击同一入口及键盘 Enter 可重新定位；页面 scrollY 保持 0。切换请求 / 响应后三列滚动位置恢复 0。
- 复制按钮调用成功并显示“已复制”。浏览器禁止剪贴板读取，因此未回读系统剪贴板；不将回读列为已验证。
- 320px 宽度、100% 与 200% 字体下遍历全部入口，document.scrollWidth 均为 320，无页面横向溢出。
- 已查看桌面截图 `proof-1792560552594-2cde45.png` 和手机 200% 字体截图 `proof-1792560680018-8011af.png`（本机 BetterWright artifacts）。窄屏三列改为纵向排列，长字段换行，代码窗口独立滚动。
- `git diff --check` 通过。无真实模型请求，无生产部署。

## 标题与导航精简验收

- 再次执行 npm run verify，通过 63 项测试及类型、构建、链接检查。
- BetterWright 验证标题卡片切换请求 / 响应，工具声明及用量定位正确；底部 details 数量为 0。
- 标签打开 Radix Dialog，Escape 关闭后焦点回到标签按钮。
- 查看桌面页面、桌面弹窗与 320px 弹窗截图：proof-1792561039215-018d80.png、proof-1792561039689-e0dc4d.png、proof-1792561046809-801909.png。手机页面宽度 320，弹窗 scrollWidth/clientWidth 均为 286，无横向溢出。

## Responses 增量续接验收

- npm run verify 通过，11 个测试文件、66 项测试；开关移入 Responses 卡片标题后重新通过类型检查及构建。
- 测试覆盖仅上传新增工具结果、历史调用 ID 匹配、重新提供 instructions/tools、保存可续接响应、响应只含本轮 output、全部导航与注释路径存在。
- BetterWright 验证开关仅影响 Responses；用户输入定位 previous_response_id，切换响应后开关状态保留且响应返回 resp_hangzhou_demo、关联 resp_shanghai_demo。
- 代码文本剔除独立注释后可 JSON.parse；复制组件直接序列化原对象，不包含教学注释。
- 320px 无页面横向溢出；空格键可切换。已查看桌面与窄屏截图 proof-1792561551846-b8db19.png、proof-1792561558120-abbc2a.png。

## read 样例与 hover 气泡验收

- npm run verify 通过：11 文件、67 测试；调整气泡关闭逻辑后再次通过类型检查及构建。
- 三种请求及响应的模型为 deepseek / gpt6 / claude-ops；read 工具参数统一 file_path、offset、limit，历史 README 读取及新增 package.json 读取调用保持独立，所有工具结果仍正确关联。
- BetterWright 确认行内注释数量为 0，JSON 可解析；悬停字段显示气泡，移开时气泡仍在，之后自动关闭；移动到气泡保持显示，Escape 关闭。键盘聚焦可显示说明。
- 320px 页面无横向溢出。已查看桌面气泡截图 proof-1792561879102-b66ae3.png 和窄屏键盘气泡截图 proof-1792561921408-cad1d9.png。
- ID 为符合常见对象格式的合成教学值，不使用线上记录；样例说明已明确模型名为演示配置名、read 为自定义工具。

## 普通会话 / 工具调用切换验收

- npm run verify 通过，12 个文件、70 项测试。新增测试覆盖普通会话无工具调用、三种协议文本及结束状态一致、增量仅上传追问、所有字段与注释路径存在。
- BetterWright 遍历两场景 × 两方向 × 增量开关共 8 种组合及全部导航入口；三列 JSON 均可解析，普通会话不含工具调用或 read 参数。
- 场景切换回请求并清除定位，保留增量偏好。320px 页面宽度保持 320，键盘 Enter 可切换场景。
- 已查看桌面截图 proof-1792562205860-1e329c.png 与手机截图 proof-1792562213459-be7339.png：桌面右上角切换可见，窄屏换行显示。
