"use client";

import { useEffect, useState } from "react";
import {
  Layout, Card, Row, Col, Typography, Tag, Spin, Empty, Button, Tooltip, Space,
} from "antd";
import {
  ReloadOutlined, DatabaseOutlined, BranchesOutlined,
  ApiOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Title, Text } = Typography;
const { Content } = Layout;
const DEFAULT_USER_ID = "default-user";

const PURPLE = "#a78bfa";
const PURPLE_DARK = "#8b5cf6";
const PURPLE_LIGHT = "#ede9fe";

interface AgentDashboardData {
  overview: {
    conversationCount: number;
    messageCount: number;
    eventCount: number;
  };
  memoryLayers: {
    instant: { label: string; count: number; note: string };
    short: { label: string; count: number; total: number; note: string;
      freshnessDistribution: { low: number; mid: number; high: number } };
    long: { label: string; count: number; avgWeight: number; note: string;
      weightDistribution: { low: number; mid: number; high: number } };
    meta: { label: string; count: number; note: string };
    knowledgeBase: { label: string; count: number; note: string };
  };
  ragStats: {
    total: number;
    vector: number;
    bm25: number;
    web: number;
    avgScore: number;
  };
  guardRailStats?: {
    total: number;
    input: { passed: number; blocked: number; sanitized: number };
    tool: { passed: number; blocked: number };
    output: { passed: number; hits: number; avgSimilarity: number; avgFactCoverage: number };
    recentHits: Array<{ layer: string; risk: string; reason: string; time: string }>;
  };
  nodeStats: { name: string; count: number }[];
  recentEvents: {
    id: string;
    type: string;
    name: string;
    payload: any;
    durationMs: number | null;
    createdAt: string;
    conversationId: string | null;
  }[];
  _meta?: { eventTableReady?: boolean };
}

export default function AgentDashboardClient() {
  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`/api/dashboard/agent?userId=${DEFAULT_USER_ID}`);
      if (!r.ok) throw new Error("加载失败");
      const json = await r.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  if (loading && !data) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#fff" }}>
        <Navbar />
        <Content style={{ padding: 16, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
            <Spin size="large" />
          </div>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#fff" }}>
        <Navbar />
        <Content style={{ padding: 16, background: "#fff" }}>
          <Card style={{ maxWidth: 600, margin: "80px auto" }}>
            <Empty description={error || "暂无数据"} />
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button onClick={fetchData} icon={<ReloadOutlined />}>重试</Button>
            </div>
          </Card>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  const ml = data.memoryLayers;
  const rs = data.ragStats;

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Navbar />
      <Content style={{ padding: "24px 16px 80px", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* ===== 标题 + 总览 ===== */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Title level={2} style={{ margin: 0, color: "#1f2937" }}>Agent 系统看板</Title>
            <Space>
              <Button
                type="default"
                href="/dashboard/trace"
                style={{ color: PURPLE, borderColor: PURPLE }}
              >
                🔍 Trace Viewer
              </Button>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
                style={{ color: PURPLE }}
              >
                刷新
              </Button>
            </Space>
          </div>
          <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 24 }}>
            观察 LangGraph + 四阶记忆 + 混合 RAG 的真实运行状态
          </Text>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <OverviewCard
                title="对话总数"
                value={data.overview.conversationCount}
                icon={<BranchesOutlined />}
              />
            </Col>
            <Col xs={24} sm={8}>
              <OverviewCard
                title="消息总数"
                value={data.overview.messageCount}
                icon={<ApiOutlined />}
              />
            </Col>
            <Col xs={24} sm={8}>
              <OverviewCard
                title="Agent 事件"
                value={data.overview.eventCount}
                icon={<ThunderboltOutlined />}
                hint={data._meta?.eventTableReady === false ? "事件日志表未初始化" : undefined}
              />
            </Col>
          </Row>

          {/* ===== Panel 1: 四阶分层记忆 ===== */}
          <Section title="四阶分层记忆" subtitle="instant / short / long / meta + 知识库">
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8} md={5}>
                <MemoryLayerCard label={ml.instant.label} count={ml.instant.count} note={ml.instant.note} />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <MemoryLayerCard
                  label={ml.short.label}
                  count={ml.short.count}
                  note={ml.short.note}
                  distribution={ml.short.freshnessDistribution}
                  distLabels={["低", "中", "高"]}
                  distTooltip="新鲜度分布"
                />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <MemoryLayerCard
                  label={ml.long.label}
                  count={ml.long.count}
                  note={`${ml.long.note} · 平均权重 ${ml.long.avgWeight}`}
                  distribution={ml.long.weightDistribution}
                  distLabels={["弱", "中", "强"]}
                  distTooltip="权重分布"
                />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <MemoryLayerCard label={ml.meta.label} count={ml.meta.count} note={ml.meta.note} />
              </Col>
              <Col xs={24} sm={8} md={4}>
                <MemoryLayerCard label={ml.knowledgeBase.label} count={ml.knowledgeBase.count} note={ml.knowledgeBase.note} accent />
              </Col>
            </Row>
          </Section>

          {/* ===== Panel 2: RAG 检索统计 ===== */}
          <Section title="RAG 检索路径" subtitle="向量 / BM25 / 联网，融合排名后的命中分布">
            {rs.total === 0 ? (
              <EmptyHint text="尚未有 RAG 检索事件。前往对话页提问几个技术问题即可点亮此面板。" />
            ) : (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={16}>
                  <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <RagBar label="🟣 向量检索" value={rs.vector} total={rs.vector + rs.bm25 + rs.web} color={PURPLE_DARK} />
                    <RagBar label="🟠 BM25 倒排" value={rs.bm25} total={rs.vector + rs.bm25 + rs.web} color="#f59e0b" />
                    <RagBar label="🔵 联网搜索" value={rs.web} total={rs.vector + rs.bm25 + rs.web} color="#3b82f6" />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10, height: "100%" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>累计检索次数</Text>
                    <div style={{ fontSize: 32, fontWeight: 600, color: PURPLE, lineHeight: 1.2 }}>
                      {rs.total}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: "block" }}>平均融合分数</Text>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#1f2937" }}>
                      {rs.avgScore || "—"}
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
          </Section>

          {/* ===== Panel: GuardRail 三层防护 ===== */}
          {data.guardRailStats && (
            <Section title="🛡️ GuardRail 三层防护" subtitle="L1 输入注入检测 · L2 工具参数校验 · L3 输出相关性+幻觉验证">
              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>L1 输入注入检测</Text>
                    <div style={{ fontSize: 24, fontWeight: 600, color: "#16a34a", lineHeight: 1.3, marginTop: 4 }}>
                      ✅ {data.guardRailStats.input.passed}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      <span style={{ color: "#dc2626" }}>拦截 {data.guardRailStats.input.blocked}</span>
                      {" · "}
                      <span style={{ color: "#d97706" }}>脱敏 {data.guardRailStats.input.sanitized}</span>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>L2 工具参数校验</Text>
                    <div style={{ fontSize: 24, fontWeight: 600, color: "#0891b2", lineHeight: 1.3, marginTop: 4 }}>
                      ✅ {data.guardRailStats.tool.passed}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      Zod schema · 黑名单 ·
                      <span style={{ color: "#dc2626" }}> 拦截 {data.guardRailStats.tool.blocked}</span>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>L3 输出验证</Text>
                    <div style={{ fontSize: 24, fontWeight: 600, color: PURPLE, lineHeight: 1.3, marginTop: 4 }}>
                      ✅ {data.guardRailStats.output.passed}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      相关性 {(data.guardRailStats.output.avgSimilarity * 100).toFixed(0)}%
                      {" · "}
                      事实覆盖 {(data.guardRailStats.output.avgFactCoverage * 100).toFixed(0)}%
                    </div>
                  </Card>
                </Col>
              </Row>
              {data.guardRailStats.recentHits.length > 0 && (
                <Card bordered={false} style={{ marginTop: 12, border: "1px solid #fed7aa", background: "#fffbeb", borderRadius: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: 500, color: "#d97706" }}>⚠️ 最近告警 ({data.guardRailStats.recentHits.length})</Text>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {data.guardRailStats.recentHits.slice(0, 5).map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#4b5563", display: "flex", gap: 6 }}>
                        <Tag color={h.risk === "high" || h.risk === "critical" ? "red" : "orange"} style={{ marginRight: 0, fontSize: 11 }}>
                          {h.layer} · {h.risk}
                        </Tag>
                        <span>{h.reason}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </Section>
          )}

          {/* ===== Panel 3: LangGraph 节点调用 ===== */}
          <Section title="LangGraph 节点调用" subtitle="各意图路由的调用次数（热力越高出现越频繁）">
            {data.nodeStats.length === 0 ? (
              <EmptyHint text="尚未有节点调用事件。" />
            ) : (
              <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {data.nodeStats.map((n) => {
                    const max = data.nodeStats[0]?.count || 1;
                    return (
                      <div key={n.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 13 }}>{prettyNodeName(n.name)}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{n.count} 次</Text>
                        </div>
                        <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${(n.count / max) * 100}%`,
                            background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </Space>
              </Card>
            )}
          </Section>

          {/* ===== Panel 4: 最近事件流水 ===== */}
          <Section title="最近 Agent 事件" subtitle="按时间倒序，最多 20 条">
            {data.recentEvents.length === 0 ? (
              <EmptyHint text="暂无事件。开始对话即会自动埋点。" />
            ) : (
              <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }} bodyStyle={{ padding: 0 }}>
                <div style={{ maxHeight: 480, overflow: "auto" }}>
                  {data.recentEvents.map((ev, i) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: i < data.recentEvents.length - 1 ? "1px solid #f5f5f5" : "none",
                        display: "flex", alignItems: "flex-start", gap: 12,
                      }}
                    >
                      <Tag color={tagColorByType(ev.type)} style={{ marginTop: 2, minWidth: 56, textAlign: "center" }}>
                        {ev.type}
                      </Tag>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Text strong style={{ fontSize: 13 }}>{ev.name}</Text>
                          {ev.durationMs != null && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{ev.durationMs}ms</Text>
                          )}
                        </div>
                        {ev.payload && (
                          <Text type="secondary" style={{
                            fontSize: 11, fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                            display: "block", marginTop: 2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {typeof ev.payload === "string" ? ev.payload : JSON.stringify(ev.payload)}
                          </Text>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(ev.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </Text>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Section>

        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}

// ====== 子组件 ======

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <Title level={4} style={{ margin: 0, color: "#1f2937" }}>{title}</Title>
      {subtitle && (
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>{subtitle}</Text>
      )}
      {children}
    </div>
  );
}

function OverviewCard({ title, value, icon, hint }: { title: string; value: number; icon: React.ReactNode; hint?: string }) {
  return (
    <Card bordered={false} style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: PURPLE_LIGHT, color: PURPLE_DARK,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          {icon}
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#1f2937", lineHeight: 1.2 }}>{value}</div>
          {hint && (
            <Tooltip title={hint}>
              <Text type="warning" style={{ fontSize: 11 }}>⚠ 待初始化</Text>
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
}

function MemoryLayerCard({ label, count, note, accent, distribution, distLabels, distTooltip }: {
  label: string; count: number; note: string; accent?: boolean;
  distribution?: { low: number; mid: number; high: number };
  distLabels?: [string, string, string];
  distTooltip?: string;
}) {
  return (
    <Card
      bordered={false}
      style={{
        background: accent ? "#faf9ff" : "#fff",
        border: `1px solid ${accent ? PURPLE_LIGHT : "#f0f0f0"}`,
        borderRadius: 10,
        height: "100%",
      }}
      bodyStyle={{ padding: 14 }}
    >
      <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
      <div style={{ fontSize: 28, fontWeight: 600, color: accent ? PURPLE_DARK : "#1f2937", lineHeight: 1.1, margin: "4px 0" }}>
        {count}
      </div>
      <Text type="secondary" style={{ fontSize: 11, display: "block", lineHeight: 1.4 }}>
        {note}
      </Text>
      {distribution && distLabels && (
        <Tooltip title={distTooltip}>
          <div style={{ marginTop: 8, display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ flex: distribution.low || 0.01, background: "#e5e7eb" }} title={`${distLabels[0]} ${distribution.low}`} />
            <div style={{ flex: distribution.mid || 0.01, background: "#c4b5fd" }} title={`${distLabels[1]} ${distribution.mid}`} />
            <div style={{ flex: distribution.high || 0.01, background: PURPLE_DARK }} title={`${distLabels[2]} ${distribution.high}`} />
          </div>
        </Tooltip>
      )}
    </Card>
  );
}

function RagBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 13 }}>{label}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{value} 条 · {pct.toFixed(0)}%</Text>
      </div>
      <div style={{ height: 10, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Card bordered={false} style={{ background: "#fafafa", border: "1px dashed #e5e7eb", borderRadius: 10 }} bodyStyle={{ padding: 24, textAlign: "center" }}>
      <DatabaseOutlined style={{ fontSize: 22, color: "#9ca3af", marginBottom: 8 }} />
      <div><Text type="secondary" style={{ fontSize: 13 }}>{text}</Text></div>
    </Card>
  );
}

function prettyNodeName(name: string): string {
  const m: Record<string, string> = {
    create_task: "🎯 制定学习计划",
    progress_tracking: "📊 查询学习进度",
    emotional_support: "💜 情绪支持",
    general_inquiry: "💬 通用问答",
    general_qa: "💬 通用问答 (general_qa)",
    intent_recognition: "🧭 意图识别",
    task_generation: "🎯 任务生成",
    progress_query: "📊 进度查询",
    emotion_support: "💜 情绪支持",
  };
  return m[name] || name;
}

function tagColorByType(type: string): string {
  if (type === "intent") return "purple";
  if (type === "node") return "blue";
  if (type === "rag") return "orange";
  if (type === "guardrail") return "red";
  return "default";
}
