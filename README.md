# Folio · 个人文档 Agent

基于 **Deep Agents** 的个人文档工作台。上传个人资料与企业表格，用自然语言要求 Agent 查找信息、填写模板、提取数据或修改文档，生成可下载的文件和来源报告。持续对话、个人记忆和来源审阅都接入真实后端。

个人使用场景及演示见 [personal-agent.md](docs/personal-agent.md)。

选型依据见 [harness-selection.md](docs/harness-selection.md)，界面参考见 [DESIGN-REFERENCES.md](DESIGN-REFERENCES.md)。前端参考 Student-Agent 的组织方式重新实现。

## 已实现

- 按工作区保存资料，支持 `docx/xlsx/md/txt`，每个内容块有稳定地址。
- 九个领域工具：列资料、分页阅读、搜索资料、填写模板、保存提取、编辑文档、读取记忆、保存用户明确要求记住的信息、查看上次产物。
- 主 Agent 按需委派资料查证与模板审查两类只读子 Agent，工具记录标明执行者。
- 同一会话复用 SQLite checkpoint，连续追问承接历史；前端刷新后恢复选中的会话。
- 个人信息与偏好可以直接编辑，也可通过对话明确要求记住；更新后旧版本归档。
- Word 表格/段落占位符和 Excel 空白/占位符填写，保留基础格式、合并单元格及原有公式。
- 填写项记录原文位置和引用，校验引用确实存在；生成后重新读取并核对写入值。
- 文本替换，Word 指定段落加粗、左/中/右对齐。
- 提取结果以带来源的 JSON 产物保存，字段同时记录在 SQLite 产物表的 report 中。
- 异步任务、增量执行事件、产物下载、SQLite graph checkpoint。
- 两个执行线程，最多八项运行或排队任务；重启后将未结束任务标为 interrupted。

这是单用户本地开发版本。工作区负责资料分组；API 尚未加入账号认证。资料和确认过的记忆跨会话复用，每个会话保留独立上下文。

## 课设汇报

[23 组前期汇报 HTML](presentation/%EF%BC%88%E5%B7%A6%E5%8F%B3%E9%94%AE%E5%88%87%E6%8D%A2%EF%BC%8923%E7%BB%84%E9%AB%98%E7%84%B1%2B%E8%92%8B%E5%BE%90%E6%9D%B0.html) 为单文件幻灯片，下载后可直接用浏览器打开。共 14 页，包含校园需求分析、业务流程与用例、Personal Agent 与文档专精方案、真实前端演示、技术架构、成员分工和开发进度。

右方向键、空格或点击推进，左方向键回退，支持触摸滑动；`F` 全屏、`O` 目录、`N` 逐页讲稿。手机资料汇入动画按阶段推进；Demo 复用真实 React 界面，以固定资料逐步演示填写、来源核对与补充续填，每次点击只推进一步，`R` 重置 Demo。

## 启动

需要 Python 3.12+ 和 [uv](https://docs.astral.sh/uv/getting-started/installation/)。

```bash
uv sync
npm ci --prefix frontend
npm --prefix frontend run build
uv run uvicorn folio.api:app --host 127.0.0.1 --port 8000
```

打开 [Folio 工作台](http://127.0.0.1:8000)，在设置中填写模型服务地址、模型名与 API Key，保存后立即生效。默认 DeepSeek。设置保存在本机 `data/provider.json`，接口不会返回密钥。

外观跟随系统，也可以在设置中切换浅色或深色；支持选择两种本地实拍办公背景，刷新后保留。照片来源见 [办公环境资源](docs/office-environments.md)。桌面采用悬浮胶囊导航和圆角主面板，工作资料按需展开；移动端保留悬浮输入框和底部导航。

也可复制 `.env.example` 为 `.env`，配置 `FOLIO_MODEL/FOLIO_BASE_URL/FOLIO_API_KEY`。网页保存的配置优先于环境配置。[API 调试页](http://127.0.0.1:8000/docs) 继续可用。

未填密钥也能启动、上传和查看文件；提交 Agent 任务时返回明确的 503 配置提示。

前端开发模式：后端运行时执行 `npm --prefix frontend run dev`，访问 Vite 输出的本地地址。API 请求代理至 8000 端口。正式预览由 FastAPI 直接提供构建后的前端，只需要一个端口。

### 演示流程

```bash
# 创建个人工作区，上传四种格式的虚构员工资料和 Excel 模板，运行并下载结果
uv run python scripts/demo.py

# 只上传演示资料并打印后续任务的请求参数
uv run python scripts/demo.py --prepare-only
```

默认下载至 `data/demo-result.xlsx`。演示资料为虚构数据。

## API

路径中的 `w` 是工作区 ID。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/health` | 服务与模型配置状态 |
| GET / PUT | `/api/settings` | 读取 / 保存模型配置，密钥只写 |
| POST | `/api/settings/models` | 使用当前填写的 Base URL / API Key 获取 OpenAI 兼容模型列表，不保存配置 |
| GET | `/api/workspaces` | 个人空间列表 |
| POST | `/api/workspaces` | 创建工作区，JSON：`{"name":"我的资料"}` |
| GET / POST | `/api/workspaces/{w}/conversations` | 列出 / 创建会话，创建时传 `{"name":"新对话"}` |
| GET | `/api/workspaces/{w}/conversations/{id}` | 完整会话与每轮产物 |
| GET / PUT | `/api/workspaces/{w}/memories` | 列出 / 更新个人记忆，更新时传 `{"label":"专业","value":"软件工程"}` |
| POST | `/api/workspaces/{w}/documents` | multipart：`file`、`role=source或template` |
| GET | `/api/workspaces/{w}/documents` | 文件列表 |
| GET | `/api/workspaces/{w}/documents/{id}?offset=0&limit=60` | 查看内容及地址 |
| GET | `/api/workspaces/{w}/documents/{id}/download` | 下载原始文件 |
| POST | `/api/workspaces/{w}/tasks` | 提交任务，返回 202 |
| GET | `/api/workspaces/{w}/tasks/{id}` | 状态、最终回复、产物及下载地址 |
| GET | `/api/workspaces/{w}/tasks/{id}/events?after=0` | 按 seq 增量读取工具执行记录 |
| GET | `/api/workspaces/{w}/artifacts/{id}/download` | 下载产物 |
| GET | `/api/workspaces/{w}/artifacts/{id}` | 分页查看产物及来源报告 |

填表任务请求：

```json
{
  "instruction": "按我的资料填表，项目经历控制在100字以内，找不到的内容留空。",
  "template_id": "上传模板得到的id",
  "conversation_id": "创建会话得到的id"
}
```

信息提取或文档编辑任务可省略 `template_id`，在指令中给出文件名称或 ID。
同一会话默认沿用上次模板；传 `clear_template: true` 清除模板。省略 `conversation_id` 可继续使用独立任务模式。

状态：`queued → running → completed/failed`，服务重启可能变为 `interrupted`。
任务结束只表示 Agent 执行结束；具体生成的文件与缺项在 `artifacts[].report` 中。

## 结构

```text
src/folio/
  agent.py       Deep Agents 精简配置、系统指令、模型适配
  tools.py       文档与记忆工具、引用验证、产物报告
  documents.py   四种格式解析、稳定地址、模板局部写回
  store.py       SQLite 和本地资料持久化
  api.py         FastAPI、后台任务、执行事件与下载
  config.py      环境配置
scripts/demo.py  四格式演示资料及完整 API 客户端
frontend/        React + TypeScript + Vite 工作台
tests/           真实 harness 调度与文档读写测试
```

## 当前支持边界

- Word 读取正文段落和顶层表格；复杂嵌套表格、文本框和页眉页脚需扩展解析器。
- 模板写入只覆盖空白或完整的 `{{字段名}}` 占位符，保护标签和公式。编辑工具可按用户指令替换文字。
- Excel 使用结构化地址，没有视觉模型；暂不计算新公式或渲染图表。
- 搜索采用关键词与同义词多次查询，模型可以分页阅读；未引入向量库或 OCR。
- Word 填写/替换保留首个 run 的格式；跨 run 混合样式会归并为首个 run 的格式。
- checkpoint 落盘保存，服务重启后不会自动恢复正在执行的任务。

## 验证

```bash
uv run pytest -q
uv run ruff check src tests scripts
npm --prefix frontend run build
```

测试使用脚本模型驱动真实 Deep Agents graph 和工具调用，覆盖上传、检索、Word/Excel 填写、下载、来源校验、模板保护、格式保留、跨工作区访问隔离、提取及编辑。测试不向外部模型发送请求；真实模型运行使用上述演示脚本。

还覆盖连续对话、重启后历史与记忆恢复、子 Agent 的只读工具边界、并发会话保护、模板清除和模型配置持久化。

浏览器验收使用 `uv run python tests/ui_server.py` 启动独立的 8001 端口临时环境，模型明确标记为 `scripted-ui-test`。数据放在临时目录，与正常工作台隔离；`/__qa/mobile` 提供 390px iframe 预览。验收记录见 [docs/verification.md](docs/verification.md)。
