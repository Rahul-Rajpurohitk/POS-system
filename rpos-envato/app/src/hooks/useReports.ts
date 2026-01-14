import { useQuery } from '@tanstack/react-query';
import { reportsApi, ReportPeriod, ReportsSummary, TopProduct } from '@/services/api/reports';

interface UseReportsResult {
  summary: ReportsSummary | undefined;
  topProducts: TopProduct[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    itemCount: number;
    createdAt: string;
  }>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useReports(period: ReportPeriod): UseReportsResult {
  // Fetch sales summary
  const summaryQuery = useQuery({
    queryKey: ['reports', 'summary', period],
    queryFn: () => reportsApi.getSalesSummary(period),
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  // Fetch top products
  const topProductsQuery = useQuery({
    queryKey: ['reports', 'topProducts', period],
    queryFn: () => reportsApi.getTopProducts(period, 5),
    staleTime: 60 * 1000,
    retry: 2,
  });

  // Fetch daily report for recent orders (only for today)
  const dailyReportQuery = useQuery({
    queryKey: ['reports', 'daily'],
    queryFn: () => reportsApi.getDailyReport(),
    staleTime: 60 * 1000,
    retry: 2,
    enabled: period === 'today', // Only fetch for today
  });

  const isLoading =
    summaryQuery.isLoading ||
    topProductsQuery.isLoading ||
    (period === 'today' && dailyReportQuery.isLoading);

  const isError =
    summaryQuery.isError || topProductsQuery.isError || dailyReportQuery.isError;

  const error =
    summaryQuery.error || topProductsQuery.error || dailyReportQuery.error;

  const refetch = () => {
    summaryQuery.refetch();
    topProductsQuery.refetch();
    if (period === 'today') {
      dailyReportQuery.refetch();
    }
  };

  return {
    summary: summaryQuery.data,
    topProducts: topProductsQuery.data || [],
    recentOrders: dailyReportQuery.data?.recentOrders || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

export default useReports;
