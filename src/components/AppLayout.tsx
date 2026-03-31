import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { getQueueSize, getQueueItems, subscribeQueue, processQueue, type QueuedOperation } from "@/lib/offlineQueue";

export interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  headerRight?: React.ReactNode;
  onBack?: () => void;
}

const AppLayout = ({ title, children, showBack = false, headerRight, onBack }: AppLayoutProps) => {
  const shouldShowBack = showBack && Boolean(onBack);

  const [online, setOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(getQueueSize);
  const [showPending, setShowPending] = useState(false);
  const [pendingItems, setPendingItems] = useState<QueuedOperation[]>([]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    return subscribeQueue(() => setQueueSize(getQueueSize()));
  }, []);

  const handleIndicatorClick = useCallback(() => {
    if (queueSize > 0) {
      setPendingItems(getQueueItems());
      setShowPending((v) => !v);
    }
  }, [queueSize]);

  const handleRetry = useCallback(() => {
    processQueue().then(() => {
      setPendingItems(getQueueItems());
    });
  }, []);

  const hasQueue = queueSize > 0;

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-4 shrink-0 md:px-6">
        {shouldShowBack && (
          <button
            onClick={onBack}
            className="surface-card flex h-10 w-10 items-center justify-center rounded-md"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
          {title}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleIndicatorClick}
            className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:bg-muted/50"
            title={online ? (hasQueue ? `${queueSize} pendente(s)` : "Online") : "Offline"}
          >
            {online ? (
              <Wifi className={`h-4 w-4 ${hasQueue ? "text-amber-400" : "text-emerald-500"}`} />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-400" />
            )}
            {hasQueue && (
              <span className="text-xs font-bold text-amber-400">{queueSize}</span>
            )}
          </button>
          {headerRight && <div className="flex items-center">{headerRight}</div>}
        </div>
      </header>

      {/* Pending operations dropdown */}
      {showPending && hasQueue && (
        <div className="border-b border-border bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {queueSize} operação(ões) pendente(s)
            </p>
            <button
              onClick={handleRetry}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 underline"
            >
              Tentar agora
            </button>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {pendingItems.map((op) => (
              <li key={op.id} className="text-xs text-amber-600 dark:text-amber-400 flex justify-between">
                <span>{op.label}</span>
                <span className="opacity-60">
                  {new Date(op.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
