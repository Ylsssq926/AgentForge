// 账号简要信息
export interface AccountBrief {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  plan_type: string;
  is_active: boolean;
  created_at: number;
  machine_id: string | null;
  is_current: boolean; // 是否是当前 Trae IDE 正在使用的账号
  /** 登录令牌过期时间（RFC3339） */
  token_expired_at?: string | null;
  /** 导入来源平台展示名（如 "Trae CN"） */
  source_platform?: string | null;
  /** 脱敏手机号（手机注册账号的联系方式） */
  phone?: string | null;
  /** 分组（用户自定义） */
  group?: string | null;
  /** 备注（用户自定义） */
  note?: string | null;
  /** 账号系统 user_id（渠道匹配/已导入标记用） */
  user_id?: string;
}

// 完整账号信息
export interface Account {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  cookies: string;
  jwt_token: string | null;
  token_expired_at: string | null;
  password?: string | null;
  user_id: string;
  tenant_id: string;
  region: string;
  plan_type: string;
  created_at: number;
  updated_at: number;
  is_active: boolean;
  machine_id: string | null;
  /** 导入来源平台展示名（如 "Trae CN"；登录添加的账号为 null/缺省） */
  source_platform?: string | null;
  /** 脱敏手机号（手机注册账号的联系方式） */
  phone?: string | null;
  /** 分组（用户自定义） */
  group?: string | null;
  /** 备注（用户自定义） */
  note?: string | null;
}

// 使用量汇总
export interface UsageSummary {
  plan_type: string;
  reset_time: number;

  // Fast Request - 请求次数
  fast_request_used: number;
  fast_request_limit: number;
  fast_request_left: number;

  // Fast Request - 美元额度 (新账号 3 美元额度显示用)
  fast_dollar_used: number;
  fast_dollar_limit: number;
  fast_dollar_left: number;

  // Basic 额度 (基础 $3)
  basic_dollar_limit: number;
  basic_dollar_used: number;
  basic_dollar_left: number;

  // Bonus 额度 (奖励 $3)
  bonus_dollar_limit: number;
  bonus_dollar_used: number;
  bonus_dollar_left: number;

  // Extra Package
  extra_fast_request_used: number;
  extra_fast_request_limit: number;
  extra_fast_request_left: number;
  extra_expire_time: number;
  extra_package_name: string;

  // Slow Request
  slow_request_used: number;
  slow_request_limit: number;
  slow_request_left: number;

  // Advanced Model
  advanced_model_used: number;
  advanced_model_limit: number;
  advanced_model_left: number;

  // Autocomplete
  autocomplete_used: number;
  autocomplete_limit: number;
  autocomplete_left: number;

  // 是否是美元计费模式 (新账号)
  is_dollar_billing: boolean;

  // ===== 积分制（CN 新版计费）=====
  is_credits_billing?: boolean;
  credits_total?: number;
  credits_consumed?: number;
  credits_left?: number;
  credits_ratio?: number;
}

// 使用事件
export interface UsageEvent {
  session_id: string;
  usage_time: number;
  mode: string;
  model_name: string;
  amount_float: number;
  cost_money_float: number;
  use_max_mode: boolean;
  product_type_list: number[];
  extra_info: {
    cache_read_token: number;
    cache_write_token: number;
    input_token: number;
    output_token: number;
  };
}

// 使用事件响应
export interface UsageEventsResponse {
  total: number;
  user_usage_group_by_sessions: UsageEvent[];
}

// API 错误
export interface ApiError {
  message: string;
}

export interface CustomTempMailConfig {
  api_url: string;
  secret_key: string;
  email_domain: string;
}

export interface AppSettings {
  quick_register_show_window: boolean;
  auto_refresh_enabled: boolean;
  privacy_auto_enable: boolean;
  auto_update_check: boolean;
  auto_start_enabled: boolean;
  api_key: string; // 用于访问验证码获取服务
  custom_tempmail_config: CustomTempMailConfig;
  /** 定时自动签到开关 */
  auto_checkin_enabled: boolean;
  /** 每日触发时间（HH:MM，本地时区） */
  auto_checkin_time: string;
  /** 本地对话库按账号隔离（切走入库 / 切回取回；每账号各占一份磁盘） */
  chat_vault_enabled: boolean;
}

/** 对话库金库槽位（按账号保存的本地对话数据） */
export interface ChatVaultSlot {
  platform_id: string;
  platform_name: string;
  user_id: string;
  bytes: number;
  stashed_at: string | null;
}

/** 账号渠道信息（本机登录的客户端集合 + 首选签到客户端；账号管理清晰化） */
export interface AccountChannels {
  platform_ids: string[];
  platform_names: string[];
  /** 首选签到客户端（TraeWork 系优先） */
  checkin_via: string;
}

/** 积分消耗趋势预测（路线图④：由 ②采样器的历史快照计算） */
export interface UsageTrend {
  /** 参与计算的样本数 */
  data_points: number;
  /** 日均消耗（积分） */
  daily_burn: number | null;
  /** 预计还可使用天数 */
  days_to_empty: number | null;
  /** 预计见底日期（YYYY-MM-DD） */
  projected_date: string | null;
  /** 当前剩余（最后一个样本） */
  credits_left: number | null;
  /** 计算依据的跨度天数 */
  basis_days: number;
}

