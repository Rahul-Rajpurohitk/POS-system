import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Users, RefreshCw, AlertCircle } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useReports } from '@/hooks';
import type { MoreScreenProps } from '@/navigation/types';
import type { ReportPeriod } from '@/services/api/reports';

function StatCard({
  title,
  value,
  icon,
  change,
  isLoading,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  isLoading?: boolean;
}) {
  return (
    <Card flex={1} minWidth={140}>
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$1">
          <Text fontSize="$2" color="$colorSecondary">
            {title}
          </Text>
          {isLoading ? (
            <Spinner size="small" />
          ) : (
            <>
              <Text fontSize="$5" fontWeight="bold">
                {value}
              </Text>
              {change && (
                <Text fontSize="$1" color={change.startsWith('-') ? '$error' : '$success'}>
                  {change}
                </Text>
              )}
            </>
          )}
        </YStack>
        <YStack backgroundColor="$primary" padding="$2" borderRadius="$2" opacity={0.9}>
          {icon}
        </YStack>
      </XStack>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <YStack padding="$4" alignItems="center" gap="$2">
      <AlertCircle size={24} color="$colorSecondary" />
      <Text color="$colorSecondary" textAlign="center">
        {message}
      </Text>
    </YStack>
  );
}

export default function ReportsScreen({ navigation }: MoreScreenProps<'Reports'>) {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<ReportPeriod>('today');

  const { summary, topProducts, recentOrders, isLoading, isError, error, refetch } = useReports(period);

  const stats = [
    {
      title: 'Total Sales',
      value: formatCurrency(summary?.totalSales || 0, settings.currency),
      icon: <DollarSign size={18} color="white" />,
    },
    {
      title: 'Orders',
      value: String(summary?.totalOrders || 0),
      icon: <ShoppingCart size={18} color="white" />,
    },
    {
      title: 'Avg. Order',
      value: formatCurrency(summary?.averageOrderValue || 0, settings.currency),
      icon: <TrendingUp size={18} color="white" />,
    },
    {
      title: 'Customers',
      value: String(summary?.totalCustomers || 0),
      icon: <Users size={18} color="white" />,
    },
  ];

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack
        padding="$4"
        alignItems="center"
        gap="$3"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>
          Reports
        </Text>
        <Button variant="ghost" size="icon" onPress={refetch} disabled={isLoading}>
          <RefreshCw size={20} color={isLoading ? '$colorSecondary' : '$primary'} />
        </Button>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          {/* Period Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$2">
              {([
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'all', label: 'All Dates' },
              ] as const).map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setPeriod(p.value)}
                >
                  <Text color={period === p.value ? 'white' : '$color'}>
                    {p.label}
                  </Text>
                </Button>
              ))}
            </XStack>
          </ScrollView>

          {/* Error State */}
          {isError && (
            <Card backgroundColor="$error" opacity={0.9}>
              <XStack alignItems="center" gap="$2">
                <AlertCircle size={20} color="white" />
                <Text color="white" flex={1}>
                  {error?.message || 'Failed to load reports'}
                </Text>
                <Button variant="ghost" size="sm" onPress={refetch}>
                  <Text color="white" fontWeight="600">
                    Retry
                  </Text>
                </Button>
              </XStack>
            </Card>
          )}

          {/* Stats Cards */}
          <XStack flexWrap="wrap" gap="$3">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} isLoading={isLoading} />
            ))}
          </XStack>

          {/* Top Products */}
          <Card>
            <Text fontSize="$5" fontWeight="600" marginBottom="$3">
              Top Products
            </Text>
            {isLoading ? (
              <YStack padding="$4" alignItems="center">
                <Spinner size="small" />
              </YStack>
            ) : topProducts.length === 0 ? (
              <EmptyState message="No product sales data for this period" />
            ) : (
              topProducts.map((item, i) => (
                <XStack
                  key={item.productId || i}
                  justifyContent="space-between"
                  paddingVertical="$2"
                  borderBottomWidth={i < topProducts.length - 1 ? 1 : 0}
                  borderBottomColor="$borderColor"
                >
                  <YStack>
                    <Text fontWeight="500">{item.productName}</Text>
                    <Text fontSize="$2" color="$colorSecondary">
                      {item.quantitySold} sold
                    </Text>
                  </YStack>
                  <Text fontWeight="600" color="$accent">
                    {formatCurrency(item.revenue, settings.currency)}
                  </Text>
                </XStack>
              ))
            )}
          </Card>

          {/* Recent Orders (only shown for 'today' period) */}
          {period === 'today' && (
            <Card>
              <Text fontSize="$5" fontWeight="600" marginBottom="$3">
                Recent Orders
              </Text>
              {isLoading ? (
                <YStack padding="$4" alignItems="center">
                  <Spinner size="small" />
                </YStack>
              ) : recentOrders.length === 0 ? (
                <EmptyState message="No orders yet today" />
              ) : (
                recentOrders.slice(0, 5).map((order, i) => (
                  <XStack
                    key={order.id}
                    justifyContent="space-between"
                    paddingVertical="$2"
                    borderBottomWidth={i < Math.min(recentOrders.length, 5) - 1 ? 1 : 0}
                    borderBottomColor="$borderColor"
                  >
                    <YStack>
                      <Text fontWeight="500">Order #{order.orderNumber}</Text>
                      <Text fontSize="$2" color="$colorSecondary">
                        {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                      </Text>
                    </YStack>
                    <Text fontWeight="600">{formatCurrency(order.total, settings.currency)}</Text>
                  </XStack>
                ))
              )}
            </Card>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
