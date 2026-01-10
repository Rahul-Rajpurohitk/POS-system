import React from 'react';
import { styled, Button as TamaguiButton, Spinner, GetProps } from 'tamagui';

const StyledButton = styled(TamaguiButton, {
  name: 'Button',
  borderRadius: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: 'white',
        pressStyle: {
          opacity: 0.85,
          backgroundColor: '$primaryHover',
        },
      },
      secondary: {
        backgroundColor: '$backgroundStrong',
        borderWidth: 1,
        borderColor: '$borderColor',
        color: '$color',
        pressStyle: {
          backgroundColor: '$backgroundPress',
        },
      },
      danger: {
        backgroundColor: '$accent',
        color: 'white',
        pressStyle: {
          opacity: 0.85,
        },
      },
      success: {
        backgroundColor: '$success',
        color: 'white',
        pressStyle: {
          opacity: 0.85,
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$color',
        pressStyle: {
          backgroundColor: '$backgroundPress',
        },
      },
      link: {
        backgroundColor: 'transparent',
        color: '$primary',
        paddingVertical: 0,
        paddingHorizontal: 0,
        pressStyle: {
          opacity: 0.7,
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
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type StyledButtonProps = GetProps<typeof StyledButton>;

export interface ButtonProps extends Omit<StyledButtonProps, 'disabled'> {
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  loading,
  disabled,
  leftIcon,
  rightIcon,
  children,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'secondary' || variant === 'ghost' ? '$color' : 'white';

  return (
    <StyledButton
      variant={variant}
      disabled={isDisabled}
      {...props}
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
