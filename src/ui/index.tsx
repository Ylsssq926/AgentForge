/**
 * 基础组件层（ui/）· AgentForge
 *
 * 约定：
 * - 只依赖 design/tokens.css 的变量与 ui/ui.css 的 af-* 类，绝不内联硬编码色值
 * - 组件保持"无业务"：不引 api、不引 features
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { useEffect } from "react";
import "./ui.css";

type Variant = "default" | "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** 仅图标（正方形按钮） */
  iconOnly?: boolean;
  loading?: boolean;
}

export function Button({
  variant = "default",
  size = "md",
  iconOnly,
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = [
    "af-btn",
    variant !== "default" ? `af-btn--${variant}` : "",
    size !== "md" ? `af-btn--${size}` : "",
    iconOnly ? "af-btn--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="af-spin" aria-hidden />}
      {children}
    </button>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 前缀图标（会自动留出内边距） */
  icon?: ReactNode;
}

export function Input({ icon, className = "", ...rest }: InputProps) {
  if (icon) {
    return (
      <span className="af-input-wrap">
        {icon}
        <input className={`af-input ${className}`} {...rest} />
      </span>
    );
  }
  return <input className={`af-input ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`af-select ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="af-field">
      {label && <label className="af-field__label">{label}</label>}
      {children}
      {hint && !error && <div className="af-field__hint">{hint}</div>}
      {error && <div className="af-field__error">{error}</div>}
    </div>
  );
}

export function Card({
  pad = true,
  hover,
  className = "",
  children,
  ...rest
}: {
  pad?: boolean;
  hover?: boolean;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const cls = ["af-card", pad ? "af-card--pad" : "", hover ? "af-card--hover" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export type BadgeTone = "neutral" | "brand" | "ok" | "warn" | "err" | "info";

export function Badge({
  tone = "neutral",
  children,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
}) {
  const cls = ["af-badge", tone !== "neutral" ? `af-badge--${tone}` : ""].filter(Boolean).join(" ");
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}

/** 应用/账号色章 */
export function Avatar({
  color,
  text,
  src,
  size = "md",
  title,
}: {
  color?: string;
  text?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  return (
    <span
      className={`af-avatar af-avatar--${size}`}
      style={{ background: src ? "transparent" : color || "var(--fg-subtle)" }}
      title={title}
    >
      {src ? <img src={src} alt={title || ""} /> : text}
    </span>
  );
}

export function Modal({
  open,
  title,
  onClose,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  title?: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="af-modal-overlay" onClick={onClose}>
      <div
        className={`af-modal ${size === "lg" ? "af-modal--lg" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="af-modal__header">
            <div className="af-modal__title">{title}</div>
            <span className="u-spacer" />
            <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="关闭">
              ✕
            </Button>
          </div>
        )}
        <div className="af-modal__body">{children}</div>
        {footer && <div className="af-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  desc,
  action,
}: {
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="af-empty">
      <div className="af-empty__title">{title}</div>
      {desc && <div className="af-empty__desc">{desc}</div>}
      {action}
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="af-tabs" role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          className={`af-tab ${value === it.id ? "is-active" : ""}`}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`af-switch ${checked ? "is-on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Section({
  title,
  actions,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="af-section">
      {(title || actions) && (
        <div className="af-section__head">
          {title && <div className="af-section__title">{title}</div>}
          <span className="u-spacer" />
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
