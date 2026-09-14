/**
 * 轻量 i18n：语言持久化 + 订阅通知 + 词典。
 *
 * 覆盖范围（阶段 5b）：导航、关于页、设备指纹页、深度重置页、上下文快照面板、
 * 通用按钮。其余继承页面（账号管理 / 统计 / 设置明细）保留中文，后续按同一词典扩展。
 */
import { useEffect, useState } from "react";

export type Lang = "zh-CN" | "en-US";

const LANG_KEY = "app_language";

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "zh-CN" || v === "en-US") return v;
  } catch {
    /* ignore */
  }
  return "zh-CN";
}

let currentLang: Lang = loadLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb());
}

export function onLangChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook：订阅语言变化 */
export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>(currentLang);
  useEffect(() => onLangChange(() => setLangState(currentLang)), []);
  return lang;
}

type Entry = { "zh-CN": string; "en-US": string };

/** 词典（键 → 双语） */
export const DICT: Record<string, Entry> = {
  // 导航
  "nav.accounts": { "zh-CN": "账号管理", "en-US": "Accounts" },
  "nav.device": { "zh-CN": "设备指纹", "en-US": "Device" },
  "nav.reset": { "zh-CN": "深度重置", "en-US": "Deep Reset" },
  "nav.settings": { "zh-CN": "设置", "en-US": "Settings" },
  "nav.about": { "zh-CN": "关于", "en-US": "About" },

  // 通用
  "common.refreshState": { "zh-CN": "刷新状态", "en-US": "Refresh" },
  "common.redetect": { "zh-CN": "重新检测", "en-US": "Redetect" },
  "common.redetectHint": { "zh-CN": "刷新平台与目录信息", "en-US": "Refresh platform & paths" },
  "common.running": { "zh-CN": "执行中…", "en-US": "Running…" },
  "common.detected": { "zh-CN": "已检测", "en-US": "Detected" },
  "common.notInstalled": { "zh-CN": "未安装", "en-US": "Not installed" },
  "common.initialized": { "zh-CN": "已初始化", "en-US": "Initialized" },
  "common.noDataDir": { "zh-CN": "（未找到数据目录）", "en-US": "(data dir not found)" },
  "common.restoreLatest": { "zh-CN": "恢复最近一次备份", "en-US": "Restore latest backup" },
  "common.language": { "zh-CN": "语言", "en-US": "Language" },

  // 关于
  "about.title": {
    "zh-CN": "AgentForge · 智能体工坊",
    "en-US": "AgentForge",
  },
  "about.desc": {
    "zh-CN":
      "多智能体客户端管理器（首发适配 Trae 系列：Trae 与 TraeWork，各含国际版与国内版）。一站式管理本机账号与设备：一键导入与切换、多开实例、定时自动签到与积分预警、设备指纹重置、深度重置（.bak 备份）、换机迁移。",
    "en-US":
      "A multi-agent client manager (currently supporting the Trae family: Trae and TraeWork, each with global and China editions). One-stop management for accounts and local devices: one-click import & switching, multi-instance, scheduled check-in with credit alerts, device fingerprint reset, deep reset with .bak backups, and migration support.",
  },
  "about.projectHome": { "zh-CN": "项目主页", "en-US": "Project Home" },
  "about.disclaimer": { "zh-CN": "免责声明", "en-US": "Disclaimer" },
  "about.copyUrl": { "zh-CN": "复制项目地址", "en-US": "Copy project URL" },
  "about.openHome": { "zh-CN": "打开项目主页", "en-US": "Open project home" },

  // 设备指纹页
  "device.desc": {
    "zh-CN":
      "仅重置设备指纹（共 8 处：机器码、遥测、登录标记、本地缓存指纹等）——不动账号与缓存；如需同时清理账号/缓存请用「深度重置」。",
    "en-US":
      "Fingerprint-only reset (8 locations: machine ID, telemetry, login markers, local cache fingerprints, etc.) — accounts and caches are untouched; use Deep Reset to also clear them.",
  },
  "device.currentFingerprint": { "zh-CN": "当前设备指纹", "en-US": "Current Fingerprint" },
  "device.idTiny": { "zh-CN": "设备 ID（TinyStorage）", "en-US": "Device ID (TinyStorage)" },
  "device.idLocalEnv": { "zh-CN": "设备 ID（local_env）", "en-US": "Device ID (local_env)" },
  "device.idNetConfig": { "zh-CN": "设备 ID（tt_net_config）", "en-US": "Device ID (tt_net_config)" },
  "device.mainjsState": { "zh-CN": "main.js 补丁状态", "en-US": "main.js patch state" },
  "device.leveldbCount": { "zh-CN": "leveldb 文件数", "en-US": "leveldb files" },
  "device.newIdPlaceholder": {
    "zh-CN": "新设备 ID（留空自动生成，纯数字）",
    "en-US": "New device ID (auto-generated if empty, digits only)",
  },
  "device.relaunch": { "zh-CN": "完成后重新启动客户端", "en-US": "Relaunch client after reset" },
  "device.reset": { "zh-CN": "重置设备指纹", "en-US": "Reset Fingerprint" },
  "device.resultFailed": { "zh-CN": "（存在失败项）", "en-US": "(has failures)" },
  "device.newIdLabel": { "zh-CN": "新设备 ID", "en-US": "New device ID" },

  // 深度重置页
  "reset.title": { "zh-CN": "深度重置", "en-US": "Deep Reset" },
  "reset.desc": {
    "zh-CN":
      "一站式清理：账号痕迹、缓存目录与设备标识（勾选「重置设备标识」后执行完整八位置指纹重置，等效于「设备指纹」页）；所有修改前自动生成 .bak 备份，完成后自动校验并给出结论。",
    "en-US":
      "One-stop reset: account traces, caches and device identifiers (checking the device option performs the full 8-location fingerprint reset, same as the Device page). A .bak backup is created before any change; an automatic verification runs afterwards.",
  },
  "reset.cleanAccounts": { "zh-CN": "清除账号与权益键", "en-US": "Clear accounts & entitlements" },
  "reset.cleanCache": { "zh-CN": "清理缓存与状态库", "en-US": "Clean caches & state DB" },
  "reset.resetIds": { "zh-CN": "重置设备标识（八位置完整指纹）", "en-US": "Reset device identifiers (full 8-location)" },
  "reset.relaunch": { "zh-CN": "完成后重新启动客户端", "en-US": "Relaunch client after reset" },
  "reset.doVerify": { "zh-CN": "状态校验", "en-US": "Verify State" },
  "reset.doReset": { "zh-CN": "执行深度重置", "en-US": "Run Deep Reset" },
  // 深度重置确认框（i18n 化；含 {label}/{exe}/{id} 占位符，用 tf() 渲染）
  "reset.confirmIntro": {
    "zh-CN": "将对「{label}」执行深度重置：",
    "en-US": "Deep reset will run on \"{label}\":",
  },
  "reset.optAccounts": {
    "zh-CN": "· 清除本地账号与权益键（Cookies 同步清理）",
    "en-US": "· Clear accounts & entitlement keys (Cookies too)",
  },
  "reset.optCache": {
    "zh-CN": "· 清理缓存目录与状态库",
    "en-US": "· Clean caches & state DB",
  },
  "reset.optDeviceIds": {
    "zh-CN": "· 设备标识完整重置（共 8 处：机器码、遥测、登录状态、本地指纹等）",
    "en-US": "· Full 8-location device identifier reset",
  },
  "reset.idHintManual": {
    "zh-CN": " · 新设备 ID：{id}",
    "en-US": " · New device ID: {id}",
  },
  "reset.idHintAuto": {
    "zh-CN": " · 新设备 ID：自动生成（随机数字）",
    "en-US": " · New device ID: auto (random)",
  },
  "reset.confirmFooter": {
    "zh-CN": "所有修改前会自动生成 .bak 备份。\n执行期间需要关闭 {exe}。\n\n继续吗？",
    "en-US": "A .bak backup is created for every change.\n{exe} must stay closed.\n\nContinue?",
  },
  "reset.restoreConfirm": {
    "zh-CN": "将从最近的 .bak 备份恢复：\n设备标识 / 登录文件 / Cookies / 缓存目录。\n\n继续吗？",
    "en-US": "Restore from the latest .bak backup:\nDevice IDs / login files / Cookies / caches.\n\nContinue?",
  },
  "reset.currentState": { "zh-CN": "当前状态", "en-US": "Current State" },
  "reset.accountKeys": { "zh-CN": "账号/权益键", "en-US": "Account keys" },
  "reset.staleTargets": { "zh-CN": "残留缓存目标", "en-US": "Stale targets" },
  "reset.log": { "zh-CN": "操作日志", "en-US": "Log" },

  // 上下文快照面板
  // 工具栏（账号页）
  "toolbar.target": { "zh-CN": "目标客户端", "en-US": "Target client" },
  "toolbar.switchMode": {
    "zh-CN":
      "切换模式：「保留聊天记录」会在切回该账号时恢复其界面与草稿状态，且不会影响其他账号的较新数据；「不保留聊天记录」则不恢复",
    "en-US":
      "Switch mode: \"Keep chat\" restores this account's UI/draft state when switching back (newer data from other accounts is preserved). \"Don't keep\" skips restore.",
  },

  // 确认对话框
};

/** 取词（缺失时回退中文，再回退键名） */
export function t(key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[currentLang] || entry["zh-CN"] || key;
}

/** 取词并替换 {var} 占位符（如 tf("reset.confirmIntro", { label: "Trae CN" })） */
export function tf(key: string, vars: Record<string, string>): string {
  return t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
