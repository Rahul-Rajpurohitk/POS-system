import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, Camera } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { generateLocalId } from '@/utils';
import type { ProductScreenProps } from '@/navigation/types';

const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  sellingPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Invalid price'),
  purchasePrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Invalid price'),
  quantity: z.string().refine(v => !isNaN(parseInt(v)) && parseInt(v) >= 0, 'Invalid quantity'),
  desc: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function AddProductScreen({ navigation }: ProductScreenProps<'AddProduct'>) {
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', sku: '', sellingPrice: '', purchasePrice: '', quantity: '0', desc: '' },
  });

  const onSubmit = async (data: ProductForm) => {
    setLoading(true);
    try {
      // TODO: API call to create product
      const product = {
        id: generateLocalId(),
        name: data.name,
        sku: data.sku,
        sellingPrice: parseFloat(data.sellingPrice),
        purchasePrice: parseFloat(data.purchasePrice),
        quantity: parseInt(data.quantity),
        desc: data.desc,
        images: [],
        createdAt: new Date().toISOString(),
      };
      console.log('Creating product:', product);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create product:', error);
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
          <Text fontSize="$6" fontWeight="bold" flex={1}>Add Product</Text>
          <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
            <Text color="white" fontWeight="600">Save</Text>
          </Button>
        </XStack>

        <ScrollView flex={1} padding="$4">
          <Card>
            <YStack gap="$4">
              <Button variant="secondary" height={120} justifyContent="center" alignItems="center">
                <Camera size={32} color="$colorSecondary" />
                <Text color="$colorSecondary">Add Image</Text>
              </Button>

              <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
                <Input label="Product Name" placeholder="Enter product name" value={value} onChangeText={onChange} error={errors.name?.message} required />
              )} />

              <Controller control={control} name="sku" render={({ field: { onChange, value } }) => (
                <Input label="SKU" placeholder="Enter SKU" value={value} onChangeText={onChange} error={errors.sku?.message} required />
              )} />

              <XStack gap="$3">
                <Controller control={control} name="sellingPrice" render={({ field: { onChange, value } }) => (
                  <Input flex={1} label="Selling Price" placeholder="0.00" keyboardType="decimal-pad" value={value} onChangeText={onChange} error={errors.sellingPrice?.message} required />
                )} />
                <Controller control={control} name="purchasePrice" render={({ field: { onChange, value } }) => (
                  <Input flex={1} label="Purchase Price" placeholder="0.00" keyboardType="decimal-pad" value={value} onChangeText={onChange} error={errors.purchasePrice?.message} required />
                )} />
              </XStack>

              <Controller control={control} name="quantity" render={({ field: { onChange, value } }) => (
                <Input label="Stock Quantity" placeholder="0" keyboardType="number-pad" value={value} onChangeText={onChange} error={errors.quantity?.message} />
              )} />

              <Controller control={control} name="desc" render={({ field: { onChange, value } }) => (
                <Input label="Description" placeholder="Product description (optional)" multiline numberOfLines={4} value={value} onChangeText={onChange} />
              )} />
            </YStack>
          </Card>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
