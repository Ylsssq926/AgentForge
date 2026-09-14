/**
 * 签到（features/automation/useCheckin）· AgentForge
 *
 * 内核为后端 `checkin_all_via_client`：CDP 驱动真实客户端 UI 完成签到，
 * 双方案适配（TraeWork 系普通 DOM + Trae IDE 系 Shadow DOM 穿透），同账号只签一次。
 * 本 hook 让"一键签到"可在任意页面复用（全部账号页 / 应用工作台 / 右键菜单）。
 */
import { useCallback, useState } from "react";
import * as api from "../../api";
import { useToast } from "../../app/ToastProvider";

export function useCheckin(onDone?: () => void) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const runAll = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    toast("info", "正在通过真实客户端签到（客户端会重启一次，约 1 分钟）…", 6000);
    try {
      const results = await api.checkinAllViaClient();
      if (results.length === 0) {
        toast("warning", "未检测到可签到的客户端，请先登录客户端后重试", 6000);
        return;
      }
      let ok = 0;
      let already = 0;
      let failed = 0;
      for (const r of results) {
        const who = r.account_name || r.platform_name;
        const via = r.account_name && r.platform_name ? `（${r.platform_name}）` : "";
        if (r.status === "签到成功") {
          ok++;
          toast("success", `${who}：签到成功${r.points ? `，+${r.points} 积分` : ""}${via}`, 5000);
        } else if (r.status === "今日已签到") {
          already++;
          toast("info", `${who}：今日已签到${via}`, 3500);
        } else {
          failed++;
          toast("warning", `${who}：${r.detail}${via}`, 6500);
        }
      }
      if (results.length > 1) {
        toast(
          failed ? "warning" : "success",
          `签到完成：成功 ${ok}，已签 ${already}${failed ? `，未成功 ${failed}` : ""}`,
          5000
        );
      }
      onDone?.();
    } catch (err: any) {
      toast("error", `签到失败：${err?.message || err}`, 7000);
    } finally {
      setBusy(false);
    }
  }, [busy, onDone, toast]);

  /** 对单个客户端签到（右键菜单用；platformId 来自账号的渠道信息） */
  const runOne = useCallback(
    async (platformId: string, platformLabel?: string) => {
      if (busy) return;
      setBusy(true);
      toast("info", `正在为 ${platformLabel || platformId} 签到（客户端会重启一次）…`, 6000);
      try {
        const r = await api.checkinViaClient(platformId);
        const who = r.platform_name || platformLabel || platformId;
        if (r.status === "签到成功") {
          toast("success", `${who}：签到成功${r.points ? `，+${r.points} 积分` : ""}`, 5000);
        } else if (r.status === "今日已签到") {
          toast("info", `${who}：今日已签到`, 4000);
        } else {
          toast("warning", `${who}：${r.detail}`, 6500);
        }
        onDone?.();
      } catch (err: any) {
        toast("error", `签到失败：${err?.message || err}`, 7000);
      } finally {
        setBusy(false);
      }
    },
    [busy, onDone, toast]
  );

  return { busy, runAll, runOne };
}
