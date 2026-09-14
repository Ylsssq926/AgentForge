/**
 * Toast 上下文（app/providers）· AgentForge
 * 从旧 App.tsx 中剥离出的通知能力：任何组件通过 useToast() 即可提示，无需层层传参。
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastApi {
  toast: (type: ToastType, message: string, durationMs?: number, dedupeKey?: string) => void;
}

const Ctx = createContext<ToastApi>({ toast: () => {} });

const MARKS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, durationMs = 3200, dedupeKey?: string) => {
      const id = dedupeKey || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => {
        const next = prev.filter((t) => t.id !== id);
        return [...next, { id, type, message }].slice(-4); // 最多同时 4 条
      });
      if (durationMs > 0) {
        window.setTimeout(() => remove(id), durationMs);
      }
    },
    [remove]
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="af-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`af-toast af-toast--${t.type}`}>
            <span className="af-toast__mark" aria-hidden>
              {MARKS[t.type]}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              className="af-toast__close"
              onClick={() => remove(t.id)}
              aria-label="关闭提示"
              type="button"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(Ctx);
}
