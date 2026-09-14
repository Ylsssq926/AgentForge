/**
 * 多开实例（features/accounts/useMultiInstance）· AgentForge
 * 为账号创建独立数据目录的客户端实例（首启即已登录、设备标识隔离）。
 * 重构前该能力在旧 App.tsx 内；此处独立成 hook，供右键菜单与工作台共用。
 */
import { useCallback, useEffect, useState } from "react";
import * as api from "../../api";
import { useToast } from "../../app/ToastProvider";

export interface InstanceState {
  running: boolean;
  pid?: number | null;
}

export function useMultiInstance() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<Record<string, InstanceState>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.multiInstanceList();
      const map: Record<string, InstanceState> = {};
      for (const it of list) {
        map[it.account_id] = { running: it.running, pid: it.pid };
      }
      setInstances(map);
    } catch {
      /* 忽略：多开信息属增强 */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 启动或停止（按当前状态切换） */
  const toggle = useCallback(
    async (accountId: string) => {
      setBusyId(accountId);
      try {
        if (instances[accountId]?.running) {
          await api.multiInstanceStop(accountId);
          toast("info", "多开实例已停止（数据目录保留，可再次启动）", 4000);
        } else {
          toast("info", "正在启动多开实例（独立数据目录，首启即已登录）…", 3000);
          const info = await api.multiInstanceLaunch(accountId);
          toast("success", `多开实例已启动（PID ${info.pid}）· 设备标识独立`, 5000);
        }
        await refresh();
      } catch (err: any) {
        toast("error", `多开操作失败：${err?.message || err}`, 6500);
      } finally {
        setBusyId(null);
      }
    },
    [instances, refresh, toast]
  );

  /** 删除实例数据目录（不可恢复） */
  const removeData = useCallback(
    async (accountId: string) => {
      if (
        !window.confirm(
          "将删除该账号的多开实例数据目录（含其独立登录状态），此操作不可恢复。\n\n继续吗？"
        )
      )
        return;
      setBusyId(accountId);
      try {
        await api.multiInstanceRemove(accountId, true);
        toast("success", "多开实例数据已删除", 4000);
        await refresh();
      } catch (err: any) {
        toast("error", `删除失败：${err?.message || err}`, 6000);
      } finally {
        setBusyId(null);
      }
    },
    [refresh, toast]
  );

  return { instances, busyId, refresh, toggle, removeData };
}
