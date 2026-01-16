import React from 'react';
import { styled, Button as TamaguiButton, Spinner, GetProps } from 'tamagui';

const StyledButton = styled(TamaguiButton, {
  name: 'Button',
  borderRadius: '$3',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  cursor: 'pointer',
  userSelect: 'none',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: 'white',
        hoverStyle: {
          backgroundColor: '$primaryHover',
          transform: [{ scale: 1.01 }],
        },
        pressStyle: {
          opacity: 0.9,
          backgroundColor: '$primaryHover',
          transform: [{ scale: 0.98 }],
        },
      },
      secondary: {
        backgroundColor: '$backgroundStrong',
        borderWidth: 1,
        borderColor: '$borderColor',
        color: '$color',
        hoverStyle: {
          borderColor: '$borderColorHover',
          backgroundColor: '$backgroundHover',
        },
        pressStyle: {
          backgroundColor: '$backgroundPress',
          transform: [{ scale: 0.98 }],
        },
      },
      danger: {
        backgroundColor: '$accent',
        color: 'white',
        hoverStyle: {
          backgroundColor: '$accentHover',
          transform: [{ scale: 1.01 }],
        },
        pressStyle: {
          opacity: 0.9,
          transform: [{ scale: 0.98 }],
        },
      },
      success: {
        backgroundColor: '$success',
        color: 'white',
        hoverStyle: {
          opacity: 0.9,
          transform: [{ scale: 1.01 }],
        },
        pressStyle: {
          opacity: 0.85,
          transform: [{ scale: 0.98 }],
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$color',
        hoverStyle: {
          backgroundColor: '$backgroundHover',
        },
        pressStyle: {
          backgroundColor: '$backgroundPress',
        },
      },
      link: {
        backgroundColor: 'transparent',
        color: '$primary',
        paddingVertical: 0,
        paddingHorizontal: 0,
        hoverStyle: {
          opacity: 0.8,
        },
        pressStyle: {
          opacity: 0.6,
        },
      },
    },
    size: {
      sm: {
        paddingVertical: '$2',
        paddingHorizontal: '$3',
        fontSize: '$3',
        height: 36,
      },
      md: {
        paddingVertical: '$3',
        paddingHorizontal: '$4',
        fontSize: '$4',
        height: 44,
      },
      lg: {
        paddingVertical: '$4',
        paddingHorizontal: '$5',
        fontSize: '$5',
        height: 52,
      },
      icon: {
        padding: '$2',
        width: 40,
        height: 40,
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        pointerEvents: 'none',
        cursor: 'not-allowed',
      },
    },
  } as const,
});

// Explicitly define variant types for proper TypeScript inference
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  // Allow any additional style props from Tamagui
  [key: string]: any;
}

export function Button({
  loading,
  disabled,
  leftIcon,
  rightIcon,
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'secondary' || variant === 'ghost' ? '$color' : 'white';

  return (
    <StyledButton
      variant={variant as any}
      size={size as any}
      disabled={isDisabled}
      {...(props as any)}
    >
      {loading ? (
        <Spinner size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </StyledButton>
  );
}

export default Button;
