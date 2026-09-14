/**
 * 添加账号（features/accounts/AddAccountDialog）· AgentForge
 * 两条路径：① 从本机客户端导入（推荐，无需重新登录）② 浏览器登录。
 * 全部使用 ui/ 组件；替代旧 AddAccountModal（692 行、大量内联样式）。
 */
import { useCallback, useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, EmptyState, Modal, Section, Tabs } from "../../ui";
import * as api from "../../api";
import type { Account } from "../../types";
import { platformColor, platformInitial } from "../../platformVisual";
import { useToast } from "../../app/ToastProvider";
import "./accounts.css";

type Tab = "local" | "browser" | "register";

export function AddAccountDialog({
  open,
  onClose,
  onAdded,
  existingUserIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (account?: Account) => void;
  existingUserIds?: string[];
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("local");
  const [logins, setLogins] = useState<api.LocalLoginPreview[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [browserBusy, setBrowserBusy] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);

  /** 快速注册（自动生成临时邮箱 → 注册 → 导入） */
  const quickRegister = async () => {
    setRegisterBusy(true);
    toast("info", "正在自动注册（约 1-2 分钟，请勿关闭窗口）…", 6000);
    try {
      const account = await api.quickRegister(false);
      toast("success", `注册成功并已导入：${account.email || account.name}`, 6000);
      onAdded(account);
      onClose();
    } catch (err: any) {
      toast("error", err?.message || "快速注册失败", 7000);
    } finally {
      setRegisterBusy(false);
    }
  };

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      setLogins(await api.previewLocalLogins());
    } catch {
      setLogins([]);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "local") void scan();
  }, [open, tab, scan]);

  const pending = logins.filter((l) => !(l.user_id && existingUserIds.includes(l.user_id)));

  const importOne = async (platformId: string, closeAfter = true) => {
    setImportingId(platformId);
    try {
      const r = await api.importLocalAccount(platformId);
      if (r.status === "imported" && r.account) {
        toast("success", r.message, 4500);
        onAdded(r.account);
        if (closeAfter) onClose();
      } else if (r.status === "already") {
        toast("info", r.message, 5000);
      } else {
        toast("warning", r.message || "未检测到可导入的账号", 5000);
      }
    } catch (err: any) {
      toast("error", err?.message || "导入失败", 6000);
    } finally {
      setImportingId(null);
    }
  };

  const importAll = async () => {
    setBatchBusy(true);
    let ok = 0;
    let dup = 0;
    let fail = 0;
    for (const item of pending) {
      try {
        const r = await api.importLocalAccount(item.platform_id);
        if (r.status === "imported" && r.account) {
          ok++;
          onAdded(r.account);
        } else if (r.status === "already") dup++;
        else fail++;
      } catch {
        fail++;
      }
    }
    setBatchBusy(false);
    toast(
      fail ? "warning" : "success",
      `批量导入完成：新增 ${ok}${dup ? `，已存在 ${dup}` : ""}${fail ? `，失败 ${fail}` : ""}`,
      5000
    );
    void scan();
  };

  const browserLogin = async () => {
    setBrowserBusy(true);
    toast("info", "已打开浏览器，请在页面中完成登录…", 5000);
    try {
      await api.startBrowserLogin();
      const account = await api.finishBrowserLogin();
      toast("success", `登录成功，已导入：${account.email || account.name}`, 5000);
      onAdded(account);
      onClose();
    } catch (err: any) {
      toast("error", err?.message || "浏览器登录失败", 6000);
    } finally {
      setBrowserBusy(false);
    }
  };

  const cancelBrowser = () => {
    void api.cancelBrowserLogin().catch(() => {});
    setBrowserBusy(false);
    toast("info", "已取消浏览器登录", 2500);
  };

  return (
    <Modal
      open={open}
      title="添加账号"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={batchBusy}>
            关闭
          </Button>
          {tab === "local" && (
            <Button onClick={() => void scan()} loading={scanning} disabled={batchBusy}>
              重新检测
            </Button>
          )}
        </>
      }
    >
      <div className="u-col" style={{ gap: "var(--s4)" }}>
        <Tabs
          items={[
            { id: "local", label: "从本机客户端导入" },
            { id: "browser", label: "浏览器登录" },
            ...(api.checkApiConfig() ? [{ id: "register", label: "快速注册" }] : []),
          ]}
          value={tab}
          onChange={(id) => setTab(id as Tab)}
        />

        {tab === "register" ? (
          <Section title="快速注册">
            <Card>
              <div className="af-feature__desc">
                自动生成临时邮箱完成注册并导入（依赖外部服务，耗时约 1-2 分钟）。
                注册期间请勿关闭本窗口。
              </div>
              <div className="af-feature__actions">
                <Button
                  variant="primary"
                  loading={registerBusy}
                  onClick={() => void quickRegister()}
                >
                  {registerBusy ? "注册中…" : "开始注册"}
                </Button>
              </div>
            </Card>
          </Section>
        ) : tab === "local" ? (
          <Section
            title="本机已登录的客户端"
            actions={
              pending.length > 1 ? (
                <Button size="sm" loading={batchBusy} onClick={() => void importAll()}>
                  全部导入（{pending.length}）
                </Button>
              ) : undefined
            }
          >
            {scanning && logins.length === 0 ? (
              <EmptyState title="正在检测本机客户端…" />
            ) : logins.length === 0 ? (
              <EmptyState
                title="未检测到已登录的客户端"
                desc="请先打开并登录 Trae / TraeCode CN / TraeWork 客户端，然后点「重新检测」。"
                action={
                  <Button variant="primary" onClick={() => void scan()}>
                    重新检测
                  </Button>
                }
              />
            ) : (
              <div className="af-acc-list">
                {logins.map((item) => {
                  const same =
                    !!item.user_id &&
                    logins.filter((l) => l.user_id === item.user_id).length > 1;
                  const imported = !!item.user_id && existingUserIds.includes(item.user_id);
                  return (
                    <div key={item.platform_id} className="af-acc" style={{ cursor: "default" }}>
                      <Avatar
                        color={platformColor(item.platform_id)}
                        text={platformInitial(item.display_name)}
                        size="md"
                      />
                      <div className="af-acc__main">
                        <div className="af-acc__name u-truncate">
                          {item.display_name}
                          {same && <Badge tone="info" title="这些客户端登录的是同一个账号">同一账号</Badge>}
                          {imported && <Badge tone="ok">已导入</Badge>}
                        </div>
                        <div className="af-acc__sub u-truncate">
                          {item.username || item.email || "已登录（导入时自动获取账号信息）"}
                        </div>
                      </div>
                      <div className="af-acc__actions" style={{ opacity: 1 }}>
                        <Button
                          size="sm"
                          variant={imported ? "default" : "primary"}
                          loading={importingId === item.platform_id}
                          disabled={batchBusy}
                          onClick={() => void importOne(item.platform_id)}
                        >
                          {imported ? "重新导入" : "导入"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        ) : (
          <Section title="浏览器登录">
            <Card>
              <div className="af-feature__desc">
                打开官网登录页，登录成功后自动把账号导入本工具。
                若你已在本机客户端登录过，用「从本机客户端导入」更快。
              </div>
              <div className="af-feature__actions">
                {browserBusy ? (
                  <>
                    <Button loading>等待登录…</Button>
                    <Button variant="ghost" onClick={cancelBrowser}>
                      取消登录
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={() => void browserLogin()}>
                    打开登录页面
                  </Button>
                )}
              </div>
            </Card>
          </Section>
        )}
      </div>
    </Modal>
  );
}
