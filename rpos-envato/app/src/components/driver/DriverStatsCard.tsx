import React from 'react';
import { styled, XStack, YStack, Text, Card } from 'tamagui';
import { TrendingUp, Star, Clock, Package, DollarSign } from '@tamagui/lucide-icons';
import type { DriverStats } from '@/types';

const StatsContainer = styled(XStack, {
  name: 'StatsContainer',
  flexWrap: 'wrap',
  gap: '$3',
});

const StatCard = styled(Card, {
  name: 'StatCard',
  flex: 1,
  minWidth: 140,
  padding: '$3',
  borderRadius: '$3',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
});

const StatIcon = styled(XStack, {
  name: 'StatIcon',
  width: 36,
  height: 36,
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '$2',
});

const StatValue = styled(Text, {
  name: 'StatValue',
  fontSize: 24,
  fontWeight: 'bold',
});

const StatLabel = styled(Text, {
  name: 'StatLabel',
  fontSize: 12,
  color: '$colorSecondary',
  marginTop: 2,
});

const StatChange = styled(Text, {
  name: 'StatChange',
  fontSize: 11,
  marginTop: '$1',
});

export interface DriverStatsCardProps {
  stats: DriverStats;
  showEarnings?: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  change?: number;
}

function StatItem({ icon, iconBg, value, label, change }: StatItemProps) {
  return (
    <StatCard>
      <StatIcon backgroundColor={iconBg}>{icon}</StatIcon>
      <StatValue>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
      {change !== undefined && (
        <StatChange color={change >= 0 ? '$success' : '$error'}>
          {change >= 0 ? '+' : ''}
          {change}% vs last week
        </StatChange>
      )}
    </StatCard>
  );
}

export function DriverStatsCard({ stats, showEarnings = false }: DriverStatsCardProps) {
  const formatRating = (rating: number): string => {
    return rating.toFixed(1);
  };

  const formatTime = (minutes?: number): string => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatCompletionRate = (rate?: number): string => {
    if (rate === undefined) return 'N/A';
    return `${Math.round(rate * 100)}%`;
  };

  return (
    <YStack gap="$3">
      {/* Today's Stats */}
      <YStack>
        <Text fontSize={14} fontWeight="600" marginBottom="$2">
          Today
        </Text>
        <StatsContainer>
          <StatItem
            icon={<Package size={18} color="$primary" />}
            iconBg="$primaryFaded"
            value={stats.deliveriesToday}
            label="Deliveries"
          />
          {showEarnings && stats.earningsToday !== undefined && (
            <StatItem
              icon={<DollarSign size={18} color="$success" />}
              iconBg="$successBackground"
              value={`$${stats.earningsToday.toFixed(2)}`}
              label="Earnings"
            />
          )}
        </StatsContainer>
      </YStack>

      {/* Overall Stats */}
      <YStack>
        <Text fontSize={14} fontWeight="600" marginBottom="$2">
          Overall
        </Text>
        <StatsContainer>
          <StatItem
            icon={<TrendingUp size={18} color="$info" />}
            iconBg="$infoBackground"
            value={stats.totalDeliveries}
            label="Total Deliveries"
          />
          <StatItem
            icon={<Star size={18} color="#FFB800" />}
            iconBg="#FFB80020"
            value={formatRating(stats.averageRating)}
            label={`Rating (${stats.totalRatings})`}
          />
        </StatsContainer>
      </YStack>

      {/* Performance Stats */}
      {(stats.completionRate !== undefined || stats.averageDeliveryTime !== undefined) && (
        <YStack>
          <Text fontSize={14} fontWeight="600" marginBottom="$2">
            Performance
          </Text>
          <StatsContainer>
            {stats.completionRate !== undefined && (
              <StatItem
                icon={<TrendingUp size={18} color="$success" />}
                iconBg="$successBackground"
                value={formatCompletionRate(stats.completionRate)}
                label="Completion Rate"
              />
            )}
            {stats.averageDeliveryTime !== undefined && (
              <StatItem
                icon={<Clock size={18} color="$warning" />}
                iconBg="$warningBackground"
                value={formatTime(stats.averageDeliveryTime)}
                label="Avg. Delivery Time"
              />
            )}
          </StatsContainer>
        </YStack>
      )}
    </YStack>
  );
}

export default DriverStatsCard;
