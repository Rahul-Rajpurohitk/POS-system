import React, { forwardRef, useState } from 'react';
import {
  styled,
  Input as TamaguiInput,
  YStack,
  XStack,
  Text,
  GetProps,
} from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { Pressable } from 'react-native';

const StyledInput = styled(TamaguiInput, {
  name: 'Input',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$3',
  backgroundColor: '$backgroundStrong',
  color: '$color',
  fontSize: '$4',
  height: 48,
  placeholderTextColor: '$placeholderColor',

  focusStyle: {
    borderColor: '$primary',
    borderWidth: 2,
  },

  hoverStyle: {
    borderColor: '$borderColorHover',
  },

  variants: {
    error: {
      true: {
        borderColor: '$error',
        focusStyle: {
          borderColor: '$error',
        },
      },
    },
    size: {
      sm: {
        height: 36,
        paddingVertical: '$2',
        paddingHorizontal: '$2',
        fontSize: '$3',
      },
      md: {
        height: 44,
        paddingVertical: '$3',
        paddingHorizontal: '$3',
        fontSize: '$4',
      },
      lg: {
        height: 52,
        paddingVertical: '$4',
        paddingHorizontal: '$4',
        fontSize: '$5',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

type StyledInputProps = GetProps<typeof StyledInput>;

export interface InputProps extends StyledInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

export const Input = forwardRef<typeof TamaguiInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      required,
      ...props
    },
    ref
  ) => {
    return (
      <YStack gap="$1.5" width="100%">
        {label && (
          <XStack gap="$1">
            <Text fontSize="$3" color="$color" fontWeight="500">
              {label}
            </Text>
            {required && (
              <Text color="$error" fontSize="$3">
                *
              </Text>
            )}
          </XStack>
        )}

        <XStack alignItems="center" position="relative">
          {leftIcon && (
            <YStack
              position="absolute"
              left="$3"
              zIndex={1}
              pointerEvents="none"
            >
              {leftIcon}
            </YStack>
          )}

          <StyledInput
            ref={ref as any}
            error={!!error}
            paddingLeft={leftIcon ? '$10' : '$3'}
            paddingRight={rightIcon ? '$10' : '$3'}
            flex={1}
            {...props}
          />

          {rightIcon && (
            <YStack position="absolute" right="$3" zIndex={1}>
              {rightIcon}
            </YStack>
          )}
        </XStack>

        {(error || helperText) && (
          <Text
            fontSize="$2"
            color={error ? '$error' : '$colorSecondary'}
            marginTop="$1"
          >
            {error || helperText}
          </Text>
        )}
      </YStack>
    );
  }
);

Input.displayName = 'Input';

// Secure/Password Input
export interface SecureInputProps extends Omit<InputProps, 'secureTextEntry'> {}

export const SecureInput = forwardRef<typeof TamaguiInput, SecureInputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input
        ref={ref}
        secureTextEntry={!showPassword}
        rightIcon={
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={20} color="$placeholderColor" />
            ) : (
              <Eye size={20} color="$placeholderColor" />
            )}
          </Pressable>
        }
        {...props}
      />
    );
  }
);

SecureInput.displayName = 'SecureInput';

export default Input;
