import React from 'react';
import { styled, Text, XStack, GetProps } from 'tamagui';

const BadgeContainer = styled(XStack, {
  name: 'Badge',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primaryBackground',
      },
      success: {
        backgroundColor: '$successBackground',
      },
      warning: {
        backgroundColor: '$warningBackground',
      },
      error: {
        backgroundColor: '$errorBackground',
      },
      info: {
        backgroundColor: '$infoBackground',
      },
      default: {
        backgroundColor: '$backgroundPress',
      },
    },
    badgeSize: {
      sm: {
        paddingHorizontal: '$1',
        paddingVertical: 2,
      },
      md: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    badgeSize: 'md',
  },
});

const BadgeText = styled(Text, {
  name: 'BadgeText',
  fontWeight: '600',

  variants: {
    variant: {
      primary: {
        color: '$primary',
      },
      success: {
        color: '$success',
      },
      warning: {
        color: '$warning',
      },
      error: {
        color: '$error',
      },
      info: {
        color: '$info',
      },
      default: {
        color: '$colorSecondary',
      },
    },
    badgeSize: {
      sm: {
        fontSize: 10,
      },
      md: {
        fontSize: 12,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    badgeSize: 'md',
  },
});

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';

export interface BadgeProps extends Omit<GetProps<typeof BadgeContainer>, 'variant' | 'size'> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md', ...props }: BadgeProps) {
  return (
    <BadgeContainer variant={variant} badgeSize={size} {...props}>
      <BadgeText variant={variant} badgeSize={size}>
        {children}
      </BadgeText>
    </BadgeContainer>
  );
}

export default Badge;
