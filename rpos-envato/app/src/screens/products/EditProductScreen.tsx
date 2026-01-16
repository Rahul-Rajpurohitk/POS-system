import React, { useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { ArrowLeft, Camera, Package } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card, Select } from '@/components/ui';
import { useProduct, useUpdateProduct } from '@/features/products';
import { useCategories } from '@/features/categories';
import type { ProductScreenProps } from '@/navigation/types';

const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  sellingPrice: z.string().refine(v => !isNaN(parseFloat(v)), 'Invalid price'),
  purchasePrice: z.string().refine(v => !isNaN(parseFloat(v)), 'Invalid price'),
  quantity: z.string().refine(v => !isNaN(parseInt(v)), 'Invalid quantity'),
  categoryId: z.string().optional(),
  desc: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductScreen({ navigation, route }: ProductScreenProps<'EditProduct'>) {
  const { id } = route.params;

  const { data: product, isLoading: productLoading, error } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const { data: categories } = useCategories();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', sku: '', sellingPrice: '', purchasePrice: '', quantity: '0', categoryId: '', desc: '' },
  });

  // Pre-fill form when product data loads
  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        sku: product.sku || '',
        sellingPrice: String(product.sellingPrice || 0),
        purchasePrice: String(product.purchasePrice || 0),
        quantity: String(product.quantity ?? product.stock ?? 0),
        categoryId: product.category?.id || product.categoryId || '',
        desc: product.description || '',
      });
    }
  }, [product, reset]);

  const onSubmit = (data: ProductForm) => {
    updateProduct.mutate(
      {
        id,
        data: {
          name: data.name,
          sku: data.sku,
          sellingPrice: parseFloat(data.sellingPrice),
          purchasePrice: parseFloat(data.purchasePrice),
          stock: parseInt(data.quantity),
          categoryId: data.categoryId || undefined,
          description: data.desc,
        },
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (error) => Alert.alert('Error', error.message || 'Failed to update product'),
      }
    );
  };

  const categoryOptions = [
    { label: 'No Category', value: '' },
    ...(categories?.map(c => ({ label: c.name, value: c.id })) || []),
  ];

  if (productLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$3" color="$colorSecondary">Loading product...</Text>
      </YStack>
    );
  }

  if (error || !product) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Product</Text>
        </XStack>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <Package size={64} color="$colorSecondary" />
          <Text fontSize="$5" fontWeight="600" marginTop="$4">Product Not Found</Text>
          <Text color="$colorSecondary" textAlign="center" marginTop="$2">
            {error?.message || 'Unable to load product details'}
          </Text>
          <Button variant="secondary" marginTop="$4" onPress={() => navigation.goBack()}>
            <Text>Go Back</Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} />
          </Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Product</Text>
          <Button variant="primary" loading={updateProduct.isPending} onPress={handleSubmit(onSubmit)}>
            <Text color="white" fontWeight="600">Save</Text>
          </Button>
        </XStack>

        <ScrollView flex={1} padding="$4">
          <Card>
            <YStack gap="$4">
              <Button variant="secondary" height={120} justifyContent="center" alignItems="center">
                <Camera size={32} color="$colorSecondary" />
                <Text color="$colorSecondary">Change Image</Text>
              </Button>

              <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
                <Input label="Product Name" value={value} onChangeText={onChange} error={errors.name?.message} required />
              )} />

              <Controller control={control} name="sku" render={({ field: { onChange, value } }) => (
                <Input label="SKU" value={value} onChangeText={onChange} error={errors.sku?.message} required />
              )} />

              <Controller control={control} name="categoryId" render={({ field: { onChange, value } }) => (
                <Select
                  label="Category"
                  options={categoryOptions}
                  value={value || ''}
                  onValueChange={onChange}
                  placeholder="Select category"
                />
              )} />

              <XStack gap="$3">
                <Controller control={control} name="sellingPrice" render={({ field: { onChange, value } }) => (
                  <Input flex={1} label="Selling Price" keyboardType="decimal-pad" value={value} onChangeText={onChange} error={errors.sellingPrice?.message} required />
                )} />
                <Controller control={control} name="purchasePrice" render={({ field: { onChange, value } }) => (
                  <Input flex={1} label="Purchase Price" keyboardType="decimal-pad" value={value} onChangeText={onChange} error={errors.purchasePrice?.message} required />
                )} />
              </XStack>

              <Controller control={control} name="quantity" render={({ field: { onChange, value } }) => (
                <Input label="Stock Quantity" keyboardType="number-pad" value={value} onChangeText={onChange} error={errors.quantity?.message} />
              )} />

              <Controller control={control} name="desc" render={({ field: { onChange, value } }) => (
                <Input label="Description" multiline numberOfLines={4} value={value} onChangeText={onChange} />
              )} />
            </YStack>
          </Card>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
