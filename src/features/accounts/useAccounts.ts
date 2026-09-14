/**
 * 账号领域 hook（features/accounts）· AgentForge
 * 职责：账号列表加载、用量刷新与缓存、渠道映射、积分趋势、切换/删除等操作。
 * 从旧 App.tsx（1477 行上帝组件）剥离；页面只消费本 hook，不再自行编排数据。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../../api";
import type { AccountBrief, AccountChannels, UsageSummary, UsageTrend } from "../../types";
import { useToast } from "../../app/ToastProvider";

export interface AccountRow extends AccountBrief {
  usage?: UsageSummary | null;
}

const USAGE_CACHE_KEY = "af_usage_cache_v1";

function readUsageCache(): Record<string, UsageSummary> {
  try {
    return JSON.parse(localStorage.getItem(USAGE_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeUsageCache(map: Record<string, UsageSummary>) {
  try {
    localStorage.setItem(USAGE_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* 忽略配额错误 */
  }
}

export function useAccounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<Record<string, AccountChannels>>({});
  const [trends, setTrends] = useState<Record<string, UsageTrend>>({});
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  /** 拉取渠道映射与积分趋势（失败静默：属增强信息） */
  const loadMeta = useCallback(() => {
    api.accountChannelsMap().then(setChannels).catch(() => {});
    api.usageForecastAll().then(setTrends).catch(() => {});
  }, []);

  /** 后台刷新全部账号用量（并发，逐个落缓存） */
  const refreshUsageAll = useCallback(async (list: AccountBrief[]) => {
    if (list.length === 0) return;
    const results = await Promise.allSettled(list.map((a) => api.getAccountUsage(a.id)));
    const updates: Record<string, UsageSummary> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") updates[list[i].id] = r.value;
    });
    if (Object.keys(updates).length > 0) {
      setAccounts((prev) =>
        prev.map((a) => (updates[a.id] ? { ...a, usage: updates[a.id] } : a))
      );
      const cache = readUsageCache();
      writeUsageCache({ ...cache, ...updates });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getAccounts();
      const cache = readUsageCache();
      setAccounts(list.map((a) => ({ ...a, usage: cache[a.id] ?? null })));
      setError(null);
      setLoading(false);
      loadMeta();
      void refreshUsageAll(list);
    } catch (err: any) {
      setError(err?.message || "加载账号列表失败");
      setLoading(false);
    }
  }, [loadMeta, refreshUsageAll]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 刷新单个账号用量 */
  const refreshOne = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      setRefreshingIds((prev) => new Set(prev).add(id));
      try {
        const usage = await api.getAccountUsage(id);
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, usage } : a)));
        const cache = readUsageCache();
        writeUsageCache({ ...cache, [id]: usage });
        api.usageForecastAll().then(setTrends).catch(() => {});
        if (!opts?.silent) toast("success", "数据已刷新", 1600, "refresh-ok");
      } catch (err: any) {
        if (!opts?.silent) toast("error", err?.message || "刷新失败");
      } finally {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [toast]
  );

  /** 删除账号 */
  const remove = useCallback(
    async (id: string) => {
      try {
        await api.removeAccount(id);
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        toast("success", "账号已删除");
        loadMeta();
      } catch (err: any) {
        toast("error", err?.message || "删除失败");
      }
    },
    [loadMeta, toast]
  );

  /** 切换账号（携带当前切换模式的可见反馈） */
  const switchTo = useCallback(
    async (id: string, opts?: { force?: boolean }) => {
      const mode = api.getSwitchMode();
      const note =
        mode === "flexible"
          ? "（已清设备特征，工作成果保留）"
          : mode === "preserve_context"
            ? "（已保留聊天记录状态，不影响其他账号数据）"
            : "（已全部清空）";
      toast("info", "正在切换账号，请稍候…", 2600);
      try {
        const outcome = await api.switchAccount(id, { force: opts?.force });
        await load();
        // 对话库按账号隔离开启时，附带说明本地对话数据的去向（入库/取回/新建）
        const vault = outcome?.chat_restored;
        const stashed = outcome?.chat_stashed;
        let chatNote = "";
        if (vault?.action === "unstash") {
          chatNote = "；已取回该账号的本地对话数据";
        } else if (vault?.action === "skip" && stashed?.action === "stash") {
          chatNote = "；上个账号的对话数据已收好，本账号将新建";
        } else if (vault?.action === "failed" || stashed?.action === "failed") {
          chatNote = "；本地对话数据处理失败（详见日志）";
        }
        if (outcome?.restored) {
          toast("success", `已切换并恢复该账号的界面与草稿状态${note}${chatNote}`, 5200);
        } else {
          toast("success", `账号切换成功${note}${chatNote}`, 4600);
        }
        return true;
      } catch (err: any) {
        toast("error", err?.message || "切换账号失败", 6000);
        return false;
      }
    },
    [load, toast]
  );

  /** 账号归属某应用（导入来源匹配，或本机该应用下有登录） */
  const accountsOfApp = useCallback(
    (platformId: string, platformLabel: string) =>
      accounts.filter((a) => {
        if (a.source_platform && a.source_platform === platformLabel) return true;
        return (channels[a.id]?.platform_ids || []).includes(platformId);
      }),
    [accounts, channels]
  );

  const stats = useMemo(
    () => ({
      total: accounts.length,
      credits: accounts.reduce(
        (sum, a) => sum + (a.usage?.is_credits_billing ? (a.usage.credits_left ?? 0) : 0),
        0
      ),
    }),
    [accounts]
  );

  return {
    accounts,
    loading,
    error,
    channels,
    trends,
    refreshingIds,
    stats,
    load,
    refreshOne,
    remove,
    switchTo,
    accountsOfApp,
  };
}
