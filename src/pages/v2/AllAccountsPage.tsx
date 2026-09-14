/**
 * 全部账号（pages/v2/AllAccountsPage）· AgentForge
 * 跨应用视角：搜索 / 按应用筛选 / 统计 / 备份导出导入。
 */
import { useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Button, Card, EmptyState, Input, Section, Select } from "../../ui";
import { AccountRowItem } from "../../features/accounts/AccountRow";
import type { useAccounts } from "../../features/accounts/useAccounts";
import type { AppItem } from "../../features/platforms/usePlatforms";
import * as api from "../../api";
import { useToast } from "../../app/ToastProvider";
import "./pages.css";

export function AllAccountsPage({
  accountsApi,
  apps,
  instances = {},
  onAddAccount,
  onOpenAccount,
  onRowContextMenu,
  onCheckinAll,
  checkinBusy,
}: {
  accountsApi: ReturnType<typeof useAccounts>;
  apps: AppItem[];
  instances?: Record<string, { running: boolean }>;
  onAddAccount: () => void;
  onOpenAccount: (id: string) => void;
  onRowContextMenu?: (e: React.MouseEvent, id: string) => void;
  /** 一键签到（真实客户端）；未传则不显示该按钮 */
  onCheckinAll?: () => void;
  checkinBusy?: boolean;
}) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  /** 批量选择 */
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return accountsApi.accounts.filter((a) => {
      if (kw) {
        const hay = `${a.name || ""} ${a.email || ""} ${a.note || ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (appFilter !== "all") {
        const ids = accountsApi.channels[a.id]?.platform_ids || [];
        const label = apps.find((x) => x.id === appFilter)?.label;
        if (!ids.includes(appFilter) && a.source_platform !== label) return false;
      }
      return true;
    });
  }, [accountsApi.accounts, accountsApi.channels, apps, appFilter, q]);

  const handleExport = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const path = await save({
        defaultPath: `agentforge-accounts-backup-${date}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      await api.exportAccountsToPath(path as string);
      toast(
        "success",
        `已导出 ${accountsApi.accounts.length} 个账号的完整备份（含登录凭据，请妥善保管）`,
        5500
      );
    } catch (err: any) {
      toast("error", err?.message || "导出失败");
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const count = await api.importAccounts(await file.text());
        toast(
          "success",
          count > 0 ? `已导入 ${count} 个账号（无需重新登录）` : "没有可导入的账号（可能已存在）",
          5000
        );
        await accountsApi.load();
      } catch (err: any) {
        toast("error", err?.message || "导入失败");
      }
    };
    input.click();
  };

  return (
    <>
      <div className="af-page-head">
        <div>
          <div className="af-page-title">全部账号</div>
          <div className="af-page-sub">跨应用视角 · 共 {accountsApi.accounts.length} 个账号</div>
        </div>
        <span className="u-spacer" />
        <div className="u-row">
          <Button onClick={handleImport}>导入备份</Button>
          <Button onClick={handleExport} disabled={accountsApi.accounts.length === 0}>
            导出备份
          </Button>
          {onCheckinAll && (
            <Button loading={checkinBusy} onClick={onCheckinAll} title="用真实客户端为所有账号签到">
              一键签到
            </Button>
          )}
          <Button variant="primary" onClick={onAddAccount}>
            添加账号
          </Button>
        </div>
      </div>

      <div className="af-stat-row">
        <div className="af-stat">
          <div className="af-stat__label">账号总数</div>
          <div className="af-stat__value">{accountsApi.stats.total}</div>
        </div>
        <div className="af-stat">
          <div className="af-stat__label">剩余积分合计</div>
          <div className="af-stat__value">{Math.round(accountsApi.stats.credits)}</div>
        </div>
      </div>

      {picked.size > 0 && (
        <Card className="af-batch-bar">
          <span>已选 {picked.size} 个账号</span>
          <span className="u-spacer" />
          <Button
            size="sm"
            onClick={() => {
              picked.forEach((id) => void accountsApi.refreshOne(id, { silent: true }));
              toast("info", `正在刷新 ${picked.size} 个账号…`, 3000);
            }}
          >
            批量刷新
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (window.confirm(`确定删除选中的 ${picked.size} 个账号吗？（仅本工具内记录）`)) {
                picked.forEach((id) => void accountsApi.remove(id));
                setPicked(new Set());
              }
            }}
          >
            批量删除
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
            取消选择
          </Button>
        </Card>
      )}

      <Section
        title="账号列表"
        actions={
          <div className="af-acc-toolbar">
            <div className="af-acc-toolbar__search">
              <Input
                placeholder="搜索名称 / 邮箱 / 备注"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={appFilter} onChange={(e) => setAppFilter(e.target.value)}>
              <option value="all">全部应用</option>
              {apps
                .filter((a) => !a.planned)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
            </Select>
          </div>
        }
      >
        {accountsApi.loading ? (
          <Card>
            <EmptyState title="正在加载账号…" />
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState
              title={accountsApi.accounts.length === 0 ? "还没有账号" : "没有匹配的账号"}
              desc={
                accountsApi.accounts.length === 0
                  ? "从本机已登录的客户端一键导入，或用浏览器登录添加。"
                  : "试试更换筛选条件或清空搜索词。"
              }
              action={
                accountsApi.accounts.length === 0 ? (
                  <Button variant="primary" onClick={onAddAccount}>
                    添加账号
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="af-acc-list">
            {rows.map((row) => (
              <AccountRowItem
                key={row.id}
                row={row}
                trend={accountsApi.trends[row.id]}
                channels={accountsApi.channels[row.id]}
                refreshing={accountsApi.refreshingIds.has(row.id)}
                selected={picked.has(row.id)}
                onToggleSelect={() => togglePick(row.id)}
                multiOpen={instances[row.id]?.running}
                onOpen={() => onOpenAccount(row.id)}
                onRefresh={() => void accountsApi.refreshOne(row.id)}
                onSwitch={() => void accountsApi.switchTo(row.id)}
                onContextMenu={(e) => onRowContextMenu?.(e, row.id)}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
