import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountBrief, AppSettings, UsageSummary, UsageEventsResponse, UsageTrend, AccountChannels, ChatVaultSlot } from "./types";

// ============ 快速注册后端 API 配置 ============
// 从环境变量读取配置，如果没有则使用空字符串（功能将不可用）
const QUICK_REGISTER_API_BASE = import.meta.env.VITE_QUICK_REGISTER_API_BASE || "";
const APP_ID = import.meta.env.VITE_APP_ID || "";
const APP_SECRET = import.meta.env.VITE_APP_SECRET || "";

// 验证配置是否有效
export function checkApiConfig(): boolean {
  return !!(QUICK_REGISTER_API_BASE && APP_ID && APP_SECRET);
}

// 任务创建响应
export interface CreateTaskResponse {
  success: boolean;
  ticket: string;
  qrcode_url: string;
  is_vip: boolean;
  url_scheme: string;
  message: string;
}

// 任务状态
export type TaskStatus = "pending" | "verified" | "expired" | "claimed";

// 查询任务状态响应
export interface TaskStatusResponse {
  success: boolean;
  ticket?: string;
  status: TaskStatus;
  platform_id?: string;
  created_at?: number;
  verified_at?: number;
  resource_payload?: {
    account: string;
    password: string;
  }[] | null;
  access_token?: string | null;
  platform?: string;
}

// 领取资源响应 - 根据后端实际返回格式
export interface ClaimResourceResponse {
  success: boolean;
  resource_payload: {
    account: string;
    password: string;
  }[];
  message: string;
}

function checkNetwork() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error("网络连接已断开，请检查网络设置");
  }
}

async function invokeNetwork<T>(cmd: string, args?: any): Promise<T> {
  checkNetwork();
  return invoke(cmd, args);
}

// 添加账号（通过 Cookies）
export async function addAccount(cookies: string): Promise<Account> {
  return invokeNetwork("add_account", { cookies });
}

// 添加账号（通过 Token，可选 Cookies）
export async function addAccountByToken(token: string, cookies?: string): Promise<Account> {
  return invokeNetwork("add_account_by_token", { token, cookies });
}

// 添加账号（通过邮箱密码登录）
export async function addAccountByEmail(email: string, password: string): Promise<Account> {
  return invokeNetwork("add_account_by_email", { email, password });
}

export async function quickRegister(showWindow?: boolean): Promise<Account> {
  if (typeof showWindow === "boolean") {
    return invokeNetwork("quick_register", { showWindow });
  }
  return invokeNetwork("quick_register");
}

// 使用自定义临时邮箱进行快速注册
export async function quickRegisterWithCustomTempMail(showWindow?: boolean): Promise<Account> {
  if (typeof showWindow === "boolean") {
    return invokeNetwork("quick_register_with_custom_tempmail", { showWindow });
  }
  return invokeNetwork("quick_register_with_custom_tempmail");
}

export async function startBrowserLogin(): Promise<void> {
  return invokeNetwork("start_browser_login");
}

export async function finishBrowserLogin(): Promise<Account> {
  return invokeNetwork("finish_browser_login");
}

export async function cancelBrowserLogin(): Promise<void> {
  return invoke("cancel_browser_login");
}

// 浏览器自动登录（跟随目标平台：CN 平台 → www.trae.cn + api.trae.cn）
export async function browserAutoLogin(
  email: string,
  password: string,
  platformId?: string
): Promise<Account> {
  return invokeNetwork("browser_auto_login_command", {
    email,
    password,
    platformId: platformId ?? getTargetPlatform(),
  });
}

// 下载并运行更新安装包（Windows: .msi）
export async function downloadAndRunInstaller(url: string): Promise<string> {
  return invokeNetwork("download_and_run_installer", { url });
}

// 删除账号
export async function removeAccount(accountId: string): Promise<void> {
  return invoke("remove_account", { accountId });
}

// 获取所有账号
export async function getAccounts(): Promise<AccountBrief[]> {
  return invoke("get_accounts");
}

// 获取单个账号详情（包含 token）
export async function getAccount(accountId: string): Promise<Account> {
  return invoke("get_account", { accountId });
}

// ============ 工具箱：目标平台（账号操作 / 机器码 / 登录状态共用） ============

/** 兜底平台列表（正式数据来自后端 platform_catalog；命名规范：产品线 + 区域后缀） */
export const TARGET_PLATFORMS = [
  { id: "trae", label: "Trae" },
  { id: "trae_cn", label: "Trae 国内版" },
  { id: "traework", label: "TraeWork" },
  { id: "traework_cn", label: "TraeWork 国内版" },
  { id: "workbuddy", label: "WorkBuddy" },
  { id: "workbuddy_cn", label: "WorkBuddy 国内版" },
] as const;

/** WorkBuddy 登录态探测结果（国际/国内账号不互通，分别返回） */
export interface WorkBuddyLoginState {
  platform_id: string;
  display_name: string;
  data_dir: string;
  logged_in: boolean;
  user_id: string | null;
  token_len: number;
  note: string | null;
}

/** 探测本机 WorkBuddy 双版本登录态 */
export async function workbuddyDetect(): Promise<WorkBuddyLoginState[]> {
  const res = await invoke<{ clients: WorkBuddyLoginState[] }>("workbuddy_detect");
  return res.clients || [];
}

/** 平台目录项（后端 PLATFORM_SPECS 的投影；kind: active=现行 / planned=规划中） */
export interface PlatformCatalogItem {
  id: string;
  display_name: string;
  region: string;
  tier: number;
  kind: string;
}

/** 拉取平台目录（前端的动态数据源；后端为单一数据源，前端不再硬编码平台元数据） */
export async function platformCatalog(): Promise<PlatformCatalogItem[]> {
  const res = await invoke<{ platforms: PlatformCatalogItem[] }>("platform_catalog");
  return res.platforms || [];
}

// ============ 对话数据迁移（换机/重装可选携带智能体对话库） ============

export interface ChatDataStatus {
  platform_id: string;
  display_name: string;
  data_dir: string;
  exists: boolean;
  bytes: number;
}

export interface ChatDataReport {
  platform_id: string;
  display_name: string;
  bytes: number;
  files: number;
  backup_of?: string | null;
}

/** 对话库金库：列出按账号保存的槽位（磁盘占用） */
export async function chatVaultSlots(): Promise<ChatVaultSlot[]> {
  const res = await invoke<{ slots: ChatVaultSlot[] }>("chat_vault_slots");
  return res.slots || [];
}

/** 对话库金库：删除某账号的槽位，返回释放字节数 */
export async function chatVaultDeleteSlot(platformId: string, userId: string): Promise<number> {
  const res = await invoke<{ freed_bytes: number }>("chat_vault_delete_slot", {
    platformId,
    userId,
  });
  return res.freed_bytes || 0;
}

/** 各平台对话库体积（设置页展示） */
export async function chatDataStatus(): Promise<{ platforms: ChatDataStatus[]; total_bytes: number }> {
  return invoke("chat_data_status");
}

/** 导出对话数据到目录（生成 AgentForge-chatdata/ 结构） */
export async function chatDataExport(dest: string): Promise<ChatDataReport[]> {
  const res = await invoke<{ reports: ChatDataReport[] }>("chat_data_export", { dest });
  return res.reports || [];
}

/** 从导出目录恢复对话数据（本机旧库自动改名备份） */
export async function chatDataImport(src: string): Promise<ChatDataReport[]> {
  const res = await invoke<{ reports: ChatDataReport[] }>("chat_data_import", { src });
  return res.reports || [];
}

const TARGET_PLATFORM_KEY = "target_platform";

/** 读取当前目标平台（默认国际版 Trae） */
export function getTargetPlatform(): string {
  try {
    const v = localStorage.getItem(TARGET_PLATFORM_KEY);
    if (v && TARGET_PLATFORMS.some((p) => p.id === v)) return v;
  } catch {
    /* ignore */
  }
  return "trae";
}

/** 设置目标平台（持久化） */
export function setTargetPlatform(id: string): void {
  try {
    localStorage.setItem(TARGET_PLATFORM_KEY, id);
  } catch {
    /* ignore */
  }
}

// ============ 工具箱：切换模式（灵活 / 保留上下文 / 完整） ============

export const SWITCH_MODES = [
  { id: "flexible", label: "灵活切换（清设备特征，留工作成果）" },
  { id: "preserve_context", label: "保留聊天记录" },
  { id: "full", label: "全部清空" },
] as const;

const SWITCH_MODE_KEY = "switch_mode";

/** 切换模式中会保留工作成果的模式集合 */
export const KEEP_WORK_MODES = ["flexible", "preserve_context"];

/** 读取当前切换模式（默认「灵活切换」；历史 "quick" 归并为 "full"） */
export function getSwitchMode(): string {
  try {
    const v = localStorage.getItem(SWITCH_MODE_KEY);
    if (v === "flexible" || v === "preserve_context" || v === "full") return v;
  } catch {
    /* ignore */
  }
  return "flexible";
}

/** 设置切换模式（持久化） */
export function setSwitchMode(id: string): void {
  try {
    localStorage.setItem(SWITCH_MODE_KEY, id);
  } catch {
    /* ignore */
  }
}

export interface SnapshotMeta {
  preserved_user_id: string;
  platform_id: string;
  created_at: number;
  source: string;
  plain_size: number;
  stored_size: number;
}

/** 对话库金库动作（按账号隔离开启时随切换返回） */
export interface ChatVaultAction {
  /** stash（已入库）/ unstash（已取回）/ skip（无需处理）/ failed */
  action: string;
  user_id: string;
  bytes: number;
  detail: string;
}

export interface SwitchOutcome {
  mode: string;
  captured: SnapshotMeta | null;
  restored: SnapshotMeta | null;
  /** 切走账号的本地对话库入库结果 */
  chat_stashed?: ChatVaultAction | null;
  /** 目标账号的本地对话库取回结果 */
  chat_restored?: ChatVaultAction | null;
}

// 设置活跃账号
export async function setActiveAccount(
  accountId: string,
  options?: { force?: boolean; platformId?: string; mode?: string }
): Promise<SwitchOutcome> {
  return invoke("switch_account", {
    accountId,
    force: options?.force,
    platformId: options?.platformId ?? getTargetPlatform(),
    mode: options?.mode ?? getSwitchMode(),
  });
}

// 切换账号（设置活跃账号并更新机器码；按模式执行）
export async function switchAccount(
  accountId: string,
  options?: { force?: boolean; platformId?: string; mode?: string }
): Promise<SwitchOutcome> {
  return invoke("switch_account", {
    accountId,
    force: options?.force,
    platformId: options?.platformId ?? getTargetPlatform(),
    mode: options?.mode ?? getSwitchMode(),
  });
}

// ============ 工具箱：上下文快照（preserveContext） ============

export async function listContextSnapshots(): Promise<SnapshotMeta[]> {
  return invoke("list_context_snapshots");
}

export async function captureContextSnapshot(
  platformId: string,
  userId?: string
): Promise<SnapshotMeta> {
  return invoke("capture_context_snapshot", {
    platformId,
    userId: userId?.trim() ? userId.trim() : null,
  });
}

export async function restoreContextSnapshot(
  platformId: string,
  userId: string
): Promise<SnapshotMeta | null> {
  return invoke("restore_context_snapshot", { platformId, userId });
}

export async function deleteContextSnapshot(userId: string): Promise<boolean> {
  return invoke("delete_context_snapshot", { userId });
}

// 获取账号使用量
export async function getAccountUsage(accountId: string): Promise<UsageSummary> {
  return invokeNetwork("get_account_usage", { accountId });
}

// 更新账号 Token
export async function updateAccountToken(accountId: string, token: string): Promise<UsageSummary> {
  return invokeNetwork("update_account_token", { accountId, token });
}

// 刷新 Token
export async function refreshToken(accountId: string): Promise<void> {
  return invokeNetwork("refresh_token", { accountId });
}

export async function refreshTokenWithPassword(accountId: string, password: string): Promise<void> {
  return invokeNetwork("refresh_token_with_password", { accountId, password });
}

export async function loginAccountWithEmail(
  accountId: string,
  email: string,
  password: string
): Promise<UsageSummary> {
  return invokeNetwork("login_account_with_email", { accountId, email, password });
}

export async function updateAccountProfile(
  accountId: string,
  updates: { email?: string | null; password?: string | null }
): Promise<Account> {
  return invokeNetwork("update_account_profile", {
    accountId,
    email: updates.email ?? null,
    password: updates.password ?? null,
  });
}

// 更新 Cookies
export async function updateCookies(accountId: string, cookies: string): Promise<void> {
  return invokeNetwork("update_cookies", { accountId, cookies });
}

// 导出账号
export async function exportAccounts(): Promise<string> {
  return invoke("export_accounts");
}

export async function exportAccountsToPath(path: string): Promise<void> {
  return invoke("export_accounts_to_path", { path });
}

// 导入账号
export async function importAccounts(data: string): Promise<number> {
  return invoke("import_accounts", { data });
}

export async function clearAccounts(): Promise<number> {
  return invoke("clear_accounts");
}

export async function getSettings(): Promise<AppSettings> {
  return invoke("get_settings");
}

export async function updateSettings(settings: AppSettings): Promise<AppSettings> {
  return invoke("update_settings", { settings });
}

// 获取使用事件
export async function getUsageEvents(
  accountId: string,
  startTime: number,
  endTime: number,
  pageNum: number = 1,
  pageSize: number = 20
): Promise<UsageEventsResponse> {
  return invokeNetwork("get_usage_events", {
    accountId,
    startTime,
    endTime,
    pageNum,
    pageSize
  });
}

// 从本地客户端导入账号（结构化结果：imported / already / no_login）
export interface LocalImportResult {
  status: "imported" | "already" | "no_login" | string;
  message: string;
  account: Account | null;
}

export async function importLocalAccount(platformId: string): Promise<LocalImportResult> {
  return invokeNetwork("read_trae_account", { platformId });
}

// ============ 机器码相关 API ============

// 获取当前系统机器码
export async function getMachineId(): Promise<string> {
  return invoke("get_machine_id");
}

// 重置系统机器码（生成新的随机机器码）
export async function resetMachineId(): Promise<string> {
  return invoke("reset_machine_id");
}

// 设置系统机器码为指定值
export async function setMachineId(machineId: string): Promise<void> {
  return invoke("set_machine_id", { machineId });
}

// 绑定账号机器码（保存当前系统机器码到账号）
export async function bindAccountMachineId(accountId: string): Promise<string> {
  return invoke("bind_account_machine_id", { accountId });
}

// ============ Trae IDE 机器码相关 API ============

// 获取 Trae IDE 的机器码
export async function getTraeMachineId(platformId?: string): Promise<string> {
  return invoke("get_trae_machine_id", { platformId: platformId ?? getTargetPlatform() });
}

// 设置 Trae IDE 的机器码
export async function setTraeMachineId(machineId: string, platformId?: string): Promise<void> {
  return invoke("set_trae_machine_id", {
    machineId,
    platformId: platformId ?? getTargetPlatform(),
  });
}

// 清除 Trae IDE 登录状态（让 IDE 变成全新安装状态）
export async function clearTraeLoginState(platformId?: string): Promise<void> {
  return invoke("clear_trae_login_state", { platformId: platformId ?? getTargetPlatform() });
}

// ============ Trae IDE 路径相关 API ============

// 获取保存的 Trae IDE 路径
export async function getTraePath(): Promise<string> {
  return invoke("get_trae_path");
}

// 设置 Trae IDE 路径
export async function setTraePath(path: string): Promise<void> {
  return invoke("set_trae_path", { path });
}

// 自动扫描 Trae IDE 路径
export async function scanTraePath(): Promise<string> {
  return invoke("scan_trae_path");
}

// ============ 礼包相关 API ============

// ============ 日志相关 API ============

// 获取最近日志
export async function getLogs(count: number): Promise<string[]> {
  return invoke("get_logs", { count });
}

// 导出日志
export async function exportLogs(path: string): Promise<void> {
  return invoke("export_logs_cmd", { path });
}

// 清空日志
export async function clearLogs(): Promise<void> {
  return invoke("clear_logs_cmd");
}

// 获取日志文件路径
export async function getLogFilePath(): Promise<string> {
  return invoke("get_log_file_path_cmd");
}

// ============ 快速注册后端 API（通过 Tauri Rust 后端调用，绕过 CORS） ============

/**
 * 创建快速注册任务
 * @param platformId 用户平台ID（如QQ号）
 * @returns 包含ticket和二维码链接的响应
 */
export async function createQuickRegisterTask(platformId: string): Promise<CreateTaskResponse> {
  // 通过 Tauri 命令调用 Rust 后端，绕过 CORS 限制
  return invoke("quick_register_create_task", { platformId });
}

/**
 * 查询任务状态
 * @param ticket 任务票据
 * @returns 任务状态响应
 */
export async function getTaskStatus(ticket: string): Promise<TaskStatusResponse> {
  console.log("查询任务状态 ticket:", ticket);
  // 通过 Tauri 命令调用 Rust 后端，绕过 CORS 限制
  return invoke("quick_register_get_status", { ticket });
}

/**
 * 领取资源（获取账号）
 * @param ticket 任务票据
 * @returns 包含账号信息的响应
 */
export async function claimResource(ticket: string): Promise<ClaimResourceResponse> {
  // 通过 Tauri 命令调用 Rust 后端，绕过 CORS 限制
  return invoke("quick_register_claim_resource", { ticket });
}

// 统计响应
export interface StatsResponse {
  success: boolean;
  data: {
    available_count: number;
    resource_type: string;
  };
  message: string;
}

/**
 * 获取剩余账号数量统计
 * @returns 统计响应
 */
export async function getQuickRegisterStats(): Promise<StatsResponse> {
  // 通过 Tauri 命令调用 Rust 后端，绕过 CORS 限制
  return invoke("quick_register_get_stats");
}

/**
 * 轮询等待任务验证完成
 * @param ticket 任务票据
 * @param timeoutMs 超时时间（毫秒）
 * @param intervalMs 轮询间隔（毫秒）
 * @returns 验证成功后的任务状态
 */
export async function pollTaskVerification(
  ticket: string,
  timeoutMs: number = 600000, // 默认10分钟
  intervalMs: number = 3000   // 默认3秒轮询一次
): Promise<TaskStatusResponse> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // 检查是否超时
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error("等待验证超时，请重新尝试"));
          return;
        }

        const status = await getTaskStatus(ticket);
        console.log("轮询状态:", status);

        // 后端可能返回的状态: pending, verified, claimed, expired
        if (status.status === "verified" || status.status === "claimed") {
          resolve(status);
          return;
        }

        if (status.status === "expired") {
          reject(new Error("二维码已过期，请重新获取"));
          return;
        }

        // 继续轮询 (pending 状态)
        setTimeout(poll, intervalMs);
      } catch (error: any) {
        console.error("轮询出错:", error);
        reject(error);
      }
    };

    poll();
  });
}

// ============ 工具箱：多平台 / 深度重置 / 备份恢复 / 状态校验 ============

export interface PlatformStatus {
  platform_id: string;
  display_name: string;
  exe_name: string;
  data_dir: string;
  data_dir_exists: boolean;
  install_dir: string | null;
  install_dir_exists: boolean;
  exe_path: string | null;
  storage_exists: boolean;
  state_db_exists: boolean;
  machineid_exists: boolean;
}

export interface ResetStep {
  name: string;
  status: "ok" | "skipped" | "failed" | string;
  detail: string;
}

export interface DeviceIds {
  machineid: string;
  telemetry_machine_id: string;
  dev_device_id: string;
  sqm_id: string;
}

export interface ResetReport {
  ok: boolean;
  steps: ResetStep[];
  log: string[];
  device_ids: DeviceIds | null;
}

export interface RestoreResult {
  restored: number;
  logs: string[];
}

export interface StateCheck {
  platform_id: string;
  data_dir: string;
  machine_id: string;
  telemetry_machine_id: string;
  dev_device_id: string;
  sqm_id: string;
  account_key_count: number;
  stale_targets: string[];
  storage_exists: boolean;
  state_db_exists: boolean;
  summary: string;
}

export async function detectPlatforms(): Promise<PlatformStatus[]> {
  return invoke("detect_platforms");
}

export async function deepReset(
  platformId: string,
  options?: {
    cleanAccounts?: boolean;
    cleanCache?: boolean;
    resetDeviceIds?: boolean;
    relaunch?: boolean;
    /** 自定义设备 ID（纯数字 8-20 位；留空自动生成） */
    newDeviceId?: string;
  }
): Promise<ResetReport> {
  return invoke("deep_reset", {
    platformId,
    cleanAccounts: options?.cleanAccounts ?? true,
    cleanCache: options?.cleanCache ?? true,
    resetDeviceIds: options?.resetDeviceIds ?? true,
    relaunch: options?.relaunch ?? false,
    newDeviceId: options?.newDeviceId?.trim() ? options.newDeviceId.trim() : null,
  });
}

export async function restoreBackup(platformId: string): Promise<RestoreResult> {
  return invoke("restore_backup", { platformId });
}

/** 更新账号分组与备注（空字符串视为清除） */
export async function updateAccountMeta(
  accountId: string,
  group: string,
  note: string
): Promise<void> {
  return invoke("update_account_meta", {
    accountId,
    group: group.trim() ? group.trim() : null,
    note: note.trim() ? note.trim() : null,
  });
}

export async function verifyState(platformId: string): Promise<StateCheck> {
  return invoke("verify_state", { platformId });
}

// ============ 多开实例（多账号并行） ============

export interface MultiInstanceStatus {
  account_id: string;
  platform_id: string;
  data_dir: string;
  pid: number;
  running: boolean;
}

/** 启动账号的多开实例（独立数据目录，首启即已登录） */
export async function multiInstanceLaunch(
  accountId: string,
  platformId?: string
): Promise<{ account_id: string; platform_id: string; data_dir: string; pid: number }> {
  return invoke("multi_instance_launch", {
    accountId,
    platformId: platformId ?? null,
  });
}

/** 多开实例列表（含存活状态） */
export async function multiInstanceList(): Promise<MultiInstanceStatus[]> {
  return invoke("multi_instance_list");
}

/** 停止多开实例（保留数据目录） */
export async function multiInstanceStop(accountId: string): Promise<void> {
  return invoke("multi_instance_stop", { accountId });
}

/** 移除多开实例（deleteData=true 时删除数据目录，危险操作） */
export async function multiInstanceRemove(
  accountId: string,
  deleteData: boolean
): Promise<void> {
  return invoke("multi_instance_remove", { accountId, deleteData });
}

// ============ 用量/积分历史（采样器数据） ============

export interface UsageSample {
  account_id: string;
  date: string;
  is_credits: boolean;
  credits_total: number;
  credits_consumed: number;
  credits_left: number;
  credits_ratio: number;
  dollar_used: number;
  recorded_at: number;
}

/** 用量历史（days 默认 30；0 表示全部） */
export async function usageHistoryList(
  accountId?: string,
  days?: number
): Promise<UsageSample[]> {
  return invoke("usage_history_list", {
    accountId: accountId ?? null,
    days: days ?? 30,
  });
}

/** 全部账号的积分消耗趋势（账号 id → 趋势；供卡片预警徽标） */
export async function usageForecastAll(): Promise<Record<string, UsageTrend>> {
  const res = await invoke<{ trends: Record<string, UsageTrend> }>("usage_forecast_all");
  return res.trends || {};
}

/** 账号渠道映射（账号 id → 本机已登录的客户端集合 + 首选签到客户端） */
export async function accountChannelsMap(): Promise<Record<string, AccountChannels>> {
  const res = await invoke<{ channels: Record<string, AccountChannels> }>("account_channels_map");
  return res.channels || {};
}

/** 构建指纹自检结果（关于页官方构建校验） */
export interface BuildAttestation {
  official: boolean;
  author: string;
  repo: string;
  version: string;
  built_at: number;
}

export async function buildAttestation(): Promise<BuildAttestation> {
  return invoke("build_attestation");
}

// ============ 工具箱：设备指纹（八位置） ============

export interface DeviceFingerprintStatus {
  platform_id: string;
  data_dir: string;
  machine_id: string;
  telemetry_machine_id: string;
  dev_device_id: string;
  sqm_id: string;
  device_id_local_env: string | null;
  device_id_net_config: string | null;
  device_id_tiny_storage: string | null;
  leveldb_file_count: number;
  mainjs_state: string;
  summary: string;
}

export interface FingerprintReport {
  ok: boolean;
  steps: ResetStep[];
  log: string[];
  new_device_id: string;
  new_machine_id: string;
}

export async function deviceFingerprintStatus(
  platformId: string
): Promise<DeviceFingerprintStatus> {
  return invoke("device_fingerprint_status", { platformId });
}

export async function resetDeviceFingerprint(
  platformId: string,
  options?: { newDeviceId?: string; relaunch?: boolean }
): Promise<FingerprintReport> {
  return invoke("reset_device_fingerprint", {
    platformId,
    newDeviceId: options?.newDeviceId?.trim() ? options.newDeviceId.trim() : null,
    relaunch: options?.relaunch ?? false,
  });
}

// ============ 工具箱：每日签到 ============

export interface CheckinOutcome {
  account_id: string;
  email: string;
  status: "claimed" | "already" | "disabled" | "failed" | string;
  credits: number | null;
  extra_credits: number | null;
  message: string;
}

/** 单账号签到（查询状态 → 未签到则领取） */
export async function checkinAccount(accountId: string): Promise<CheckinOutcome> {
  return invokeNetwork("checkin_account", { accountId });
}

/** 批量签到（所有持有 Token 的账号，HTTP 方式） */
export async function checkinAllAccounts(): Promise<CheckinOutcome[]> {
  return invokeNetwork("checkin_all_accounts");
}

// ============ 客户端签到（CDP 驱动真实客户端 UI） ============

export interface CdpCheckinInfo {
  platform_id: string;
  platform_name: string;
  /** 账号名（用户名/邮箱；toast 以账号为主体展示，避免平台名飘忽） */
  account_name?: string;
  /** 签到成功 / 今日已签到 / 未登录 / 签到失败 / 失败 */
  status: string;
  detail: string;
  points: number | null;
}

/**
 * 通过真实客户端完成签到：以调试模式重启客户端 → 点击账号菜单的签到按钮 → 验证并恢复。
 * 生态调研（zrl1129/trae-checkin-manager 等）证明此路径可完全绕开裸 HTTP 请求的风控问题。
 */
export async function checkinViaClient(platformId: string): Promise<CdpCheckinInfo> {
  return invoke("checkin_via_client", { platformId });
}

/**
 * 一键签到（后端内核：自动选择目标客户端 + 按账号去重 + 逐个 CDP 签到）
 * 与「定时自动签到」共用同一实现，保证行为一致。
 */
export async function checkinAllViaClient(): Promise<CdpCheckinInfo[]> {
  const res = await invoke<{ results: CdpCheckinInfo[] }>("checkin_all_via_client");
  return res.results;
}

// ============ 平台登录检测（导入来源区分） ============

export interface PlatformLoginStatus {
  platform_id: string;
  display_name: string;
  data_dir_exists: boolean;
  has_login: boolean;
}

/** 各平台本地登录检测（区分 Trae / Trae CN / TRAEWork CN / TraeCode CN 等客户端包） */
export async function platformLoginStatus(): Promise<PlatformLoginStatus[]> {
  return invoke("platform_login_status");
}

// ============ 本地可导入账号预览（离线解析，不联网） ============

export interface LocalLoginPreview {
  platform_id: string;
  display_name: string;
  user_id: string;
  username: string;
  email: string;
}

/** 列出本机各客户端检测到的可导入账号（离线解析；无需先选平台） */
export async function previewLocalLogins(): Promise<LocalLoginPreview[]> {
  return invoke("preview_local_logins");
}
