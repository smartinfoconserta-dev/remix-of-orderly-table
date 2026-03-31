import { useEffect, useState, useSyncExternalStore } from "react";
import { getQueueSize, getQueueItems, subscribeQueue } from "@/lib/offlineQueue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wifi, WifiOff, Clock } from "lucide-react";

function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const queueSize = useSyncExternalStore(subscribeQueue, getQueueSize, getQueueSize);
  const items = useSyncExternalStore(subscribeQueue, getQueueItems, getQueueItems);

  if (online && queueSize === 0) {
    return (
      <div className="fixed top-2 left-2 z-50">
        <div className="w-3 h-3 rounded-full bg-green-500 opacity-60" title="Online" />
      </div>
    );
  }

  const dotColor = !online ? "bg-red-500" : "bg-yellow-500 animate-pulse";
  const Icon = !online ? WifiOff : Clock;
  const label = !online
    ? "Sem conexão"
    : `${queueSize} operação(ões) pendente(s)`;

  return (
    <div className="fixed top-2 left-2 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <button className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium shadow-md border border-border bg-background/95 backdrop-blur-sm ${!online ? "text-red-600" : "text-yellow-600"}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
            <Icon className="w-3.5 h-3.5" />
            {queueSize > 0 && <span>{queueSize}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-72 p-3">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {items.length > 0 ? (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {items.map((op) => (
                <li key={op.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">{op.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma operação pendente.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
