# Folio：界面文案与信息层级

> 当前实现快照：2026-11-04。用途：交给 Gemini 做文案去 AI 味与术语统一。这里记录的是当前原文和真实交互，不是改写方案。

## 1. 产品与改写范围

Folio 是单用户的个人文档助理。用户保存简历、联系方式、项目记录等资料，上传收到的 Word / Excel 表格，让助理查资料、填写、生成文件并展示来源。它也能整理经历、提取内容、修改文档。个人信息和填写偏好可以保存，在之后的任务里复用。

### 给文案编辑者的说明

- 第 2–5 节是页面、弹层、状态和动态规则；第 6 节说明当前并存的名称；后面的源清单保留每处原文、编号和源码位置。
- 可以修改标题、按钮、说明、空状态、提示、自动生成的输入草稿和无障碍名称。同一个词在不同位置可能承担不同作用，请结合层级阅读。
- 文件名、用户资料、用户自己写的记忆和模型回答是动态数据。不要替用户编造内容；需要调整模型回答语气时，请单列建议。
- `${...}` 是前端插值，`{...}` 是本文用来表示动态内容的占位符。API 地址、模型标识、文件扩展名、技术参数与数值规则要保留实际含义。
- 建议按“文案编号 / 当前原文 / 建议文案 / 原因”返回。信息层级或模块命名的调整单列，便于之后回填代码。

## 2. 界面层级总览

```text
Folio
├─ 浏览器标签页：Folio · 我的文档 Agent
├─ 全局导航
│  ├─ 助理
│  ├─ 资料
│  ├─ 关于我
│  ├─ 设置 → 设置 Sheet
│  └─ 刷新资料与记忆（图标按钮）
├─ 会话侧栏（手机上为抽屉）
│  ├─ 对话
│  ├─ 新对话（加号按钮）
│  ├─ 搜索对话
│  ├─ 对话列表 / 空状态 / 搜索无结果
│  └─ Folio + 选择个人空间
├─ 页面顶部
│  ├─ 当前页 / 当前对话标题
│  ├─ 模型名 / 连接模型 → 设置的模型连接页
│  ├─ 上传资料
│  └─ 工作资料 → 工作资料 Sheet（只在助理页）
├─ 助理页
│  ├─ 尚无任务：个人首页
│  │  ├─ 收到的表格 → 表格列表 / 上传表格
│  │  ├─ 我的资料 → 文件摘要 / 管理 / 添加资料
│  │  ├─ 关于我 → 记忆摘要 / 查看 / 添加填写偏好
│  │  └─ 整理项目经历入口
│  ├─ 已有任务：对话时间线
│  │  └─ 每轮：用户请求 → Folio → 处理过程 → 回复 → 结果文件
│  └─ 浮动输入区
│     ├─ 当前表格标签
│     ├─ 添加资料 / 输入框 / 选择表格 / 发送
│     └─ 可用资料与记忆 / 快捷键 / 模型连接提示
├─ 资料页
│  ├─ 我的资料 + 页面说明 + 添加资料
│  ├─ 全部 / 资料 / 表格模板 + 搜索文件
│  ├─ 名称 / 用途 / 格式 + 文件列表
│  └─ 添加 Word / Excel 表格模板
├─ 关于我页
│  ├─ 关于我 + 页面说明 + 添加记忆
│  ├─ 记忆列表 / 空状态
│  └─ 用对话保存记忆的示例
└─ 二级 Sheet
   ├─ 工作资料：资料 / 本次结果
   ├─ 个人记忆：信息名称 / 内容 / 保存
   ├─ 补充信息：待补内容 / 保存资料并继续
   ├─ 文档预览：内容 / 分页 / 下载或选用表格
   ├─ 结果预览：填写依据 / 文件内容 / 引用原文 / 补充缺项
   └─ 设置：外观与空间 / 模型连接
```

## 3. 页面、组件与当前文案

### 3.1 全局导航与会话侧栏

| 层级 / 元素 | 当前文案或动态内容 | 作用 / 条件 |
| --- | --- | --- |
| 品牌 | Folio | 会话侧栏底部、每轮助理署名 |
| 导航 | 助理 / 资料 / 关于我 / 设置 | 切换页面或打开设置 |
| 图标按钮 | 刷新资料与记忆 | 刷新列表和个人记忆 |
| 侧栏标题 | 对话 | 桌面常驻，手机抽屉内显示 |
| 加号按钮名称 | 新对话 | 开始空对话 |
| 搜索占位 | 搜索对话 | 按对话标题筛选 |
| 列表项 | {对话标题} | 打开历史对话 |
| 隐藏的分组标题 | 对话记录 {对话数} | 当前代码保留，CSS 隐藏 |
| 隐藏的分组标题 | 对话记录 {对话数} | 当前代码保留，CSS 隐藏 |
| 列表空状态 | 暂无对话 | 没有任何会话 |
| 搜索空状态 | 没有匹配的对话 | 有会话但搜索无匹配 |
| 空间选择器名称 | 选择个人空间 | 展示实际空间名称 |
| 默认空间名 | 我的空间 | 首次启动且没有空间时创建 |
| 默认对话名 | 新对话 | 无实际标题时；发送后标题取首条请求内容 |
| 手机抽屉按钮 | 打开会话列表 / 关闭会话列表 | 只显示图标，文字用于无障碍名称 |

手机导航收起时只显示当前页的文字，其余项以图标呈现；桌面导航悬停可展开标签。手机顶部隐藏模型名称按钮，输入区隐藏键盘快捷键说明。

手机导航收起时只显示当前页的文字，其余项以图标呈现；桌面导航悬停可展开标签。手机顶部隐藏模型名称按钮，输入区隐藏键盘快捷键说明。

### 3.2 页面顶部

| 元素 | 当前文案 / 规则 |
| --- | --- |
| 助理首页标题 | 个人助理 |
| 已选对话标题 | {当前对话标题}，缺省为“新对话” |
| 资料页标题 | 我的资料 |
| 记忆页标题 | 关于我 |
| 模型按钮 | {模型名}；没有模型信息时为“连接模型” |
| 上传按钮 | 上传资料（图标的 title 和无障碍名称） |
| 工作资料按钮 title | 工作资料 / 收起资料面板 |
| 工作资料按钮无障碍名称 | 打开资料面板 / 收起资料面板 |
| 全局错误条 | {接口错误或前端错误文本}，可通过“关闭错误提示”关闭 |
| 加载状态 | 正在载入个人空间… |
| 连接失败后按钮 | 重新连接服务 |

### 3.3 助理首页：收到的表格

显示条件：当前对话没有任务。

| 层级 / 元素 | 当前文案 | 交互 / 条件 |
| --- | --- | --- |
| 一级标题 | 收到的表格 | 展示已上传的模板文件 |
| 标题右侧操作 | 新表格 | 上传模板 |
| 文件主名称 | {表格文件名} | 选择为本次要填写的表格 |
| 未选中文件的副文案 | 用我的资料填写 | 点击后带入表格并准备输入草稿 |
| 选中文件的副文案 | 这次填写这一份 | 该表格已选中 |
| 次操作 | 原表 | 打开表格预览 |
| 次操作无障碍名称 | 查看原表 {表格文件名} | 与可见的“原表”配套 |
| 无表格时说明 | 把收到的 Word 或 Excel 表格交到这里。 | 空列表 |
| 无表格时按钮 | 上传表格 | 打开文件选择器 |

### 3.4 助理首页：个人上下文

| 层级 / 元素 | 当前文案 | 交互 / 条件 |
| --- | --- | --- |
| 二级标题 | 我的资料 {资料数} | 不重复计算由个人记忆生成的文档 |
| 标题右侧操作 | 管理 | 打开资料页 |
| 文件摘要 | {文件名} | 最多显示前三份，点击预览 |
| 更多资料 | 另有 {剩余数} 份资料 | 资料超过三份时；进入资料页 |
| 无资料说明 | 添加简历、项目记录或联系方式，下次填表继续用。 | 无资料时 |
| 操作 | 添加资料 | 上传个人资料 |
| 二级标题 | 关于我 {记忆数} | 与“我的资料”并列 |
| 标题右侧操作 | 查看 | 进入关于我页 |
| 记忆摘要 | {信息名称} → {信息内容} | 最多显示两条真实记忆 |
| 无记忆说明 | 还没有记住的信息。 | 无记忆时 |
| 操作 | 记住一条填写偏好 | 打开个人记忆 Sheet，名称预填“填写偏好” |
| 底部次要入口 | 也可以整理一份项目经历 | 把整理经历的指令填入输入框，等待用户发送 |

### 3.5 助理页：对话时间线

每轮按以下顺序展示：

1. 用户请求：用户输入原文。
2. 助理署名：Folio。
3. 运行状态：等待处理 / 正在处理。
4. 可展开的处理过程：工具、查证或模板审查的记录。
5. 模型回复：Markdown 动态内容。
6. 生成的文件：名称、项目数、来源数、缺项数、预览与下载入口。

| 元素 / 情况 | 当前文案 |
| --- | --- |
| 排队 | 等待处理 |
| 运行中 | 正在处理 |
| 最新任务尚无中间回复 | 正在阅读资料并组织结果… |
| 其他运行中任务的占位 | 正在处理… |
| 没有模型回复也没有具体错误 | 这项任务没有生成回复。 |
| 失败后的操作 | 重新编辑并发送 |
| 处理中折叠标题 | 正在查阅与处理 |
| 已结束折叠标题 | 查看处理过程 |
| 操作数量 | {已完成工具次数} 项操作 |
| 子任务委派 | 委派资料查证 / 委派模板审查；未知类型显示其标识 |
| 没有使用文档工具 | 这项回复没有使用文档工具。 |
| 处理记录加载失败兜底 | 记录读取失败 |

处理记录中的当前名称：

| 工具 / 执行者标识 | 界面名称 |
| --- | --- |
| list_documents | 查看资料清单 |
| read_document | 阅读文档 |
| search_sources | 检索相关内容 |
| fill_template | 填写并校验表格 |
| save_extraction | 保存提取信息 |
| edit_document | 修改文档 |
| list_memories | 读取个人记忆 |
| remember_user_fact | 更新个人记忆 |
| read_output | 查看上次结果 |
| folio | Folio |
| evidence-reader | 资料查证 |
| template-reviewer | 模板审查 |

### 3.6 结果文件卡片（对话和工作资料内共用）

| 层级 / 元素 | 当前文案 / 规则 |
| --- | --- |
| 主标题 | {产物文件名} |
| 有提取或填写内容时 | {项目数} 项内容 |
| 有引用资料时追加 | · 来自 {不同来源文档数} 份资料 |
| 有缺项时追加 | · {缺项数} 项待补 |
| 没有项目数时 | 查看文档 |
| 缺项操作 | 补充信息 |
| 下载图标无障碍名称 | 下载 {产物文件名} |

示意拼接：`2 项内容 · 来自 2 份资料`、`1 项内容 · 来自 1 份资料 · 1 项待补`。数字由当前结果报告计算。

### 3.7 浮动输入区

| 层级 / 元素 | 当前文案 | 条件 / 行为 |
| --- | --- | --- |
| 当前表格标签 | {表格文件名}，找不到文件名时为“当前对话的表格” | 已选模板时 |
| 取消图标名称 | 取消选择表格 | 取消当前选择 |
| 附件图标名称和 title | 添加资料 | 也支持把文件拖到输入区 |
| 输入框无障碍名称 | 给 Folio 发送消息 | 所有对话共用 |
| 已选表格时的占位 | 这次填写有什么要求？ | 不自动发送 |
| 没选表格时的占位 | 交代一件事，或补充我的信息… | 不自动发送 |
| 表格选择器 title / 无障碍名称 | 选择要填写的表格 | 下拉选择已有模板 |
| 默认选项 | 选择表格 | 未选中 |
| 模板选项 | {文件名} | 来自实际模板列表 |
| 上传选项 | ＋ 上传新表格 | 打开模板文件选择器 |
| 发送图标名称 / title | 发送消息 | 空输入、上传或任务执行期间禁用 |
| 已连接模型的底部入口 | 可用 {资料数} 份资料 · {记忆数} 条记忆 | 打开工作资料 Sheet |
| 键盘说明 | Enter 发送 · Shift Enter 换行 | 桌面显示；中文输入法组词时不发送 |
| 没有配置模型时的说明 | 连接模型后即可开始对话 | 底部提示 |
| 没有配置模型时的按钮 | 连接模型 | 直接打开模型连接设置 |

### 3.8 资料页

| 层级 / 元素 | 当前文案 / 内容 |
| --- | --- |
| 一级标题 | 我的资料 |
| 说明 | 保留一份，供下一次任务继续使用。 |
| 主按钮 | 添加资料 / 上传中… |
| 筛选 | 全部 / 资料 / 表格模板 |
| 搜索占位 | 搜索文件 |
| 列表表头 | 名称 / 用途 / 格式 |
| 文件名称 | {实际文件名} |
| 用途标签 | 个人资料 / 表格模板 |
| 格式标签 | MD / TXT / DOCX / XLSX，按文件扩展名显示 |
| 搜索或筛选无结果 | 没有匹配的文件 |
| 尚无任何文件 | 还没有资料，添加简历、项目记录或工作总结。 |
| 列表下方操作 | 添加 Word / Excel 表格模板 |

点击文件打开文档预览。由个人记忆自动生成的引用文档不在资料页重复列出。

### 3.9 关于我页

| 层级 / 元素 | 当前文案 / 内容 |
| --- | --- |
| 一级标题 | 关于我 |
| 页面说明 | 你确认过的信息与偏好，Folio 会在之后的任务中继续使用。 |
| 主按钮 | 添加记忆 |
| 记忆条目标题 | {信息名称} |
| 记忆条目正文 | {信息内容} |
| 条目操作 | 编辑 |
| 空状态标题 | 先记住最常用的信息 |
| 空状态说明 | 姓名、专业、联系方式，或你希望如何整理项目经历。 |
| 空状态操作 | 添加第一条记忆 |
| 底部提示 | 也可以在对话里说：记住，我的项目简介控制在一百字以内。 |

## 4. 二级 Sheet 层级与文案

共同结构：标题与关闭 → 正文或切换区 → 底部操作。长内容只滚动正文，底部操作保持可见；Esc 关闭当前 Sheet，关闭后归还焦点。手机上的资料、预览靠底部显示，会话列表从左侧弹出。

### 4.1 工作资料

入口：助理页顶部的工作资料按钮，或输入区下方的可用资料入口。

```text
工作资料
├─ 关闭工作资料（图标）
├─ 资料 {资料与模板总数} / 本次结果 {结果文件数}
├─ 资料分页
│  ├─ 待填写的表格 → {模板文件名列表}
│  ├─ 我的资料 → {个人资料文件名列表}
│  ├─ 空状态：添加资料后，Folio 就能在填表时查找相关信息。
│  └─ 添加资料
├─ 本次结果分页
│  ├─ 结果文件卡片（与对话区共用）
│  └─ 空状态：生成的文件会出现在这里，可查看内容和每一项的来源。
└─ {记忆数} 条个人记忆可供使用 → 查看个人记忆（图标）
```

当前“本次结果”列出当前会话各轮任务的产物。点击文件预览后，关闭预览可返回工作资料；选用模板后关闭弹层并进入输入框。

### 4.2 个人记忆：新建 / 编辑

| 层级 / 元素 | 当前文案 / 内容 |
| --- | --- |
| 标题 | 个人记忆 |
| 关闭图标 | 关闭记忆编辑 |
| 字段一 | 信息名称 |
| 字段一占位 | 例如：专业、联系方式、写作偏好 |
| 首页入口的预填名称 | 填写偏好 |
| 字段二 | 内容 |
| 字段二占位 | 希望 Folio 记住的内容 |
| 说明 | 保存同名信息会更新原来的内容。 |
| 次操作 | 取消 |
| 主操作 | 保存记忆 |
| 成功 Toast | 个人记忆已保存 |
| 失败兜底 | 保存失败 |

编辑原来的记忆时，名称只读、内容可编辑。保存时显示旋转图标，按钮仍叫“保存记忆”；关闭、取消和字段暂时禁用。

### 4.3 补充信息

入口：有缺项的结果卡片，或结果预览里的“补充这些信息”。

| 层级 / 元素 | 当前文案 / 内容 |
| --- | --- |
| 标题 | 补充信息 |
| 关闭图标 | 关闭补充信息 |
| 上下文 | {当前产物文件名} |
| 字段名 | 待补内容 |
| 预填内容 | 每个缺项一行：`{缺项名称}：` |
| 说明 | 保存为一份补充资料，填写结果中可以查看这份来源。 |
| 未实际补充时错误 | 请补充至少一项内容。 |
| 次操作 | 取消 |
| 主操作 | 保存资料并继续 |
| 保存中 | 保存中… |
| 失败兜底 | 补充资料保存失败 |

保存成功后：创建补充资料文件、选回原模板、回到当前对话并准备一条继续填写的草稿；还需用户发送。由结果预览进入后取消，会返回原结果预览。

### 4.4 文档 / 模板预览

| 层级 / 元素 | 当前文案 / 内容 |
| --- | --- |
| 标题 | {文件名}，加载前为“读取文档” |
| 普通文档副标题 | 文档内容 |
| 关闭图标 | 关闭文档预览 |
| 加载占位 | 读取中… |
| 没有正文 | 此文件没有可显示的正文。 |
| Excel 分区标题 | {工作表名称} |
| Excel 列标 / 行标 | A、B、C… / 1、2、3… |
| Excel 空白单元格 | — |
| Word 空白单元格 | — |
| 文本空白段落 | 空白 |
| 分页按钮 | 上一页内容 / 下一页内容（图标的无障碍名称） |
| 分页数值 | {起始块}–{结束块} / {内容块总数}；每页 50 块 |
| 普通文件底部操作 | 下载原文件 |
| 模板底部操作 | 用这份表格开始 |

内容来源是解析后的文档：Excel、Word 表格组织成网格，其他正文按段落阅读。表格单元格 title 显示实际地址，例如 `员工登记!B1`。引用进入的原文位置会高亮并滚动定位。

### 4.5 生成结果预览与引用返回

```text
{产物文件名}
├─ 副标题：生成结果与来源
├─ 关闭文档预览（图标）
├─ 填写依据 / 文件内容（默认进入填写依据）
├─ 填写依据
│  ├─ 填写内容与依据
│  │  └─ 每项：{目标位置} → {写入内容} → {组织说明（可选）}
│  │     └─ 来源按钮：{来源文件名} + {逐字引用原文}
│  │        └─ 查不到文件名时：原始资料
│  └─ 待补充（有缺项才出现）
│     ├─ {缺项列表}
│     └─ 补充这些信息
├─ 文件内容：与普通文档预览共用阅读组件
└─ 下载文件
```

点击引用后，展示对应原文并出现“返回结果”图标按钮；点击可回到当前产物的填写依据。

地址转成人能读的文本的当前规则：

| 内容类型 | 当前文案格式 |
| --- | --- |
| Word 段落 | 第 {从 1 开始的段号} 段 |
| 文本行 | 第 {从 1 开始的行号} 行 |
| 同一行的续块 | 第 {行号} 行（续） |
| Word 表格单元格 | 表 {表号} · {行号} 行 {列号} 列 |
| Excel 单元格 | {工作表名} · {单元格地址} |

### 4.6 设置：外观与空间

入口：导航的“设置”；打开后默认显示本页。

| 层级 / 元素 | 当前文案 |
| --- | --- |
| 标题 | 设置 |
| 关闭图标 | 关闭设置 |
| 一级切换 | 外观与空间 / 模型连接 |
| 字段名 | 外观 |
| 外观选项 | 跟随系统 / 浅色 / 深色 |
| 选择组标题 | 办公空间 |
| 照片选项 | 窗边会议室 / 玻璃办公区 |
| 底部操作 | 完成 |

外观和空间选择立即生效，浏览器保存选择，刷新后保留。

### 4.7 设置：模型连接

入口：设置内切换；顶部模型名、底部连接按钮，以及未配置模型时发送任务，都会直接打开本页。

| 层级 / 元素 | 当前文案 / 内容 |
| --- | --- |
| 字段一 | 服务地址 |
| 默认值 / 占位 | https://api.deepseek.com |
| 字段二 | 模型名称 |
| 默认值 / 占位 | deepseek-chat |
| 字段三 | API Key |
| 未配置时占位 | 输入服务商提供的 API Key |
| 已配置时占位 | 已保存，留空则继续使用 |
| 说明 | 支持 DeepSeek 及兼容接口。密钥保存在本机服务端。 |
| 次操作 | 取消 |
| 主操作 | 保存连接 |
| 成功 Toast | 模型连接配置已保存 |
| 失败兜底 | 保存失败 |

保存中显示旋转图标，按钮仍叫“保存连接”；字段、切换和取消暂时禁用。

## 5. 自动草稿、动态命名与全局反馈

### 5.1 自动填入输入框的四类草稿

这些文字会进入用户可编辑的输入框，并在发送后成为对话中的用户请求。

| 触发入口 | 当前原文 |
| --- | --- |
| 首页选择表格，且输入框为空 | 填写《{表格文件名}》，沿用我的信息和填写偏好。 |
| 首页整理项目经历 | 从我的资料中整理项目经历，附上信息来源。 |
| 预览里选用表格，且输入框为空 | 根据我的资料填写这份表格，缺少的信息请告诉我。 |
| 保存补充资料成功 | 根据刚添加的《{补充资料文件名}》，继续填写《{产物文件名}》，保留已经填好的信息。 |

### 5.2 动态文件与标题

| 对象 | 当前规则 |
| --- | --- |
| 填写产物 | `{模板文件名去掉扩展名} · 已填写{原扩展名}` |
| 提取产物 | `提取结果.json` |
| 文档编辑产物 | 当前使用随机产物 ID 加原文件扩展名，没有单独的中文命名模板 |
| 补充资料 | `{产物名去掉扩展名} · 补充资料 {递增序号}.md` |
| 对话标题 | 默认“新对话”；首次任务后取用户请求前 32 个字符 |
| 用户上传的文件 | 实际文件名 |
| 记忆名称与内容 | 用户保存的信息名称、内容 |

### 5.3 全局通知与前端兜底

| 触发 | 当前原文 |
| --- | --- |
| 刷新完成 | 资料与记忆已刷新 |
| 批量上传资料完成 | {成功数} 份资料已添加 |
| 批量上传模板完成 | {成功数} 份表格已添加 |
| 保存记忆完成 | 个人记忆已保存 |
| 保存模型连接完成 | 模型连接配置已保存 |
| 未知操作错误 | 操作失败，请重试 |
| 无可用接口错误说明 | 请求失败 ({HTTP 状态码}) |
| 处理记录读取失败 | 记录读取失败 |
| 表单保存失败 | 保存失败 |
| 补充资料保存失败 | 补充资料保存失败 |

后端错误可能作为全局错误条、任务失败消息、表单错误或工具记录显示。完整原文在后面的 B 编号清单。

## 6. 当前名称对照与动态内容边界

### 6.1 当前并存的叫法

| 概念 | 当前叫法及出现位置 |
| --- | --- |
| 助理 | “助理”导航、“个人助理”顶部、“Folio”署名、“我的文档 Agent”浏览器标题 |
| 个人资料 | “资料”导航、“我的资料”页面、“个人资料”文件用途、“工作资料”Sheet、“资料清单”工具记录 |
| 长期信息 | “关于我”导航与页面、“记忆 / 个人记忆”表单、数量和工具记录、“信息与偏好”页面说明 |
| 要填写的文件 | “收到的表格”首页、“表格模板”筛选与用途、“待填写的表格”工作资料、“模板”部分错误提示 |
| 输出文件 | “结果文件 / 本次结果 / 生成结果”界面；“产物”部分接口错误；“已填写”文件名 |
| 缺失字段 | “缺少的信息”草稿、“缺项”报告、“待补 / 待补充 / 补充信息 / 补充这些信息”界面 |

### 6.2 动态生成的回复

以下区域没有固定的一套成品文案：

- 模型最终回答与处理中间文字。
- 写入内容、组织说明、缺项描述。
- 引用的原文及原文件正文。
- 用户输入、文件名、空间名、保存的信息。

目前系统提示词对回复语气的直接要求只有：

```text
你是 Folio，用户长期使用的个人文档 Agent，使用中文回复。
持续承接当前会话，用户可以补充信息、修正内容和继续修改。
遇到同名人物、时间冲突或相互矛盾的资料时，说明问题并将对应字段留空。
执行 fill_template 后才能声称完成填表。
缺少的信息在 missing 中列出。完成后简短说明产物和缺项，产物由系统附加下载地址。
```

这些摘自 `src/folio/agent.py`，是内部提示词上下文。改写 UI 时无需把它们写进页面。脚本验收模型的预设答复、演示简历和演示空间名称不作为固定产品文案列入清单。

## 7. 前端原文源清单（逐处编号）

以下保留重复出现的位置，便于按编号回填。`\n` 表示换行；带反引号的模板保留 `${...}` 源码插值。混合 JSX 文本可能分成数条，完整拼接形式见前面的层级说明。

共 232 处前端原文记录，涉及 `App.tsx`、`DocumentContent.tsx`、`api.ts` 与 HTML 标题；`Sheet.tsx` 没有独立的可见固定文案。

### 状态、默认值、提示与自动草稿

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F001 | 查看资料清单 | 状态、映射或默认值 | `frontend/src/App.tsx:54` |
| F002 | 阅读文档 | 状态、映射或默认值 | `frontend/src/App.tsx:55` |
| F003 | 检索相关内容 | 状态、映射或默认值 | `frontend/src/App.tsx:56` |
| F004 | 填写并校验表格 | 状态、映射或默认值 | `frontend/src/App.tsx:57` |
| F005 | 保存提取信息 | 状态、映射或默认值 | `frontend/src/App.tsx:58` |
| F006 | 修改文档 | 状态、映射或默认值 | `frontend/src/App.tsx:59` |
| F007 | 读取个人记忆 | 状态、映射或默认值 | `frontend/src/App.tsx:60` |
| F008 | 更新个人记忆 | 状态、映射或默认值 | `frontend/src/App.tsx:61` |
| F009 | 查看上次结果 | 状态、映射或默认值 | `frontend/src/App.tsx:62` |
| F010 | 资料查证 | 状态、映射或默认值 | `frontend/src/App.tsx:66` |
| F011 | 模板审查 | 状态、映射或默认值 | `frontend/src/App.tsx:67` |
| F012 | `` `第 ${Number(paragraph[1]) + 1} 段` `` | 状态、映射或默认值 | `frontend/src/App.tsx:72` |
| F013 | `` `第 ${Number(line[1]) + 1} 行${Number(line[2]) ? "（续）" : ""}` `` | 状态、映射或默认值 | `frontend/src/App.tsx:75` |
| F014 | `` `表 ${Number(cell[1]) + 1} · ${Number(cell[2]) + 1} 行 ${Number(cell[3]) + 1} 列` `` | 状态、映射或默认值 | `frontend/src/App.tsx:78` |
| F015 | 新对话 | 状态、映射或默认值 | `frontend/src/App.tsx:198` |
| F016 | 资料与记忆已刷新 | Toast 通知 | `frontend/src/App.tsx:267` |
| F017 | 操作失败，请重试 | 错误提示 | `frontend/src/App.tsx:276` |
| F018 | 我的空间 | 状态、映射或默认值 | `frontend/src/App.tsx:303` |
| F019 | 请补充至少一项内容。 | 错误提示 | `frontend/src/App.tsx:509` |
| F020 | `` `${supplement.name.replace(/\.[^.]+$/, "")} · 补充资料` `` | 状态、映射或默认值 | `frontend/src/App.tsx:515` |
| F021 | `` `根据刚添加的《${name}》，继续填写《${supplement.name}》，保留已经填好的信息。` `` | 自动填入输入框的草稿 | `frontend/src/App.tsx:528` |
| F022 | 补充资料保存失败 | 错误提示 | `frontend/src/App.tsx:539` |
| F023 | 新对话 | 状态、映射或默认值 | `frontend/src/App.tsx:558` |
| F024 | `` `${completed} 份${role === "template" ? "表格" : "资料"}已添加` `` | Toast 通知 | `frontend/src/App.tsx:609` |
| F025 | 个人记忆已保存 | Toast 通知 | `frontend/src/App.tsx:630` |
| F026 | 保存失败 | 状态、映射或默认值 | `frontend/src/App.tsx:632` |

### 会话侧栏

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F027 | 对话 | 属性 aria-label；aside.sidebar | `frontend/src/App.tsx:643` |
| F028 | 对话 | 可见正文/标签；span ← div.sidebar-heading | `frontend/src/App.tsx:646` |
| F029 | 关闭会话列表 | 属性 aria-label；button.icon-button ← div.sidebar-heading | `frontend/src/App.tsx:650` |
| F030 | 新对话 | 属性 aria-label；button.icon-button ← div.sidebar-heading | `frontend/src/App.tsx:658` |
| F031 | 搜索对话 | 属性 placeholder；label.search ← aside.sidebar | `frontend/src/App.tsx:667` |
| F032 | 对话记录 | 可见正文/标签；div.section-caption ← aside.sidebar | `frontend/src/App.tsx:673` |
| F033 | 暂无对话 | 可见正文/标签；p.sidebar-empty ← div.conversation-list | `frontend/src/App.tsx:688` |
| F034 | 没有匹配的对话 | 可见正文/标签；p.sidebar-empty ← div.conversation-list | `frontend/src/App.tsx:692` |
| F035 | Folio | 可见正文/标签；strong ← div.space-info | `frontend/src/App.tsx:698` |
| F036 | 选择个人空间 | 属性 aria-label；select ← div.space-info | `frontend/src/App.tsx:700` |

### 全局导航

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F037 | 主导航 | 属性 aria-label；nav.rail ← div | `frontend/src/App.tsx:745` |
| F038 | 助理 | 状态、映射或默认值；div.rail-links ← nav.rail | `frontend/src/App.tsx:762` |
| F039 | 资料 | 状态、映射或默认值；div.rail-links ← nav.rail | `frontend/src/App.tsx:763` |
| F040 | 关于我 | 状态、映射或默认值；div.rail-links ← nav.rail | `frontend/src/App.tsx:764` |
| F041 | 设置 | 属性 aria-label；button ← nav.rail | `frontend/src/App.tsx:792` |
| F042 | 设置 | 可见正文/标签；span ← button | `frontend/src/App.tsx:803` |
| F043 | 刷新资料与记忆 | 属性 aria-label；button.refresh-control ← div | `frontend/src/App.tsx:808` |
| F044 | 刷新资料与记忆 | 属性 title；button.refresh-control ← div | `frontend/src/App.tsx:809` |

### 顶部与全局状态

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F045 | 打开会话列表 | 属性 aria-label；button.icon-button.mobile-menu ← header.topbar | `frontend/src/App.tsx:831` |
| F046 | 个人助理 | 状态、映射或默认值；strong ← div.breadcrumb | `frontend/src/App.tsx:841` |
| F047 | 我的资料 | 状态、映射或默认值；strong ← div.breadcrumb | `frontend/src/App.tsx:843` |
| F048 | 关于我 | 状态、映射或默认值；strong ← div.breadcrumb | `frontend/src/App.tsx:844` |
| F049 | 连接模型 | 状态、映射或默认值；button.model-button ← div.breadcrumb | `frontend/src/App.tsx:853` |
| F050 | 上传资料 | 属性 aria-label；button.icon-button ← div.topbar-actions | `frontend/src/App.tsx:860` |
| F051 | 上传资料 | 属性 title；button.icon-button ← div.topbar-actions | `frontend/src/App.tsx:861` |
| F052 | 收起资料面板 | 属性 aria-label；button.icon-button ← div.topbar-actions | `frontend/src/App.tsx:870` |
| F053 | 打开资料面板 | 属性 aria-label；button.icon-button ← div.topbar-actions | `frontend/src/App.tsx:870` |
| F054 | 收起资料面板 | 属性 title；button.icon-button ← div.topbar-actions | `frontend/src/App.tsx:871` |
| F055 | 工作资料 | 属性 title；button.icon-button ← div.topbar-actions | `frontend/src/App.tsx:871` |
| F056 | 关闭错误提示 | 属性 aria-label；button.icon-button ← div.error-banner | `frontend/src/App.tsx:888` |
| F057 | 正在载入个人空间… | 可见正文/标签；div.loading ← main.main | `frontend/src/App.tsx:898` |
| F058 | 重新连接服务 | 可见正文/标签；button.primary ← div.loading | `frontend/src/App.tsx:906` |

### 个人首页

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F059 | 收到的表格 | 可见正文/标签；h1 ← div.desk-heading | `frontend/src/App.tsx:919` |
| F060 | 新表格 | 可见正文/标签；button.text-button ← div.desk-heading | `frontend/src/App.tsx:925` |
| F061 | `` `填写《${form.name}》，沿用我的信息和填写偏好。` `` | 自动填入输入框的草稿；button.desk-form-select ← div | `frontend/src/App.tsx:942` |
| F062 | 这次填写这一份 | 状态、映射或默认值；small ← span | `frontend/src/App.tsx:955` |
| F063 | 用我的资料填写 | 状态、映射或默认值；small ← span | `frontend/src/App.tsx:956` |
| F064 | `` `查看原表 ${form.name}` `` | 属性 aria-label；button.desk-original ← div | `frontend/src/App.tsx:970` |
| F065 | 原表 | 可见正文/标签；button.desk-original ← div | `frontend/src/App.tsx:972` |
| F066 | 把收到的 Word 或 Excel 表格交到这里。 | 可见正文/标签；p ← div.desk-empty | `frontend/src/App.tsx:979` |
| F067 | 上传表格 | 可见正文/标签；button.secondary ← div.desk-empty | `frontend/src/App.tsx:984` |
| F068 | 可复用的个人信息 | 属性 aria-label；section.desk-context ← div.personal-desk | `frontend/src/App.tsx:991` |
| F069 | 我的资料 | 可见正文/标签；h2 ← div.desk-heading | `frontend/src/App.tsx:996` |
| F070 | 管理 | 可见正文/标签；button ← div.desk-heading | `frontend/src/App.tsx:999` |
| F071 | 另有 | 可见正文/标签；button ← div.desk-source-list | `frontend/src/App.tsx:1017` |
| F072 | 份资料 | 可见正文/标签；button ← div.desk-source-list | `frontend/src/App.tsx:1017` |
| F073 | 添加简历、项目记录或联系方式，下次填表继续用。 | 可见正文/标签；p.desk-empty-copy ← div.desk-source-section | `frontend/src/App.tsx:1023` |
| F074 | 添加资料 | 可见正文/标签；button.desk-add ← div.desk-source-section | `frontend/src/App.tsx:1030` |
| F075 | 关于我 | 可见正文/标签；h2 ← div.desk-heading | `frontend/src/App.tsx:1036` |
| F076 | 查看 | 可见正文/标签；button ← div.desk-heading | `frontend/src/App.tsx:1039` |
| F077 | 还没有记住的信息。 | 可见正文/标签；p.desk-empty-copy ← div.desk-memory-section | `frontend/src/App.tsx:1052` |
| F078 | 填写偏好 | 属性 onClick；button.desk-add ← div.desk-memory-section | `frontend/src/App.tsx:1057` |
| F079 | 记住一条填写偏好 | 可见正文/标签；button.desk-add ← div.desk-memory-section | `frontend/src/App.tsx:1060` |
| F080 | 从我的资料中整理项目经历，附上信息来源。 | 自动填入输入框的草稿；button.desk-other ← div.personal-desk | `frontend/src/App.tsx:1067` |
| F081 | 也可以整理一份项目经历 | 可见正文/标签；button.desk-other ← div.personal-desk | `frontend/src/App.tsx:1071` |

### 对话时间线

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F082 | Folio | 可见正文/标签；strong ← div.assistant-header | `frontend/src/App.tsx:1082` |
| F083 | 等待处理 | 状态、映射或默认值；span ← div.assistant-header | `frontend/src/App.tsx:1090` |
| F084 | 正在处理 | 状态、映射或默认值；span ← div.assistant-header | `frontend/src/App.tsx:1091` |
| F085 | 正在阅读资料并组织结果… | 状态、映射或默认值；div.working-message ← article.turn | `frontend/src/App.tsx:1116` |
| F086 | 正在处理… | 状态、映射或默认值；div.working-message ← article.turn | `frontend/src/App.tsx:1117` |
| F087 | 这项任务没有生成回复。 | 状态、映射或默认值；div.task-error ← article.turn | `frontend/src/App.tsx:1121` |
| F088 | 重新编辑并发送 | 可见正文/标签；button.text-button ← div.task-error | `frontend/src/App.tsx:1129` |

### 浮动输入区

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F089 | 当前对话的表格 | 状态、映射或默认值；span ← div.attached-template | `frontend/src/App.tsx:1163` |
| F090 | 取消选择表格 | 属性 aria-label；button.icon-button ← div.attached-template | `frontend/src/App.tsx:1167` |
| F091 | 添加资料 | 属性 aria-label；button.icon-button ← div.input-surface | `frontend/src/App.tsx:1178` |
| F092 | 添加资料 | 属性 title；button.icon-button ← div.input-surface | `frontend/src/App.tsx:1179` |
| F093 | 给 Folio 发送消息 | 属性 aria-label；div.input-surface ← div.compose-row | `frontend/src/App.tsx:1194` |
| F094 | 这次填写有什么要求？ | 属性 placeholder；div.input-surface ← div.compose-row | `frontend/src/App.tsx:1197` |
| F095 | 交代一件事，或补充我的信息… | 属性 placeholder；div.input-surface ← div.compose-row | `frontend/src/App.tsx:1198` |
| F096 | 选择要填写的表格 | 属性 title；label.template-select ← div.input-surface | `frontend/src/App.tsx:1217` |
| F097 | 选择要填写的表格 | 属性 aria-label；select ← label.template-select | `frontend/src/App.tsx:1221` |
| F098 | 选择表格 | 可见正文/标签；option ← select | `frontend/src/App.tsx:1229` |
| F099 | ＋ 上传新表格 | 可见正文/标签；option ← select | `frontend/src/App.tsx:1235` |
| F100 | 发送消息 | 属性 aria-label；button.send-button ← div.compose-row | `frontend/src/App.tsx:1242` |
| F101 | 发送消息 | 属性 title；button.send-button ← div.compose-row | `frontend/src/App.tsx:1243` |
| F102 | 可用 | 可见正文/标签；button ← div.composer-footer | `frontend/src/App.tsx:1266` |
| F103 | 份资料 · | 可见正文/标签；button ← div.composer-footer | `frontend/src/App.tsx:1266` |
| F104 | 条记忆 | 可见正文/标签；button ← div.composer-footer | `frontend/src/App.tsx:1266` |
| F105 | Enter 发送 · Shift Enter 换行 | 可见正文/标签；span ← div.composer-footer | `frontend/src/App.tsx:1268` |
| F106 | 连接模型后即可开始对话 | 可见正文/标签；span ← div.composer-footer | `frontend/src/App.tsx:1272` |
| F107 | 连接模型 | 可见正文/标签；button ← div.composer-footer | `frontend/src/App.tsx:1274` |

### 资料页

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F108 | 我的资料 | 可见正文/标签；h1 ← div | `frontend/src/App.tsx:1285` |
| F109 | 保留一份，供下一次任务继续使用。 | 可见正文/标签；p ← div | `frontend/src/App.tsx:1286` |
| F110 | 上传中… | 状态、映射或默认值；button.primary ← div.page-heading | `frontend/src/App.tsx:1294` |
| F111 | 添加资料 | 状态、映射或默认值；button.primary ← div.page-heading | `frontend/src/App.tsx:1294` |
| F112 | 全部 | 状态、映射或默认值；div.tabs ← div.library-toolbar | `frontend/src/App.tsx:1300` |
| F113 | 资料 | 状态、映射或默认值；div.tabs ← div.library-toolbar | `frontend/src/App.tsx:1301` |
| F114 | 表格模板 | 状态、映射或默认值；div.tabs ← div.library-toolbar | `frontend/src/App.tsx:1302` |
| F115 | 搜索文件 | 属性 placeholder；label.search ← div.library-toolbar | `frontend/src/App.tsx:1316` |
| F116 | 名称 | 可见正文/标签；span ← div.file-table-head | `frontend/src/App.tsx:1324` |
| F117 | 用途 | 可见正文/标签；span ← div.file-table-head | `frontend/src/App.tsx:1325` |
| F118 | 格式 | 可见正文/标签；span ← div.file-table-head | `frontend/src/App.tsx:1326` |
| F119 | 表格模板 | 状态、映射或默认值；span ← button.file-table-row | `frontend/src/App.tsx:1342` |
| F120 | 个人资料 | 状态、映射或默认值；span ← button.file-table-row | `frontend/src/App.tsx:1342` |
| F121 | 没有匹配的文件 | 状态、映射或默认值；div.table-empty ← div.file-table | `frontend/src/App.tsx:1351` |
| F122 | 还没有资料，添加简历、项目记录或工作总结。 | 状态、映射或默认值；div.table-empty ← div.file-table | `frontend/src/App.tsx:1352` |
| F123 | 添加 Word / Excel 表格模板 | 可见正文/标签；button.text-button ← section.library.page-scroll | `frontend/src/App.tsx:1361` |

### 关于我页

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F124 | 关于我 | 可见正文/标签；h1 ← div | `frontend/src/App.tsx:1368` |
| F125 | 你确认过的信息与偏好，Folio 会在之后的任务中继续使用。 | 可见正文/标签；p ← div | `frontend/src/App.tsx:1369` |
| F126 | 添加记忆 | 可见正文/标签；button.primary ← div.page-heading | `frontend/src/App.tsx:1376` |
| F127 | 编辑 | 可见正文/标签；span ← button.memory-row | `frontend/src/App.tsx:1396` |
| F128 | 先记住最常用的信息 | 可见正文/标签；h2 ← div.memory-empty | `frontend/src/App.tsx:1407` |
| F129 | 姓名、专业、联系方式，或你希望如何整理项目经历。 | 可见正文/标签；p ← div.memory-empty | `frontend/src/App.tsx:1408` |
| F130 | 添加第一条记忆 | 可见正文/标签；button.secondary ← div.memory-empty | `frontend/src/App.tsx:1413` |
| F131 | 也可以在对话里说：记住，我的项目简介控制在一百字以内。 | 可见正文/标签；div.memory-note ← section.memory-page.page-scroll | `frontend/src/App.tsx:1419` |

### 补充信息 Sheet

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F132 | 补充信息 | 属性 aria-label；form.dialog ← Sheet | `frontend/src/App.tsx:1431` |
| F133 | 补充信息 | 可见正文/标签；h2 ← div.dialog-heading | `frontend/src/App.tsx:1435` |
| F134 | 关闭补充信息 | 属性 aria-label；button.icon-button ← div.dialog-heading | `frontend/src/App.tsx:1439` |
| F135 | 待补内容 | 可见正文/标签；label ← div.sheet-body | `frontend/src/App.tsx:1449` |
| F136 | 保存为一份补充资料，填写结果中可以查看这份来源。 | 可见正文/标签；p.form-intro ← div.sheet-body | `frontend/src/App.tsx:1461` |
| F137 | 取消 | 可见正文/标签；button.secondary ← div.dialog-actions | `frontend/src/App.tsx:1476` |
| F138 | 保存中… | 状态、映射或默认值；button.primary ← div.dialog-actions | `frontend/src/App.tsx:1483` |
| F139 | 保存资料并继续 | 状态、映射或默认值；button.primary ← div.dialog-actions | `frontend/src/App.tsx:1483` |

### 工作资料 Sheet

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F140 | 工作资料 | 属性 aria-label；aside.inspector ← Sheet | `frontend/src/App.tsx:1501` |
| F141 | 工作资料 | 可见正文/标签；h2 ← div.inspector-header | `frontend/src/App.tsx:1504` |
| F142 | 关闭工作资料 | 属性 aria-label；button.icon-button ← div.inspector-header | `frontend/src/App.tsx:1507` |
| F143 | 资料 | 可见正文/标签；button ← div.inspector-tabs | `frontend/src/App.tsx:1518` |
| F144 | 本次结果 | 可见正文/标签；button ← div.inspector-tabs | `frontend/src/App.tsx:1524` |
| F145 | 待填写的表格 | 可见正文/标签；div.section-caption ← div.inspector-content | `frontend/src/App.tsx:1532` |
| F146 | 我的资料 | 可见正文/标签；div.section-caption ← div.inspector-content | `frontend/src/App.tsx:1552` |
| F147 | 添加资料后，Folio 就能在填表时查找相关信息。 | 可见正文/标签；p.panel-empty ← div.inspector-content | `frontend/src/App.tsx:1575` |
| F148 | 添加资料 | 可见正文/标签；button.add-source ← div.inspector-content | `frontend/src/App.tsx:1584` |
| F149 | 生成的文件会出现在这里，可查看内容和每一项的来源。 | 可见正文/标签；p ← div.panel-empty | `frontend/src/App.tsx:1604` |
| F150 | 条个人记忆可供使用 | 可见正文/标签；span ← div.inspector-bottom | `frontend/src/App.tsx:1610` |
| F151 | 查看个人记忆 | 属性 aria-label；button.icon-button ← div.inspector-bottom | `frontend/src/App.tsx:1613` |

### 设置保存通知

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F152 | 模型连接配置已保存 | Toast 通知；div | `frontend/src/App.tsx:1644` |

### 个人记忆 Sheet

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F153 | 个人记忆 | 属性 aria-label；form.dialog ← Sheet | `frontend/src/App.tsx:1654` |
| F154 | 个人记忆 | 可见正文/标签；h2 ← div.dialog-heading | `frontend/src/App.tsx:1658` |
| F155 | 关闭记忆编辑 | 属性 aria-label；button.icon-button ← div.dialog-heading | `frontend/src/App.tsx:1662` |
| F156 | 信息名称 | 可见正文/标签；label ← div.sheet-body | `frontend/src/App.tsx:1671` |
| F157 | 例如：专业、联系方式、写作偏好 | 属性 placeholder；label ← div.sheet-body | `frontend/src/App.tsx:1677` |
| F158 | 内容 | 可见正文/标签；label ← div.sheet-body | `frontend/src/App.tsx:1686` |
| F159 | 希望 Folio 记住的内容 | 属性 placeholder；label ← div.sheet-body | `frontend/src/App.tsx:1696` |
| F160 | 保存同名信息会更新原来的内容。 | 可见正文/标签；p.form-note ← div.sheet-body | `frontend/src/App.tsx:1699` |
| F161 | 取消 | 可见正文/标签；button.secondary ← div.dialog-actions | `frontend/src/App.tsx:1713` |
| F162 | 保存记忆 | 可见正文/标签；button.primary ← div.dialog-actions | `frontend/src/App.tsx:1723` |

### 文档与结果预览

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F163 | 文档预览 | 属性 aria-label；section.preview-dialog ← Sheet | `frontend/src/App.tsx:1735` |
| F164 | 返回结果 | 属性 aria-label；button.icon-button ← div.dialog-heading | `frontend/src/App.tsx:1741` |
| F165 | 读取文档 | 状态、映射或默认值；h2 ← div | `frontend/src/App.tsx:1748` |
| F166 | 生成结果与来源 | 状态、映射或默认值；span ← div | `frontend/src/App.tsx:1750` |
| F167 | 文档内容 | 状态、映射或默认值；span ← div | `frontend/src/App.tsx:1750` |
| F168 | 关闭文档预览 | 属性 aria-label；button.icon-button ← div.dialog-heading | `frontend/src/App.tsx:1755` |
| F169 | 预览内容 | 属性 aria-label；div.preview-tabs ← section.preview-dialog | `frontend/src/App.tsx:1765` |
| F170 | 填写依据 | 可见正文/标签；button ← div.preview-tabs | `frontend/src/App.tsx:1771` |
| F171 | 文件内容 | 可见正文/标签；button ← div.preview-tabs | `frontend/src/App.tsx:1777` |
| F172 | 读取中… | 可见正文/标签；div.loading ← div.preview-scroll | `frontend/src/App.tsx:1789` |
| F173 | 填写内容与依据 | 可见正文/标签；h3 ← div.evidence-report | `frontend/src/App.tsx:1795` |
| F174 | 原始资料 | 状态、映射或默认值；span ← button.citation | `frontend/src/App.tsx:1825` |
| F175 | 待补充 | 可见正文/标签；h3 ← div.desk-heading | `frontend/src/App.tsx:1836` |
| F176 | 补充这些信息 | 可见正文/标签；button ← div.desk-heading | `frontend/src/App.tsx:1845` |
| F177 | 此文件没有可显示的正文。 | 可见正文/标签；p.panel-empty ← div.preview-scroll | `frontend/src/App.tsx:1862` |
| F178 | 上一页内容 | 属性 aria-label；button.icon-button ← div | `frontend/src/App.tsx:1873` |
| F179 | – | 可见正文/标签；span ← div | `frontend/src/App.tsx:1884` |
| F180 | / | 可见正文/标签；span ← div | `frontend/src/App.tsx:1889` |
| F181 | 下一页内容 | 属性 aria-label；button.icon-button ← div | `frontend/src/App.tsx:1893` |
| F182 | 根据我的资料填写这份表格，缺少的信息请告诉我。 | 自动填入输入框的草稿；button.primary ← div.preview-footer | `frontend/src/App.tsx:1918` |
| F183 | 用这份表格开始 | 可见正文/标签；button.primary ← div.preview-footer | `frontend/src/App.tsx:1923` |
| F184 | 下载文件 | 可见正文/标签；a.primary ← div.preview-footer | `frontend/src/App.tsx:1931` |
| F185 | 下载原文件 | 可见正文/标签；a.secondary ← div.preview-footer | `frontend/src/App.tsx:1939` |

### 结果文件卡片

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F186 | `` `${count} 项内容${sourceCount ? ` · 来自 ${sourceCount} 份资料` : ""}` `` | 状态、映射或默认值；small ← span | `frontend/src/App.tsx:1978` |
| F187 | 查看文档 | 状态、映射或默认值；small ← span | `frontend/src/App.tsx:1979` |
| F188 | `` ` · ${missing} 项待补` `` | 状态、映射或默认值；small ← span | `frontend/src/App.tsx:1980` |
| F189 | 补充信息 | 可见正文/标签；button.artifact-continue ← div.artifact | `frontend/src/App.tsx:1986` |
| F190 | `` `下载 ${artifact.name}` `` | 属性 aria-label；a.icon-button ← div.artifact | `frontend/src/App.tsx:1992` |

### 处理过程

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F191 | 记录读取失败 | 错误提示 | `frontend/src/App.tsx:2035` |
| F192 | 正在查阅与处理 | 状态、映射或默认值；summary ← details.activity | `frontend/src/App.tsx:2047` |
| F193 | 查看处理过程 | 状态、映射或默认值；summary ← details.activity | `frontend/src/App.tsx:2047` |
| F194 | 项操作 | 可见正文/标签；span ← summary | `frontend/src/App.tsx:2049` |
| F195 | `` `委派${agentNames[e.payload.subagent_type \|\| ""] \|\| e.payload.subagent_type}` `` | 状态、映射或默认值；span ← div | `frontend/src/App.tsx:2079` |
| F196 | 这项回复没有使用文档工具。 | 可见正文/标签；p ← div | `frontend/src/App.tsx:2091` |

### 设置 Sheet

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F197 | 保存失败 | 错误提示 | `frontend/src/App.tsx:2139` |
| F198 | 设置 | 属性 aria-label；form.dialog ← Sheet | `frontend/src/App.tsx:2150` |
| F199 | 设置 | 可见正文/标签；h2 ← div.dialog-heading | `frontend/src/App.tsx:2154` |
| F200 | 关闭设置 | 属性 aria-label；button.icon-button ← div.dialog-heading | `frontend/src/App.tsx:2158` |
| F201 | 设置分类 | 属性 aria-label；div.settings-tabs ← form.dialog | `frontend/src/App.tsx:2165` |
| F202 | 外观与空间 | 可见正文/标签；button ← div.settings-tabs | `frontend/src/App.tsx:2172` |
| F203 | 模型连接 | 可见正文/标签；button ← div.settings-tabs | `frontend/src/App.tsx:2180` |
| F204 | 外观 | 可见正文/标签；label.appearance-setting ← div.sheet-body | `frontend/src/App.tsx:2187` |
| F205 | 外观 | 属性 aria-label；select ← label.appearance-setting | `frontend/src/App.tsx:2191` |
| F206 | 跟随系统 | 可见正文/标签；option ← select | `frontend/src/App.tsx:2193` |
| F207 | 浅色 | 可见正文/标签；option ← select | `frontend/src/App.tsx:2194` |
| F208 | 深色 | 可见正文/标签；option ← select | `frontend/src/App.tsx:2195` |
| F209 | 办公空间 | 可见正文/标签；legend ← fieldset.environment-picker | `frontend/src/App.tsx:2199` |
| F210 | 窗边会议室 | 状态、映射或默认值；div.environment-options ← fieldset.environment-picker | `frontend/src/App.tsx:2204` |
| F211 | 玻璃办公区 | 状态、映射或默认值；div.environment-options ← fieldset.environment-picker | `frontend/src/App.tsx:2209` |
| F212 | 完成 | 可见正文/标签；button.primary ← div.dialog-actions | `frontend/src/App.tsx:2233` |
| F213 | 服务地址 | 可见正文/标签；label ← div.sheet-body | `frontend/src/App.tsx:2241` |
| F214 | https://api.deepseek.com | 属性 placeholder；label ← div.sheet-body | `frontend/src/App.tsx:2248` |
| F215 | 模型名称 | 可见正文/标签；label ← div.sheet-body | `frontend/src/App.tsx:2252` |
| F216 | deepseek-chat | 属性 placeholder；label ← div.sheet-body | `frontend/src/App.tsx:2258` |
| F217 | API Key | 可见正文/标签；label ← div.sheet-body | `frontend/src/App.tsx:2262` |
| F218 | 已保存，留空则继续使用 | 属性 placeholder；label ← div.sheet-body | `frontend/src/App.tsx:2271` |
| F219 | 输入服务商提供的 API Key | 属性 placeholder；label ← div.sheet-body | `frontend/src/App.tsx:2272` |
| F220 | 支持 DeepSeek 及兼容接口。密钥保存在本机服务端。 | 可见正文/标签；p.form-note ← div.sheet-body | `frontend/src/App.tsx:2277` |
| F221 | 取消 | 可见正文/标签；button.secondary ← div.dialog-actions | `frontend/src/App.tsx:2292` |
| F222 | 保存连接 | 可见正文/标签；button.primary ← div.dialog-actions | `frontend/src/App.tsx:2298` |

### 文档阅读组件

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F223 | `` `${name} · 表格内容` `` | 属性 aria-label；table ← div.worksheet-scroll | `frontend/src/DocumentContent.tsx:62` |
| F224 | 行号 | 属性 aria-label；tr ← thead | `frontend/src/DocumentContent.tsx:65` |
| F225 | — | 可见正文/标签；span.empty-cell ← td | `frontend/src/DocumentContent.tsx:91` |
| F226 | `` `文档表格 ${Number(tableId) + 1}` `` | 属性 aria-label；table ← div.word-table-scroll | `frontend/src/DocumentContent.tsx:139` |
| F227 | — | 可见正文/标签；span.empty-cell ← td | `frontend/src/DocumentContent.tsx:154` |
| F228 | 空白 | 可见正文/标签；span.empty-cell ← div | `frontend/src/DocumentContent.tsx:172` |

### 状态、默认值、提示与自动草稿

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F229 | [aria-label="打开资料面板"] | 状态、映射或默认值 | `frontend/src/Sheet.tsx:76` |
| F230 | [aria-label="打开会话列表"] | 状态、映射或默认值 | `frontend/src/Sheet.tsx:78` |

### 接口错误兜底

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F231 | `` `请求失败 (${response.status})` `` | 状态、映射或默认值 | `frontend/src/api.ts:66` |

### 浏览器标题

| 编号 | 当前原文 | 类型 / 元素 | 源码位置 |
| --- | --- | --- | --- |
| F232 | Folio · 我的文档 Agent | 浏览器标签页标题；title | `frontend/index.html:10` |

## 8. 后端消息与文件名源清单

这些消息通过接口、失败状态、处理记录或模型回复进入界面。包含原来的技术参数与数值限制，改写时保留其含义。文件名规则可以调整描述部分，扩展名仍需符合真实文件类型。

共 50 处记录。重复消息保留不同调用位置。

### src/folio/api.py

| 编号 | 当前原文 | 类型 | 源码位置 |
| --- | --- | --- | --- |
| B001 | 模型调用失败，请检查服务端日志与模型配置 | 错误或状态消息 | `src/folio/api.py:106` |
| B002 | 服务重启，任务中断 | 错误或状态消息 | `src/folio/api.py:116` |
| B003 | 模型服务地址不合法 | 异常/接口错误 | `src/folio/api.py:179` |
| B004 | 请使用 HTTPS 地址，本地模型可以使用 HTTP | 异常/接口错误 | `src/folio/api.py:183` |
| B005 | 请等待正在执行的任务结束后修改模型 | 异常/接口错误 | `src/folio/api.py:186` |
| B006 | 模型名称不能为空 | 异常/接口错误 | `src/folio/api.py:193` |
| B007 | 标题和内容不能为空 | 异常/接口错误 | `src/folio/api.py:231` |
| B008 | 支持 docx、xlsx、md、txt | 异常/接口错误 | `src/folio/api.py:249` |
| B009 | 模板支持 docx、xlsx | 异常/接口错误 | `src/folio/api.py:251` |
| B010 | 文件超过上传大小限制 | 异常/接口错误 | `src/folio/api.py:254` |
| B011 | 文件损坏或内容无法解析 | 异常/接口错误 | `src/folio/api.py:260` |
| B012 | 请在 .env 中配置 FOLIO_API_KEY 后重启服务 | 异常/接口错误 | `src/folio/api.py:283` |
| B013 | 任务队列已满，请稍后重试 | 异常/接口错误 | `src/folio/api.py:285` |
| B014 | 分页参数不合法 | 异常/接口错误 | `src/folio/api.py:328` |

### src/folio/store.py

| 编号 | 当前原文 | 类型 | 源码位置 |
| --- | --- | --- | --- |
| B015 | 工作区不存在 | 异常/接口错误 | `src/folio/store.py:75` |
| B016 | 对话不存在 | 异常/接口错误 | `src/folio/store.py:106` |
| B017 | 文档不存在 | 异常/接口错误 | `src/folio/store.py:183` |
| B018 | template_id 必须指向模板文件 | 异常/接口错误 | `src/folio/store.py:231` |
| B019 | 请等待当前对话回复完成 | 异常/接口错误 | `src/folio/store.py:242` |
| B020 | 任务不存在 | 异常/接口错误 | `src/folio/store.py:262` |
| B021 | 产物不存在 | 异常/接口错误 | `src/folio/store.py:312` |

### src/folio/tools.py

| 编号 | 当前原文 | 类型 | 源码位置 |
| --- | --- | --- | --- |
| B022 | 引用必须来自资料文件 | 异常/接口错误 | `src/folio/tools.py:35` |
| B023 | f"引用原文不匹配：{citation.document_id}/{citation.address}" | 动态文本或文件名 | `src/folio/tools.py:38` |
| B024 | offset >= 0，limit 在 1 到 100 之间 | 异常/接口错误 | `src/folio/tools.py:42` |
| B025 | 提供至少一个关键词，limit 在 1 到 50 之间 | 异常/接口错误 | `src/folio/tools.py:55` |
| B026 | 只能填写当前任务指定的模板 | 异常/接口错误 | `src/folio/tools.py:95` |
| B027 | 没有可填写的字段，请向用户说明缺少哪些资料 | 异常/接口错误 | `src/folio/tools.py:98` |
| B028 | f"写回校验失败：{patch.address}" | 动态文本或文件名 | `src/folio/tools.py:116` |
| B029 | f"{Path(doc['name']).stem} · 已填写{output.suffix}" | 动态文本或文件名 | `src/folio/tools.py:117` |
| B030 | 至少提供一个提取字段 | 异常/接口错误 | `src/folio/tools.py:125` |
| B031 | 提取结果.json | 产物文件名 | `src/folio/tools.py:131` |
| B032 | 文档编辑支持 docx、txt、md | 异常/接口错误 | `src/folio/tools.py:149` |
| B033 | 段落索引超出范围 | 异常/接口错误 | `src/folio/tools.py:170` |
| B034 | alignment 支持 left、center、right | 异常/接口错误 | `src/folio/tools.py:182` |
| B035 | 没有找到待替换文本 | 异常/接口错误 | `src/folio/tools.py:185` |
| B036 | 纯文本文件仅支持非空文本替换 | 异常/接口错误 | `src/folio/tools.py:189` |
| B037 | 没有找到待替换文本 | 异常/接口错误 | `src/folio/tools.py:198` |
| B038 | 只有用户明确要求记住时才可写入个人记忆 | 错误或状态消息 | `src/folio/tools.py:275` |
| B039 | 记忆标题或内容长度不合法 | 错误或状态消息 | `src/folio/tools.py:277` |
| B040 | 分页参数不合法 | 异常/接口错误 | `src/folio/tools.py:292` |

### src/folio/documents.py

| 编号 | 当前原文 | 类型 | 源码位置 |
| --- | --- | --- | --- |
| B041 | 支持 txt、md、docx、xlsx | 异常/接口错误 | `src/folio/documents.py:18` |
| B042 | 解压后文档超过 100MB | 异常/接口错误 | `src/folio/documents.py:22` |
| B043 | 文档块数超过上限 | 异常/接口错误 | `src/folio/documents.py:28` |
| B044 | 工作表范围过大，请清理多余行列 | 异常/接口错误 | `src/folio/documents.py:57` |
| B045 | 文档文本超过上限 | 异常/接口错误 | `src/folio/documents.py:65` |
| B046 | f"重复写入位置：{address}" | 动态文本或文件名 | `src/folio/documents.py:90` |
| B047 | f"不存在的位置：{address}" | 动态文本或文件名 | `src/folio/documents.py:93` |
| B048 | f"位置包含原有内容，禁止覆盖：{address}" | 动态文本或文件名 | `src/folio/documents.py:95` |
| B049 | 填写模板支持 docx 和 xlsx | 异常/接口错误 | `src/folio/documents.py:123` |

### src/folio/agent.py

| 编号 | 当前原文 | 类型 | 源码位置 |
| --- | --- | --- | --- |
| B050 | 请在 .env 中配置 FOLIO_API_KEY | 异常/接口错误 | `src/folio/agent.py:45` |

## 9. 源码快照索引

清单来自当前代码；以下哈希用于识别这份文案表对应的版本。

| 文件 | SHA-256（前 12 位） |
| --- | --- |
| `frontend/index.html` | `00ad12689ea1` |
| `frontend/src/App.tsx` | `d1699f22d61d` |
| `frontend/src/DocumentContent.tsx` | `54aacbd68618` |
| `frontend/src/Sheet.tsx` | `250809ab6efc` |
| `frontend/src/api.ts` | `c70aa66b297d` |
| `src/folio/api.py` | `5b0538e583b5` |
| `src/folio/store.py` | `cf37715c556f` |
| `src/folio/tools.py` | `d331d4185725` |
| `src/folio/documents.py` | `1c505a828e59` |
| `src/folio/agent.py` | `9621d96c651b` |
