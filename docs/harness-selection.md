# 后端 harness 选型记录

日期：2026-11-03。目标是个人文档资料复用、自然语言文档操作及多源填表，优先本地课设部署。

## 调研结果

| 项目 | 可以复用的能力 | 本次处理 |
| --- | --- | --- |
| [Deep Agents](https://github.com/langchain-ai/deepagents) | 完整工具执行循环、上下文压缩、虚拟文件系统、LangGraph 状态与 checkpoint | 直接作为依赖使用，定制工具与配置，不 fork 整个仓库 |
| [CRAFT](https://github.com/Glllllly/CRAFT) | 多源证据驱动的 Excel 填表、结构与视觉双视图、反思与局部修复 | 最贴近填表的垂直方案；README 说明需要本地视觉推理及 Torch、Transformers、PaddleOCR，部分渲染依赖平台。先借鉴证据定位和写后验证流程，不引入重模型 |
| [DocETL](https://github.com/ucbepic/docetl) | 文档集合的 map/reduce/filter/resolve 等处理与优化 | 更适合批量抽取与实体归并；目前单人资料和填表流程无需引入整套 ETL 优化层 |
| [Pydantic AI](https://github.com/pydantic/pydantic-ai) | 类型化工具、结构化输出、可组合的 harness 能力 | 可行备选；本次选定 Deep Agents，减少同时维护两套运行时 |
| [SmartAgent](https://github.com/chen-hong-yu666/SmartAgent) | 同题目的文档解析、提取和填表模块划分 | 只参考功能划分；不复制它的前端和后端代码 |

以上依据各项目 README 和 Deep Agents 的 graph/profile/filesystem 实现。没有把其他项目 README 中的准确率和耗时当作本项目测试结果。

## 实际精简

- 使用 `create_deep_agent`，保留上游模型调用、工具调度、上下文管理及 SQLite checkpoint。
- 用 `HarnessProfile` 关闭默认 general-purpose subagent，注册资料查证和模板审查两个专用只读子 Agent。由主 Agent 按需决定委派。
- 文件系统工具仅保留 `ls/read_file/write_file`，操作的是上游 StateBackend 虚拟文件，用于上下文卸载。
- 不提供 shell、任意 Python 执行、通用文件编辑、联网搜索和浏览器工具。
- 原始文档通过应用工具访问；Agent 只接触当前工作区的数据和 ID。
- 接入九个领域工具：原来的六个文档工具，以及读取个人记忆、按用户要求保存记忆、查看上次产物。
- 上传资料和个人记忆持续保存在 SQLite 与本地文件中；会话复用 graph thread，checkpoint 保存历史模型消息与工具结果。独立任务接口继续支持。

## 项目负责的领域代码

文档地址索引、来源引用校验、Word/Excel 局部写回、产物管理和 HTTP API 属于本项目适配层。
读写底层复用 `python-docx` 和 `openpyxl`。未复制上游代码，第三方库通过依赖与 `uv.lock` 记录。

## 后续扩展位置

1. 首先用真实资料运行模型，收集错填的字段、模板结构与工具轨迹。
2. 表格结构识别不足时，再评估接入 CRAFT 的区域识别与局部修复。
3. 资料增多后，可在 `search_sources` 后替换为混合检索；工具协议及产物协议可保持不变。
4. 多份资料需要批量归并时，再评估 DocETL 的 map/resolve/reduce。
5. 前端已参考 Student-Agent 的会话组织方式实现，包含资料、记忆、任务进度、来源审阅和产物下载。
