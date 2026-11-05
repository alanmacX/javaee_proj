# 界面参考与实现决策

## 当前视觉方向：visionOS

主要依据 [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials)、[Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) 和 [Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments)。实际查看了官方 Music 应用的玻璃窗口画面，以及导航收起、展开与应用场景截图。

### 材质层级

- 静止的低对比中性环境底色，主窗口以规则玻璃承接环境颜色。
- 主窗口共享一层模糊与静态边缘高光；会话栏和工作资料区用略深的材质区分区域。
- 普通内容、文件行和记忆条目采用安静的薄表面，避免给每一块内容再套玻璃与模糊。
- 输入框与搜索框采用较深的内凹表面；发送、工具和主操作采用浅色薄材质。
- 输入区作为独立 ornament，和导航一样浮在内容上；弹窗使用更厚、更易阅读的玻璃层。
- 浅深色共享同一组尺寸和材质关系，文字与符号随外观调整对比度。

### 导航与反馈

桌面导航 68px 收起、188px 展开，图标轴线保持固定；选中玻璃层平滑移动。鼠标悬停和键盘焦点可展开，普通鼠标点击不会使导航永久遮住内容。

按用户要求移除了指针位置处理、光效坐标变量和局部柔光覆盖层。只保留静态玻璃边缘、正常悬停反馈和导航切换动画。

## 结构参考

[Student-Agent](https://github.com/alanmacX/Student-Agent/tree/main/server-src/frontend) 的原前端已在临时目录运行并查看。保留其会话工作台、侧边导航与移动端浮动输入区的组织方式；当前整体材质以 visionOS 为准。

[Linear Inbox](https://linear.app/docs/inbox) 的产品截图用于文件列表的字段对齐与密度。

## 验证与截图

实际检查了浅色工作台、资料库、预览弹窗、深色记忆页和 390px 移动界面。移动端页面宽度与滚动宽度都为 390；使用新界面提交并完成一次脚本模型驱动的填表任务。

[桌面工作台](docs/screenshots/workspace.png) · [移动端](docs/screenshots/mobile.png)

## Design token 迁移

按上一版玻璃外观抽取 token，保留静态高光、边缘和内凹效果。分层及组件映射见 [设计 token 文档](docs/design-system.md)。这次检查了恢复后的浅色工作台、资料页、深色设置和 390px 布局。

## 个人助理首页

沿用 Apple 材质与 Student-Agent 工作台组织，将欢迎区换成实际表格列表、个人资料与已保存的信息。用对齐、文字和分隔线组织首页；玻璃用于主窗口、导航和输入区。截图：[个人首页](docs/screenshots/personal-desk.png)、[390px](docs/screenshots/personal-mobile.png)。

## 边缘材质修正

重新逐图对照 Apple 官方 Music 窗口与 expanded tab bar：官方导航以细的方向性边缘勾勒轮廓，选中项是均匀的半透明表面。删除导航同时叠加的白色 border 与多层 inset 高光，保留单层 0.5px 渐变边缘；主窗口与输入区去掉重复亮线。输入区独立使用较低亮度的材质，保留内凹阴影。所有数值仍由 token 管理。

实际检查：[浅色](docs/screenshots/material-light.png)、[深色](docs/screenshots/material-dark.png)、[390px](docs/screenshots/material-mobile.png)。

## 实拍办公环境与空间细节

再次对照 Apple 官方 Music 窗口与展开 tab bar 图片，调整窗口与环境的关系：背景是清晰的真实办公照片，窗口内部采样其低频颜色；导航贴近窗口左侧，独立采用更薄材质，窗口边缘使用单层方向性细线。输入框保留内凹感，弹窗提高底色浓度。环境固定，无指针跟随光照或视差。

实拍照片的原始画面都已查看，来源与实现见 [办公环境资源](docs/office-environments.md)。设置提供办公空间缩略图与持久化选择，并按“外观与空间 / 模型连接”分组。

## 二级弹层修订

沿用 Apple Materials 的材质关系，并整理上下文与控制区层级，统一六类二级界面。资料面板独立浮动，打开时不挤压工作台；表单和预览将标题、正文与底部操作分开。Excel、Word 的解析内容以表格和段落阅读，生成结果将内容与依据分开。

截图：[表格预览](docs/screenshots/sheet-preview.png)、[设置表单](docs/screenshots/sheet-settings.png)、[工作资料](docs/screenshots/sheet-inspector.png)、[窄屏长内容](docs/screenshots/sheet-mobile.png)。


## 文案与二级控件统一（2026-11-04）

参考 [Apple Materials · visionOS](https://developer.apple.com/design/human-interface-guidelines/materials#visionOS) 和 [Menus](https://developer.apple.com/design/human-interface-guidelines/menus)、[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)。实际查看官方 Materials 中 Music 玻璃窗口的画面。采用浮动材质区分控件与内容：菜单独立承接模糊，选中行用薄亮面，表单字段用较深内凹面，避免继续叠加粗边线。

空间与待填表格改用同一个 GlassSelect，菜单通过 portal 浮于窗口和弹层上方，按视口空间向上或向下展开。外观改为三项胶囊分段；设置、补全信息、常用信息、文件预览与资料侧栏共享玻璃材质、字段圆角和底部操作区。

界面统一使用工作台、资料库、常用信息、待填表格、生成文件与待补项。后端透传报错和模型回复提示词同步更新。补全表单的按钮准确描述保存并返回对话的实际行为。

验证：生产构建、294 项 design token 检查、11 项后端测试通过。浏览器检查浅深色设置、菜单方向键与回车、手机表格预览、结果侧栏及补全资料后续填；390px 下页面滚动宽度为 390px。截图：[设置](docs/screenshots/revised-settings.png)、[手机设置](docs/screenshots/revised-mobile.png)。


## 设置页与 visionOS 材质（2026-11-04）

设置改为主导航的第四个页面，与资料库、常用信息同级；进入后隐藏对话列表。桌面左侧为分类、右侧为表单，手机使用横向分段。保存配置后保留当前页面。

实际放大查看 [Apple Materials 的 visionOS Music 原图](https://developer.apple.com/tutorials/images/com.apple.HIG/visionos-glass-material-transition@2x.png)，并对照 [Materials · visionOS](https://developer.apple.com/design/human-interface-guidelines/materials#visionOS)、[Windows](https://developer.apple.com/design/human-interface-guidelines/windows)。官方窗口的环境颜色被柔化并压缩对比，轮廓是低对比细线，输入框较深，按钮与选中项略亮。

当前实现：删除锐利边缘采样、加亮圈、菲涅耳高光和明显透镜变形。EnvironmentGlass 只使用一份经 32px 模糊、去饱和与对比压缩的环境纹理，极轻的边缘偏移不改变磨砂厚度。用平滑 SDF 覆盖处理圆角，按设备像素比绘制（上限 2x）。CSS 只保留一层低对比边缘，移除菜单、Sheet 重复内侧高光及输入区焦点亮圈。环境纹理预处理延展边缘，避免模糊产生透明黑边。

一个 WebGL context 按需绘制最多四个表面，文字由 DOM 绘制；没有常驻帧循环或指针跟随。初始化失败、context 丢失或系统要求降低透明度时回到 CSS 材质。外观页只保留外观和背景选择。

浏览器检查浅色、深色设置页及工作台；390px 下页面与滚动宽度都为 390px，设置没有 modal。截图：[浅色](docs/screenshots/visionos-soft-light.png)、[深色](docs/screenshots/visionos-soft-dark.png)。


### 环境透色与厚度修正

再次对照 Apple 官方 Music 窗口及 Materials 对环境适应的说明。移除灰度混合与 70%/80% 固定灰色覆盖；保留模糊环境的色度，浅深色分别映射亮度。纹理模糊改为 24px，以保留窗边冷色、植被绿、木质棕和办公区蓝灰色的大范围变化。沿用无发光边缘，下缘暗线、短接触阴影与长软投影表达厚度。导航与输入区不再额外覆盖灰色底。

生产构建和 297 项 design token 检查通过。浏览器检查两种环境、浅深色、390px 布局；页面宽度与滚动宽度都为 390px。截图：[浅色环境透色](docs/screenshots/environment-light.png)、[深色环境透色](docs/screenshots/environment-dark.png)。

### 删除残留高光

删除主窗口、导航与刷新按钮的渐变轮廓伪元素，以及对应 rim token。菜单、Sheet 和控件改为低对比暗边。修正 WebGL 圆角覆盖输出：默认预乘透明度上下文现在使用 RGB × coverage，消除半透明像素合成出的白色光圈。保留环境透色、下缘暗线和阴影。浅深色截图复查通过，生产构建与 295 项 token 检查通过。

### 毛玻璃材质修正

撤掉偏移背面、硬截面和短距离接触阴影。边缘在同一块磨砂材质内增加柔和散射和微弱光学密度过渡，继续透出环境颜色。外部只留低对比软投影，没有黑色底座、挤出侧面或白色亮圈。浅深色浏览器画面及生产构建检查通过。截图：[浅色毛玻璃](docs/screenshots/matte-glass-light.png)、[深色毛玻璃](docs/screenshots/matte-glass-dark.png)。


## 当前边缘材质：官方演示中的磨砂弧面（2026-11-05）

重新学习 [Design for spatial user interfaces · Materials](https://developer.apple.com/videos/play/wwdc2023/10076/?time=205)，提取并实际查看 3:25 的无内容玻璃窗口画面。官方空窗口的上角和侧边能观察到窄圆弧：环境光在弧面内变化，主体保持粗糙、透色，底边较暗；厚度没有靠偏移黑色背面表达。结合 [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) 的环境适应说明，重新实现周边法线与内部反射。

当前算法把圆弧限制在窗口内约 5.5 CSS px，沿弧面计算渐变法线、柔和偏移和粗糙环境反射；反射直接采样环境纹理，随朝向改变权重，没有白色发光项。保留漫散射、环境色度和预乘透明度抗锯齿，不恢复 CSS 描边、偏移背面或硬接触阴影。窗口、导航与输入区共用。生产构建及 295 项 token 检查通过；实际查看浅深色页面。截图：[浅色弧面](docs/screenshots/visionos-rounded-light.png)、[深色弧面](docs/screenshots/visionos-rounded-dark.png)。


### 实际运行页面阴影接管（2026-11-05）

直接检查用户正在用的 8000 页面，确认原 CSS 阴影仍在光学材质之外生效（窗口 0 14px 44px，导航 0 8px 24px）。现在 data-optics=ready 时主窗口、导航、刷新、输入区的 box-shadow 都关闭。光学层用 SDF 距离场计算紧贴轮廓、连续渐隐的弱遮蔽，关闭原来的大幅向下偏移投影。启用 ONE / ONE_MINUS_SRC_ALPHA 预乘 source-over 混合，修正 ornament 与窗口交叠处半透明边缘覆盖底层的问题。

已在 8000 实际页面刷新新构建，并读取 computed style 确认窗口和导航 box-shadow 都为 none。截图：[运行页面](docs/screenshots/live-shadow-fixed.png)。


### 页面单标题与前景导航（2026-11-05）

资料库、常用信息和设置移除顶部重复页名及重复操作区，正文保留唯一主标题；工作台顶部为 h1，待填表格改为区块 h2。正文顶距随之收紧。

修正透明度问题的根源：后置的全局光学画布无法遮挡上方正文 DOM。导航、刷新与输入区现在各有前景 canvas，在同一次 GL 绘制中把对应材质区域复制到各自容器内。前景材质位于控件内容之下、页面正文之上；展开导航仍透环境色，正文文字不会穿入菜单。浏览器逐页确认 h1 分别只有工作台、资料库、常用信息、设置一个；在真实资料库确认展开遮挡。生产构建与 295 项 token 检查通过。截图：[资料库导航](docs/screenshots/library-navigation-fixed.png)。


### 普通状态玻璃分层（2026-11-05）

普通状态复查发现前景材质画布按控件边框裁剪，失去了阴影外延。现在每块前景表面独立清屏、绘制，并带 30px 透明外延复制到自己的层里；主画布最后只保留主窗口，避免重复叠加 ornament。前景画布不再套圆角裁剪，真实轮廓和外延阴影由带预乘透明度的 SDF 输出。修正 canvas 与父级 border 的坐标偏移。主窗口与小控件分别使用不同的弧面宽度和阴影参数；边缘粗糙弧面在普通状态持续存在。

在 8000 页面移开指针、收起 tab 栏检查浅深色，确认四块独立表面及完整前景外延；展开资料库导航遮挡正常。恢复跟随系统和普通工作台。生产构建与 296 项 token 检查通过。截图：[普通浅色](docs/screenshots/glass-resting-light.png)、[普通深色](docs/screenshots/glass-resting-dark.png)。
