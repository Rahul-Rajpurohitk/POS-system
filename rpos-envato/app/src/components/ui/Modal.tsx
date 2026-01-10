import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet } from 'react-native';
import { styled, YStack, XStack, Text, GetProps } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import { Button } from './Button';

const Overlay = styled(YStack, {
  name: 'ModalOverlay',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '$4',
});

const ModalContainer = styled(YStack, {
  name: 'ModalContainer',
  backgroundColor: '$cardBackground',
  borderRadius: '$4',
  maxWidth: 500,
  width: '100%',
  maxHeight: '90%',

  // Shadow
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 16,
  elevation: 8,

  variants: {
    size: {
      sm: {
        maxWidth: 400,
      },
      md: {
        maxWidth: 500,
      },
      lg: {
        maxWidth: 600,
      },
      xl: {
        maxWidth: 800,
      },
      full: {
        maxWidth: '95%',
        maxHeight: '95%',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const ModalHeader = styled(XStack, {
  name: 'ModalHeader',
  padding: '$4',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ModalBody = styled(YStack, {
  name: 'ModalBody',
  padding: '$4',
  flex: 1,
});

const ModalFooter = styled(XStack, {
  name: 'ModalFooter',
  padding: '$4',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
  justifyContent: 'flex-end',
  gap: '$3',
});

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  footer?: React.ReactNode;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  footer,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Overlay>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnBackdrop ? onClose : undefined}
        />

        <ModalContainer size={size}>
          {(title || showCloseButton) && (
            <ModalHeader>
              <Text fontSize="$6" fontWeight="600" color="$color">
                {title}
              </Text>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={onClose}
                >
                  <X size={24} color="$color" />
                </Button>
              )}
            </ModalHeader>
          )}

          <ModalBody>{children}</ModalBody>

          {footer && <ModalFooter>{footer}</ModalFooter>}
        </ModalContainer>
      </Overlay>
    </RNModal>
  );
}

// Confirmation Modal
export interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onPress={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onPress={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <Text fontSize="$4" color="$color">
        {message}
      </Text>
    </Modal>
  );
}

export default Modal;
