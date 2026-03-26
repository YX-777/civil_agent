"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Progress,
  Radio,
  Result,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";
import { useXhsSyncReport } from "@/hooks/use-xhs-sync-report";
import { apiClient } from "@/lib/utils";

const { Content } = Layout;
const { Paragraph, Text, Title } = Typography;

function renderRunStatus(status: string) {
  if (status === "success") {
    return <Tag color="success">成功</Tag>;
  }
  if (status === "failed") {
    return <Tag color="error">失败</Tag>;
  }
  return <Tag color="processing">{status}</Tag>;
}

function renderPostStatus(status: string) {
  if (status === "new") {
    return <Tag color="blue">正文可用</Tag>;
  }
  if (status === "detail_unavailable") {
    return <Tag color="orange">详情失败</Tag>;
  }
  return <Tag>{status}</Tag>;
}

function formatRetryResultMessage(message?: string, category?: string | null) {
  const normalized = (message || "").toLowerCase();

  // 将后端的技术化错误统一映射成用户可读的中文说明，避免页面直接暴露内部实现细节。
  if (category === "login_required" || normalized.includes("not logged in")) {
    return "小红书 MCP 当前未登录，请先完成登录后再重试。";
  }
  if (category === "lookup_miss" || normalized.includes("not found in notedetailmap")) {
    return "原帖详情映射已失效，当前没有拿到这条帖子的详情内容。";
  }
  if (normalized.includes("was not updated to new after retry")) {
    return "已执行重试，但还没有确认恢复到原帖正文。";
  }
  if (category === "invalid_param" || normalized.includes("missing xsectoken") || normalized.includes("missing before get_feed_detail")) {
    return "这条帖子缺少必要参数，暂时无法重新抓取详情。";
  }
  if (category === "access_denied") {
    return "详情页访问被限制，当前账号暂时无法获取这条内容。";
  }
  if (category === "transient" || normalized.includes("fetch failed") || normalized.includes("network")) {
    return "本次重试遇到网络波动，建议稍后再试一次。";
  }
  if (category === "parse_empty" || normalized.includes("detail content empty")) {
    return "接口返回了详情页，但没有解析出可用正文。";
  }
  if (!message) {
    return "暂无更多错误信息。";
  }
  return message;
}

export default function XiaohongshuDashboardPage() {
  const { data, isLoading, error, refresh } = useXhsSyncReport();
  const [postFilter, setPostFilter] = useState<"all" | "new" | "detail_unavailable">("all");
  const [retryingPostId, setRetryingPostId] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const filteredPosts = useMemo(() => {
    // 这个 useMemo 必须放在早返回之前，避免再次出现 “Rendered more hooks than during the previous render”。
    if (!data) {
      return [];
    }
    if (postFilter === "all") {
      return data.recentPosts;
    }
    return data.recentPosts.filter((post) => post.status === postFilter);
  }, [data, postFilter]);

  if (isLoading) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Navbar />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", paddingTop: 160 }}>
            <Spin size="large" />
          </div>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Navbar />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <Result
              status="error"
              title="小红书同步报表加载失败"
              subTitle={error ?? "未知错误"}
              extra={
                <Button type="primary" onClick={refresh}>
                  重试
                </Button>
              }
            />
          </div>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  const latestRun = data.latestRun;
  const successfulRate =
    data.summary.totalRuns > 0 ? Math.round((data.summary.successRuns / data.summary.totalRuns) * 100) : 0;
  const latestContentAvailability =
    latestRun && latestRun.fetchedCount > 0
      ? Math.round(((latestRun.insertedCount - latestRun.detailErrorCount) / latestRun.fetchedCount) * 100)
      : 0;

  async function handleRetry(postId: string) {
    setRetryingPostId(postId);
    try {
      const response = await apiClient.post("/api/xhs-sync/retry", { postId });
      const result = response.data as {
        status: "recovered" | "still_unavailable";
        message: string;
        category?: string | null;
      };

      if (result.status === "recovered") {
        messageApi.success("重试成功，帖子正文已重新入库");
        // 这里的高亮只是一层视觉反馈，真正是否恢复仍以后端刷新后的数据库状态为准。
        setHighlightedPostId(postId);
      } else {
        messageApi.warning(`重试已执行，但帖子仍不可用：${formatRetryResultMessage(result.message, result.category)}`);
      }

      await refresh();
    } catch (err) {
      const responseMessage =
        typeof (err as { response?: { data?: { error?: string } } })?.response?.data?.error === "string"
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      const errorMessage =
        err instanceof Error ? formatRetryResultMessage(responseMessage ?? err.message) : "重试失败";
      messageApi.error(errorMessage);
    } finally {
      setRetryingPostId(null);
    }
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {contextHolder}
      <Navbar
        extra={
          <Space>
            <Link href="/dashboard">
              <Button>返回总看板</Button>
            </Link>
            <Button type="primary" icon={<ReloadOutlined />} onClick={refresh}>
              刷新报表
            </Button>
          </Space>
        }
      />
      <Content style={{ padding: "16px", paddingBottom: 80 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
              <div>
                <Title level={2} style={{ marginBottom: 8 }}>
                  小红书同步看板
                </Title>
                <Text type="secondary">
                  这里展示最近同步任务结果、失败分类和最近入库的帖子样本，方便直接判断抓取质量。
                </Text>
              </div>
            </Space>
          </div>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="同步总次数" value={data.summary.totalRuns} prefix={<BarChartOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="成功次数" value={data.summary.successRuns} prefix={<CheckCircleOutlined />} />
                <Progress percent={successfulRate} size="small" strokeColor="#52c41a" showInfo={false} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="已入库帖子" value={data.summary.totalPosts} />
                <Text type="secondary">其中正文可用 {data.summary.newPosts} 条</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic
                  title="详情失败帖子"
                  value={data.summary.detailUnavailablePosts}
                  prefix={<WarningOutlined />}
                />
                <Text type="secondary">需要重点优化的样本池</Text>
              </Card>
            </Col>
          </Row>

          {latestRun ? (
            <Card
              title="最近一次同步"
              extra={
                <Space>
                  {renderRunStatus(latestRun.status)}
                  <Text type="secondary">{dayjs(latestRun.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Text>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Statistic title="抓取候选数" value={latestRun.fetchedCount} />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic title="新增入库数" value={latestRun.insertedCount} />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic title="详情失败数" value={latestRun.detailErrorCount} />
                </Col>
              </Row>

              <div style={{ marginTop: 20 }}>
                <Text strong>正文可用率</Text>
                <Progress
                  percent={latestContentAvailability}
                  strokeColor={latestContentAvailability >= 70 ? "#52c41a" : "#faad14"}
                />
              </div>

              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                <Col xs={24} lg={12}>
                  <Card size="small" title="失败分类">
                    <Space wrap>
                      <Tag color="orange">access_denied {latestRun.detailErrorBreakdown.access_denied}</Tag>
                      <Tag color="gold">transient {latestRun.detailErrorBreakdown.transient}</Tag>
                      <Tag color="purple">parse_empty {latestRun.detailErrorBreakdown.parse_empty}</Tag>
                      <Tag color="magenta">login_required {latestRun.detailErrorBreakdown.login_required}</Tag>
                      <Tag color="cyan">invalid_param {latestRun.detailErrorBreakdown.invalid_param}</Tag>
                      <Tag color="blue">lookup_miss {latestRun.detailErrorBreakdown.lookup_miss ?? 0}</Tag>
                      <Tag color="default">unknown {latestRun.detailErrorBreakdown.unknown}</Tag>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Alert
                    type={latestRun.detailErrorCount > 0 ? "warning" : "success"}
                    showIcon
                    message={
                      latestRun.detailErrorCount > 0
                        ? "最近一轮仍有详情失败样本，建议优先查看下方帖子列表。"
                        : "最近一轮详情抓取表现正常。"
                    }
                  />
                </Col>
              </Row>
            </Card>
          ) : null}

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={11}>
              <Card title="最近同步记录" style={{ height: "100%" }}>
                <Table
                  rowKey="id"
                  pagination={false}
                  size="small"
                  dataSource={data.recentRuns}
                  columns={[
                    {
                      title: "时间",
                      dataIndex: "createdAt",
                      key: "createdAt",
                      render: (value: string) => dayjs(value).format("MM-DD HH:mm"),
                    },
                    {
                      title: "状态",
                      dataIndex: "status",
                      key: "status",
                      render: renderRunStatus,
                    },
                    {
                      title: "抓取/入库",
                      key: "result",
                      render: (_, record) => `${record.fetchedCount} / ${record.insertedCount}`,
                    },
                    {
                      title: "详情失败",
                      dataIndex: "detailErrorCount",
                      key: "detailErrorCount",
                    },
                  ]}
                />
              </Card>
            </Col>

            <Col xs={24} xl={13}>
              <Card title="失败趋势" style={{ marginBottom: 16 }}>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.runTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" style={{ fontSize: 12 }} />
                      <YAxis style={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="insertedCount" name="新增入库" fill="#1677ff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="detailErrorCount" name="详情失败" fill="#fa8c16" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="关键词效果" style={{ marginBottom: 16 }}>
                <Table
                  rowKey="keyword"
                  pagination={false}
                  size="small"
                  dataSource={data.keywordStats}
                  columns={[
                    {
                      title: "关键词",
                      dataIndex: "keyword",
                      key: "keyword",
                    },
                    {
                      title: "总样本",
                      dataIndex: "totalPosts",
                      key: "totalPosts",
                    },
                    {
                      title: "正文可用",
                      dataIndex: "availablePosts",
                      key: "availablePosts",
                    },
                    {
                      title: "详情失败",
                      dataIndex: "detailUnavailablePosts",
                      key: "detailUnavailablePosts",
                    },
                  ]}
                />
              </Card>

              <Card title="最近帖子样本">
                <div style={{ marginBottom: 12 }}>
                  <Radio.Group
                    value={postFilter}
                    onChange={(e) => setPostFilter(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="all">全部</Radio.Button>
                    <Radio.Button value="new">只看正文可用</Radio.Button>
                    <Radio.Button value="detail_unavailable">只看详情失败</Radio.Button>
                  </Radio.Group>
                </div>
                <Table
                  rowKey="postId"
                  pagination={{ pageSize: 6 }}
                  size="small"
                  dataSource={filteredPosts}
                  rowClassName={(record) =>
                    record.postId === highlightedPostId ? "xhs-post-row-highlight" : ""
                  }
                  columns={[
                    {
                      title: "帖子",
                      key: "title",
                      render: (_, record) => (
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{record.title}</div>
                          <Space size="small" wrap>
                            {renderPostStatus(record.status)}
                            {record.keyword ? <Tag>{record.keyword}</Tag> : null}
                            {record.postId === highlightedPostId ? <Tag color="success">刚刚重试成功</Tag> : null}
                            <Text type="secondary">{record.authorName ?? "未知作者"}</Text>
                            <Text type="secondary">点赞 {record.likeCount}</Text>
                            <Text type="secondary">评论 {record.commentCount}</Text>
                          </Space>
                        </div>
                      ),
                    },
                    {
                      title: "内容预览",
                      dataIndex: "contentPreview",
                      key: "contentPreview",
                      render: (value: string, record) => (
                        <div>
                          <Paragraph style={{ marginBottom: 6 }}>{value}</Paragraph>
                          {record.errorMessage ? (
                            // 列表里统一展示中文错误，而不是把底层技术报错直接甩给用户。
                            <Text type="danger">{formatRetryResultMessage(record.errorMessage, record.errorCategory)}</Text>
                          ) : null}
                          {record.status === "detail_unavailable" ? (
                            <div style={{ marginTop: 8 }}>
                              <Button
                                size="small"
                                loading={retryingPostId === record.postId}
                                onClick={() => handleRetry(record.postId)}
                              >
                                重试抓取
                              </Button>
                            </div>
                          ) : null}
                          {record.sourceUrl ? (
                            <div style={{ marginTop: 6 }}>
                              <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                                查看原帖
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <style jsx global>{`
            .xhs-post-row-highlight td {
              background: #f6ffed !important;
              transition: background 0.3s ease;
            }
          `}</style>
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}
