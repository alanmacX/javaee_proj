# Folio Design Tokens

以当前 visionOS 风格的玻璃版本为视觉基线。保留静态高光、薄边缘、导航玻璃选中层、窗口投影和输入框内凹效果；材质参数集中在 `frontend/src/tokens.css`。

## 分层

| 层级 | 命名示例 | 用途 |
| --- | --- | --- |
| 基础尺度 | `space-*`、`radius-*`、`font-*`、`duration-*` | 间距、圆角、文字、时间 |
| 语义角色 | `color-label-*`、`material-*`、`stroke-*`、`elevation-*`、`filter-*` | 内容对比、表面、边缘、深度与模糊 |
| 组件参数 | `nav-*`、`composer-*`、`dialog-field-*`、`layout-*`、`motion-nav-*` | 组件尺寸、布局和反馈 |

浅色值定义在 `:root`，深色在 `:root[data-theme="dark"]` 覆盖。主题共享尺寸；页面断点只改变布局。保留上一版的非标准尺寸，如导航 34px 圆角、输入表面 21px 圆角，以便等效迁移。

## 组件与材质

| 组件 | 主要 token |
| --- | --- |
| 主窗口 | `material-window`、`material-window-tint`、`filter-window-frame`、`elevation-window` |
| 导航与刷新 | `material-nav`、`material-nav-rim`、`filter-nav`、`elevation-nav` |
| 导航选中层 | `material-nav-selection`、`elevation-nav-selection`、`motion-nav-selection` |
| 浮动输入区 | `material-ornament`、`filter-composer`、`elevation-ornament` |
| 内凹输入表面 | `material-field`、`elevation-composer-field` |
| 弹窗与表单 | `material-sheet`、`filter-dialog`、`elevation-dialog-field` |

`--selected-row` 是组件运行时状态，保留在组件上，通过 `nav-step` 计算选中层位置。指针跟随光效保持移除。

## 修改与校验

修改视觉值时先找对应角色；组件 CSS 引用 token。即使数值相同，也不要用字号表达间距、用图标尺寸表达圆角。新增组件参数按实际作用命名。

运行 `npm --prefix frontend run check:design` 检查未定义引用、循环依赖、散落的固定视觉值及图标数值。生产构建会自动执行这项检查。响应式 media query 的断点和百分比布局保留在组件 CSS。

## 边缘与光照

导航只使用一层 `material-nav-rim`，厚度由 `stroke-material-edge` 控制，基础 border 保留透明占位。`elevation-nav` 负责软投影，不叠加内侧亮边。选中层使用均匀半透明填充。

输入区独立使用 `material-composer` 与 `material-composer-field`，窗口、导航和输入区分别调节表面亮度；内凹感来自弱 inset 阴影。浅深色分别配置边缘与投影强度。

## 办公环境

`scene-image`、`scene-tone`、`scene-position` 定义环境层；`data-environment` 切换本地实拍照片。窗口、导航和输入区各用自己的材质与模糊 token。窗口方向性细边由 `material-window-rim` 控制，与导航共用 `stroke-material-edge` 的细度。导航位置由窗口左边界、导航宽度与间距推导。

## 二级 Sheet

常用信息编辑、补全信息、文档预览、资料面板和移动端会话抽屉都使用 `frontend/src/Sheet.tsx`。弹层渲染在 body portal 中，背景工作台 inert；关闭后归还焦点，Esc 只作用于当前层。保存期间保留表单，禁用重复提交和关闭。拖选正文后松开鼠标不会触发遮罩关闭。

表单采用固定标题、独立滚动的 `sheet-body` 和固定操作区。表单、预览、资料面板分别使用尺寸 token，短内容自动收高；移动端资料与预览靠底部显示。遮罩只轻微压暗上下文，玻璃模糊放在 Sheet 本身，避免两个 backdrop-filter 相互干扰。

`frontend/src/DocumentContent.tsx` 将解析出的 Excel 单元格、Word 表格组织成阅读网格，正文按段落排版。生成结果用“填写依据 / 文件内容”切换，来源打开后保留返回结果入口，并定位高亮原文。预览保留分页，文件下载沿用原 API。


## 页面与环境光学

设置现在使用 `.settings-page`，不再由 Sheet 承载。只有预览、补全信息、常用信息编辑及临时侧栏使用 Sheet。

`EnvironmentGlass.tsx` 使用柔化后保留色度、按浅深色分别映射亮度的单份环境纹理。边缘和中央保持相同的磨砂厚度，不加发光圈、锐利透镜带或强反射。圆角用平滑 SDF 覆盖，按设备像素比（上限 2x）绘制。一个 context 最多绘制四个表面；尺寸、布局与主题变化时按需更新，无常驻动画循环。纹理、program、buffer、shader 在清理时释放。`data-optics=ready` 仅在有效纹理完成绘制后启用，失败时保留 CSS 材质。

窗口和 ornament 的厚度由下缘暗线、接触阴影和柔和远投影承担。环境色不再与固定灰底混合；浅深色共享环境色相，只改变亮度范围。

当前边缘使用同一毛玻璃表面内的圆润弧面法线和粗糙环境反射，权重随朝向改变。弧面宽度约 5.5 CSS px，不增加背面几何、不画整圈白线。详见 DESIGN-REFERENCES.md 的 2026-11-05 演示分析。
