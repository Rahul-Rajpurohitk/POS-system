import React from 'react';
import { styled, XStack, Text } from 'tamagui';
import {
  Clock,
  ChefHat,
  UserCheck,
  Store,
  Package,
  Truck,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from '@tamagui/lucide-icons';
import type { DeliveryStatus } from '@/types';
import { DELIVERY_STATUS_TEXT, DELIVERY_STATUS_COLORS } from '@/types';

const BadgeContainer = styled(XStack, {
  name: 'DeliveryStatusBadge',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  alignItems: 'center',
  gap: '$1',
});

const BadgeText = styled(Text, {
  name: 'BadgeText',
  fontSize: 12,
  fontWeight: '600',
});

export interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_ICONS: Record<DeliveryStatus, React.ComponentType<any>> = {
  pending: Clock,
  accepted: ChefHat,
  assigned: UserCheck,
  picking_up: Store,
  picked_up: Package,
  on_the_way: Truck,
  nearby: MapPin,
  delivered: CheckCircle,
  cancelled: XCircle,
  failed: AlertTriangle,
};

const STATUS_BG_COLORS: Record<DeliveryStatus, string> = {
  pending: '#FFA50020',
  accepted: '#4169E120',
  assigned: '#9370DB20',
  picking_up: '#20B2AA20',
  picked_up: '#32CD3220',
  on_the_way: '#1E90FF20',
  nearby: '#00CED120',
  delivered: '#228B2220',
  cancelled: '#DC143C20',
  failed: '#8B000020',
};

export function DeliveryStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: DeliveryStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const color = DELIVERY_STATUS_COLORS[status];
  const bgColor = STATUS_BG_COLORS[status];
  const text = DELIVERY_STATUS_TEXT[status];

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const padding = size === 'sm' ? '$1' : size === 'lg' ? '$3' : '$2';

  return (
    <BadgeContainer backgroundColor={bgColor} paddingHorizontal={padding}>
      {showIcon && <Icon size={iconSize} color={color} />}
      <BadgeText fontSize={fontSize} color={color}>
        {text}
      </BadgeText>
    </BadgeContainer>
  );
}

export default DeliveryStatusBadge;
