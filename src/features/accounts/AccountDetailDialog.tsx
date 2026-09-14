/**
 * 账号详情（features/accounts/AccountDetailDialog）· AgentForge
 * 展示用量与凭据，支持编辑邮箱/密码与分组备注、复制信息。
 * 全部使用 ui/ 组件；替代旧 DetailModal（695 行）。
 */
import { useEffect, useState } from "react";
import { Avatar, Badge, Button, Field, Input, Modal, Section } from "../../ui";
import type { AccountRow } from "./useAccounts";
import type { AccountChannels, UsageEvent } from "../../types";
import { platformColor, platformInitial } from "../../platformVisual";
import { useToast } from "../../app/ToastProvider";
import * as api from "../../api";
import "./accounts.css";

export function AccountDetailDialog({
  row,
  channels,
  onClose,
  onSaveProfile,
  onSaveMeta,
  onSwitch,
  onRefresh,
  onDelete,
}: {
  row: AccountRow | null;
  channels?: AccountChannels | null;
  onClose: () => void;
  onSaveProfile: (id: string, updates: { email?: string; password?: string }) => Promise<void>;
  onSaveMeta: (id: string, group: string, note: string) => Promise<void>;
  onSwitch: (id: string) => void;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [group, setGroup] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");
  const [repairing, setRepairing] = useState(false);
  /** 用量明细（按需加载：点开才请求，避免拖慢弹窗） */
  const [events, setEvents] = useState<UsageEvent[] | null>(null);
  const [eventsBusy, setEventsBusy] = useState(false);

  const loadEvents = async (id: string) => {
    setEventsBusy(true);
    try {
      const end = Math.floor(Date.now() / 1000);
      const start = end - 7 * 24 * 3600; // 近 7 天
      const resp = await api.getUsageEvents(id, start, end, 1, 20);
      setEvents(resp.user_usage_group_by_sessions || []);
    } catch (err: any) {
      toast("error", err?.message || "获取用量明细失败", 6000);
      setEvents([]);
    } finally {
      setEventsBusy(false);
    }
  };

  useEffect(() => {
    setEmail(row?.email || "");
    setPassword((row as any)?.password || "");
    setGroup(row?.group || "");
    setNote(row?.note || "");
    setShowPwd(false);
    setEvents(null);
    setTokenDraft("");
  }, [row]);

  if (!row) return null;

  const usage = row.usage;
  const platformId = channels?.platform_ids?.[0] || "";
  const platformLabel = channels?.platform_names?.join(" / ") || row.source_platform || "本地账号";

  const copy = (text: string, what: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast("success", `已复制${what}`, 2000));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await onSaveProfile(row.id, { email, password });
    } finally {
      setSaving(false);
    }
  };

  const saveMeta = async () => {
    setSaving(true);
    try {
      await onSaveMeta(row.id, group, note);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!row}
      title="账号详情"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("确定删除此账号吗？删除后无法恢复（本地记录）。")) {
                onDelete(row.id);
                onClose();
              }
            }}
          >
            删除账号
          </Button>
          <span className="u-spacer" />
          <Button onClick={() => onRefresh(row.id)}>刷新用量</Button>
          <Button variant="primary" onClick={() => onSwitch(row.id)}>
            切换到此账号
          </Button>
        </>
      }
    >
      <div className="u-col" style={{ gap: "var(--s5)" }}>
        {/* 身份头 */}
        <div className="u-row" style={{ gap: "var(--s3)" }}>
          <Avatar
            color={platformColor(platformId)}
            text={platformInitial(platformLabel)}
            src={row.avatar_url || undefined}
            size="lg"
          />
          <div style={{ minWidth: 0 }}>
            <div className="af-acc__name">
              {row.name || row.email || row.id}
              {row.is_current && <Badge tone="ok">当前使用</Badge>}
            </div>
            <div className="af-acc__sub u-truncate">
              {platformLabel} · {row.plan_type || "Free"}
            </div>
          </div>
        </div>

        {/* 用量 */}
        <Section title="用量">
          <div className="af-stat-row">
            {usage?.is_credits_billing ? (
              <>
                <div className="af-stat">
                  <div className="af-stat__label">剩余积分</div>
                  <div className="af-stat__value">{Math.round(usage.credits_left ?? 0)}</div>
                </div>
                <div className="af-stat">
                  <div className="af-stat__label">总额</div>
                  <div className="af-stat__value">{Math.round(usage.credits_total ?? 0)}</div>
                </div>
              </>
            ) : usage ? (
              <div className="af-stat">
                <div className="af-stat__label">快速请求余额</div>
                <div className="af-stat__value">
                  ${(usage.fast_dollar_left ?? 0).toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="af-stat">
                <div className="af-stat__label">用量</div>
                <div className="af-stat__value">—</div>
              </div>
            )}
          </div>
        </Section>

        {/* 凭据 */}
        <Section
          title="登录信息"
          actions={
            <Button size="sm" loading={saving} onClick={() => void saveProfile()}>
              保存
            </Button>
          }
        >
          <div className="u-col" style={{ gap: "var(--s3)" }}>
            <Field label="邮箱">
              <div className="u-row">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button size="sm" variant="ghost" onClick={() => copy(email, "邮箱")}>
                  复制
                </Button>
              </div>
            </Field>
            <Field label="密码" hint="留空表示不修改；仅保存在本机。">
              <div className="u-row">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="（未记录）"
                />
                <Button size="sm" variant="ghost" onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? "隐藏" : "显示"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copy(password, "密码")}>
                  复制
                </Button>
              </div>
            </Field>
          </div>
        </Section>

        {/* 用量明细（近 7 天，按需加载） */}
        <Section
          title="用量明细（近 7 天）"
          actions={
            <Button size="sm" loading={eventsBusy} onClick={() => void loadEvents(row.id)}>
              {events === null ? "加载" : "刷新"}
            </Button>
          }
        >
          {events === null ? (
            <div className="u-subtle">点「加载」查看最近的模型调用与消耗明细。</div>
          ) : events.length === 0 ? (
            <div className="u-subtle">近 7 天没有用量记录。</div>
          ) : (
            <div className="af-log">
              {events
                .map((ev) => {
                  const t = new Date(ev.usage_time * 1000).toLocaleString();
                  const cost =
                    ev.cost_money_float > 0
                      ? `$${ev.cost_money_float.toFixed(4)}`
                      : `${ev.amount_float} 积分`;
                  const io = ev.extra_info
                    ? ` · in ${ev.extra_info.input_token} / out ${ev.extra_info.output_token}`
                    : "";
                  return `${t}  ${ev.model_name || ev.mode || "—"}  ${cost}${io}`;
                })
                .join("\n")}
            </div>
          )}
        </Section>

        {/* 登录失效时的修复手段 */}
        <Section title="修复登录（令牌过期时使用）">
          <div className="u-col" style={{ gap: "var(--s3)" }}>
            <Field
              label="手动更新令牌"
              hint="从客户端或浏览器取得新的登录令牌后粘贴到此处，可立即恢复该账号可用性。"
            >
              <div className="u-row">
                <Input
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  placeholder="粘贴新的 Token"
                />
                <Button
                  size="sm"
                  loading={repairing}
                  disabled={!tokenDraft.trim()}
                  onClick={async () => {
                    setRepairing(true);
                    try {
                      await api.updateAccountToken(row.id, tokenDraft.trim());
                      setTokenDraft("");
                      toast("success", "令牌已更新，账号恢复可用", 4500);
                      onRefresh(row.id);
                    } catch (err: any) {
                      toast("error", err?.message || "更新令牌失败", 6000);
                    } finally {
                      setRepairing(false);
                    }
                  }}
                >
                  更新
                </Button>
              </div>
            </Field>
            <Field
              label="刷新登录令牌"
              hint="用已保存的刷新凭据续期（最省事，优先尝试这个）。"
            >
              <Button
                size="sm"
                loading={repairing}
                onClick={async () => {
                  setRepairing(true);
                  try {
                    await api.refreshToken(row.id);
                    toast("success", "登录令牌已刷新", 4000);
                    onRefresh(row.id);
                  } catch (err: any) {
                    toast("error", err?.message || "刷新令牌失败", 6000);
                  } finally {
                    setRepairing(false);
                  }
                }}
              >
                刷新令牌
              </Button>
            </Field>
            <Field label="用邮箱密码重新登录" hint="需已填写上方邮箱与密码；将重新获取登录凭据。">
              <Button
                size="sm"
                loading={repairing}
                disabled={!email.trim() || !password.trim()}
                onClick={async () => {
                  setRepairing(true);
                  try {
                    await api.loginAccountWithEmail(row.id, email.trim(), password.trim());
                    toast("success", "重新登录成功，凭据已更新", 4500);
                    onRefresh(row.id);
                  } catch (err: any) {
                    toast("error", err?.message || "重新登录失败", 6000);
                  } finally {
                    setRepairing(false);
                  }
                }}
              >
                重新登录
              </Button>
            </Field>
          </div>
        </Section>

        {/* 分组备注 */}
        <Section
          title="分组与备注"
          actions={
            <Button size="sm" loading={saving} onClick={() => void saveMeta()}>
              保存
            </Button>
          }
        >
          <div className="u-col" style={{ gap: "var(--s3)" }}>
            <Field label="分组">
              <Input
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="如：主力 / 备用"
              />
            </Field>
            <Field label="备注">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="自定义说明"
              />
            </Field>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
