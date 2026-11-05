# 验收记录

日期：2026-11-03。

## 自动检查

- `uv run pytest -q`：11 项通过。
- `uv run ruff check src tests scripts`：通过。
- `npm --prefix frontend run build`：TypeScript 检查及 Vite 生产构建通过。
- 测试使用脚本模型驱动真实 Deep Agents graph、工具调度及 SQLite checkpoint，没有调用付费模型接口。

## 浏览器交互

在 `tests/ui_server.py` 的隔离环境中检查，模型名为 `scripted-ui-test`，数据使用临时目录。

1. 选择企业 Excel 模板并发送填写请求，收到生成文件。
2. 主 Agent 委派 `evidence-reader`，子 Agent 读取资料，执行记录显示查证者。
3. 打开产物，查看填写值和来源报告；点击引用，原文位置高亮，可返回产物。
4. 通过下载按钮取得 Excel 文件，姓名值、合并区域和原有公式保留。
5. 在同一会话继续追问，刷新后两轮对话、所选模板和产物都恢复。
6. 在记忆页新增个人偏好，列表与资料数量同步更新。
7. 通过实际文件选择器上传资料，长文件名完整换行显示。
8. 桌面 1280px、窄屏 601px 实际查看界面；另用隔离 iframe 检查 390px 移动断点。
9. 390px 资料页上传长文件名后，`documentElement.clientWidth` 与 `scrollWidth` 都是 390，没有横向溢出。
10. 下一轮对话结束后，仍可打开上一轮的处理过程，看到完整委派与四项工具操作。

截图：[正常工作台](screenshots/workspace.png)、[390px 资料页](screenshots/mobile.png)。

## 视觉修订

实际运行 Student-Agent 原版前端，对照其浅色主面板、悬浮导航、胶囊标题栏与输入区重做。生产构建通过，检查了浅色工作台、资料库、深色设置弹窗与 390px 布局；在移动端用新版输入框完成脚本模型填表任务。截图已更新为新版工作台与移动端任务结果。

左侧导航随后按 Apple 官方 visionOS 的玻璃与 tab bar 示例细化。检查浅深色、68px 收起与 188px 展开、导航切换高亮和 390px 触控布局；四个图标展开前后横坐标都是 37px。生产构建通过。细节截图见 [导航展开状态](screenshots/navigation-expanded.png)。

整套界面现已统一为 visionOS 风格的分层玻璃：主窗口、会话栏、输入 ornament、资料页、筛选控件和弹窗共享材质系统。移除了跟随指针的光效及其事件处理、坐标变量和覆盖层。生产构建通过，检查了资料页、预览弹窗、深色记忆页和 390px 移动界面；移动端再次完成脚本模型填表任务，产物和下载入口正常显示。

正常工作台使用 8000 端口，验收用脚本模型服务使用 8001 端口。正常服务的资料与模型设置不受验收环境影响。

## Design token 与外观恢复

恢复上一版静态玻璃、高光和输入内凹效果后，抽取并整理 260 个 token。命名整理前后，浅色和深色各 1,389 条 CSS 声明展开后的值一致。`check:design`、TypeScript 和 Vite 构建通过。检查了浅色工作台、资料页、深色设置弹窗，以及 390px iframe；移动页面 clientWidth 和 scrollWidth 都为 390。

迁移后截图：[工作台](screenshots/token-workspace.png)、[移动端](screenshots/token-mobile.png)。

## 个人助理流程

- 首页直接选用真实模板，草稿带入表格名称，原表可单独预览。
- 保存填写偏好后首页回显；记忆生成的引用文档不在上传资料列表重复显示。
- 隔离脚本模型完成两轮填写：首轮姓名写入、联系电话缺失；在补充表单保存电话后，第二轮保留姓名并填写电话。
- 第二轮报告为 2 项内容、2 份来源、无缺项；预览中的 B1 为李明、B3 为虚构测试电话，B2 原公式保留，补充资料引用可见。
- 390px 首页的 clientWidth 与 scrollWidth 都为 390，表格选择、资料和个人信息入口可见。
- design check、TypeScript、Vite 构建和 UI 验收脚本的 Ruff 检查通过。

截图：[首页](screenshots/personal-desk.png)、[续填来源](screenshots/personal-result.png)、[移动端](screenshots/personal-mobile.png)。

## 边缘高光修正

对照 Apple 官方窗口与展开 tab bar 图片，修正重复亮边和输入区亮白外圈。检查了浅深色工作台、展开导航及 390px 页面；窄屏 clientWidth 与 scrollWidth 都为 390。264 个 token 的 design check、TypeScript 和 Vite 构建通过。

## 实拍办公背景与空间细节

- 检查了窗边会议室、玻璃办公区两张实拍照片，以及浅深色玻璃窗口、展开导航、模板预览和设置。
- 场景切换后刷新，选择仍保留。外观与空间设置、模型连接分别显示；模型按钮直接进入连接设置。
- 390px 页面的 clientWidth 与 scrollWidth 都为 390，实测设置打开、场景切换、完成关闭正常。
- 271 个 token 的 design check、TypeScript 和 Vite 构建通过。

截图：[深色会议室](screenshots/office-dark.png)、[浅色办公区](screenshots/office-light.png)、[390px](screenshots/office-mobile.png)。

## 二级 Sheet 修订

- 六类界面共用 portal、模态焦点管理、背景 inert 和关闭行为；保存时禁用重复操作。
- 检查设置的浅深色、个人记忆编辑与保存、工作资料、文档预览和补充表单。
- 桌面从资料面板打开原表，Esc 返回资料面板；关闭面板焦点返回“打开资料面板”。选用表格后所有弹层关闭，输入框获得焦点，背景恢复操作。
- 脚本模型两轮填写完成；结果可切换依据与网格，引用跳转后能返回结果。取消补充返回原结果，再保存补充并发送成功。
- 390px 会话抽屉和工作资料面板打开、关闭正常；结果面板按内容收高，下载与补充按钮分开排布。
- 在隔离环境加入 110 段虚构长正文：预览正文高度 649px、滚动内容 4,639px；切到第二页显示 51–100 / 110。分页和下载仍在底部，页面宽度与滚动宽度都是 390px。
- Design check（288 个 token）、TypeScript 与 Vite 生产构建通过。

截图：[预览](screenshots/sheet-preview.png)、[设置](screenshots/sheet-settings.png)、[资料面板](screenshots/sheet-inspector.png)、[窄屏长文](screenshots/sheet-mobile.png)。
