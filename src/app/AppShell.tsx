/**
 * 应用外壳（app/AppShell）· AgentForge
 * 结构：左侧导航（应用组 + 全局组）+ 右侧内容区。
 * 心智：**应用为主语** —— 应用条目进入工作台；全局仅保留「全部账号 / 设置 / 关于」。
 */
import type { ReactNode } from "react";
import { Avatar, Badge } from "../ui";
import { platformColor, platformInitial } from "../platformVisual";
import "./shell.css";

export interface ShellApp {
  id: string;
  label: string;
  planned: boolean;
  accountCount?: number;
}

const GLOBAL_ITEMS = [
  { id: "accounts", label: "全部账号" },
  { id: "settings", label: "设置" },
  { id: "about", label: "关于" },
];

export function AppShell({
  apps,
  current,
  onNavigate,
  children,
}: {
  apps: ShellApp[];
  current: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="af-shell">
      <aside className="af-side">
        <div className="af-side__brand">
          <Avatar color="var(--brand)" text="AF" size="md" />
          <div className="af-side__brand-text">
            <div className="af-side__brand-name">AgentForge</div>
            <div className="af-side__brand-sub">智能体工坊</div>
          </div>
        </div>

        <nav className="af-side__nav">
          <div className="af-side__group">应用</div>
          {apps.map((app) => {
            const active = current === `app:${app.id}`;
            return (
              <button
                key={app.id}
                type="button"
                className={`af-nav-item ${active ? "is-active" : ""} ${
                  app.planned ? "is-planned" : ""
                }`}
                onClick={() => !app.planned && onNavigate(`app:${app.id}`)}
                title={app.planned ? `${app.label}：适配规划中` : app.label}
              >
                <Avatar
                  color={app.planned ? "var(--fg-subtle)" : platformColor(app.id)}
                  text={platformInitial(app.label)}
                  size="sm"
                />
                <span className="af-nav-item__label u-truncate">{app.label}</span>
                {app.planned ? (
                  <Badge>规划中</Badge>
                ) : app.accountCount ? (
                  <span className="af-nav-item__count">{app.accountCount}</span>
                ) : null}
              </button>
            );
          })}

          <div className="af-side__group">全局</div>
          {GLOBAL_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`af-nav-item ${current === item.id ? "is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="af-nav-item__label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="af-content">
        <div className="af-content__inner">{children}</div>
      </main>
    </div>
  );
}
