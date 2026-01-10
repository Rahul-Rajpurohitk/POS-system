import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, Camera, Trash2 } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card, ConfirmModal } from '@/components/ui';
import type { ProductScreenProps } from '@/navigation/types';

const schema = z.object({ name: z.string().min(2, 'Name is required') });
type Form = z.infer<typeof schema>;

export default function EditCategoryScreen({ navigation, route }: ProductScreenProps<'EditCategory'>) {
  const { id } = route.params;
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { name: 'Beverages' },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try { console.log('Updating category:', id, data); navigation.goBack(); }
    finally { setLoading(false); }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Category</Text>
        <Button variant="ghost" size="icon" onPress={() => setDeleteModal(true)}><Trash2 size={20} color="$error" /></Button>
        <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}><Text color="white" fontWeight="600">Save</Text></Button>
      </XStack>
      <ScrollView flex={1} padding="$4">
        <Card>
          <YStack gap="$4">
            <Button variant="secondary" height={100} justifyContent="center" alignItems="center">
              <Camera size={32} color="$colorSecondary" /><Text color="$colorSecondary">Change Image</Text>
            </Button>
            <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
              <Input label="Category Name" value={value} onChangeText={onChange} error={errors.name?.message} required />
            )} />
          </YStack>
        </Card>
      </ScrollView>
      <ConfirmModal visible={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={() => { setDeleteModal(false); navigation.goBack(); }}
        title="Delete Category" message="Are you sure?" confirmText="Delete" confirmVariant="danger" />
    </YStack>
  );
}
