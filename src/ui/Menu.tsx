/**
 * 上下文菜单（ui/Menu）· AgentForge
 * 右键唤出的操作菜单：自动避让视口边界、点击外部/Esc 关闭。
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface MenuItem {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** 分隔线（置于该项之前） */
  separatorBefore?: boolean;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    // 边界避让：菜单超出视口时向内翻转
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = x + r.width > window.innerWidth - 8 ? Math.max(8, x - r.width) : x;
    const top = y + r.height > window.innerHeight - 8 ? Math.max(8, y - r.height) : y;
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="af-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) => (
        <div key={it.id}>
          {it.separatorBefore && <div className="af-menu__sep" />}
          <button
            type="button"
            role="menuitem"
            className={`af-menu__item ${it.danger ? "is-danger" : ""}`}
            disabled={it.disabled}
            onClick={() => {
              it.onSelect();
              onClose();
            }}
          >
            {it.label}
          </button>
        </div>
      ))}
    </div>
  );
}
