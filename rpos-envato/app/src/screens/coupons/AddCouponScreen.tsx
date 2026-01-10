import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import type { MoreScreenProps } from '@/navigation/types';

const schema = z.object({
  code: z.string().min(2, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['percentage', 'fixed']),
  amount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Invalid amount'),
});
type Form = z.infer<typeof schema>;

export default function AddCouponScreen({ navigation }: MoreScreenProps<'AddCoupon'>) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { code: '', name: '', type: 'percentage', amount: '' },
  });

  const onSubmit = async (data: Form) => { setLoading(true); try { console.log('Creating coupon:', data); navigation.goBack(); } finally { setLoading(false); } };

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Add Coupon</Text>
        <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}><Text color="white" fontWeight="600">Save</Text></Button>
      </XStack>
      <ScrollView flex={1} padding="$4">
        <Card><YStack gap="$4">
          <Controller control={control} name="code" render={({ field: { onChange, value } }) => (<Input label="Coupon Code" placeholder="e.g., SAVE10" autoCapitalize="characters" value={value} onChangeText={onChange} error={errors.code?.message} required />)} />
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (<Input label="Description" placeholder="e.g., 10% Off" value={value} onChangeText={onChange} error={errors.name?.message} required />)} />
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="500">Type</Text>
            <XStack gap="$2">
              <Button flex={1} variant={type === 'percentage' ? 'primary' : 'secondary'} onPress={() => { setType('percentage'); setValue('type', 'percentage'); }}><Text color={type === 'percentage' ? 'white' : '$color'}>Percentage</Text></Button>
              <Button flex={1} variant={type === 'fixed' ? 'primary' : 'secondary'} onPress={() => { setType('fixed'); setValue('type', 'fixed'); }}><Text color={type === 'fixed' ? 'white' : '$color'}>Fixed Amount</Text></Button>
            </XStack>
          </YStack>
          <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (<Input label={type === 'percentage' ? 'Discount (%)' : 'Discount Amount ($)'} placeholder="0" keyboardType="decimal-pad" value={value} onChangeText={onChange} error={errors.amount?.message} required />)} />
        </YStack></Card>
      </ScrollView>
    </YStack>
  );
}
