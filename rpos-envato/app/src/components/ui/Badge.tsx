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
    size: {
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
    size: 'md',
  },
});

const BadgeText = styled(Text, {
  name: 'BadgeText',
  fontWeight: '600',

  variants: {
    variant: {
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
    size: {
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
    size: 'md',
  },
});

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface BadgeProps extends Omit<GetProps<typeof BadgeContainer>, 'variant' | 'size'> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md', ...props }: BadgeProps) {
  return (
    <BadgeContainer variant={variant} size={size} {...props}>
      <BadgeText variant={variant} size={size}>
        {children}
      </BadgeText>
    </BadgeContainer>
  );
}

export default Badge;
