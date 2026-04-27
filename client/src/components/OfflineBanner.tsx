import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/contexts/NetworkContext";

export default function OfflineBanner() {
  const { connected } = useNetworkStatus();
  if (connected) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium shadow-md backdrop-blur-xl bg-amber-500/95 text-amber-950 dark:bg-amber-600/95 dark:text-amber-50"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      role="status"
      aria-live="polite"
      data-testid="banner-offline"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>You're offline — only downloaded surahs available</span>
    </div>
  );
}
