/**
 * 应用工作台（pages/v2/WorkbenchPage）· AgentForge
 * 单一心智：以「应用」为主语，四个 Tab 覆盖该应用的全部能力。
 *   账号 / 自动化 / 维护 / 迁移
 */
import { useState } from "react";
import { Avatar, Badge, Button, Card, EmptyState, Section, Tabs } from "../../ui";
import { AccountRowItem } from "../../features/accounts/AccountRow";
import type { useAccounts } from "../../features/accounts/useAccounts";
import type { AppItem } from "../../features/platforms/usePlatforms";
import { platformColor, platformInitial } from "../../platformVisual";
import * as api from "../../api";
import { useCheckin } from "../../features/automation/useCheckin";

type Tab = "accounts" | "automation" | "maintenance" | "migration";

const TABS = [
  { id: "accounts", label: "账号" },
  { id: "automation", label: "自动化" },
  { id: "maintenance", label: "维护" },
  { id: "migration", label: "迁移" },
];

export function WorkbenchPage({
  app,
  accountsApi,
  instances = {},
  onAddAccount,
  onOpenAccount,
  onNavigate,
  onRowContextMenu,
}: {
  app: AppItem;
  accountsApi: ReturnType<typeof useAccounts>;
  instances?: Record<string, { running: boolean }>;
  onAddAccount: () => void;
  onOpenAccount: (id: string) => void;
  onNavigate: (page: string) => void;
  onRowContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("accounts");
  const rows = accountsApi.accountsOfApp(app.id, app.label);
  const switchModeLabel = (() => {
    const m = api.getSwitchMode();
    if (m === "flexible") return "灵活切换（留工作成果）";
    if (m === "preserve_context") return "保留聊天记录";
    return "全部清空";
  })();
  // 签到走共享 hook（与全部账号页、右键菜单同一实现，避免行为漂移）
  const { busy: checkingIn, runOne } = useCheckin(() => void accountsApi.load());
  /** 工作台内签到：该应用有明确平台身份，直接对它签到 */
  const handleCheckin = () => void runOne(app.id, app.label);

  if (app.planned) {
    return (
      <>
        <Header app={app} subtitle="适配规划中" />
        <Card>
          <EmptyState
            title={`${app.label} 适配规划中`}
            desc="后续版本将支持该应用的账号导入 / 切换与特色功能（架构已预留）。当前请先使用已适配的应用。"
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <Header
        app={app}
        subtitle={`${rows.length} 个账号 · 切换行为：${switchModeLabel}`}
        actions={
          <>
            <Button onClick={onAddAccount}>添加账号</Button>
            <Button variant="primary" loading={checkingIn} onClick={handleCheckin}>
              一键签到
            </Button>
          </>
        }
      />

      <Tabs items={TABS} value={tab} onChange={(id) => setTab(id as Tab)} />

      {tab === "accounts" && (
        <Section title="该应用下的账号">
          {rows.length === 0 ? (
            <Card>
              <EmptyState
                title="还没有账号"
                desc="若你已在该客户端登录，点下面按钮即可一键导入（无需重新登录）。"
                action={
                  <Button variant="primary" onClick={onAddAccount}>
                    从本机客户端导入
                  </Button>
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
      )}

      {tab === "automation" && (
        <Section title="自动化">
          <div className="af-feature-grid">
            <FeatureCard
              title="定时自动签到"
              desc="每天到点用真实客户端自动签到；错过时间会在下次启动后补签。开关在「设置」。"
              action={
                <>
                  <Button size="sm" loading={checkingIn} onClick={handleCheckin}>
                    立即签到
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onNavigate("settings")}>
                    去设置
                  </Button>
                </>
              }
            />
            <FeatureCard
              title="积分预警"
              desc="后台记录用量并估算消耗速率，剩余不多时在账号行显示「约 N 天后见底」。"
              action={
                <Button size="sm" variant="ghost" onClick={() => setTab("accounts")}>
                  查看账号
                </Button>
              }
            />
          </div>
        </Section>
      )}

      {tab === "maintenance" && (
        <Section title="维护">
          <div className="af-feature-grid">
            <FeatureCard
              title="设备指纹重置"
              desc="重置该客户端的设备标识（共 8 处），全程 .bak 自动备份。"
              action={
                <Button size="sm" onClick={() => onNavigate("maintenance")}>
                  打开重置工具
                </Button>
              }
            />
            <FeatureCard
              title="深度重置"
              desc="清理账号状态与缓存目录，可从最近备份恢复。"
              action={
                <Button size="sm" onClick={() => onNavigate("maintenance")}>
                  打开重置工具
                </Button>
              }
            />
            <FeatureCard
              title="多开实例"
              desc="为账号创建独立数据目录的实例（首启即已登录，设备指纹互相隔离）。"
              action={
                <Button size="sm" variant="ghost" onClick={() => setTab("accounts")}>
                  在账号行右键操作
                </Button>
              }
            />
          </div>
        </Section>
      )}

      {tab === "migration" && (
        <Section title="迁移与备份">
          <div className="af-feature-grid">
            <FeatureCard
              title="账号备份 / 换机迁移"
              desc="导出含登录凭据的完整备份，新电脑导入即可直接使用，无需重新登录。"
              action={
                <Button size="sm" onClick={() => onNavigate("accounts")}>
                  在「全部账号」导出
                </Button>
              }
            />
            <FeatureCard
              title="对话数据迁移"
              desc="把本机对话库与会话快照带到新机器（体积较大，导入前请关闭客户端）。"
              action={
                <Button size="sm" onClick={() => onNavigate("settings")}>
                  去设置操作
                </Button>
              }
            />
          </div>
        </Section>
      )}
    </>
  );
}

function Header({
  app,
  subtitle,
  actions,
}: {
  app: AppItem;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="af-page-head">
      <Avatar color={platformColor(app.id)} text={platformInitial(app.label)} size="lg" />
      <div>
        <div className="af-page-title">
          {app.label} {app.planned && <Badge>规划中</Badge>}
        </div>
        <div className="af-page-sub">{subtitle}</div>
      </div>
      <span className="u-spacer" />
      {actions && <div className="u-row">{actions}</div>}
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="af-feature">
      <div className="af-feature__title">{title}</div>
      <div className="af-feature__desc">{desc}</div>
      {action && <div className="af-feature__actions">{action}</div>}
    </Card>
  );
}
