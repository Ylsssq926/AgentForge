//! 应用（平台）视觉标识：色章颜色与字母缩写（Sidebar / 工作台 / 导入弹窗共用）
//! 色值按平台 ID 映射；未知平台回退中性色。

export const PLATFORM_COLORS: Record<string, string> = {
  trae: "#7c5cff",
  trae_cn: "#2f6bff",
  traework: "#0aa679",
  traework_cn: "#0aa679",
  traecode_cn: "#2f6bff",
  workbuddy: "#f59e0b",
  workbuddy_cn: "#ef7c1a",
  qoder: "#0ea5e9",
};

export function platformColor(id: string): string {
  return PLATFORM_COLORS[id] || "#64748b";
}

/** 平台名首字母缩写（如 "TraeCode CN" → "TC"，"TraeWork CN" → "TW"） */
export function platformInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.map((w) => w[0] || "").join("");
  return (letters.slice(0, 2) || "T").toUpperCase();
}
