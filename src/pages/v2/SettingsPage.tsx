/**
 * 设置（pages/v2/SettingsPage）· AgentForge
 * 分区：自动化 / 数据与迁移 / 诊断。每项均写清"何时生效"。
 */
import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Badge, Button, Card, Input, Section, Select, Switch } from "../../ui";
import * as api from "../../api";
import type { AppSettings, ChatVaultSlot } from "../../types";
import { useToast } from "../../app/ToastProvider";
import "./pages.css";

function fmtBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [chatBytes, setChatBytes] = useState<number | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [switchMode, setSwitchMode] = useState<string>(() => api.getSwitchMode());
  const [traePath, setTraePath] = useState("");
  const [pathBusy, setPathBusy] = useState(false);
  const [vaultSlots, setVaultSlots] = useState<ChatVaultSlot[]>([]);

  const reloadVault = () => {
    api
      .chatVaultSlots()
      .then(setVaultSlots)
      .catch(() => {});
  };

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
    api
      .chatDataStatus()
      .then((r) => setChatBytes(r.total_bytes))
      .catch(() => {});
    reloadVault();
    api
      .getTraePath()
      .then(setTraePath)
      .catch(() => {});
  }, []);

  const patch = async (part: Partial<AppSettings>, okMsg: string) => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await api.updateSettings({ ...settings, ...part });
      setSettings(next);
      toast("success", okMsg, 2400);
    } catch (err: any) {
      toast("error", err?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleChatExport = async () => {
    try {
      const dir = await open({ directory: true, title: "选择对话数据导出位置" });
      if (!dir || typeof dir !== "string") return;
      setChatBusy(true);
      toast("info", "正在导出对话数据（体积较大，请稍候）…", 4000);
      const reports = await api.chatDataExport(dir);
      if (reports.length === 0) {
        toast("warning", "未检测到可导出的对话数据", 5000);
      } else {
        const total = reports.reduce((s, r) => s + r.bytes, 0);
        toast("success", `已导出：${reports.map((r) => r.display_name).join("、")}（${fmtBytes(total)}）`, 6000);
      }
    } catch (err: any) {
      toast("error", err?.message || "导出失败", 6000);
    } finally {
      setChatBusy(false);
    }
  };

  const handleChatImport = async () => {
    try {
      const dir = await open({ directory: true, title: "选择对话数据来源文件夹" });
      if (!dir || typeof dir !== "string") return;
      if (
        !window.confirm(
          "将从所选文件夹恢复对话数据到本机客户端。\n\n· 请先关闭对应客户端\n· 现有对话库会自动改名备份（可回滚）\n\n继续吗？"
        )
      )
        return;
      setChatBusy(true);
      toast("info", "正在导入对话数据…", 4000);
      const reports = await api.chatDataImport(dir);
      toast(
        reports.length ? "success" : "warning",
        reports.length
          ? `已导入：${reports.map((r) => r.display_name).join("、")}，重开客户端即可看到历史`
          : "所选文件夹中未找到可导入的对话数据",
        6000
      );
    } catch (err: any) {
      toast("error", err?.message || "导入失败", 6000);
    } finally {
      setChatBusy(false);
    }
  };

  /** 删除某账号的对话槽位（仅删已入库的副本，不影响当前使用中的对话库） */
  const handleVaultDelete = async (slot: ChatVaultSlot) => {
    if (
      !window.confirm(
        `删除「${slot.platform_name}」中账号 ${slot.user_id.slice(0, 12)} 的本地对话副本？\n\n` +
          `将释放约 ${fmtBytes(slot.bytes)} 磁盘。该账号切回后对话历史需重新开始（云端会话不受影响）。\n\n此操作不可撤销。`,
      )
    )
      return;
    try {
      const freed = await api.chatVaultDeleteSlot(slot.platform_id, slot.user_id);
      toast("success", `已释放约 ${fmtBytes(freed)} 磁盘`, 5000);
      reloadVault();
    } catch (err: any) {
      toast("error", err?.message || "删除失败", 6000);
    }
  };

  const copyLogs = async () => {
    try {
      const logs = await api.getLogs(100);
      if (!logs.length) {
        toast("warning", "暂无日志内容");
        return;
      }
      await navigator.clipboard.writeText(logs.join("\n"));
      toast("success", "已复制最近 100 条日志");
    } catch (err: any) {
      toast("error", err?.message || "复制失败");
    }
  };

  return (
    <>
      <div className="af-page-head">
        <div>
          <div className="af-page-title">设置</div>
          <div className="af-page-sub">自动化行为、数据迁移与诊断</div>
        </div>
      </div>

      <Section title="切换与自动化">
        <Card>
          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">
                切换账号时的清理方式
                {switchMode === "flexible" && <Badge tone="ok">灵活切换</Badge>}
              </div>
              <div className="af-set-row__desc">
                <b>灵活切换（推荐）</b>：换掉设备特征（机器码、遥测 ID、登录凭证、Cookies），
                保留工作成果（编辑器布局、会话草稿、模型选择、Git 状态、终端历史、项目列表）。
                多账号来回切换时，做过的事都还在。
                <br />
                <b>保留聊天记录</b>：整体清空后再把该账号的界面与草稿状态合并恢复（旧行为）。
                <br />
                <b>全部清空</b>：每次切换都当作全新环境，工作状态不保留。
              </div>
              <div style={{ marginTop: "var(--s2)", maxWidth: 420 }}>
                <Select
                  value={switchMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    api.setSwitchMode(mode);
                    setSwitchMode(mode);
                    const msg =
                      mode === "flexible"
                        ? "已切到灵活切换：清设备特征，留工作成果"
                        : mode === "preserve_context"
                          ? "已切到保留聊天记录（旧行为）"
                          : "已切到全部清空";
                    toast("success", msg);
                  }}
                >
                  {api.SWITCH_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">定时自动签到</div>
              <div className="af-set-row__desc">
                每天到点用真实客户端完成签到（同账号只签一次）。
                <b>需要 AgentForge 保持运行</b>；建议同时开启下方「开机自动启动」。
                错过时间会在下次启动后自动补签。
              </div>
            </div>
            <div className="af-set-row__action">
              <Input
                type="time"
                style={{ width: 116 }}
                value={settings?.auto_checkin_time || "09:30"}
                disabled={!settings || !settings.auto_checkin_enabled || saving}
                onChange={(e) => void patch({ auto_checkin_time: e.target.value }, "已更新签到时间")}
              />
              <Switch
                checked={!!settings?.auto_checkin_enabled}
                disabled={!settings || saving}
                onChange={(next) =>
                  void patch({ auto_checkin_enabled: next }, next ? "已开启定时签到" : "已关闭定时签到")
                }
                label="定时自动签到"
              />
            </div>
          </div>

          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">
                开机自动启动（后台静默）
                <Badge tone="brand">推荐</Badge>
              </div>
              <div className="af-set-row__desc">
                开机后台常驻：自动刷新登录令牌、执行定时签到、记录积分用量。
                开启后无需手动打开本工具，上述自动化才会全天生效。
              </div>
            </div>
            <div className="af-set-row__action">
              <Switch
                checked={!!settings?.auto_start_enabled}
                disabled={!settings || saving}
                onChange={(next) =>
                  void patch({ auto_start_enabled: next }, next ? "已开启开机自启" : "已关闭开机自启")
                }
                label="开机自动启动"
              />
            </div>
          </div>

          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">自动刷新用量</div>
              <div className="af-set-row__desc">打开应用时自动刷新各账号的用量与积分数据。</div>
            </div>
            <div className="af-set-row__action">
              <Switch
                checked={!!settings?.auto_refresh_enabled}
                disabled={!settings || saving}
                onChange={(next) => void patch({ auto_refresh_enabled: next }, "已更新自动刷新设置")}
                label="自动刷新用量"
              />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="数据与迁移">
        <Card>
          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">对话数据迁移（换机 / 重装）</div>
              <div className="af-set-row__desc">
                导出各客户端的对话库与会话快照到文件夹；新机器导入即可延续历史。
                {chatBytes !== null && <> 本机合计约 <b>{fmtBytes(chatBytes)}</b>。</>}
                导入前请关闭对应客户端，现有对话库会自动改名备份。
              </div>
            </div>
            <div className="af-set-row__action">
              <Button loading={chatBusy} onClick={() => void handleChatExport()}>
                导出
              </Button>
              <Button disabled={chatBusy} onClick={() => void handleChatImport()}>
                导入
              </Button>
            </div>
          </div>

          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">
                每个账号独立保存本地对话数据
                {settings?.chat_vault_enabled && <Badge tone="ok">已开启</Badge>}
              </div>
              <div className="af-set-row__desc">
                开启后：切走账号时把它的本地对话库收进专属槽位，切回时原样取回，账号之间不再互相覆盖。
                采用同盘移动（秒级，不复制），代价是<b>每个账号各占一份磁盘</b>（单份常见 1 GB 左右）。
                <br />
                云端会话仍由各账号自身承载：本功能保住的是本机历史与索引，不能把 A 账号的云端对话搬给 B 账号。
              </div>
              {vaultSlots.length > 0 && (
                <div className="af-set-hint" style={{ marginTop: "var(--s2)" }}>
                  已保存 {vaultSlots.length} 个账号槽位，合计约{" "}
                  <b>{fmtBytes(vaultSlots.reduce((s, x) => s + x.bytes, 0))}</b>
                  <div style={{ marginTop: "var(--s1)", display: "grid", gap: "var(--s1)" }}>
                    {vaultSlots.map((s) => (
                      <div
                        key={`${s.platform_id}:${s.user_id}`}
                        style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {s.platform_name} · {s.user_id.slice(0, 12)}
                          {s.user_id.length > 12 ? "…" : ""} · {fmtBytes(s.bytes)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleVaultDelete(s)}
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="af-set-row__action">
              <Switch
                checked={!!settings?.chat_vault_enabled}
                disabled={saving || !settings}
                onChange={(v) =>
                  void patch(
                    { chat_vault_enabled: v },
                    v ? "已开启：下次切换账号即生效" : "已关闭（已保存的槽位仍保留）",
                  )
                }
              />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="客户端位置">
        <Card>
          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">客户端安装路径</div>
              <div className="af-set-row__desc">
                装在非标准位置时（例如自定义盘符）可在此指定；多数情况留空，工具会自动探测并记住。
              </div>
              <div style={{ marginTop: "var(--s2)", maxWidth: 460 }}>
                <Input
                  value={traePath}
                  placeholder="留空 = 自动探测"
                  onChange={(e) => setTraePath(e.target.value)}
                />
              </div>
            </div>
            <div className="af-set-row__action">
              <Button
                loading={pathBusy}
                onClick={async () => {
                  setPathBusy(true);
                  try {
                    const found = await api.scanTraePath();
                    setTraePath(found);
                    toast(found ? "success" : "warning", found ? `已探测到：${found}` : "未探测到客户端", 4500);
                  } catch (err: any) {
                    toast("error", err?.message || "探测失败");
                  } finally {
                    setPathBusy(false);
                  }
                }}
              >
                自动探测
              </Button>
              <Button
                loading={pathBusy}
                onClick={async () => {
                  setPathBusy(true);
                  try {
                    await api.setTraePath(traePath.trim());
                    toast("success", "客户端路径已保存", 3500);
                  } catch (err: any) {
                    toast("error", err?.message || "保存失败");
                  } finally {
                    setPathBusy(false);
                  }
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="诊断">
        <Card>
          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">应用日志</div>
              <div className="af-set-row__desc">复制最近 100 条日志，便于反馈问题。</div>
            </div>
            <div className="af-set-row__action">
              <Button onClick={() => void copyLogs()}>复制日志</Button>
            </div>
          </div>
        </Card>
      </Section>
    </>
  );
}
