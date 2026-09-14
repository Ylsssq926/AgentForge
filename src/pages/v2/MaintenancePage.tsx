/**
 * 维护（pages/v2/MaintenancePage）· AgentForge
 * 结构：选应用 → 看状态 → 选操作 → 执行/恢复。全部使用 ui/ 组件（不依赖旧 App.css）。
 */
import { useCallback, useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, Field, Input, Section, Switch } from "../../ui";
import * as api from "../../api";
import type { DeviceFingerprintStatus, PlatformStatus, ResetReport, StateCheck } from "../../api";
import { platformColor, platformInitial } from "../../platformVisual";
import { useToast } from "../../app/ToastProvider";
import "./pages.css";

export function MaintenancePage() {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<StateCheck | null>(null);
  const [fingerprint, setFingerprint] = useState<DeviceFingerprintStatus | null>(null);
  const [report, setReport] = useState<ResetReport | null>(null);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [opts, setOpts] = useState({
    cleanAccounts: true,
    cleanCache: true,
    resetDeviceIds: true,
    relaunch: false,
  });

  const selected = platforms.find((p) => p.platform_id === selectedId) || null;

  const loadPlatforms = useCallback(async () => {
    try {
      const list = await api.detectPlatforms();
      setPlatforms(list);
      setSelectedId((prev) => {
        if (prev && list.some((p) => p.platform_id === prev)) return prev;
        const pick =
          list.find((p) => p.data_dir_exists && p.storage_exists) ||
          list.find((p) => p.data_dir_exists) ||
          list[0];
        return pick ? pick.platform_id : "";
      });
    } catch (err: any) {
      toast("error", err?.message || "检测客户端失败");
    }
  }, [toast]);

  useEffect(() => {
    void loadPlatforms();
  }, [loadPlatforms]);

  const loadState = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        const [st, fp] = await Promise.all([
          api.verifyState(id),
          api.deviceFingerprintStatus(id).catch(() => null),
        ]);
        setState(st);
        setFingerprint(fp);
      } catch {
        setState(null);
      }
    },
    []
  );

  useEffect(() => {
    void loadState(selectedId);
  }, [selectedId, loadState]);

  const runReset = async () => {
    if (!selected) return;
    const lines = [
      `将对「${selected.display_name}」执行操作：`,
      opts.cleanAccounts ? "· 清除本地账号与权益数据（含 Cookies）" : "",
      opts.cleanCache ? "· 清理缓存目录与状态库" : "",
      opts.resetDeviceIds
        ? `· 重置设备标识（共 8 处）${newDeviceId.trim() ? ` · 新 ID：${newDeviceId.trim()}` : " · 自动生成"}`
        : "",
      "",
      "所有修改前自动生成 .bak 备份。",
      `执行期间需要关闭 ${selected.exe_name}。`,
      "",
      "继续吗？",
    ].filter((l) => l !== "");
    if (!window.confirm(lines.join("\n"))) return;

    setBusy(true);
    setReport(null);
    try {
      const r = await api.deepReset(selectedId, {
        ...opts,
        newDeviceId: opts.resetDeviceIds ? newDeviceId : undefined,
      });
      setReport(r);
      toast(r.ok ? "success" : "warning", r.ok ? "操作完成" : "完成，但存在失败步骤（见日志）", 5000);
      await loadState(selectedId);
    } catch (err: any) {
      toast("error", err?.message || "执行失败", 6000);
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        "将从最近的 .bak 备份恢复：\n设备标识 / 登录文件 / Cookies / 缓存目录。\n\n继续吗？"
      )
    )
      return;
    setBusy(true);
    try {
      const r = await api.restoreBackup(selectedId);
      toast("success", `已从备份恢复 ${r.restored} 项`, 5000);
      await loadState(selectedId);
    } catch (err: any) {
      toast("error", err?.message || "恢复失败", 6000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="af-page-head">
        <div>
          <div className="af-page-title">维护</div>
          <div className="af-page-sub">设备标识重置 · 深度清理 · 备份恢复（全程 .bak 可回滚）</div>
        </div>
        <span className="u-spacer" />
        <Button onClick={() => void loadPlatforms()}>重新检测</Button>
      </div>

      <Section title="选择应用">
        <div className="af-plat-grid">
          {platforms.map((p) => (
            <button
              key={p.platform_id}
              type="button"
              className={`af-plat ${selectedId === p.platform_id ? "is-active" : ""}`}
              onClick={() => setSelectedId(p.platform_id)}
            >
              <Avatar
                color={platformColor(p.platform_id)}
                text={platformInitial(p.display_name)}
                size="sm"
              />
              <div className="af-plat__main">
                <div className="af-plat__name u-truncate">{p.display_name}</div>
                <div className="af-plat__sub">
                  {p.data_dir_exists ? (p.storage_exists ? "已登录使用" : "已安装") : "未安装"}
                </div>
              </div>
              {p.data_dir_exists && p.storage_exists && <Badge tone="ok">就绪</Badge>}
            </button>
          ))}
        </div>
      </Section>

      {selected && (
        <>
          <Section title="当前状态">
            <Card>
              <div className="af-set-row">
                <div className="af-set-row__main">
                  <div className="af-set-row__label">账号与登录数据</div>
                  <div className="af-set-row__desc">
                    {state
                      ? `账号键 ${state.account_key_count} 项 · 登录文件 ${
                          state.storage_exists ? "存在" : "无"
                        } · 状态库 ${state.state_db_exists ? "存在" : "无"}`
                      : "读取中…"}
                  </div>
                </div>
              </div>
              <div className="af-set-row">
                <div className="af-set-row__main">
                  <div className="af-set-row__label">设备标识</div>
                  <div className="af-set-row__desc">
                    {fingerprint?.machine_id
                      ? `机器码 ${fingerprint.machine_id.slice(0, 12)}…`
                      : "未读取到机器码"}
                  </div>
                </div>
              </div>
            </Card>
          </Section>

          <Section title="操作选项">
            <Card>
              <OptionRow
                label="清除账号与权益数据"
                desc="移除本地账号记录与权益键（含 Cookies）。"
                checked={opts.cleanAccounts}
                onChange={(v) => setOpts((o) => ({ ...o, cleanAccounts: v }))}
              />
              <OptionRow
                label="清理缓存与状态库"
                desc="删除缓存目录与本地状态数据库。"
                checked={opts.cleanCache}
                onChange={(v) => setOpts((o) => ({ ...o, cleanCache: v }))}
              />
              <OptionRow
                label="重置设备标识（8 处）"
                desc="机器码、遥测、登录标记、本地指纹等一并重置。"
                checked={opts.resetDeviceIds}
                onChange={(v) => setOpts((o) => ({ ...o, resetDeviceIds: v }))}
              />
              <OptionRow
                label="完成后重新启动客户端"
                desc="操作结束自动拉起该客户端。"
                checked={opts.relaunch}
                onChange={(v) => setOpts((o) => ({ ...o, relaunch: v }))}
              />
              {opts.resetDeviceIds && (
                <div className="af-set-row">
                  <div className="af-set-row__main">
                    <Field
                      label="自定义设备 ID（可选）"
                      hint="纯数字 8-20 位；留空则自动生成随机值。"
                    >
                      <Input
                        placeholder="留空 = 自动生成"
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value)}
                        style={{ maxWidth: 260 }}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </Card>
          </Section>

          <div className="u-row">
            <Button variant="primary" loading={busy} onClick={() => void runReset()}>
              执行操作
            </Button>
            <Button disabled={busy} onClick={() => void runRestore()}>
              从备份恢复
            </Button>
            <span className="u-spacer" />
            <span className="u-subtle">目标：{selected.display_name}（需关闭客户端）</span>
          </div>

          {report && (
            <Section title="执行日志">
              <div className="af-log">{report.log.join("\n")}</div>
            </Section>
          )}
        </>
      )}
    </>
  );
}

function OptionRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="af-set-row">
      <div className="af-set-row__main">
        <div className="af-set-row__label">{label}</div>
        <div className="af-set-row__desc">{desc}</div>
      </div>
      <div className="af-set-row__action">
        <Switch checked={checked} onChange={onChange} label={label} />
      </div>
    </div>
  );
}
