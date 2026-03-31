import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──

export interface QueuedOperation {
  id: string;
  rpcName: string;
  params: Record<string, any>;
  label: string;
  createdAt: string;
}

const STORAGE_KEY = "offline_queue";
const RETRY_INTERVAL_MS = 10_000;

// ── Helpers ──

function loadQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  notifyListeners();
}

// ── Network error detection ──

export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return true;
  if (typeof err === "object" && err !== null) {
    const msg = String((err as any).message ?? (err as any).code ?? "");
    if (/fetch|network|timeout|ERR_INTERNET|ECONNREFUSED/i.test(msg)) return true;
  }
  return false;
}

// ── Public API ──

export function enqueue(rpcName: string, params: Record<string, any>, label: string) {
  const queue = loadQueue();
  queue.push({
    id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rpcName,
    params,
    label,
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
  toast.warning("Sem conexão — operação salva localmente", { duration: 3000 });
}

export async function processQueue(): Promise<number> {
  const queue = loadQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedOperation[] = [];
  let processed = 0;

  for (const op of queue) {
    try {
      const { error } = await supabase.rpc(op.rpcName as any, op.params as any);
      if (error) {
        if (isNetworkError(error)) {
          remaining.push(op);
        } else {
          console.error(`[offlineQueue] Falha permanente ao processar ${op.rpcName}:`, error);
          // Drop permanently failed ops — don't re-queue
        }
      } else {
        processed++;
      }
    } catch (err) {
      if (isNetworkError(err)) {
        remaining.push(op);
      } else {
        console.error(`[offlineQueue] Erro inesperado ao processar ${op.rpcName}:`, err);
      }
    }
  }

  saveQueue(remaining);

  if (processed > 0) {
    toast.success(`${processed} operação(ões) sincronizada(s) com sucesso`);
  }

  return processed;
}
// ── Cached snapshots for useSyncExternalStore ──
let _cachedSize: number = loadQueue().length;
let _cachedItems: QueuedOperation[] = loadQueue();

export function getQueueSize(): number {
  return _cachedSize;
}

export function getQueueItems(): QueuedOperation[] {
  return _cachedItems;
}

// ── Listener pattern for React ──

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeQueue(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  const q = loadQueue();
  _cachedSize = q.length;
  _cachedItems = q;
  listeners.forEach((fn) => fn());
}

// ── Auto-retry loop ──

let retryTimer: ReturnType<typeof setInterval> | null = null;

export function startRetryLoop() {
  if (retryTimer) return;
  retryTimer = setInterval(() => {
    if (navigator.onLine && getQueueSize() > 0) {
      processQueue();
    }
  }, RETRY_INTERVAL_MS);
}

export function stopRetryLoop() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

// Process queue immediately when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (getQueueSize() > 0) processQueue();
  });
  startRetryLoop();
}
