import { useEffect, useRef, useCallback } from "react";

type BotStatus = "offline" | "connecting" | "online" | "disconnected" | "suspended";
interface SessionState {
  userId: string;
  status: BotStatus;
  qr?: string;
  pairingCode?: string;
  error?: string;
  lastConnectedAt?: string;
}

export function useBotSession(userId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<((state: SessionState) => void)[]>([]);

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket(`wss://hfzbotcloud.my.id:3001?userId=${userId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data) as SessionState;
        listenersRef.current.forEach(fn => fn(state));
      } catch {}
    };

    ws.onclose = () => {
      setTimeout(connect, 3000); // reconnect
    };
  }, [userId]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const onState = useCallback((fn: (state: SessionState) => void) => {
    listenersRef.current.push(fn);
    return () => {
      listenersRef.current = listenersRef.current.filter(f => f !== fn);
    };
  }, []);

  return { onState };
}
