import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Network, type ConnectionStatus } from "@capacitor/network";

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
