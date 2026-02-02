/**
 * DownloadPdfButton - A reusable button component for downloading PDF documents
 *
 * Features:
 * - Supports receipt and invoice downloads
 * - Loading state with spinner
 * - Error handling with toast
 * - Multiple size and variant options
 * - Cross-platform support (web and native)
 */

import React, { useCallback } from 'react';
import { Button, Spinner, XStack, Text, styled } from 'tamagui';
import { Download, FileText, Receipt } from '@tamagui/lucide-icons';
import { usePdfDownload, PdfType } from '@/hooks';

interface DownloadPdfButtonProps {
  /**
   * Order ID for which to download the PDF
   */
  orderId: string;

  /**
   * Type of PDF to download
   */
  type: PdfType;

  /**
   * Button variant style
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outlined';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show the label text
   */
  showLabel?: boolean;

  /**
   * Whether to show icon
   */
  showIcon?: boolean;

  /**
   * Custom label text (overrides default)
   */
  label?: string;

  /**
   * Callback when download completes successfully
   */
  onSuccess?: (filePath?: string) => void;

  /**
   * Callback when download fails
   */
  onError?: (error: string) => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}

// Size configuration
const SIZE_CONFIG = {
  sm: {
    height: 28,
    fontSize: 12,
    iconSize: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  md: {
    height: 36,
    fontSize: 14,
    iconSize: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  lg: {
    height: 44,
    fontSize: 16,
    iconSize: 18,
    paddingHorizontal: 20,
    gap: 8,
  },
};

// Variant configuration
const VARIANT_CONFIG = {
  primary: {
    backgroundColor: '$blue10',
    borderColor: '$blue10',
    color: 'white',
    hoverBackgroundColor: '$blue11',
  },
  secondary: {
    backgroundColor: '$gray4',
    borderColor: '$gray6',
    color: '$gray12',
    hoverBackgroundColor: '$gray5',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: '$gray11',
    hoverBackgroundColor: '$gray3',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: '$gray8',
    color: '$gray11',
    hoverBackgroundColor: '$gray2',
  },
};

export function DownloadPdfButton({
  orderId,
  type,
  variant = 'secondary',
  size = 'md',
  showLabel = true,
  showIcon = true,
  label,
  onSuccess,
  onError,
  disabled = false,
}: DownloadPdfButtonProps) {
  const { downloading, downloadPdf, isSupported } = usePdfDownload();

  const sizeConfig = SIZE_CONFIG[size];
  const variantConfig = VARIANT_CONFIG[variant];

  // Default labels based on type
  const defaultLabel = type === 'receipt' ? 'Receipt' : 'Invoice';
  const displayLabel = label || defaultLabel;

  // Icon based on type
  const Icon = type === 'receipt' ? Receipt : FileText;

  const handlePress = useCallback(async () => {
    if (downloading || disabled || !isSupported) return;

    const result = await downloadPdf(type, orderId);

    if (result.success) {
      onSuccess?.(result.filePath);
    } else {
      onError?.(result.error || 'Download failed');
    }
  }, [downloading, disabled, isSupported, downloadPdf, type, orderId, onSuccess, onError]);

  // Button content based on download state
  const renderContent = () => {
    if (downloading) {
      return (
        <XStack alignItems="center" gap={sizeConfig.gap}>
          <Spinner size="small" color={variantConfig.color} />
          {showLabel && (
            <Text
              fontSize={sizeConfig.fontSize}
              color={variantConfig.color}
            >
              Downloading...
            </Text>
          )}
        </XStack>
      );
    }

    return (
      <XStack alignItems="center" gap={sizeConfig.gap}>
        {showIcon && (
          <Icon size={sizeConfig.iconSize} color={variantConfig.color} />
        )}
        {showLabel && (
          <Text
            fontSize={sizeConfig.fontSize}
            color={variantConfig.color}
            fontWeight="500"
          >
            {displayLabel}
          </Text>
        )}
      </XStack>
    );
  };

  if (!isSupported) {
    return null; // Don't render if PDF download is not supported
  }

  return (
    <Button
      onPress={handlePress}
      disabled={downloading || disabled}
      height={sizeConfig.height}
      paddingHorizontal={sizeConfig.paddingHorizontal}
      backgroundColor={variantConfig.backgroundColor}
      borderColor={variantConfig.borderColor}
      borderWidth={1}
      borderRadius="$2"
      opacity={disabled ? 0.5 : 1}
      pressStyle={{
        backgroundColor: variantConfig.hoverBackgroundColor,
        scale: 0.98,
      }}
      hoverStyle={{
        backgroundColor: variantConfig.hoverBackgroundColor,
      }}
    >
      {renderContent()}
    </Button>
  );
}

/**
 * Convenience component for downloading receipts
 */
export function DownloadReceiptButton(
  props: Omit<DownloadPdfButtonProps, 'type'>
) {
  return <DownloadPdfButton {...props} type="receipt" />;
}

/**
 * Convenience component for downloading invoices
 */
export function DownloadInvoiceButton(
  props: Omit<DownloadPdfButtonProps, 'type'>
) {
  return <DownloadPdfButton {...props} type="invoice" />;
}

/**
 * Combined button group for both receipt and invoice downloads
 */
interface DownloadPdfButtonGroupProps {
  orderId: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  onSuccess?: (type: PdfType, filePath?: string) => void;
  onError?: (type: PdfType, error: string) => void;
}

export function DownloadPdfButtonGroup({
  orderId,
  variant = 'secondary',
  size = 'sm',
  showLabels = true,
  onSuccess,
  onError,
}: DownloadPdfButtonGroupProps) {
  return (
    <XStack gap="$2">
      <DownloadPdfButton
        orderId={orderId}
        type="receipt"
        variant={variant}
        size={size}
        showLabel={showLabels}
        onSuccess={(path) => onSuccess?.('receipt', path)}
        onError={(error) => onError?.('receipt', error)}
      />
      <DownloadPdfButton
        orderId={orderId}
        type="invoice"
        variant={variant}
        size={size}
        showLabel={showLabels}
        onSuccess={(path) => onSuccess?.('invoice', path)}
        onError={(error) => onError?.('invoice', error)}
      />
    </XStack>
  );
}

export default DownloadPdfButton;
