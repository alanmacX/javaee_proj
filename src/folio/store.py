import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4


def uid() -> str:
    return uuid4().hex


class Store:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.db = self.root / "folio.sqlite"
        with self.connect() as conn:
            conn.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS workspaces (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY, workspace TEXT NOT NULL, name TEXT NOT NULL,
                    role TEXT NOT NULL, path TEXT NOT NULL, blocks TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY, workspace TEXT NOT NULL, request TEXT NOT NULL,
                    template_id TEXT, status TEXT NOT NULL DEFAULT 'queued',
                    result TEXT, error TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS events (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT NOT NULL,
                    kind TEXT NOT NULL, payload TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS artifacts (
                    id TEXT PRIMARY KEY, workspace TEXT NOT NULL, task TEXT NOT NULL,
                    name TEXT NOT NULL, path TEXT NOT NULL, report TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY, workspace TEXT NOT NULL, title TEXT NOT NULL,
                    template_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY, workspace TEXT NOT NULL, label TEXT NOT NULL,
                    value TEXT NOT NULL, document_id TEXT NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(workspace,label)
                );
            """)
            columns = {r[1] for r in conn.execute("PRAGMA table_info(tasks)")}
            if "conversation_id" not in columns:
                conn.execute("ALTER TABLE tasks ADD COLUMN conversation_id TEXT")

    @contextmanager
    def connect(self):
        conn = sqlite3.connect(self.db, timeout=20)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()

    def workspace(self, workspace: str):
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM workspaces WHERE id=?", (workspace,)).fetchone()
        if row is None:
            raise KeyError("未找到该工作区")
        return dict(row)

    def create_workspace(self, name: str):
        item = {"id": uid(), "name": name}
        with self.connect() as conn:
            conn.execute("INSERT INTO workspaces VALUES (:id, :name)", item)
        return item

    def workspaces(self):
        with self.connect() as conn:
            return [dict(r) for r in conn.execute("SELECT * FROM workspaces ORDER BY rowid")]

    def conversations(self, workspace: str):
        self.workspace(workspace)
        with self.connect() as conn:
            return [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM conversations WHERE workspace=? "
                    "ORDER BY updated_at DESC,rowid DESC",
                    (workspace,),
                )
            ]

    def conversation(self, workspace: str, conversation: str):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM conversations WHERE workspace=? AND id=?", (workspace, conversation)
            ).fetchone()
        if row is None:
            raise KeyError("未找到该对话")
        return dict(row)

    def create_conversation(self, workspace: str, title: str):
        self.workspace(workspace)
        conversation = uid()
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO conversations (id,workspace,title) VALUES (?,?,?)",
                (conversation, workspace, title),
            )
        return self.conversation(workspace, conversation)

    def conversation_tasks(self, workspace: str, conversation: str):
        self.conversation(workspace, conversation)
        with self.connect() as conn:
            ids = [
                r[0]
                for r in conn.execute(
                    "SELECT id FROM tasks WHERE workspace=? AND conversation_id=? ORDER BY rowid",
                    (workspace, conversation),
                )
            ]
        return [self.task(workspace, task) for task in ids]

    def memories(self, workspace: str):
        self.workspace(workspace)
        with self.connect() as conn:
            return [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM memories WHERE workspace=? ORDER BY rowid", (workspace,)
                )
            ]

    def remember(self, workspace: str, label: str, value: str):
        doc = self.add_document(
            workspace, f"{label}.md", "source", f"{label}：{value}".encode("utf-8")
        )
        try:
            with self.connect() as conn:
                old = conn.execute(
                    "SELECT * FROM memories WHERE workspace=? AND label=?", (workspace, label)
                ).fetchone()
                memory = old["id"] if old else uid()
                if old:
                    conn.execute(
                        "UPDATE documents SET role='archived' WHERE id=?", (old["document_id"],)
                    )
                conn.execute(
                    "INSERT INTO memories (id,workspace,label,value,document_id) "
                    "VALUES (?,?,?,?,?) "
                    "ON CONFLICT(workspace,label) DO UPDATE SET value=excluded.value, "
                    "document_id=excluded.document_id,updated_at=CURRENT_TIMESTAMP",
                    (memory, workspace, label, value, doc["id"]),
                )
        except BaseException:
            with self.connect() as conn:
                conn.execute("UPDATE documents SET role='archived' WHERE id=?", (doc["id"],))
            raise
        return {"id": memory, "label": label, "value": value, "document_id": doc["id"]}

    def documents(self, workspace: str):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT id,name,role FROM documents WHERE workspace=? AND role!='archived' "
                "ORDER BY rowid",
                (workspace,),
            ).fetchall()
        return [dict(row) for row in rows]

    def document(self, workspace: str, document: str):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM documents WHERE workspace=? AND id=?", (workspace, document)
            ).fetchone()
        if row is None:
            raise KeyError("未找到该文档")
        item = dict(row)
        item["blocks"] = json.loads(item["blocks"])
        return item

    def add_document(self, workspace: str, name: str, role: str, content: bytes):
        from folio.documents import parse

        self.workspace(workspace)
        document = uid()
        directory = self.root / workspace / "documents"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / (document + Path(name).suffix.lower())
        path.write_bytes(content)
        try:
            blocks = parse(path)
            with self.connect() as conn:
                conn.execute(
                    "INSERT INTO documents VALUES (?,?,?,?,?,?)",
                    (
                        document,
                        workspace,
                        name,
                        role,
                        str(path),
                        json.dumps(blocks, ensure_ascii=False),
                    ),
                )
        except BaseException:
            path.unlink(missing_ok=True)
            raise
        return {"id": document, "name": name, "role": role, "block_count": len(blocks)}

    def create_task(
        self,
        workspace: str,
        request: str,
        template: str | None,
        conversation: str | None = None,
        clear_template: bool = False,
    ):
        self.workspace(workspace)
        if conversation:
            session = self.conversation(workspace, conversation)
            template = None if clear_template else template or session["template_id"]
        if template:
            doc = self.document(workspace, template)
            if doc["role"] != "template":
                raise ValueError("所选文件不是有效的待填表格")
        task = uid()
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            if conversation:
                active = conn.execute(
                    "SELECT id FROM tasks WHERE conversation_id=? "
                    "AND status IN ('queued','running')",
                    (conversation,),
                ).fetchone()
                if active:
                    raise ConversationBusy("请等待当前回复生成完毕")
                conn.execute(
                    "UPDATE conversations SET title=CASE WHEN title='新对话' "
                    "THEN ? ELSE title END, "
                    "template_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
                    (request[:32], template, conversation),
                )
            conn.execute(
                "INSERT INTO tasks (id,workspace,request,template_id,conversation_id) "
                "VALUES (?,?,?,?,?)",
                (task, workspace, request, template, conversation),
            )
        return self.task(workspace, task)

    def task(self, workspace: str, task: str):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM tasks WHERE workspace=? AND id=?", (workspace, task)
            ).fetchone()
        if row is None:
            raise KeyError("未找到该任务")
        item = dict(row)
        item["result"] = json.loads(item["result"]) if item["result"] else None
        return item

    def set_task(self, task: str, status: str, result=None, error=None):
        with self.connect() as conn:
            conn.execute(
                "UPDATE tasks SET status=?,result=?,error=? WHERE id=?",
                (
                    status,
                    json.dumps(result, ensure_ascii=False) if result is not None else None,
                    error,
                    task,
                ),
            )

    def event(self, task: str, kind: str, payload):
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO events (task,kind,payload) VALUES (?,?,?)",
                (
                    task,
                    kind,
                    json.dumps(payload, ensure_ascii=False, default=str),
                ),
            )

    def events(self, task: str, after: int = 0):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM events WHERE task=? AND seq>? ORDER BY seq LIMIT 200",
                (task, after),
            ).fetchall()
        return [{**dict(r), "payload": json.loads(r["payload"])} for r in rows]

    def artifacts(self, workspace: str, task: str):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT id,name,report FROM artifacts WHERE workspace=? AND task=?",
                (workspace, task),
            ).fetchall()
        return [{**dict(r), "report": json.loads(r["report"])} for r in rows]

    def artifact(self, workspace: str, artifact: str):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM artifacts WHERE workspace=? AND id=?", (workspace, artifact)
            ).fetchone()
        if row is None:
            raise KeyError("未找到生成的文件")
        return dict(row)


class ConversationBusy(ValueError):
    pass
