import { EnvironmentGlass } from "./EnvironmentGlass";
import { GlassSelect } from "./GlassSelect";
import { Sheet } from "./Sheet";
import { DocumentContent } from "./DocumentContent";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  FilePlus2,
  Files,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  LoaderCircle,
  Menu,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Plus,
  Search,
  RefreshCw,
  Settings,
  Upload,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  api,
  json,
  type AgentEvent,
  type Artifact,
  type Conversation,
  type Doc,
  type Memory,
  type Preview,
  type Provider,
  type Task,
  type Workspace,
} from "./api";

type Page = "agent" | "documents" | "memories" | "settings";
type Target = { kind: "document" | "artifact"; id: string; address?: string };
const running = (t: Task) => ["queued", "running"].includes(t.status);
const toolNames: Record<string, string> = {
  list_documents: "获取资料列表",
  read_document: "读取文档",
  search_sources: "检索资料",
  fill_template: "填写并核对表格",
  save_extraction: "保存提取结果",
  edit_document: "修改文档",
  list_memories: "读取常用信息",
  remember_user_fact: "更新常用信息",
  read_output: "读取上一步结果",
};
const agentNames: Record<string, string> = {
  folio: "Folio",
  "evidence-reader": "核对资料来源",
  "template-reviewer": "检查表格结构",
};

function addressLabel(address: string) {
  const paragraph = address.match(/^paragraph:(\d+)$/);
  if (paragraph) return `第 ${Number(paragraph[1]) + 1} 段`;
  const line = address.match(/^line:(\d+)\/offset:(\d+)$/);
  if (line)
    return `第 ${Number(line[1]) + 1} 行${Number(line[2]) ? "（续）" : ""}`;
  const cell = address.match(/^table:(\d+)\/row:(\d+)\/cell:(\d+)$/);
  if (cell)
    return `表 ${Number(cell[1]) + 1} · ${Number(cell[2]) + 1} 行 ${Number(cell[3]) + 1} 列`;
  return address.replace("!", " · ");
}

function DocIcon({
  name,
  size = "var(--icon-md)",
}: {
  name: string;
  size?: number | string;
}) {
  return name.endsWith(".xlsx") ? (
    <FileSpreadsheet size={size} />
  ) : (
    <FileText size={size} />
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState("");
  const [page, setPage] = useState<Page>("agent");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [settingsSection, setSettingsSection] = useState<
    "appearance" | "model"
  >("appearance");
  function showSettings(section: "appearance" | "model") {
    setSettingsSection(section);
    setPage("settings");
    setSidebarOpen(false);
  }
  const [memoryEdit, setMemoryEdit] = useState<{
    label: string;
    value: string;
    original?: string;
  } | null>(null);
  const [supplement, setSupplement] = useState<Pick<
    Artifact,
    "name" | "report"
  > | null>(null);
  const [supplementReturn, setSupplementReturn] = useState<Target | null>(null);
  const [supplementText, setSupplementText] = useState("");
  const [supplementError, setSupplementError] = useState("");
  const [supplementSaving, setSupplementSaving] = useState(false);
  const [memoryError, setMemoryError] = useState("");
  const [memorySaving, setMemorySaving] = useState(false);
  const [inspector, setInspector] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("folio.theme") || "system",
  );
  const [environment, setEnvironment] = useState(() =>
    localStorage.getItem("folio.environment") === "corridor"
      ? "corridor"
      : "meeting",
  );
  const [inspectorTab, setInspectorTab] = useState("sources");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [narrowScreen, setNarrowScreen] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  const [target, setTarget] = useState<Target | null>(null);
  const [returnTarget, setReturnTarget] = useState<Target | null>(null);
  const [previewTab, setPreviewTab] = useState<"content" | "evidence">(
    "content",
  );
  const [preview, setPreview] = useState<
    (Preview & { offset?: number }) | null
  >(null);
  const [previewError, setPreviewError] = useState("");
  const [offset, setOffset] = useState(0);
  const sourceInput = useRef<HTMLInputElement>(null);
  const templateInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const focusComposerNext = useRef(false);
  const workspaceRef = useRef("");
  const active = tasks.find(running);
  const outputs = tasks.flatMap((t) => t.artifacts || []);
  const templates = docs.filter((d) => d.role === "template");
  const memoryDocuments = new Set(memories.map((memory) => memory.document_id));
  const sources = docs.filter(
    (d) => d.role === "source" && !memoryDocuments.has(d.id),
  );
  const currentTitle =
    conversations.find((c) => c.id === selected)?.title || "新建对话";
  const base = `/api/workspaces/${workspace}`;

  useEffect(() => {
    if (
      focusComposerNext.current &&
      !target &&
      !supplement &&
      !sidebarOpen &&
      !inspector
    ) {
      focusComposerNext.current = false;
      composerRef.current?.focus();
    }
  }, [target, supplement, sidebarOpen, inspector, page]);

  useEffect(() => {
    const input = composerRef.current;
    if (!input) return;
    input.style.height = "auto";
    const maximum = Number.parseFloat(getComputedStyle(input).maxHeight);
    input.style.height = `${Math.min(input.scrollHeight, maximum || input.scrollHeight)}px`;
  }, [draft, page]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1001px)");
    const resize = () => {
      if (!media.matches) setInspector(false);
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => {
      setNarrowScreen(query.matches);
      setSidebarOpen(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMemoryError("");
  }, [!!memoryEdit]);

  useEffect(() => {
    localStorage.setItem("folio.theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("folio.environment", environment);
    document.documentElement.dataset.environment = environment;
  }, [environment]);

  async function refresh() {
    if (refreshing || !workspace) return;
    setRefreshing(true);
    try {
      await refreshResources();
      setNotice("资料与常用信息已更新");
    } catch (e) {
      fail(e);
    } finally {
      setRefreshing(false);
    }
  }

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "操作失败，请重试");
  }
  async function refreshResources(w = workspace) {
    const [documents, facts, sessions] = await Promise.all([
      api<Doc[]>(`/api/workspaces/${w}/documents`),
      api<Memory[]>(`/api/workspaces/${w}/memories`),
      api<Conversation[]>(`/api/workspaces/${w}/conversations`),
    ]);
    if (workspaceRef.current === w) {
      setDocs(documents);
      setMemories(facts);
      setConversations(sessions);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [spaces, config] = await Promise.all([
        api<Workspace[]>("/api/workspaces"),
        api<Provider>("/api/settings"),
      ]);
      const available = spaces.length
        ? spaces
        : [
            await api<Workspace>(
              "/api/workspaces",
              json("POST", { name: "默认空间" }),
            ),
          ];
      if (cancelled) return;
      setWorkspaces(available);
      setProvider(config);
      const id =
        available.find((w) => w.id === localStorage.getItem("folio.workspace"))
          ?.id || available[0].id;
      setWorkspace(id);
    })()
      .catch(fail)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspace) return;
    workspaceRef.current = workspace;
    localStorage.setItem("folio.workspace", workspace);
    setSelected("");
    setTasks([]);
    setEvents([]);
    setTemplateId("");
    setDocs([]);
    setMemories([]);
    setConversations([]);
    refreshResources(workspace)
      .then(async () => {
        const remembered = localStorage.getItem(
          `folio.conversation.${workspace}`,
        );
        if (!remembered) return;
        const sessions = await api<Conversation[]>(
          `/api/workspaces/${workspace}/conversations`,
        );
        const found = sessions.find((c) => c.id === remembered);
        if (found && workspaceRef.current === workspace) {
          setSelected(found.id);
          setTemplateId(found.template_id || "");
        }
      })
      .catch(fail);
  }, [workspace]);

  useEffect(() => {
    if (!selected || !workspace) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let cursor = 0;
    let eventTask = "";
    async function poll() {
      try {
        const conversation = await api<Conversation>(
          `${base}/conversations/${selected}`,
        );
        if (cancelled) return;
        const turns = conversation.tasks || [];
        setTasks(turns);
        const last = turns.at(-1);
        if (last) {
          if (eventTask !== last.id) {
            cursor = 0;
            eventTask = last.id;
            setEvents([]);
          }
          const next = await api<AgentEvent[]>(
            `${base}/tasks/${last.id}/events?after=${cursor}`,
          );
          if (cancelled) return;
          if (next.length) {
            cursor = next.at(-1)!.seq;
            setEvents((old) => [...old, ...next]);
          }
        }
        timer = setTimeout(poll, last && running(last) ? 650 : 2000);
      } catch (e) {
        if (!cancelled) {
          fail(e);
          timer = setTimeout(poll, 4000);
        }
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selected, workspace]);

  const lastStatus = tasks.at(-1)?.status;
  useEffect(() => {
    if (lastStatus === "completed") {
      refreshResources().catch(fail);
      setInspectorTab("outputs");
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [tasks.length, lastStatus]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setPreview(null);
    setPreviewError("");
    const endpoint = target.kind === "document" ? "documents" : "artifacts";
    const params = new URLSearchParams({ offset: String(offset), limit: "50" });
    if (target.address && offset === 0) params.set("address", target.address);
    api<Preview & { offset?: number }>(
      `${base}/${endpoint}/${target.id}?${params}`,
    )
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((e) => {
        if (!cancelled) setPreviewError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [target, offset, workspace]);

  useEffect(() => {
    if (!preview || !target?.address) return;
    const match = Array.from(
      document.querySelectorAll<HTMLElement>(".sheet-preview [data-address]"),
    ).find((element) => element.dataset.address === target.address);
    match?.scrollIntoView({ block: "center" });
  }, [preview, target?.address, previewTab]);

  function openPreview(next: Target, back: Target | null = null) {
    setReturnTarget(back);
    setPreviewTab(next.kind === "artifact" ? "evidence" : "content");
    setOffset(0);
    setTarget(next);
  }

  function chooseConversation(conversation: Conversation) {
    if (sending) return;
    localStorage.setItem(`folio.conversation.${workspace}`, conversation.id);
    setSelected(conversation.id);
    setTasks([]);
    setEvents([]);
    setTemplateId(conversation.template_id || "");
    setDraft("");
    setPage("agent");
    setSidebarOpen(false);
    setError("");
    setInspectorTab("sources");
  }

  function newConversation() {
    if (sending) return;
    if (sidebarOpen) focusComposerNext.current = true;
    localStorage.removeItem(`folio.conversation.${workspace}`);
    setSelected("");
    setTasks([]);
    setEvents([]);
    setTemplateId("");
    setDraft("");
    setPage("agent");
    setSidebarOpen(false);
    setError("");
    composerRef.current?.focus();
  }

  function continueArtifact(artifact: Pick<Artifact, "name" | "report">) {
    setSupplementReturn(target);
    setTarget(null);
    setInspector(false);
    setSupplement(artifact);
    setSupplementText(
      (artifact.report.missing || []).map((field) => `${field}：`).join("\n"),
    );
    setSupplementError("");
  }

  function cancelSupplement() {
    setSupplement(null);
    if (supplementReturn) {
      setTarget(supplementReturn);
      setOffset(0);
      setPreviewTab("evidence");
    }
    setSupplementReturn(null);
  }

  async function saveSupplement(event: React.FormEvent) {
    event.preventDefault();
    if (!supplement || !supplementText.trim() || supplementSaving) return;
    if (
      supplementText.trim() ===
      (supplement.report.missing || [])
        .map((field) => `${field}：`)
        .join("\n")
        .trim()
    ) {
      setSupplementError("至少填写一项内容");
      return;
    }
    setSupplementSaving(true);
    setSupplementError("");
    try {
      const stem = `${supplement.name.replace(/\.[^.]+$/, "")} · 补充资料`;
      const revision =
        docs.filter((doc) => doc.name.startsWith(stem)).length + 1;
      const name = `${stem} ${revision}.md`;
      const body = new FormData();
      body.append(
        "file",
        new File([supplementText], name, { type: "text/markdown" }),
      );
      body.append("role", "source");
      await api<Doc>(`${base}/documents`, { method: "POST", body });
      await refreshResources();
      setDraft(`用刚补充的《${name}》继续把《${supplement.name}》填完。`);
      if (supplement.report.template_id)
        setTemplateId(supplement.report.template_id);
      focusComposerNext.current = true;
      setSupplement(null);
      setTarget(null);
      setInspector(false);
      setPage("agent");
      composerRef.current?.focus();
    } catch (e) {
      setSupplementError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSupplementSaving(false);
    }
  }

  async function send() {
    if (!draft.trim() || sending || active || !workspace) return;
    if (!provider?.configured) {
      showSettings("model");
      return;
    }
    setSending(true);
    setError("");
    try {
      let id = selected;
      if (!id) {
        const conversation = await api<Conversation>(
          `${base}/conversations`,
          json("POST", { name: "新建对话" }),
        );
        id = conversation.id;
        localStorage.setItem(`folio.conversation.${workspace}`, id);
        setSelected(id);
        setConversations((old) => [conversation, ...old]);
      }
      const task = await api<Task>(
        `${base}/tasks`,
        json("POST", {
          instruction: draft.trim(),
          template_id: templateId || null,
          clear_template: !templateId,
          conversation_id: id,
        }),
      );
      setTasks((old) => [
        ...old.filter((t) => t.id !== task.id),
        { ...task, artifacts: [] },
      ]);
      setEvents([]);
      setDraft("");
      await refreshResources();
    } catch (e) {
      fail(e);
    } finally {
      setSending(false);
    }
  }

  async function upload(files: FileList | File[], role: "source" | "template") {
    if (!workspace || !files.length) return;
    setUploading(true);
    setError("");
    let completed = 0;
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("role", role);
        const doc = await api<Doc>(`${base}/documents`, {
          method: "POST",
          body,
        });
        if (role === "template") {
          setTemplateId(doc.id);
          setPage("agent");
        }
        completed++;
      }
      setNotice(
        `已添加 ${completed} 份${role === "template" ? "表格" : "资料"}`,
      );
    } catch (e) {
      fail(e);
    } finally {
      await refreshResources().catch(fail);
      setUploading(false);
      if (sourceInput.current) sourceInput.current.value = "";
      if (templateInput.current) templateInput.current.value = "";
    }
  }

  async function saveMemory(event: React.FormEvent) {
    event.preventDefault();
    if (!memoryEdit) return;
    setMemoryError("");
    setMemorySaving(true);
    try {
      await api(`${base}/memories`, json("PUT", memoryEdit));
      await refreshResources();
      setMemoryEdit(null);
      setNotice("已保存");
    } catch (e) {
      setMemoryError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setMemorySaving(false);
    }
  }

  const sidebarContent = (
    <aside
      className="sidebar"
      role={narrowScreen ? "dialog" : undefined}
      aria-modal={narrowScreen || undefined}
      aria-label="对话列表"
    >
      <div className="sidebar-heading">
        <span>对话列表</span>
        {narrowScreen && (
          <button
            className="icon-button"
            aria-label="收起侧栏"
            onClick={() => setSidebarOpen(false)}
          >
            <X size="var(--icon-md)" />
          </button>
        )}
        <button
          className="icon-button"
          aria-label="新建对话"
          onClick={newConversation}
        >
          <Plus size="var(--icon-md)" />
        </button>
      </div>
      <label className="search">
        <Search size="var(--icon-md)" />
        <input
          placeholder="搜索对话列表"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="section-caption">
        历史对话<span>{conversations.length}</span>
      </div>
      <div className="conversation-list">
        {conversations
          .filter((c) => c.title.includes(query))
          .map((c) => (
            <button
              key={c.id}
              className={`conversation ${selected === c.id ? "selected" : ""}`}
              onClick={() => chooseConversation(c)}
            >
              <MessageSquare size="var(--icon-md)" />
              <span>{c.title}</span>
            </button>
          ))}
        {!conversations.length && <p className="sidebar-empty">暂无历史对话</p>}
        {query &&
          conversations.length > 0 &&
          !conversations.some((c) => c.title.includes(query)) && (
            <p className="sidebar-empty">未找到相关对话</p>
          )}
      </div>
      <div className="sidebar-bottom">
        <BookOpen size="var(--icon-md)" />
        <div className="space-info">
          <strong>Folio</strong>
          <GlassSelect
            label="选择个人空间"
            value={workspace}
            onChange={setWorkspace}
            disabled={sending || uploading}
            options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
          />
        </div>
      </div>
    </aside>
  );

  const filteredDocs = docs.filter(
    (d) =>
      !memoryDocuments.has(d.id) &&
      d.name.toLowerCase().includes(docQuery.toLowerCase()) &&
      (docFilter === "all" || d.role === docFilter),
  );
  return (
    <>
      <input
        hidden
        type="file"
        multiple
        ref={sourceInput}
        accept=".docx,.xlsx,.md,.txt"
        onChange={(e) => e.target.files && upload(e.target.files, "source")}
      />
      <input
        hidden
        type="file"
        ref={templateInput}
        accept=".docx,.xlsx"
        onChange={(e) => e.target.files && upload(e.target.files, "template")}
      />
      <div className={`app page-${page}`}>
        <div className="environment" aria-hidden="true" />
        <EnvironmentGlass environment={environment} />

        <nav
          className="rail"
          aria-label="主导航"
          style={
            {
              "--selected-row":
                page === "settings"
                  ? 3
                  : page === "agent"
                    ? 0
                    : page === "documents"
                      ? 1
                      : 2,
            } as React.CSSProperties
          }
        >
          <canvas className="ornament-glass" aria-hidden="true" />
          <span className="rail-selection" aria-hidden="true" />
          <div className="rail-links">
            {(
              [
                { id: "agent", label: "工作台", icon: MessageSquare },
                { id: "documents", label: "资料库", icon: FolderOpen },
                { id: "memories", label: "常用信息", icon: BrainCircuit },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`rail-link ${!(page === "settings") && page === id ? "active" : ""}`}
                onClick={() => {
                  setPage(id);
                  setSidebarOpen(false);
                }}
                aria-label={label}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon
                  size="var(--icon-lg)"
                  strokeWidth={
                    !(page === "settings") && page === id
                      ? "var(--icon-stroke-active)"
                      : "var(--icon-stroke)"
                  }
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            className={`rail-link rail-settings ${page === "settings" ? "active" : ""}`}
            onClick={() => showSettings("appearance")}
            aria-label="设置"
            aria-current={page === "settings" ? "page" : undefined}
          >
            <Settings
              size="var(--icon-lg)"
              strokeWidth={
                page === "settings"
                  ? "var(--icon-stroke-active)"
                  : "var(--icon-stroke)"
              }
            />
            <span>设置</span>
          </button>
        </nav>
        <button
          className="refresh-control"
          aria-label="重新加载资料"
          title="重新加载资料"
          onClick={refresh}
          disabled={refreshing}
        >
          <canvas className="ornament-glass" aria-hidden="true" />
          <RefreshCw
            size="var(--icon-md)"
            className={refreshing ? "spin" : ""}
          />
        </button>

        {narrowScreen
          ? sidebarOpen && (
              <Sheet kind="navigation" onDismiss={() => setSidebarOpen(false)}>
                {sidebarContent}
              </Sheet>
            )
          : sidebarContent}

        <main className="main">
          {page === "agent" && (
            <header className="topbar">
              <button
                className="icon-button mobile-menu"
                aria-label="展开对话列表"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size="var(--icon-md)" />
              </button>
              <div className="breadcrumb">
                <h1>{selected ? currentTitle : "工作台"}</h1>
                <button
                  className="model-button"
                  onClick={() => showSettings("model")}
                >
                  <span
                    className={`status-dot ${provider?.configured ? "online" : ""}`}
                  />
                  {provider?.model || "配置模型"}
                  <ChevronDown size="var(--icon-sm)" />
                </button>
              </div>
              <div className="topbar-actions">
                <button
                  className="icon-button"
                  aria-label="上传资料"
                  title="上传资料"
                  onClick={() => sourceInput.current?.click()}
                  disabled={uploading}
                >
                  <Upload size="var(--icon-md)" />
                </button>
                {page === "agent" && (
                  <button
                    className="icon-button"
                    aria-label={
                      inspector ? "收起侧边面板" : "展开参考资料与结果"
                    }
                    title={inspector ? "收起侧边面板" : "参考资料与结果"}
                    onClick={() => setInspector(!inspector)}
                  >
                    {inspector ? (
                      <PanelRightClose size="var(--icon-md)" />
                    ) : (
                      <PanelRightOpen size="var(--icon-md)" />
                    )}
                  </button>
                )}
              </div>
            </header>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="关闭提示"
                onClick={() => setError("")}
              >
                <X size="var(--icon-md)" />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              加载中…
            </div>
          ) : !workspace ? (
            <div className="loading">
              <button
                className="primary"
                onClick={() => window.location.reload()}
              >
                重试
              </button>
            </div>
          ) : page === "agent" ? (
            <>
              <div className={`thread ${tasks.length ? "" : "empty-thread"}`}>
                {!tasks.length ? (
                  <div className="personal-desk">
                    <section
                      className="desk-forms"
                      aria-labelledby="forms-title"
                    >
                      <div className="desk-heading">
                        <h2 id="forms-title">待填表格</h2>
                        <button
                          className="text-button"
                          disabled={uploading}
                          onClick={() => templateInput.current?.click()}
                        >
                          <Plus size="var(--icon-sm)" /> 上传表格
                        </button>
                      </div>
                      {templates.length ? (
                        <div className="desk-form-list">
                          {templates.map((form) => (
                            <div
                              className={`desk-form ${templateId === form.id ? "chosen" : ""}`}
                              key={form.id}
                            >
                              <button
                                className="desk-form-select"
                                aria-pressed={templateId === form.id}
                                onClick={() => {
                                  setTemplateId(form.id);
                                  if (!draft.trim())
                                    setDraft(`用我的资料填写《${form.name}》`);
                                  composerRef.current?.focus();
                                }}
                              >
                                <DocIcon
                                  name={form.name}
                                  size="var(--icon-lg)"
                                />
                                <span>
                                  <strong>{form.name}</strong>
                                  <small>
                                    {templateId === form.id
                                      ? "已选中"
                                      : "点击选用"}
                                  </small>
                                </span>
                                {templateId === form.id ? (
                                  <Check size="var(--icon-md)" />
                                ) : (
                                  <ChevronRight size="var(--icon-md)" />
                                )}
                              </button>
                              <button
                                className="desk-original"
                                onClick={() =>
                                  openPreview({ kind: "document", id: form.id })
                                }
                                aria-label={`预览 ${form.name}`}
                              >
                                预览
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="desk-empty">
                          <p>上传需要填写的 Word 或 Excel 表格</p>
                          <button
                            className="secondary"
                            onClick={() => templateInput.current?.click()}
                          >
                            上传表格
                          </button>
                        </div>
                      )}
                    </section>
                    <section
                      className="desk-context"
                      aria-label="个人资料与常用信息"
                    >
                      <div className="desk-source-section">
                        <div className="desk-heading">
                          <h2>
                            个人资料 <span>{sources.length}</span>
                          </h2>
                          <button onClick={() => setPage("documents")}>
                            管理
                          </button>
                        </div>
                        {sources.length ? (
                          <div className="desk-source-list">
                            {sources.slice(0, 3).map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() =>
                                  openPreview({ kind: "document", id: doc.id })
                                }
                              >
                                <span>{doc.name}</span>
                                <ChevronRight size="var(--icon-sm)" />
                              </button>
                            ))}
                            {sources.length > 3 && (
                              <button onClick={() => setPage("documents")}>
                                还有 {sources.length - 3} 份资料
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="desk-empty-copy">
                            上传简历或项目文档，填表时自动调用
                          </p>
                        )}
                        <button
                          className="desk-add"
                          onClick={() => sourceInput.current?.click()}
                        >
                          上传资料
                        </button>
                      </div>
                      <div className="desk-memory-section">
                        <div className="desk-heading">
                          <h2>
                            常用信息 <span>{memories.length}</span>
                          </h2>
                          <button onClick={() => setPage("memories")}>
                            管理
                          </button>
                        </div>
                        {memories.length ? (
                          <dl className="desk-memory-list">
                            {memories.slice(0, 2).map((memory) => (
                              <div key={memory.id}>
                                <dt>{memory.label}</dt>
                                <dd>{memory.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="desk-empty-copy">暂无常用信息</p>
                        )}
                        <button
                          className="desk-add"
                          onClick={() =>
                            setMemoryEdit({ label: "填表要求", value: "" })
                          }
                        >
                          添加常用信息
                        </button>
                      </div>
                    </section>
                    <button
                      className="desk-other"
                      onClick={() => {
                        setDraft("根据我的资料整理一份项目经历，并标注来源");
                        composerRef.current?.focus();
                      }}
                    >
                      整理项目经历 <ChevronRight size="var(--icon-sm)" />
                    </button>
                  </div>
                ) : (
                  <div className="turns">
                    {tasks.map((task, index) => (
                      <article className="turn" key={task.id}>
                        <div className="user-message">{task.request}</div>
                        <div className="assistant-header">
                          <BookOpen size="var(--icon-md)" />
                          <strong>Folio</strong>
                          {running(task) && (
                            <span>
                              <LoaderCircle
                                size="var(--icon-sm)"
                                className="spin"
                              />
                              {task.status === "queued" ? "排队中" : "处理中"}
                            </span>
                          )}
                        </div>
                        <TaskActivity
                          task={task}
                          base={base}
                          live={index === tasks.length - 1 ? events : []}
                        />
                        {task.result?.message ? (
                          <Markdown>
                            {typeof task.result.message === "string"
                              ? task.result.message
                              : JSON.stringify(task.result.message)}
                          </Markdown>
                        ) : running(task) ? (
                          <div className="working-message">
                            {index === tasks.length - 1
                              ? events
                                  .filter((e) => e.kind === "assistant_message")
                                  .map((e) =>
                                    typeof e.payload.text === "string"
                                      ? e.payload.text
                                      : "",
                                  )
                                  .join("\n") || "正在检索资料并生成内容…"
                              : "处理中…"}
                          </div>
                        ) : (
                          <div className="task-error">
                            {task.error || "未能生成回复"}
                            <button
                              className="text-button"
                              onClick={() => {
                                setDraft(task.request);
                                composerRef.current?.focus();
                              }}
                            >
                              修改并重发
                            </button>
                          </div>
                        )}
                        {task.artifacts?.map((artifact) => (
                          <ArtifactRow
                            key={artifact.id}
                            artifact={artifact}
                            onPreview={() =>
                              openPreview({ kind: "artifact", id: artifact.id })
                            }
                            onContinue={() => continueArtifact(artifact)}
                          />
                        ))}
                      </article>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
              <div className="composer-wrap">
                <div
                  className="composer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    upload(e.dataTransfer.files, "source");
                  }}
                >
                  {templateId && (
                    <div className="attached-template">
                      <FileSpreadsheet size="var(--icon-md)" />
                      <span>
                        {templates.find((t) => t.id === templateId)?.name ||
                          "当前表格"}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="移除表格"
                        onClick={() => setTemplateId("")}
                      >
                        <X size="var(--icon-sm)" />
                      </button>
                    </div>
                  )}
                  <div className="compose-row">
                    <canvas className="ornament-glass" aria-hidden="true" />
                    <div className="input-surface">
                      <button
                        className="icon-button"
                        aria-label="上传资料"
                        title="上传资料"
                        disabled={uploading}
                        onClick={() => sourceInput.current?.click()}
                      >
                        {uploading ? (
                          <LoaderCircle
                            size="var(--icon-md)"
                            className="spin"
                          />
                        ) : (
                          <Paperclip size="var(--icon-md)" />
                        )}
                      </button>
                      <textarea
                        ref={composerRef}
                        aria-label="输入指令"
                        placeholder={
                          templateId
                            ? "补充本次填表的特殊要求（如字数、日期格式），或直接发送…"
                            : "输入填表、整理文档指令，或直接发送要保存的个人信息…"
                        }
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing &&
                            window.innerWidth > 700
                          ) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        rows={1}
                      />
                      <div className="template-select">
                        <FileSpreadsheet size="var(--icon-md)" />
                        <GlassSelect
                          label="选择待填表格"
                          value={templateId}
                          onChange={(value) =>
                            value === "upload"
                              ? templateInput.current?.click()
                              : setTemplateId(value)
                          }
                          options={[
                            { value: "", label: "选择表格" },
                            ...templates.map((t) => ({
                              value: t.id,
                              label: t.name,
                            })),
                            { value: "upload", label: "＋ 上传新表格" },
                          ]}
                        />
                      </div>
                    </div>
                    <button
                      className="send-button"
                      aria-label="发送"
                      title="发送"
                      disabled={
                        !draft.trim() || sending || !!active || uploading
                      }
                      onClick={send}
                    >
                      {sending || active ? (
                        <LoaderCircle size="var(--icon-md)" className="spin" />
                      ) : (
                        <ArrowUp size="var(--icon-md)" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="composer-footer">
                  {provider?.configured ? (
                    <>
                      <button
                        onClick={() => {
                          setInspector(true);
                          setInspectorTab("sources");
                        }}
                      >
                        已关联 {sources.length} 份资料 · {memories.length}{" "}
                        条常用信息
                      </button>
                      <span>Enter 发送 · Shift Enter 换行</span>
                    </>
                  ) : (
                    <>
                      <span>请先配置大模型接口</span>
                      <button onClick={() => showSettings("model")}>
                        配置模型 <ChevronRight size="var(--icon-sm)" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : page === "settings" ? (
            <SettingsPage
              initialSection={settingsSection}
              onSectionChange={setSettingsSection}
              theme={theme}
              onTheme={setTheme}
              environment={environment}
              onEnvironment={setEnvironment}
              provider={provider}
              onSaved={(config) => {
                setProvider(config);
                setNotice("模型配置已保存");
              }}
            />
          ) : page === "documents" ? (
            <section className="library page-scroll">
              <div className="page-heading">
                <div>
                  <h1>资料库</h1>
                  <p>管理个人背景文档与待填表格，所有对话均可直接调用</p>
                </div>
                <button
                  className="primary"
                  disabled={uploading}
                  onClick={() => sourceInput.current?.click()}
                >
                  <Upload size="var(--icon-md)" />
                  {uploading ? "上传中…" : "上传资料"}
                </button>
              </div>
              <div className="library-toolbar">
                <div className="tabs">
                  {[
                    ["all", "全部"],
                    ["source", "个人资料"],
                    ["template", "待填表格"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={docFilter === id ? "active" : ""}
                      onClick={() => setDocFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size="var(--icon-md)" />
                  <input
                    placeholder="搜索文件"
                    value={docQuery}
                    onChange={(e) => setDocQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="file-table">
                <div className="file-table-head">
                  <span>文件名</span>
                  <span>类型</span>
                  <span>格式</span>
                  <span />
                </div>
                {filteredDocs.map((doc) => (
                  <button
                    className="file-table-row"
                    key={doc.id}
                    onClick={() =>
                      openPreview({ kind: "document", id: doc.id })
                    }
                  >
                    <span>
                      <DocIcon name={doc.name} />
                      <strong>{doc.name}</strong>
                    </span>
                    <span>
                      {doc.role === "template" ? "待填表格" : "个人资料"}
                    </span>
                    <span>{doc.name.split(".").at(-1)?.toUpperCase()}</span>
                    <ChevronRight size="var(--icon-md)" />
                  </button>
                ))}
                {!filteredDocs.length && (
                  <div className="table-empty">
                    {docs.length
                      ? "未找到相关文件"
                      : "暂无文件，可上传简历、项目记录或待填表格"}
                  </div>
                )}
              </div>
              <button
                className="text-button"
                onClick={() => templateInput.current?.click()}
              >
                <FilePlus2 size="var(--icon-md)" />
                上传待填表格（Word / Excel）
              </button>
            </section>
          ) : (
            <section className="memory-page page-scroll">
              <div className="page-heading">
                <div>
                  <h1>常用信息</h1>
                  <p>保存在这里的零散信息与填表要求，每次任务都会自动生效</p>
                </div>
                <button
                  className="primary"
                  onClick={() => setMemoryEdit({ label: "", value: "" })}
                >
                  <Plus size="var(--icon-md)" />
                  添加信息
                </button>
              </div>
              {memories.length ? (
                <div className="memory-list">
                  {memories.map((memory) => (
                    <button
                      key={memory.id}
                      className="memory-row"
                      onClick={() =>
                        setMemoryEdit({
                          label: memory.label,
                          value: memory.value,
                          original: memory.label,
                        })
                      }
                    >
                      <strong>{memory.label}</strong>
                      <p>{memory.value}</p>
                      <span>
                        编辑 <ChevronRight size="var(--icon-sm)" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="memory-empty">
                  <BrainCircuit
                    size="var(--icon-display)"
                    strokeWidth="var(--icon-stroke)"
                  />
                  <h2>暂无常用信息</h2>
                  <p>
                    可以保存电话、邮箱，或“项目简介控制在 100 字以内”等长期要求
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setMemoryEdit({ label: "", value: "" })}
                  >
                    添加常用信息
                  </button>
                </div>
              )}
              <div className="memory-note">
                <MessageSquare size="var(--icon-md)" />
                提示：你也可以在对话中直接输入“记住：项目简介控制在 100
                字以内”来快速添加
              </div>
            </section>
          )}
        </main>

        {supplement && (
          <Sheet onDismiss={cancelSupplement} busy={supplementSaving}>
            <form
              className="dialog"
              role="dialog"
              aria-modal="true"
              aria-label="补全信息"
              onSubmit={saveSupplement}
            >
              <div className="dialog-heading">
                <h2>补全信息</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="关闭"
                  disabled={supplementSaving}
                  onClick={cancelSupplement}
                >
                  <X size="var(--icon-md)" />
                </button>
              </div>
              <div className="sheet-body">
                <p className="sheet-context">{supplement.name}</p>
                <label>
                  待补字段
                  <textarea
                    data-autofocus
                    rows={5}
                    required
                    disabled={supplementSaving}
                    maxLength={12000}
                    value={supplementText}
                    onChange={(e) => setSupplementText(e.target.value)}
                  />
                </label>
                <p className="form-intro">
                  保存为参考资料，返回对话后可发送续填指令
                </p>
                {supplementError && (
                  <p className="task-error" role="alert">
                    {supplementError}
                  </p>
                )}
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={supplementSaving}
                  onClick={cancelSupplement}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={supplementSaving || !supplementText.trim()}
                >
                  {supplementSaving ? "保存中…" : "保存并返回对话"}
                </button>
              </div>
            </form>
          </Sheet>
        )}

        {page === "agent" &&
          inspector &&
          !target &&
          !memoryEdit &&
          !supplement && (
            <Sheet kind="inspector" onDismiss={() => setInspector(false)}>
              <aside
                className="inspector"
                role="dialog"
                aria-modal="true"
                aria-label="参考资料与结果"
              >
                <div className="inspector-header">
                  <h2>参考资料与结果</h2>
                  <button
                    className="icon-button"
                    aria-label="关闭面板"
                    onClick={() => setInspector(false)}
                  >
                    <X size="var(--icon-md)" />
                  </button>
                </div>
                <div className="inspector-tabs">
                  <button
                    className={inspectorTab === "sources" ? "active" : ""}
                    onClick={() => setInspectorTab("sources")}
                  >
                    参考资料 <span>{sources.length + templates.length}</span>
                  </button>
                  <button
                    className={inspectorTab === "outputs" ? "active" : ""}
                    onClick={() => setInspectorTab("outputs")}
                  >
                    生成文件 <span>{outputs.length}</span>
                  </button>
                </div>
                <div className="inspector-content">
                  {inspectorTab === "sources" ? (
                    <>
                      {templates.length > 0 && (
                        <>
                          <div className="section-caption">待填表格</div>
                          {templates.map((doc) => (
                            <button
                              key={doc.id}
                              className={`inspector-file ${templateId === doc.id ? "chosen" : ""}`}
                              onClick={() =>
                                openPreview({ kind: "document", id: doc.id })
                              }
                            >
                              <span className="file-symbol">
                                <DocIcon name={doc.name} />
                              </span>
                              <span>{doc.name}</span>
                              {templateId === doc.id && (
                                <Check size="var(--icon-sm)" />
                              )}
                            </button>
                          ))}
                        </>
                      )}
                      <div className="section-caption">个人资料</div>
                      {docs
                        .filter(
                          (d) =>
                            d.role === "source" && !memoryDocuments.has(d.id),
                        )
                        .map((doc) => (
                          <button
                            key={doc.id}
                            className="inspector-file"
                            onClick={() =>
                              openPreview({ kind: "document", id: doc.id })
                            }
                          >
                            <span className="file-symbol">
                              <DocIcon name={doc.name} />
                            </span>
                            <span>{doc.name}</span>
                            <ChevronRight size="var(--icon-sm)" />
                          </button>
                        ))}
                      {!sources.length && (
                        <p className="panel-empty">
                          暂无资料，上传后可用于自动填表
                        </p>
                      )}
                      <button
                        className="add-source"
                        onClick={() => sourceInput.current?.click()}
                        disabled={uploading}
                      >
                        <Plus size="var(--icon-md)" />
                        上传资料
                      </button>
                    </>
                  ) : outputs.length ? (
                    outputs.map((a) => (
                      <ArtifactRow
                        key={a.id}
                        artifact={a}
                        onContinue={() => continueArtifact(a)}
                        onPreview={() =>
                          openPreview({ kind: "artifact", id: a.id })
                        }
                      />
                    ))
                  ) : (
                    <div className="panel-empty">
                      <Files
                        size="var(--icon-xl)"
                        strokeWidth="var(--icon-stroke)"
                      />
                      <p>当前对话还没有生成文件</p>
                    </div>
                  )}
                </div>
                <div className="inspector-bottom">
                  <BrainCircuit size="var(--icon-md)" />
                  <span>{memories.length} 条常用信息已启用</span>
                  <button
                    className="icon-button"
                    aria-label="管理常用信息"
                    onClick={() => {
                      setInspector(false);
                      setPage("memories");
                    }}
                  >
                    <ChevronRight size="var(--icon-md)" />
                  </button>
                </div>
              </aside>
            </Sheet>
          )}

        {notice && (
          <div className="toast" role="status">
            <Check size="var(--icon-md)" />
            {notice}
          </div>
        )}
        {memoryEdit && (
          <Sheet onDismiss={() => setMemoryEdit(null)} busy={memorySaving}>
            <form
              className="dialog"
              role="dialog"
              aria-modal="true"
              aria-label="常用信息"
              onSubmit={saveMemory}
            >
              <div className="dialog-heading">
                <h2>常用信息</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="关闭"
                  disabled={memorySaving}
                  onClick={() => setMemoryEdit(null)}
                >
                  <X size="var(--icon-md)" />
                </button>
              </div>
              <div className="sheet-body">
                <label>
                  名称
                  <input
                    required
                    disabled={memorySaving}
                    maxLength={80}
                    data-autofocus
                    placeholder="如：联系电话、通讯地址、填表要求"
                    value={memoryEdit.label}
                    readOnly={!!memoryEdit.original}
                    onChange={(e) =>
                      setMemoryEdit({ ...memoryEdit, label: e.target.value })
                    }
                  />
                </label>
                <label>
                  内容
                  <textarea
                    required
                    disabled={memorySaving}
                    rows={4}
                    maxLength={4000}
                    value={memoryEdit.value}
                    onChange={(e) =>
                      setMemoryEdit({ ...memoryEdit, value: e.target.value })
                    }
                    placeholder="输入具体信息或要求…"
                  />
                </label>
                <p className="form-note">同名条目将直接覆盖原有内容</p>
                {memoryError && (
                  <p className="inline-error" role="alert">
                    {memoryError}
                  </p>
                )}
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={memorySaving}
                  onClick={() => setMemoryEdit(null)}
                >
                  取消
                </button>
                <button
                  className="primary"
                  type="submit"
                  disabled={memorySaving}
                >
                  {memorySaving && (
                    <LoaderCircle size="var(--icon-md)" className="spin" />
                  )}
                  保存
                </button>
              </div>
            </form>
          </Sheet>
        )}
        {target && (
          <Sheet kind="preview" onDismiss={() => setTarget(null)}>
            <section
              className="preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="文档预览"
            >
              <div className="dialog-heading">
                {returnTarget && (
                  <button
                    className="icon-button"
                    aria-label="返回填写依据"
                    onClick={() => openPreview(returnTarget)}
                  >
                    <ArrowLeft size="var(--icon-md)" />
                  </button>
                )}
                <div>
                  <h2>{preview?.name || "加载中…"}</h2>
                  <span>
                    {target.kind === "artifact"
                      ? "填写结果与来源核对"
                      : "文档预览"}
                  </span>
                </div>
                <button
                  className="icon-button"
                  aria-label="关闭预览"
                  onClick={() => setTarget(null)}
                >
                  <X size="var(--icon-md)" />
                </button>
              </div>
              {preview?.report && (
                <div
                  className="preview-tabs"
                  role="group"
                  aria-label="视图切换"
                >
                  <button
                    aria-pressed={previewTab === "evidence"}
                    onClick={() => setPreviewTab("evidence")}
                  >
                    数据来源
                  </button>
                  <button
                    aria-pressed={previewTab === "content"}
                    onClick={() => setPreviewTab("content")}
                  >
                    文档全文
                  </button>
                </div>
              )}
              <div className="preview-scroll">
                {previewError ? (
                  <p role="alert" className="inline-error">
                    {previewError}
                  </p>
                ) : !preview ? (
                  <div className="loading">
                    <LoaderCircle className="spin" />
                    加载中…
                  </div>
                ) : (
                  <>
                    {preview.report && previewTab === "evidence" && (
                      <div className="evidence-report">
                        <h3>已填字段与来源</h3>
                        {(
                          preview.report.patches ||
                          preview.report.fields ||
                          []
                        ).map((patch, i) => (
                          <div className="evidence-row" key={i}>
                            <code>{addressLabel(patch.address)}</code>
                            <p>{String(patch.value)}</p>
                            {patch.explanation && (
                              <small>{patch.explanation}</small>
                            )}
                            {patch.sources.map((source, si) => (
                              <button
                                key={si}
                                className="citation"
                                onClick={() =>
                                  openPreview(
                                    {
                                      kind: "document",
                                      id: source.document_id,
                                      address: source.address,
                                    },
                                    target,
                                  )
                                }
                              >
                                <FileText size="var(--icon-sm)" />
                                <span>
                                  {docs.find((d) => d.id === source.document_id)
                                    ?.name || "未知资料"}
                                  <q>{source.quote}</q>
                                </span>
                                <ChevronRight size="var(--icon-sm)" />
                              </button>
                            ))}
                          </div>
                        ))}
                        {!!preview.report.missing?.length && (
                          <div className="missing-fields">
                            <div className="desk-heading">
                              <h3>待补项</h3>
                              <button
                                onClick={() =>
                                  continueArtifact({
                                    name: preview.name,
                                    report: preview.report!,
                                  })
                                }
                              >
                                去补全
                              </button>
                            </div>
                            {preview.report.missing.map((m) => (
                              <p key={m}>{m}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(!preview.report || previewTab === "content") &&
                      (preview.blocks.length ? (
                        <DocumentContent
                          blocks={preview.blocks}
                          highlighted={target.address}
                        />
                      ) : (
                        <p className="panel-empty">文档内容为空</p>
                      ))}
                  </>
                )}
              </div>
              <div className="preview-footer">
                <div>
                  {preview && preview.total > 50 && (
                    <>
                      <button
                        className="icon-button"
                        aria-label="上一页"
                        disabled={(preview.offset ?? offset) === 0}
                        onClick={() =>
                          setOffset(
                            Math.max(0, (preview.offset ?? offset) - 50),
                          )
                        }
                      >
                        <ChevronLeft size="var(--icon-md)" />
                      </button>
                      <span>
                        {(preview.offset ?? offset) + 1}–
                        {Math.min(
                          (preview.offset ?? offset) + 50,
                          preview.total,
                        )}{" "}
                        / {preview.total}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="下一页"
                        disabled={
                          (preview.offset ?? offset) + 50 >= preview.total
                        }
                        onClick={() =>
                          setOffset((preview.offset ?? offset) + 50)
                        }
                      >
                        <ChevronRight size="var(--icon-md)" />
                      </button>
                    </>
                  )}
                </div>
                {target.kind === "document" &&
                docs.find((d) => d.id === target.id)?.role === "template" ? (
                  <button
                    className="primary"
                    onClick={() => {
                      focusComposerNext.current = true;
                      setTemplateId(target.id);
                      setInspector(false);
                      setPage("agent");
                      setTarget(null);
                      if (!draft)
                        setDraft("用我的资料填写这张表，有缺漏的地方请标出来");
                      composerRef.current?.focus();
                    }}
                  >
                    填写此表 <ArrowUp size="var(--icon-md)" />
                  </button>
                ) : target.kind === "artifact" ? (
                  <a
                    className="primary"
                    href={`${base}/artifacts/${target.id}/download`}
                  >
                    <Download size="var(--icon-md)" />
                    下载文件
                  </a>
                ) : (
                  <a
                    className="secondary"
                    href={`${base}/documents/${target.id}/download`}
                  >
                    <Download size="var(--icon-md)" />
                    下载原文件
                  </a>
                )}
              </div>
            </section>
          </Sheet>
        )}
      </div>
    </>
  );
}

function ArtifactRow({
  artifact,
  onPreview,
  onContinue,
}: {
  artifact: Artifact;
  onPreview: () => void;
  onContinue: () => void;
}) {
  const fields = artifact.report.patches ?? artifact.report.fields ?? [];
  const count = fields.length;
  const sourceCount = new Set(
    fields.flatMap((field) =>
      field.sources.map((source) => source.document_id),
    ),
  ).size;
  const missing = artifact.report.missing?.length || 0;
  return (
    <div className="artifact">
      <button className="artifact-main" onClick={onPreview}>
        <span className="artifact-icon">
          <DocIcon name={artifact.name} size="var(--icon-lg)" />
        </span>
        <span>
          <strong>{artifact.name}</strong>
          <small>
            {count
              ? `已填 ${count} 项${sourceCount ? ` · 引用 ${sourceCount} 份资料` : ""}`
              : "点击预览"}
            {missing ? ` · ${missing} 项待补` : ""}
          </small>
        </span>
      </button>
      {missing > 0 && (
        <button className="artifact-continue" onClick={onContinue}>
          补全信息
        </button>
      )}
      <a
        className="icon-button"
        href={artifact.download_url}
        aria-label={`下载 ${artifact.name}`}
      >
        <ArrowDown size="var(--icon-md)" />
      </a>
    </div>
  );
}

function TaskActivity({
  task,
  base,
  live,
}: {
  task: Task;
  base: string;
  live: AgentEvent[];
}) {
  const [history, setHistory] = useState<AgentEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const rows = live.length ? live : history;
  useEffect(() => {
    if (live.length) {
      setHistory(live);
      if (!running(task)) setLoaded(true);
    }
  }, [live, task.status]);
  async function load() {
    if (loaded || live.length) return;
    try {
      const all: AgentEvent[] = [];
      let after = 0;
      while (true) {
        const page = await api<AgentEvent[]>(
          `${base}/tasks/${task.id}/events?after=${after}`,
        );
        all.push(...page);
        if (page.length < 200) break;
        after = page.at(-1)!.seq;
      }
      setHistory(all);
      setLoaded(!running(task));
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法加载执行记录");
    }
  }
  return (
    <details
      className="activity"
      open={running(task)}
      onToggle={(e) => {
        if (e.currentTarget.open) load();
      }}
    >
      <summary>
        {running(task) ? "正在检索并处理…" : "执行步骤"}
        {rows.length > 0 && (
          <span>{rows.filter((e) => e.kind === "tool_end").length} 步</span>
        )}
      </summary>
      <div>
        {rows
          .filter((e) =>
            ["tool_start", "tool_error", "delegation"].includes(e.kind),
          )
          .map((e) => (
            <div
              key={e.seq}
              className={`activity-row ${e.kind === "tool_error" ? "activity-error" : ""}`}
            >
              {e.kind === "delegation" ? (
                <BrainCircuit size="var(--icon-sm)" />
              ) : e.kind === "tool_error" ? (
                <X size="var(--icon-sm)" />
              ) : rows.some(
                  (done) =>
                    done.kind === "tool_end" &&
                    done.seq > e.seq &&
                    done.payload.name === e.payload.name &&
                    done.payload.actor === e.payload.actor,
                ) ? (
                <Check size="var(--icon-sm)" />
              ) : (
                <Circle size="var(--icon-sm)" />
              )}
              <span>
                {e.kind === "delegation"
                  ? `执行：${agentNames[e.payload.subagent_type || ""] || e.payload.subagent_type}`
                  : e.kind === "tool_error"
                    ? e.payload.error
                    : toolNames[e.payload.name || ""] || e.payload.name}
              </span>
              {e.payload.actor && e.payload.actor !== "folio" && (
                <small>{agentNames[e.payload.actor]}</small>
              )}
            </div>
          ))}
        {loaded &&
          !rows.some((e) => ["tool_start", "delegation"].includes(e.kind)) && (
            <p>本次未调用文档工具</p>
          )}
        {error && <p className="inline-error">{error}</p>}
      </div>
    </details>
  );
}

function SettingsPage({
  initialSection,
  onSectionChange,
  theme,
  onTheme,
  environment,
  onEnvironment,
  provider,
  onSaved,
}: {
  initialSection: "appearance" | "model";
  onSectionChange: (section: "appearance" | "model") => void;
  theme: string;
  onTheme: (theme: string) => void;
  environment: string;
  onEnvironment: (environment: string) => void;
  provider: Provider | null;
  onSaved: (p: Provider) => void;
}) {
  const section = initialSection;
  const [model, setModel] = useState(provider?.model || "deepseek-chat");
  const [url, setUrl] = useState(
    provider?.base_url || "https://api.deepseek.com",
  );
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (section !== "model") return;
    setSaving(true);
    setError("");
    try {
      onSaved(
        await api<Provider>(
          "/api/settings",
          json("PUT", { model, base_url: url, api_key: key }),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      className="settings-page page-scroll"
      aria-label="设置"
      onSubmit={save}
    >
      <div className="page-heading">
        <h1>设置</h1>
      </div>
      <div className="settings-tabs" role="group" aria-label="设置分类">
        <button
          type="button"
          disabled={saving}
          aria-pressed={section === "appearance"}
          onClick={() => onSectionChange("appearance")}
        >
          外观与背景
        </button>
        <button
          type="button"
          disabled={saving}
          aria-pressed={section === "model"}
          onClick={() => onSectionChange("model")}
        >
          模型接口
        </button>
      </div>
      {section === "appearance" ? (
        <>
          <div className="settings-fields">
            <div className="appearance-setting">
              <span>外观</span>
              <div
                className="appearance-segments"
                role="group"
                aria-label="外观"
              >
                {[
                  { value: "system", label: "跟随系统" },
                  { value: "light", label: "浅色" },
                  { value: "dark", label: "深色" },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    aria-pressed={theme === option.value}
                    onClick={() => onTheme(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <fieldset className="environment-picker">
              <legend>界面背景</legend>
              <div className="environment-options">
                {[
                  {
                    id: "meeting",
                    name: "窗边会议室",
                    image: "/environments/office-lounge.jpg",
                  },
                  {
                    id: "corridor",
                    name: "玻璃办公区",
                    image: "/environments/office-loft.jpg",
                  },
                ].map((scene) => (
                  <button
                    type="button"
                    key={scene.id}
                    aria-pressed={environment === scene.id}
                    onClick={() => onEnvironment(scene.id)}
                  >
                    <img src={scene.image} alt="" />
                    <span>
                      {scene.name}
                      {environment === scene.id && (
                        <Check size="var(--icon-sm)" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </>
      ) : (
        <>
          <div className="settings-fields">
            <label>
              接口地址 (Base URL)
              <input
                required
                disabled={saving}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.deepseek.com"
              />
            </label>
            <label>
              模型标识 (Model ID)
              <input
                required
                disabled={saving}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
              />
            </label>
            <label>
              API Key
              <input
                type="password"
                disabled={saving}
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={
                  provider?.configured
                    ? "已配置（留空则保持不变）"
                    : "粘贴 API Key (sk-...)"
                }
              />
            </label>
            <p className="form-note">
              支持 OpenAI 兼容接口（如 DeepSeek）。API Key 仅保存在本地。
            </p>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => {
                setModel(provider?.model || "deepseek-chat");
                setUrl(provider?.base_url || "https://api.deepseek.com");
                setKey("");
                setError("");
              }}
            >
              重置
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving && (
                <LoaderCircle className="spin" size="var(--icon-md)" />
              )}
              保存配置
            </button>
          </div>
        </>
      )}
    </form>
  );
}
