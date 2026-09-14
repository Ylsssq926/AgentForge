import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoot } from "./app/AppRoot";

// 重构后入口：设计令牌与基线由 AppRoot 内部引入；旧 App.tsx/App.css 已停用
// （备份见 .removed_backup/legacy-frontend/）。
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
