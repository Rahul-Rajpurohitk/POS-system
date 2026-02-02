import React, { Component, ReactNode } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { AlertTriangle, RefreshCw, Home } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary specifically for delivery-related components.
 * Catches rendering errors and displays a user-friendly fallback UI.
 */
export class DeliveryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging/monitoring
    console.error('Delivery component error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage, onGoHome } = this.props;

      return (
        <Card padding="$4" margin="$2">
          <YStack alignItems="center" gap="$3">
            <YStack
              backgroundColor="$errorBackground"
              padding="$3"
              borderRadius="$4"
            >
              <AlertTriangle size={32} color="$error" />
            </YStack>

            <Text fontSize={18} fontWeight="bold" textAlign="center">
              {fallbackTitle || 'Something went wrong'}
            </Text>

            <Text
              fontSize={14}
              color="$colorSecondary"
              textAlign="center"
              paddingHorizontal="$4"
            >
              {fallbackMessage ||
                'There was an error loading the delivery information. Please try again.'}
            </Text>

            {__DEV__ && this.state.error && (
              <YStack
                backgroundColor="$backgroundPress"
                padding="$2"
                borderRadius="$2"
                width="100%"
              >
                <Text fontSize={11} color="$error">
                  {this.state.error.message}
                </Text>
              </YStack>
            )}

            <XStack gap="$3" marginTop="$2">
              <Button
                variant="primary"
                onPress={this.handleRetry}
                icon={<RefreshCw size={16} color="white" />}
              >
                <Text color="white">Try Again</Text>
              </Button>

              {onGoHome && (
                <Button
                  variant="secondary"
                  onPress={onGoHome}
                  icon={<Home size={16} />}
                >
                  <Text>Go Home</Text>
                </Button>
              )}
            </XStack>
          </YStack>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for delivery panels with error boundary
 */
export function withDeliveryErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallbackTitle?: string;
    fallbackMessage?: string;
  }
) {
  return function WithErrorBoundary(props: P) {
    return (
      <DeliveryErrorBoundary
        fallbackTitle={options?.fallbackTitle}
        fallbackMessage={options?.fallbackMessage}
      >
        <WrappedComponent {...props} />
      </DeliveryErrorBoundary>
    );
  };
}

export default DeliveryErrorBoundary;
