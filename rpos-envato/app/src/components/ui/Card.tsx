import React from 'react';
import { styled, YStack, XStack, Text, GetProps } from 'tamagui';

const StyledCard = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBackground',
  borderRadius: '$3',
  padding: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',

  // Shadow for elevation
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 4,
  elevation: 2,

  variants: {
    variant: {
      default: {},
      elevated: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4,
      },
      outlined: {
        shadowOpacity: 0,
        elevation: 0,
        borderWidth: 1,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
        padding: 0,
      },
    },
    pressable: {
      true: {
        cursor: 'pointer',
        pressStyle: {
          scale: 0.98,
          opacity: 0.9,
        },
        hoverStyle: {
          borderColor: '$borderColorHover',
        },
      },
    },
    size: {
      sm: {
        padding: '$3',
        borderRadius: '$2',
      },
      md: {
        padding: '$4',
        borderRadius: '$3',
      },
      lg: {
        padding: '$5',
        borderRadius: '$4',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type StyledCardProps = GetProps<typeof StyledCard>;

export interface CardProps extends StyledCardProps {
  children: React.ReactNode;
}

export function Card({ children, ...props }: CardProps) {
  return <StyledCard {...props}>{children}</StyledCard>;
}

// Card Header
const StyledCardHeader = styled(XStack, {
  name: 'CardHeader',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '$3',
  paddingBottom: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',
});

export interface CardHeaderProps extends GetProps<typeof StyledCardHeader> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  ...props
}: CardHeaderProps) {
  return (
    <StyledCardHeader {...props}>
      <YStack>
        <Text fontSize="$5" fontWeight="600" color="$color">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="$3" color="$colorSecondary" marginTop="$1">
            {subtitle}
          </Text>
        )}
      </YStack>
      {action}
    </StyledCardHeader>
  );
}

// Card Body
export const CardBody = styled(YStack, {
  name: 'CardBody',
  gap: '$3',
});

// Card Footer
export const CardFooter = styled(XStack, {
  name: 'CardFooter',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '$3',
  marginTop: '$4',
  paddingTop: '$3',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
});

export default Card;
