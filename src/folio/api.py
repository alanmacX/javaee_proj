import json
import logging
import os
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from threading import BoundedSemaphore
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from langgraph.checkpoint.sqlite import SqliteSaver
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from folio.agent import build_agent
from folio.config import Settings
from folio.documents import SUPPORTED
from folio.store import ConversationBusy, Store
from folio.tools import DocumentTools

logger = logging.getLogger(__name__)


class WorkspaceInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class TaskInput(BaseModel):
    instruction: str = Field(min_length=1, max_length=12000)
    template_id: str | None = None
    conversation_id: str | None = None
    clear_template: bool = False


class MemoryInput(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=4000)


class ProviderInput(BaseModel):
    model: str = Field(min_length=1, max_length=200)
    base_url: str = Field(min_length=1, max_length=1000)
    api_key: str = Field(default="", max_length=2000)


def create_app(settings: Settings | None = None, model=None):
    settings = settings or Settings()
    store = Store(settings.data_dir)
    provider_file = store.root / "provider.json"
    if provider_file.exists() and model is None:
        saved = json.loads(provider_file.read_text())
        settings.model = saved["model"]
        settings.base_url = saved["base_url"]
        settings.api_key = saved["api_key"]

    def run_task(workspace, task_id):
        task = store.task(workspace, task_id)
        store.set_task(task_id, "running")
        store.event(task_id, "status", {"status": "running"})
        try:
            tools = DocumentTools(store, workspace, task_id)
            # Each task owns a persistent graph thread; sources persist across tasks.
            with sqlite3.connect(
                store.root / "checkpoints.sqlite", check_same_thread=False
            ) as conn:
                agent = build_agent(settings, tools, SqliteSaver(conn), model=model)
                prompt = task["request"]
                if task["template_id"]:
                    prompt += f"\n当前任务模板 ID：{task['template_id']}"
                config = {
                    "configurable": {"thread_id": task["conversation_id"] or task_id},
                    "recursion_limit": settings.max_steps,
                }
                for namespace, update in agent.stream(
                    {"messages": [{"role": "user", "content": prompt}]},
                    config,
                    stream_mode="updates",
                    subgraphs=True,
                ):
                    for payload in update.values():
                        if not isinstance(payload, dict):
                            continue
                        for message in payload.get("messages", []):
                            if message.type == "ai":
                                if message.content and not namespace:
                                    store.event(
                                        task_id, "assistant_message", {"text": message.content}
                                    )
                                for call in message.tool_calls:
                                    if call["name"] == "task":
                                        store.event(task_id, "delegation", call["args"])
                state = agent.get_state(config).values
                result = {
                    "message": state["messages"][-1].content,
                    "artifacts": store.artifacts(workspace, task_id),
                }
                store.set_task(task_id, "completed", result=result)
                store.event(task_id, "status", {"status": "completed"})
        except Exception:
            logger.exception("Task %s failed", task_id)
            # Never return provider exception strings: they may contain request metadata.
            error = "模型请求失败，请检查接口配置或查看终端日志"
            store.set_task(task_id, "failed", error=error)
            store.event(task_id, "status", {"status": "failed", "error": error})

    @asynccontextmanager
    async def lifespan(app):
        with store.connect() as conn:
            conn.execute(
                "UPDATE tasks SET status='interrupted',error=? "
                "WHERE status IN ('queued','running')",
                ("服务已重启，当前任务中断，请重新发送",),
            )
        app.state.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="folio")
        app.state.slots = BoundedSemaphore(8)
        yield
        app.state.executor.shutdown(wait=True, cancel_futures=False)

    app = FastAPI(title="Folio Document Agent", version="0.2.0", lifespan=lifespan)
    app.state.store = store

    @app.exception_handler(KeyError)
    async def not_found(request, exc):
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=404, content={"detail": str(exc.args[0])})

    @app.exception_handler(ValueError)
    async def invalid(request, exc):
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(ConversationBusy)
    async def busy(request, exc):
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "harness": "deepagents",
            "model": settings.model,
            "model_configured": bool(settings.api_key or model),
        }

    @app.post("/api/workspaces", status_code=201)
    def create_workspace(body: WorkspaceInput):
        return store.create_workspace(body.name)

    @app.get("/api/workspaces")
    def workspaces():
        return store.workspaces()

    @app.get("/api/settings")
    def get_settings():
        return {
            "model": settings.model,
            "base_url": settings.base_url,
            "configured": bool(settings.api_key or model),
        }

    @app.put("/api/settings")
    def save_settings(body: ProviderInput):
        parsed = urlparse(body.base_url)
        if (
            not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("接口地址格式不正确")
        if parsed.scheme != "https" and not (
            parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            raise ValueError("远程接口需使用 HTTPS，仅本地接口支持 HTTP")
        with store.connect() as conn:
            if conn.execute("SELECT 1 FROM tasks WHERE status IN ('running','queued')").fetchone():
                raise HTTPException(409, "当前有任务正在运行，请稍后再修改模型配置")
        saved = {
            "model": body.model.strip(),
            "base_url": body.base_url.rstrip("/"),
            "api_key": body.api_key.strip() or settings.api_key,
        }
        if not saved["model"]:
            raise ValueError("请填写模型标识")
        temp = provider_file.with_suffix(".tmp")
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as file:
            json.dump(saved, file)
        temp.replace(provider_file)
        settings.model, settings.base_url, settings.api_key = (
            saved["model"],
            saved["base_url"],
            saved["api_key"],
        )
        return get_settings()

    @app.get("/api/workspaces/{workspace}/conversations")
    def conversations(workspace: str):
        return store.conversations(workspace)

    @app.post("/api/workspaces/{workspace}/conversations", status_code=201)
    def create_conversation(workspace: str, body: WorkspaceInput):
        return store.create_conversation(workspace, body.name)

    @app.get("/api/workspaces/{workspace}/conversations/{conversation_id}")
    def conversation_detail(workspace: str, conversation_id: str):
        return {
            **store.conversation(workspace, conversation_id),
            "tasks": [
                get_task(workspace, t["id"])
                for t in store.conversation_tasks(workspace, conversation_id)
            ],
        }

    @app.get("/api/workspaces/{workspace}/memories")
    def memories(workspace: str):
        return store.memories(workspace)

    @app.put("/api/workspaces/{workspace}/memories")
    def remember(workspace: str, body: MemoryInput):
        if not body.label.strip() or not body.value.strip():
            raise ValueError("请填写标题和具体内容")
        return store.remember(workspace, body.label.strip(), body.value.strip())

    @app.get("/api/workspaces/{workspace}/documents")
    def list_documents(workspace: str):
        store.workspace(workspace)
        return store.documents(workspace)

    @app.post("/api/workspaces/{workspace}/documents", status_code=201)
    async def upload(
        workspace: str,
        file: UploadFile = File(...),
        role: Literal["source", "template"] = Form("source"),
    ):
        store.workspace(workspace)
        name = Path(file.filename or "file").name
        suffix = Path(name).suffix.lower()
        if suffix not in SUPPORTED:
            raise HTTPException(415, "仅支持上传 .docx、.xlsx、.md、.txt 文件")
        if role == "template" and suffix not in {".docx", ".xlsx"}:
            raise HTTPException(415, "待填表格仅支持 .docx 和 .xlsx 格式")
        content = await file.read(settings.max_upload_bytes + 1)
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(413, "文件体积超出限制")
        try:
            return await run_in_threadpool(store.add_document, workspace, name, role, content)
        except (KeyError, ValueError):
            raise
        except Exception as exc:
            raise HTTPException(422, "无法解析该文件，请确认文件未损坏且未加密") from exc

    @app.get("/api/workspaces/{workspace}/documents/{document_id}")
    def read_document(
        workspace: str,
        document_id: str,
        offset: int = 0,
        limit: int = 60,
        address: str | None = None,
    ):
        if address:
            blocks = store.document(workspace, document_id)["blocks"]
            offset = next((i for i, b in enumerate(blocks) if b["address"] == address), offset)
        return DocumentTools(store, workspace, "").read(document_id, offset, limit)

    @app.get("/api/workspaces/{workspace}/documents/{document_id}/download")
    def download_document(workspace: str, document_id: str):
        document = store.document(workspace, document_id)
        return FileResponse(document["path"], filename=document["name"])

    @app.post("/api/workspaces/{workspace}/tasks", status_code=202)
    def submit_task(workspace: str, body: TaskInput):
        if not settings.api_key and model is None:
            raise HTTPException(
                503, "尚未配置 API Key，请在设置中填写，或在 .env 中配置 FOLIO_API_KEY"
            )
        if not app.state.slots.acquire(blocking=False):
            raise HTTPException(429, "当前任务较多，请稍后再试")
        try:
            task = store.create_task(
                workspace,
                body.instruction,
                body.template_id,
                body.conversation_id,
                body.clear_template,
            )
            future = app.state.executor.submit(run_task, workspace, task["id"])
            future.add_done_callback(lambda _: app.state.slots.release())
        except BaseException:
            app.state.slots.release()
            raise
        return task

    @app.get("/api/workspaces/{workspace}/tasks/{task_id}")
    def get_task(workspace: str, task_id: str):
        task = store.task(workspace, task_id)
        task["artifacts"] = store.artifacts(workspace, task_id)
        for artifact in task["artifacts"]:
            artifact["download_url"] = (
                f"/api/workspaces/{workspace}/artifacts/{artifact['id']}/download"
            )
        return task

    @app.get("/api/workspaces/{workspace}/tasks/{task_id}/events")
    def events(workspace: str, task_id: str, after: int = 0):
        store.task(workspace, task_id)
        return store.events(task_id, after)

    @app.get("/api/workspaces/{workspace}/artifacts/{artifact_id}/download")
    def download(workspace: str, artifact_id: str):
        artifact = store.artifact(workspace, artifact_id)
        return FileResponse(artifact["path"], filename=artifact["name"])

    @app.get("/api/workspaces/{workspace}/artifacts/{artifact_id}")
    def read_artifact(workspace: str, artifact_id: str, offset: int = 0, limit: int = 60):
        # The HTTP read does not belong to an agent task, so no tool events are emitted.
        artifact = store.artifact(workspace, artifact_id)
        from folio.documents import parse

        if offset < 0 or not 1 <= limit <= 100:
            raise ValueError("分页参数无效")
        blocks = parse(Path(artifact["path"])) if Path(artifact["path"]).suffix != ".json" else []
        return {
            "name": artifact["name"],
            "report": json.loads(artifact["report"]),
            "total": len(blocks),
            "blocks": blocks[offset : offset + limit],
        }

    frontend = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if frontend.is_dir():
        app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")

    return app


app = create_app()
