/**
 * Agent 系统看板 - 入口
 *
 * 砍掉旧的学习数据统计，改为 Agent 系统运行看板：
 *  - 四阶分层记忆状态
 *  - RAG 检索路径分布
 *  - LangGraph 节点调用统计
 *  - 最近 Agent 事件流水
 *
 * 数据通过 /api/dashboard/agent 实时拉取（CSR）
 */

import AgentDashboardClient from "./AgentDashboardClient";

export default function DashboardPage() {
  return <AgentDashboardClient />;
}
