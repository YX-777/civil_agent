import { useCallback, useEffect, useState } from "react";
import type { XhsSyncDashboardData } from "@/types";
import { apiClient } from "@/lib/utils";

export function useXhsSyncReport() {
  // 这个 hook 专门服务于小红书同步看板，
  // 把“首次加载 / 刷新 / 错误状态”统一封装起来，避免页面组件里充满重复样板代码。
  const [data, setData] = useState<XhsSyncDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<XhsSyncDashboardData>("/api/xhs-sync/report");
      setData(response.data);
    } catch (err) {
      // 页面层只关心可展示的错误文本，不在这里透出底层 axios 细节。
      const message = err instanceof Error ? err.message : "Failed to fetch xiaohongshu sync report";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchReport,
  };
}
