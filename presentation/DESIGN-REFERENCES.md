# 汇报初稿

- 主参考：用户提供的 `/Users/macalan/Downloads/Archive/大创结题/答辩演示.html`。沿用 1200×675 舞台等比缩放、next/prev/goToStep 状态推进、键盘/点击/滑动、导航代次取消过期回调的组织方式。复用其中手机 SVG 外壳，替换屏幕内容。
- 用户明确要求仅使用上述翻页逻辑。外部搜索未用于翻页设计。
- 内容：9 页前期汇报，分开呈现方案、已有原型和计划评测。80% 与 90 秒为题目目标。
- 资源：项目 `docs/screenshots/personal-desk.png` 内嵌到 HTML，无外部字体或图片请求。
- 浏览器检查：查看封面、三手机资料入口、汇聚终态及原型截图页；方向键推进与导航跳页生效。修正手机底部与说明文字重叠。
- 操作：空格/右键头/点击推进，左键头回退；O 目录，N 讲稿，F 全屏。手机页分三步，↻ 返回该页开场。支持横向滑动与窗口等比适配。

## 2026-11-05 手机界面重做

### 旧稿复查

- 三个屏幕共用通用白卡片，缺少各平台的导航、内容结构及输入方式。
- 泛化标题、装饰圆环与三栏底色反复出现，没有帮助说明前期研究内容。
- 文件从固定坐标随机旋转飞入，和屏幕中的附件没有视觉连续关系。

### 实际查看的画面

1. 微信： https://blog.csdn.net/qq_39891419/article/details/127899756 ，实际查看其聊天及文件选择器截图 https://i-blog.csdnimg.cn/blog_migrate/c4e76635841fe418dc805933c475e151.jpeg 。参考灰色聊天背景、头像位置、左右气泡、带来源分隔的文件附件、底部语音/文本/表情/添加输入栏。
2. Outlook 官方支持：https://support.microsoft.com/en-gb/office/search-email-attachments-in-outlook-mobile-eaadb9e5-fe39-42d0-a9a2-63609147ff10 ，实际查看其官方视频缩略图：蓝色导航、重点/其他分组、发件人/时间/主题/摘要层级、收件箱附件与底栏。
3. OneDrive：https://sharepointmaven.com/an-overview-of-the-mobile-apps-available-with-microsoft-365/ ，实际查看文件页截图 https://sharepointmaven.com/wp-content/uploads/2024/01/mobileappsmicrosoft365-1-634x1374.jpg 。参考文件夹/文件列表行、日期大小、排序与视图切换、中央相机和底部导航。

### 实现

- 三套独立可动画 DOM，使用场景演示资料替换截图内容。390px 逻辑屏幕等比置入用户参考中的手机 SVG；状态栏亦来自用户参考文件。
- 微信显示聊天及文件消息；Outlook 显示重点收件箱和附件；OneDrive 显示文件列表。文件按顺序进入，列表滚动，再从附件对应坐标沿二次曲线汇入 Folio 资料区。
- 移除封面装饰圆环；正文改为白底、宋体内容标题与明确的需求/实现/测试说明。用户提供的翻页状态组织方式保留。
- 手机外壳原始署名：Rafael Fernandez / Wikimedia Commons，CC BY-SA 4.0（原参考文件中的署名）。保留外壳 SVG，屏幕与动画单独重做。

### 实际检查

- 浏览器查看三手机开场、附件进入、资料汇聚终态、技术路线页；点击单步与目录跳转正常。
- 修正 Outlook 和 OneDrive 的状态栏把灵动岛染白、标签与页底重叠问题。
- 390px 窄屏：viewport、scrollWidth、stageWidth 都是 390px；恢复默认桌面尺寸。
- 动画结束后 flight 元素为 0；内嵌截图加载正常。
- 新版预览：`手机演示-新版.png`。

## 课设叙事改写

按用户调整，保留手机动画与翻页。内容改为：项目定位 → 分散资料 → 办公场景 → personal agent → 文档工作能力 → Agent 工作过程 → 工作台原型 → 技术栈 → 跨任务复用。
删除赛题对照、准确率/响应时间指标、规定样本规模与验收计划。同步重写目录和逐页讲稿。技术栈按 pyproject.toml 和 frontend/package.json 核对。
浏览器查看技术栈、跨任务复用、原型页，文字与截图布局完整；JS 语法检查通过。
