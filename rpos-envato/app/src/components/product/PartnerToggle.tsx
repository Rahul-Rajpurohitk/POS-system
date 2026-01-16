import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Check, Store } from '@tamagui/lucide-icons';
import type { PartnerAvailability } from '@/types';

/**
 * Professional Partner Toggle Component
 *
 * Design Philosophy:
 * - Consistent blue primary when active (not harsh brand colors)
 * - Subtle, professional inactive states
 * - Clean typography and spacing
 * - Scalable for future partner additions
 */

// Professional color palette - consistent and clean
const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  inactive: {
    bg: '#F9FAFB',
    border: '#E5E7EB',
    text: '#6B7280',
  },
  active: {
    bg: '#3B82F6',
    border: '#2563EB',
    text: '#FFFFFF',
  },
};

// Partner metadata - icons and display names
const PARTNER_META: Record<string, { name: string; icon: string }> = {
  doordash: { name: 'DoorDash', icon: '🚗' },
  ubereats: { name: 'Uber Eats', icon: '🍔' },
  grubhub: { name: 'Grubhub', icon: '🍕' },
  postmates: { name: 'Postmates', icon: '📦' },
  instacart: { name: 'Instacart', icon: '🛒' },
};

const DEFAULT_PARTNERS = ['doordash', 'ubereats', 'grubhub', 'postmates', 'instacart'];

interface PartnerToggleProps {
  value: PartnerAvailability;
  onChange: (value: PartnerAvailability) => void;
  partners?: string[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'grid';
}

export function PartnerToggle({
  value,
  onChange,
  partners = DEFAULT_PARTNERS,
  disabled = false,
  size = 'md',
  layout = 'horizontal',
}: PartnerToggleProps) {
  const handleToggle = (partnerKey: string) => {
    if (disabled) return;
    const currentValue = value[partnerKey] ?? false;
    onChange({
      ...value,
      [partnerKey]: !currentValue,
    });
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { px: 10, py: 6, fontSize: 11, iconSize: 14, gap: 4 };
      case 'lg':
        return { px: 16, py: 10, fontSize: 14, iconSize: 18, gap: 8 };
      default:
        return { px: 12, py: 8, fontSize: 13, iconSize: 16, gap: 6 };
    }
  };

  const styles = getSizeStyles();
  const activeCount = Object.values(value).filter(Boolean).length;

  return (
    <YStack gap="$3">
      {/* Header with count */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <Store size={16} color={COLORS.primary} />
          <Text fontSize={12} color="#6B7280" fontWeight="500">
            Available on {activeCount} platform{activeCount !== 1 ? 's' : ''}
          </Text>
        </XStack>
        {activeCount > 0 && (
          <XStack
            backgroundColor={COLORS.primaryLight}
            paddingHorizontal="$2"
            paddingVertical={2}
            borderRadius={4}
          >
            <Text fontSize={11} color={COLORS.primary} fontWeight="600">
              {activeCount} active
            </Text>
          </XStack>
        )}
      </XStack>

      {/* Partner chips */}
      <XStack
        flexWrap="wrap"
        gap="$2"
        {...(layout === 'grid' ? { justifyContent: 'flex-start' } : {})}
      >
        {partners.map((partnerKey) => {
          const isActive = value[partnerKey] ?? false;
          const meta = PARTNER_META[partnerKey] || { name: partnerKey, icon: '📦' };

          return (
            <XStack
              key={partnerKey}
              paddingHorizontal={styles.px}
              paddingVertical={styles.py}
              borderRadius={8}
              backgroundColor={isActive ? COLORS.active.bg : COLORS.inactive.bg}
              borderWidth={1.5}
              borderColor={isActive ? COLORS.active.border : COLORS.inactive.border}
              alignItems="center"
              gap={styles.gap}
              cursor={disabled ? 'not-allowed' : 'pointer'}
              opacity={disabled ? 0.5 : 1}
              hoverStyle={!disabled ? {
                backgroundColor: isActive ? '#2563EB' : '#F3F4F6',
                borderColor: isActive ? '#1D4ED8' : '#D1D5DB',
              } : {}}
              pressStyle={!disabled ? {
                transform: [{ scale: 0.98 }],
                opacity: 0.9,
              } : {}}
              onPress={() => handleToggle(partnerKey)}
            >
              {/* Icon/Emoji */}
              <Text fontSize={styles.iconSize}>{meta.icon}</Text>

              {/* Partner name */}
              <Text
                fontSize={styles.fontSize}
                fontWeight="600"
                color={isActive ? COLORS.active.text : COLORS.inactive.text}
              >
                {meta.name}
              </Text>

              {/* Check indicator */}
              {isActive && (
                <YStack
                  width={18}
                  height={18}
                  borderRadius={9}
                  backgroundColor="rgba(255,255,255,0.25)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Check size={12} color="white" strokeWidth={3} />
                </YStack>
              )}
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
}

/**
 * Compact partner status display (read-only)
 */
interface PartnerStatusProps {
  availability: PartnerAvailability;
  showInactive?: boolean;
}

export function PartnerStatus({ availability, showInactive = false }: PartnerStatusProps) {
  const activePartners = DEFAULT_PARTNERS.filter(p => availability[p]);
  const inactivePartners = DEFAULT_PARTNERS.filter(p => !availability[p]);

  if (activePartners.length === 0) {
    return (
      <XStack
        backgroundColor="#FEF2F2"
        paddingHorizontal="$2"
        paddingVertical={4}
        borderRadius={6}
        alignItems="center"
        gap="$1"
      >
        <Text fontSize={11} color="#991B1B">Not listed on any platform</Text>
      </XStack>
    );
  }

  return (
    <XStack flexWrap="wrap" gap="$1">
      {activePartners.map((partnerKey) => {
        const meta = PARTNER_META[partnerKey];
        return (
          <XStack
            key={partnerKey}
            backgroundColor={COLORS.primaryLight}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={6}
            alignItems="center"
            gap={4}
          >
            <Text fontSize={12}>{meta.icon}</Text>
            <Text fontSize={11} color={COLORS.primary} fontWeight="500">
              {meta.name}
            </Text>
          </XStack>
        );
      })}
      {showInactive && inactivePartners.length > 0 && (
        <XStack
          backgroundColor="#F3F4F6"
          paddingHorizontal={8}
          paddingVertical={4}
          borderRadius={6}
        >
          <Text fontSize={11} color="#9CA3AF">
            +{inactivePartners.length} more
          </Text>
        </XStack>
      )}
    </XStack>
  );
}

export default PartnerToggle;
