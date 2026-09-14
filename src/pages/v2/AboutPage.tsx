/**
 * 关于（pages/v2/AboutPage）· AgentForge
 * 含构建校验徽标（官方构建 / 非官方构建警告）与免责声明。
 */
import { useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, Section } from "../../ui";
import * as api from "../../api";
import { useToast } from "../../app/ToastProvider";
import "./pages.css";

const REPO = "https://github.com/Ylsssq926/AgentForge";
const AUTHOR = "掠蓝";

const DISCLAIMER = [
  "本工具仅用于个人学习与技术研究，仅处理本机已登录账号的本地数据。",
  "所有修改前自动生成 .bak 备份；不修改客户端程序本体。",
  "深度重置会清理本地账号状态与缓存，设备指纹重置会改写客户端识别信息。",
  "本项目为开源作品，禁止二次售卖。若你是付费购买获得，请立即退款。",
];

export function AboutPage() {
  const { toast } = useToast();
  const [version, setVersion] = useState("0.1.0");
  const [attest, setAttest] = useState<api.BuildAttestation | null>(null);

  useEffect(() => {
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then((v) => v && setVersion(v))
      .catch(() => {});
    api.buildAttestation().then(setAttest).catch(() => {});
  }, []);

  return (
    <>
      <div className="af-page-head">
        <div>
          <div className="af-page-title">关于</div>
          <div className="af-page-sub">版本信息与来源校验</div>
        </div>
      </div>

      <Card>
        <div className="af-about-hero">
          <Avatar color="var(--brand)" text="AF" size="lg" />
          <div>
            <div className="af-about-name">
              AgentForge <Badge>v{version}</Badge>
            </div>
            <div className="af-about-desc">
              多智能体客户端管理器（首发适配 Trae 系列）：账号导入与切换、多开实例、
              定时签到与积分预警、设备维护、换机迁移。
            </div>
          </div>
        </div>
      </Card>

      {attest && (
        <Card>
          {attest.official ? (
            <div className="u-row">
              <Badge tone="ok">✓ 官方构建</Badge>
              <span className="u-muted">
                作者 {attest.author} · 构建校验通过 · 来源可信
              </span>
            </div>
          ) : (
            <div className="u-col">
              <div className="u-row">
                <Badge tone="err">⚠ 非官方构建</Badge>
                <span className="u-muted">本程序的署名或代码可能已被修改，来源不可信。</span>
              </div>
              <span className="u-subtle">请从官方仓库重新下载：{REPO}</span>
            </div>
          )}
        </Card>
      )}

      <Section title="项目">
        <Card>
          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">开源仓库</div>
              <div className="af-set-row__desc">{REPO}</div>
            </div>
            <div className="af-set-row__action">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(REPO).then(() => toast("success", "已复制仓库地址", 2000));
                }}
              >
                复制地址
              </Button>
            </div>
          </div>
          <div className="af-set-row">
            <div className="af-set-row__main">
              <div className="af-set-row__label">作者</div>
              <div className="af-set-row__desc">{AUTHOR}</div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="免责声明">
        <Card>
          <div className="af-about-list">
            {DISCLAIMER.map((line, i) => (
              <div key={i}>
                {i + 1}. {line}
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </>
  );
}
