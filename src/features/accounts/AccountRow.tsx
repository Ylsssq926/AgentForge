/**
 * 账号行（features/accounts/AccountRow）· AgentForge
 * 统一的账号展示单元：色章 + 名称/邮箱 + 用量 + 预警 + 操作。
 * 卡片/列表两种视图共用同一数据表达，避免样式与信息不一致。
 */
import { Avatar, Badge, Button } from "../../ui";
import type { AccountRow as Row } from "./useAccounts";
import type { UsageTrend, AccountChannels } from "../../types";
import { platformColor, platformInitial } from "../../platformVisual";
import "./accounts.css";

function creditText(row: Row): string | null {
  const u = row.usage;
  if (!u) return null;
  if (u.is_credits_billing) {
    return `${Math.round(u.credits_left ?? 0)} / ${Math.round(u.credits_total ?? 0)} 积分`;
  }
  if (u.is_dollar_billing) {
    return `$${(u.fast_dollar_left ?? 0).toFixed(2)} 余额`;
  }
  return null;
}

/** 剩余额度占比（0..1）；无总量或非额度计费时返回 null */
function creditRatio(row: Row): number | null {
  const u = row.usage;
  if (!u) return null;
  if (u.is_credits_billing) {
    const total = u.credits_total ?? 0;
    if (total <= 0) return null;
    return Math.min(1, Math.max(0, (u.credits_left ?? 0) / total));
  }
  return null;
}

export function AccountRowItem({
  row,
  trend,
  channels,
  refreshing,
  selected,
  onToggleSelect,
  multiOpen,
  onOpen,
  onRefresh,
  onSwitch,
  onContextMenu,
}: {
  row: Row;
  trend?: UsageTrend | null;
  channels?: AccountChannels | null;
  refreshing?: boolean;
  /** 批量选择：为 undefined 时不显示复选框 */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** 多开实例运行中 */
  multiOpen?: boolean;
  onOpen: () => void;
  onRefresh: () => void;
  onSwitch: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const primaryPlatform = channels?.platform_ids?.[0] || "";
  const label = channels?.platform_names?.[0] || row.source_platform || "本地账号";
  const credits = creditText(row);
  const days = trend?.days_to_empty != null && trend.days_to_empty <= 30 ? trend.days_to_empty : null;
  const daysTone = days == null ? "neutral" : days <= 3 ? "err" : days <= 7 ? "warn" : "info";
  // 额度量条（借鉴 workbuddy2api-panel 的积分量条：一眼看出余量档位）
  const ratio = creditRatio(row);
  const ratioTone = ratio == null ? "ok" : ratio <= 0.1 ? "err" : ratio <= 0.3 ? "warn" : "ok";

  return (
    <div
      className="af-acc"
      onClick={onOpen}
      onContextMenu={onContextMenu}
      title="点击查看详情 · 右键更多操作"
    >
      {onToggleSelect && (
        <button
          type="button"
          className={`af-check ${selected ? "is-on" : ""}`}
          aria-label="选择账号"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        />
      )}
      <Avatar
        color={platformColor(primaryPlatform)}
        text={platformInitial(label)}
        src={row.avatar_url || undefined}
        size="md"
        title={label}
      />

      <div className="af-acc__main">
        <div className="af-acc__name u-truncate">
          {row.name || row.email || row.id}
          {row.is_current && <Badge tone="ok">当前</Badge>}
          {multiOpen && <Badge tone="info" title="多开实例运行中">多开中</Badge>}
        </div>
        <div className="af-acc__sub u-truncate">
          {row.email || "—"}
          {channels?.platform_names && channels.platform_names.length > 1 && (
            <span className="af-acc__chan"> · {channels.platform_names.join(" / ")}</span>
          )}
        </div>
      </div>

      <div className="af-acc__meta">
        {credits && <Badge tone="brand">{credits}</Badge>}
        {days != null && (
          <Badge tone={daysTone as "err" | "warn" | "info"} title="按近期消耗速率估算">
            约 {Math.max(1, Math.ceil(days))} 天后见底
          </Badge>
        )}
        {ratio != null && (
          <div
            className="af-acc__bar"
            title={`剩余额度 ${Math.round(ratio * 100)}%`}
            aria-label={`剩余额度 ${Math.round(ratio * 100)}%`}
          >
            <span
              className={`af-acc__bar-fill af-acc__bar-fill--${ratioTone}`}
              style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
            />
          </div>
        )}
      </div>

      <div className="af-acc__actions" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" loading={refreshing} onClick={onRefresh} title="刷新用量">
          刷新
        </Button>
        <Button size="sm" onClick={onSwitch} title="切换到该账号">
          切换
        </Button>
      </div>
    </div>
  );
}
