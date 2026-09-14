/**
 * 应用根（app/AppRoot）· AgentForge
 * 职责仅为"装配"：Provider → 外壳 → 路由到页面；业务逻辑在 features/，展示在 ui/ 与 pages/v2。
 * 取代旧 1477 行 App.tsx。
 */
import { useCallback, useMemo, useState } from "react";
import "../design/tokens.css";
import "../design/primitives.css";
// 说明：旧 App.css（6951 行）已随三大弹窗与维护页重写而彻底退役——
// 新架构仅依赖 design/tokens.css + design/primitives.css + 各 feature 的样式模块。
import { ToastProvider, useToast } from "./ToastProvider";
import { AppShell } from "./AppShell";
import { useAccounts } from "../features/accounts/useAccounts";
import { usePlatforms } from "../features/platforms/usePlatforms";
import { WorkbenchPage } from "../pages/v2/WorkbenchPage";
import { AllAccountsPage } from "../pages/v2/AllAccountsPage";
import { SettingsPage } from "../pages/v2/SettingsPage";
import { AboutPage } from "../pages/v2/AboutPage";
import { MaintenancePage } from "../pages/v2/MaintenancePage";
import { AddAccountDialog } from "../features/accounts/AddAccountDialog";
import { AccountDetailDialog } from "../features/accounts/AccountDetailDialog";
import { useMultiInstance } from "../features/accounts/useMultiInstance";
import { useCheckin } from "../features/automation/useCheckin";
import { ContextMenu } from "../ui/Menu";
import type { MenuItem } from "../ui/Menu";
import * as api from "../api";
import type { AccountRow } from "../features/accounts/useAccounts";

function Inner() {
  const { toast } = useToast();
  const accountsApi = useAccounts();
  const { apps, byId } = usePlatforms();

  // 路由：app:<id> / accounts / maintenance / settings / about
  const [page, setPage] = useState<string>(() => "accounts");
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<AccountRow | null>(null);
  const multi = useMultiInstance();
  /** 签到（CDP 驱动真实客户端）：全局共享，供各页面与右键菜单调用 */
  const checkin = useCheckin(() => void accountsApi.load());
  /** 右键菜单（账号行） */
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  /** 侧栏应用条目（带账号计数） */
  const shellApps = useMemo(
    () =>
      apps.map((a) => ({
        ...a,
        accountCount: a.planned ? 0 : accountsApi.accountsOfApp(a.id, a.label).length,
      })),
    [apps, accountsApi]
  );

  const openDetail = useCallback(
    async (id: string) => {
      const row = accountsApi.accounts.find((a) => a.id === id);
      if (!row) return;
      try {
        const full = await api.getAccount(id);
        setDetail({ ...row, email: full.email, password: full.password ?? null } as AccountRow);
      } catch {
        setDetail(row);
      }
    },
    [accountsApi.accounts]
  );

  const updateCredentials = useCallback(
    async (accountId: string, updates: { email?: string; password?: string }) => {
      await api.updateAccountProfile(accountId, updates);
      await accountsApi.load();
      toast("success", "账号信息已更新");
    },
    [accountsApi, toast]
  );

  const updateMeta = useCallback(
    async (accountId: string, group: string, note: string) => {
      await api.updateAccountMeta(accountId, group, note);
      await accountsApi.load();
      toast("success", "分组与备注已保存");
    },
    [accountsApi, toast]
  );

  /** 右键菜单项（覆盖旧版全部操作 + 多开实例） */
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const id = menu.id;
    const row = accountsApi.accounts.find((a) => a.id === id);
    const running = !!multi.instances[id]?.running;
    return [
      { id: "switch", label: "切换到此账号", onSelect: () => void accountsApi.switchTo(id) },
      {
        id: "checkin",
        label: "签到（用真实客户端）",
        disabled: checkin.busy,
        onSelect: () => {
          const ch = accountsApi.channels[id];
          const pid = ch?.platform_ids?.[0];
          const label = ch?.platform_names?.[0];
          if (pid) void checkin.runOne(pid, label);
          else void checkin.runAll();
        },
      },
      {
        id: "relogin",
        label: "重新登录（强制写入）",
        onSelect: () => void accountsApi.switchTo(id, { force: true }),
      },
      {
        id: "multi",
        label: running ? "停止多开实例" : "多开实例（独立登录）",
        separatorBefore: true,
        disabled: multi.busyId === id,
        onSelect: () => void multi.toggle(id),
      },
      {
        id: "multi-remove",
        label: "删除多开实例数据",
        danger: true,
        disabled: multi.busyId === id,
        onSelect: () => void multi.removeData(id),
      },
      {
        id: "refresh",
        label: "刷新用量",
        separatorBefore: true,
        onSelect: () => void accountsApi.refreshOne(id),
      },
      {
        id: "refresh-token",
        label: "刷新登录令牌",
        onSelect: async () => {
          toast("info", "正在刷新登录令牌…", 3000);
          try {
            await api.refreshToken(id);
            toast("success", "登录令牌已刷新", 4000);
            void accountsApi.refreshOne(id, { silent: true });
          } catch (err: any) {
            toast("error", `刷新令牌失败：${err?.message || err}`, 6500);
          }
        },
      },
      { id: "detail", label: "查看详情", onSelect: () => void openDetail(id) },
      {
        id: "copy",
        label: "复制邮箱",
        onSelect: () => {
          const text = row?.email || "";
          if (!text) {
            toast("warning", "该账号没有邮箱信息");
            return;
          }
          navigator.clipboard.writeText(text).then(() => toast("success", "已复制邮箱", 2000));
        },
      },
      {
        id: "delete",
        label: "删除账号",
        danger: true,
        separatorBefore: true,
        onSelect: () => {
          if (window.confirm("确定删除此账号吗？（仅删除本工具内的记录）")) {
            void accountsApi.remove(id);
          }
        },
      },
    ];
  }, [menu, accountsApi, multi, openDetail, toast]);

  let content: React.ReactNode = null;
  if (page.startsWith("app:")) {
    const app = byId(page.slice(4));
    content = app ? (
      <WorkbenchPage
        app={app}
        accountsApi={accountsApi}
        instances={multi.instances}
        onAddAccount={() => setAddOpen(true)}
        onOpenAccount={(id) => void openDetail(id)}
        onNavigate={setPage}
        onRowContextMenu={(e, id) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, id });
        }}
      />
    ) : null;
  } else if (page === "accounts") {
    content = (
      <AllAccountsPage
        accountsApi={accountsApi}
        apps={apps}
        instances={multi.instances}
        onAddAccount={() => setAddOpen(true)}
        onOpenAccount={(id) => void openDetail(id)}
        onRowContextMenu={(e, id) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, id });
        }}
        onCheckinAll={() => void checkin.runAll()}
        checkinBusy={checkin.busy}
      />
    );
  } else if (page === "maintenance") {
    content = <MaintenancePage />;
  } else if (page === "settings") {
    content = <SettingsPage />;
  } else if (page === "about") {
    content = <AboutPage />;
  }

  return (
    <>
      <AppShell apps={shellApps} current={page} onNavigate={setPage}>
        {content}
      </AppShell>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      <AddAccountDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => void accountsApi.load()}
        existingUserIds={accountsApi.accounts.map((a) => a.user_id || "").filter(Boolean)}
      />

      <AccountDetailDialog
        row={detail}
        channels={detail ? accountsApi.channels[detail.id] : null}
        onClose={() => setDetail(null)}
        onSaveProfile={updateCredentials}
        onSaveMeta={updateMeta}
        onSwitch={(id) => {
          setDetail(null);
          void accountsApi.switchTo(id);
        }}
        onRefresh={(id) => void accountsApi.refreshOne(id)}
        onDelete={(id) => void accountsApi.remove(id)}
      />
    </>
  );
}

export function AppRoot() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
