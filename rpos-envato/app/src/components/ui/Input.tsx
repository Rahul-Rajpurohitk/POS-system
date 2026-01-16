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
  borderRadius: '$3',
  paddingVertical: '$3',
  paddingHorizontal: '$3',
  backgroundColor: '$backgroundStrong',
  color: '$color',
  fontSize: '$4',
  height: 48,
  placeholderTextColor: '$placeholderColor',
  outlineWidth: 0,

  focusStyle: {
    borderColor: '$primary',
    borderWidth: 2,
    outlineWidth: 0,
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
          borderWidth: 2,
        },
      },
    },
    size: {
      sm: {
        height: 36,
        paddingVertical: '$2',
        paddingHorizontal: '$2',
        fontSize: '$3',
        borderRadius: '$2',
      },
      md: {
        height: 46,
        paddingVertical: '$3',
        paddingHorizontal: '$3',
        fontSize: '$4',
        borderRadius: '$3',
      },
      lg: {
        height: 54,
        paddingVertical: '$4',
        paddingHorizontal: '$4',
        fontSize: '$5',
        borderRadius: '$3',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

type StyledInputProps = GetProps<typeof StyledInput>;

// Explicitly define size type for proper TypeScript inference
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<StyledInputProps, 'error' | 'size'> {
  size?: InputSize;
  label?: string;
  error?: string; // String error message (converted to boolean for styled variant)
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
