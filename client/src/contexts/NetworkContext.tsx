import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Network, type ConnectionStatus } from "@capacitor/network";
import { toast } from "@/hooks/use-toast";

interface NetworkContextValue {
  connected: boolean;
  connectionType: string;
}

const DEFAULT_VALUE: NetworkContextValue = {
  connected: true,
  connectionType: "unknown",
};

const NetworkContext = createContext<NetworkContextValue>(DEFAULT_VALUE);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkContextValue>(DEFAULT_VALUE);

  // Fire a toast the first time the connection transitions to offline.
  // The ref prevents a toast on the initial mount when status is still the
  // DEFAULT_VALUE (connected: true) before the real status is fetched.
  const prevConnectedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevConnectedRef.current === null) {
      // First render — just record the current state without toasting.
      prevConnectedRef.current = status.connected;
      return;
    }
    if (prevConnectedRef.current === true && status.connected === false) {
      toast({
        title: 'No internet connection',
        description: 'Only downloaded surahs are available offline.',
        variant: 'destructive',
      });
    }
    prevConnectedRef.current = status.connected;
  }, [status.connected]);

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    Network.getStatus()
      .then((s: ConnectionStatus) => {
        if (cancelled) return;
        setStatus({ connected: s.connected, connectionType: s.connectionType });
      })
      .catch((err) => {
        console.warn("[Network] getStatus failed", err);
      });

    Network.addListener("networkStatusChange", (s: ConnectionStatus) => {
      setStatus({ connected: s.connected, connectionType: s.connectionType });
    })
      .then((handle) => {
        if (cancelled) {
          handle.remove();
          return;
        }
        removeListener = () => { handle.remove(); };
      })
      .catch((err) => {
        console.warn("[Network] addListener failed", err);
      });

    return () => {
      cancelled = true;
      if (removeListener) removeListener();
    };
  }, []);

  return <NetworkContext.Provider value={status}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus(): NetworkContextValue {
  return useContext(NetworkContext);
}
