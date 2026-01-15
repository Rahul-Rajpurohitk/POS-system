import React from 'react';
import { ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, Pencil, Trash2, Package, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card, ConfirmModal } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useProduct, useDeleteProduct } from '@/features/products/hooks';
import type { ProductScreenProps } from '@/navigation/types';

export default function ProductDetailScreen({ navigation, route }: ProductScreenProps<'ProductDetail'>) {
  const { id } = route.params;
  const { settings } = useSettingsStore();
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);

  const {
    data: product,
    isLoading,
    error,
    refetch
  } = useProduct(id);

  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(id);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading product...</Text>
      </YStack>
    );
  }

  if (error || !product) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} />
          </Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Product Details</Text>
        </XStack>
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
          <Text color="$error">Failed to load product</Text>
          <Button variant="secondary" onPress={() => refetch()}>
            <RefreshCw size={18} />
            <Text>Retry</Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Product Details</Text>
        <Button variant="ghost" size="icon" onPress={() => navigation.navigate('EditProduct', { id })}>
          <Pencil size={20} color="$primary" />
        </Button>
        <Button variant="ghost" size="icon" onPress={() => setDeleteModalVisible(true)}>
          <Trash2 size={20} color="$error" />
        </Button>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          <Card alignItems="center" padding="$6">
            <YStack width={120} height={120} backgroundColor="$backgroundPress" borderRadius="$3" alignItems="center" justifyContent="center">
              <Package size={48} color="$placeholderColor" />
            </YStack>
          </Card>

          <Card>
            <YStack gap="$3">
              <Text fontSize="$6" fontWeight="bold">{product.name}</Text>
              <XStack gap="$4">
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">SKU</Text>
                  <Text fontSize="$4">{product.sku || 'N/A'}</Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Category</Text>
                  <Text fontSize="$4">{product.category?.name || 'None'}</Text>
                </YStack>
              </XStack>
              <XStack gap="$4">
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Selling Price</Text>
                  <Text fontSize="$5" fontWeight="bold" color="$accent">
                    {formatCurrency(product.sellingPrice, settings.currency)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Purchase Price</Text>
                  <Text fontSize="$4">
                    {formatCurrency(product.purchasePrice, settings.currency)}
                  </Text>
                </YStack>
              </XStack>
              <YStack>
                <Text fontSize="$2" color="$colorSecondary">Stock Quantity</Text>
                <Text fontSize="$4">{product.quantity ?? product.stock ?? 0}</Text>
              </YStack>
              {(product.desc || product.description) && (
                <YStack>
                  <Text fontSize="$2" color="$colorSecondary">Description</Text>
                  <Text fontSize="$4">{product.desc || product.description}</Text>
                </YStack>
              )}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      <ConfirmModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </YStack>
  );
}
