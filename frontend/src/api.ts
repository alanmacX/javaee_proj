export type Workspace = { id: string; name: string };
export type Doc = { id: string; name: string; role: "source" | "template" };
export type Citation = { document_id: string; address: string; quote: string };
export type Patch = {
  address: string;
  value: string | number | boolean;
  sources: Citation[];
  explanation?: string;
};
export type Artifact = {
  id: string;
  name: string;
  download_url: string;
  report: {
    template_id?: string;
    patches?: Patch[];
    fields?: Patch[];
    missing?: string[];
  };
};
export type Task = {
  id: string;
  request: string;
  status: string;
  result: { message: string } | null;
  error: string | null;
  artifacts: Artifact[];
  created_at: string;
};
export type Conversation = {
  id: string;
  title: string;
  template_id: string | null;
  tasks?: Task[];
};
export type Memory = {
  id: string;
  label: string;
  value: string;
  document_id: string;
};
export type Provider = { model: string; base_url: string; configured: boolean };
export type AgentEvent = {
  seq: number;
  kind: string;
  payload: {
    name?: string;
    actor?: string;
    text?: string;
    subagent_type?: string;
    description?: string;
    error?: string;
  };
};
export type Block = { address: string; text: string };
export type Preview = {
  name: string;
  total: number;
  blocks: Block[];
  report?: Artifact["report"];
};

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const data = await response.json();
      message = typeof data.detail === "string" ? data.detail : message;
    } catch {
      /* retain status */
    }
    throw new Error(message);
  }
  return response.json();
}

export function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
