import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, Camera } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import type { ProductScreenProps } from '@/navigation/types';

const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  sellingPrice: z.string().refine(v => !isNaN(parseFloat(v)), 'Invalid price'),
  purchasePrice: z.string().refine(v => !isNaN(parseFloat(v)), 'Invalid price'),
  quantity: z.string().refine(v => !isNaN(parseInt(v)), 'Invalid quantity'),
  desc: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductScreen({ navigation, route }: ProductScreenProps<'EditProduct'>) {
  const { id } = route.params;
  const [loading, setLoading] = useState(false);

  // Mock existing product data
  const product = { name: 'Coffee', sku: 'COF001', sellingPrice: '4.99', purchasePrice: '2', quantity: '100', desc: 'Premium coffee' };

  const { control, handleSubmit, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: product,
  });

  const onSubmit = async (data: ProductForm) => {
    setLoading(true);
    try {
      // TODO: API call to update product
      console.log('Updating product:', id, data);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} />
          </Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Product</Text>
          <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
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
