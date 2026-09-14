/**
 * 平台（应用）目录 hook（features/platforms）· AgentForge
 * 数据来自后端 `platform_catalog`（单一数据源，含 planned 预留项）。
 */
import { useEffect, useState } from "react";
import * as api from "../../api";

export interface AppItem {
  id: string;
  label: string;
  planned: boolean;
}

const FALLBACK: AppItem[] = api.TARGET_PLATFORMS.map((p) => ({
  id: p.id,
  label: p.label,
  planned: false,
}));

export function usePlatforms() {
  const [apps, setApps] = useState<AppItem[]>(FALLBACK);

  useEffect(() => {
    api
      .platformCatalog()
      .then((list) => {
        if (list.length === 0) return;
        setApps(
          list.map((x) => ({ id: x.id, label: x.display_name, planned: x.kind !== "active" }))
        );
      })
      .catch(() => {});
  }, []);

  const active = apps.filter((a) => !a.planned);
  const byId = (id: string) => apps.find((a) => a.id === id);

  return { apps, active, byId };
}
