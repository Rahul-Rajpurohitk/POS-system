import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Users, Calendar } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import type { MoreScreenProps } from '@/navigation/types';

function StatCard({ title, value, icon, change }: { title: string; value: string; icon: React.ReactNode; change?: string }) {
  return (
    <Card flex={1} minWidth={140}>
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$1">
          <Text fontSize="$2" color="$colorSecondary">{title}</Text>
          <Text fontSize="$5" fontWeight="bold">{value}</Text>
          {change && <Text fontSize="$1" color="$success">{change}</Text>}
        </YStack>
        <YStack backgroundColor="$primary" padding="$2" borderRadius="$2" opacity={0.9}>{icon}</YStack>
      </XStack>
    </Card>
  );
}

export default function ReportsScreen({ navigation }: MoreScreenProps<'Reports'>) {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const stats = [
    { title: 'Total Sales', value: formatCurrency(12500, settings.currency), icon: <DollarSign size={18} color="white" />, change: '+12.5%' },
    { title: 'Orders', value: '48', icon: <ShoppingCart size={18} color="white" />, change: '+8.2%' },
    { title: 'Avg. Order', value: formatCurrency(260, settings.currency), icon: <TrendingUp size={18} color="white" /> },
    { title: 'Customers', value: '32', icon: <Users size={18} color="white" />, change: '+5.1%' },
  ];

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Reports</Text>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          <XStack gap="$2">
            {(['today', 'week', 'month'] as const).map(p => (
              <Button key={p} flex={1} variant={period === p ? 'primary' : 'secondary'} size="sm" onPress={() => setPeriod(p)}>
                <Text color={period === p ? 'white' : '$color'} textTransform="capitalize">{p}</Text>
              </Button>
            ))}
          </XStack>

          <XStack flexWrap="wrap" gap="$3">
            {stats.map((stat, i) => <StatCard key={i} {...stat} />)}
          </XStack>

          <Card>
            <Text fontSize="$5" fontWeight="600" marginBottom="$3">Top Products</Text>
            {[{ name: 'Coffee', qty: 45, total: 224.55 }, { name: 'Sandwich', qty: 32, total: 287.68 }, { name: 'Salad', qty: 28, total: 363.72 }].map((item, i) => (
              <XStack key={i} justifyContent="space-between" paddingVertical="$2" borderBottomWidth={i < 2 ? 1 : 0} borderBottomColor="$borderColor">
                <YStack><Text fontWeight="500">{item.name}</Text><Text fontSize="$2" color="$colorSecondary">{item.qty} sold</Text></YStack>
                <Text fontWeight="600" color="$accent">{formatCurrency(item.total, settings.currency)}</Text>
              </XStack>
            ))}
          </Card>

          <Card>
            <Text fontSize="$5" fontWeight="600" marginBottom="$3">Recent Orders</Text>
            {[1, 2, 3, 4, 5].map(i => (
              <XStack key={i} justifyContent="space-between" paddingVertical="$2" borderBottomWidth={i < 5 ? 1 : 0} borderBottomColor="$borderColor">
                <YStack><Text fontWeight="500">Order #{1000 + i}</Text><Text fontSize="$2" color="$colorSecondary">2 items</Text></YStack>
                <Text fontWeight="600">{formatCurrency(Math.random() * 50 + 10, settings.currency)}</Text>
              </XStack>
            ))}
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
