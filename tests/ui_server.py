"""Isolated browser acceptance server. Uses a scripted model and temporary data only.

Run: uv run python tests/ui_server.py
Never points at the normal data/ directory or changes the user's model configuration.
"""

import io
import tempfile
from pathlib import Path

import uvicorn
from langchain_core.messages import AIMessage
from openpyxl import load_workbook
from starlette.responses import HTMLResponse
from starlette.routing import Route
from test_workflow import ScriptedModel, call, template

from folio.api import create_app
from folio.config import Settings


def main():
    with tempfile.TemporaryDirectory(prefix="folio-ui-") as directory:
        settings = Settings(data_dir=Path(directory), model="scripted-ui-test", api_key="")

        class UIScriptedModel(ScriptedModel):
            def _generate(self, messages, stop=None, run_manager=None, **kwargs):
                if self.calls == 7:
                    supplements = [d for d in store.documents(workspace) if "补充资料" in d["name"]]
                    if supplements:
                        extra = store.document(workspace, supplements[-1]["id"])
                        block = extra["blocks"][0]
                        phone = block["text"].split("：", 1)[-1].strip()
                        with store.connect() as conn:
                            previous = conn.execute(
                                "SELECT id FROM artifacts WHERE workspace=? "
                                "ORDER BY rowid DESC LIMIT 1",
                                (workspace,),
                            ).fetchone()[0]
                        self.responses[7:] = [
                            call("read_output", {"artifact_id": previous}, 7),
                            call("read_document", {"document_id": extra["id"]}, 8),
                            call(
                                "fill_template",
                                {
                                    "template_id": form["id"],
                                    "patches": [
                                        {
                                            "address": "登记表!B1",
                                            "value": "李明",
                                            "sources": [
                                                {
                                                    "document_id": source["id"],
                                                    "address": "line:0/offset:0",
                                                    "quote": "姓名：李明",
                                                }
                                            ],
                                        },
                                        {
                                            "address": "登记表!B3",
                                            "value": phone,
                                            "sources": [
                                                {
                                                    "document_id": extra["id"],
                                                    "address": block["address"],
                                                    "quote": block["text"],
                                                }
                                            ],
                                        },
                                    ],
                                    "missing": [],
                                },
                                9,
                            ),
                            AIMessage(
                                content="联系电话已补入，姓名保持原值。新文件附有两项填写依据。"
                            ),
                        ]
                return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

        model = UIScriptedModel(
            model="scripted-ui-test", api_key="local-test", profile={"max_input_tokens": 64000}
        )
        app = create_app(settings, model=model)

        async def mobile_preview(request):
            return HTMLResponse("""<!doctype html><html><head><meta charset="utf-8">
            <title>Folio 移动端验收 · 390px</title></head>
            <body style="margin:0;background:#080b12;display:flex;justify-content:center">
            <iframe title="390像素移动端" src="/" width="390" height="844"
              style="border:0;flex-shrink:0"></iframe></body></html>""")

        app.router.routes.insert(0, Route("/__qa/mobile", mobile_preview))
        store = app.state.store
        workspace = store.create_workspace("界面验收 · 演示资料")["id"]
        source = store.add_document(
            workspace,
            "个人简历.md",
            "source",
            "姓名：李明\n专业：软件工程\n院校：金陵科技学院".encode(),
        )
        form_bytes = io.BytesIO(template(".xlsx"))
        book = load_workbook(form_bytes)
        book.active["A3"] = "联系电话"
        book.active["B3"] = "{{联系电话}}"
        output = io.BytesIO()
        book.save(output)
        book.close()
        form = store.add_document(workspace, "企业登记表.xlsx", "template", output.getvalue())
        model.responses = [
            call("list_documents", {}, 1),
            call(
                "task",
                {
                    "subagent_type": "evidence-reader",
                    "description": "核对个人简历中的姓名并返回原文位置",
                },
                2,
            ),
            call("read_document", {"document_id": source["id"]}, 3),
            AIMessage(
                content=f"姓名为李明。document_id={source['id']}，"
                "address=line:0/offset:0，quote=姓名：李明。"
            ),
            call("read_document", {"document_id": form["id"]}, 4),
            call(
                "fill_template",
                {
                    "template_id": form["id"],
                    "patches": [
                        {
                            "address": "登记表!B1",
                            "value": "李明",
                            "sources": [
                                {
                                    "document_id": source["id"],
                                    "address": "line:0/offset:0",
                                    "quote": "姓名：李明",
                                }
                            ],
                        }
                    ],
                    "missing": ["联系电话"],
                },
                5,
            ),
            AIMessage(
                content="登记表已填好，姓名填写为 **李明**。\n\n"
                "联系电话还没有资料，已留空。可以补充后继续填写。"
            ),
            call("read_document", {"document_id": source["id"]}, 6),
            AIMessage(content="已再次核对，姓名 **李明** 与个人简历一致。"),
        ]
        uvicorn.run(app, host="127.0.0.1", port=8001)


if __name__ == "__main__":
    main()
