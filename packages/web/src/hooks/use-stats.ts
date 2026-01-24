import { useState, useEffect, useCallback } from "react";
import { Stats } from "@/types";
import { apiClient } from "@/lib/utils";

export function useStats(timeRange: "week" | "month" | "all" = "month") {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/stats?range=${timeRange}`);
      setStats(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch stats";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}