import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, Camera, Trash2, Check } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card, ConfirmModal } from '@/components/ui';
import type { ProductScreenProps } from '@/navigation/types';

// Category color palette - softer, muted colors
const CATEGORY_COLORS = [
  '#3B82F6', '#F97316', '#22C55E', '#A855F7', '#EF4444',
  '#06B6D4', '#EC4899', '#84CC16', '#F59E0B', '#6366F1',
];

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  color: z.string().default('#4F46E5'),
});
type Form = z.infer<typeof schema>;

export default function EditCategoryScreen({ navigation, route }: ProductScreenProps<'EditCategory'>) {
  const { id } = route.params;
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // TODO: Fetch actual category data and populate the form
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: 'Beverages', color: '#10B981' },
  });

  const selectedColor = watch('color');

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      console.log('Updating category:', id, data);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Category</Text>
        <Button variant="ghost" size="icon" onPress={() => setDeleteModal(true)}>
          <Trash2 size={20} color="$error" />
        </Button>
        <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
          <Text color="white" fontWeight="600">Save</Text>
        </Button>
      </XStack>
      <ScrollView flex={1} padding="$4">
        <Card>
          <YStack gap="$4">
            <Button variant="secondary" height={100} justifyContent="center" alignItems="center">
              <Camera size={32} color="$colorSecondary" />
              <Text color="$colorSecondary">Change Image</Text>
            </Button>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Category Name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  required
                />
              )}
            />

            {/* Color Picker */}
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="500" color="$color">Category Color</Text>
              <XStack flexWrap="wrap" gap="$2">
                {CATEGORY_COLORS.map((color) => (
                  <YStack
                    key={color}
                    width={44}
                    height={44}
                    borderRadius="$2"
                    backgroundColor={color}
                    borderWidth={selectedColor === color ? 3 : 0}
                    borderColor="$color"
                    cursor="pointer"
                    justifyContent="center"
                    alignItems="center"
                    hoverStyle={{ opacity: 0.9 }}
                    onPress={() => setValue('color', color)}
                  >
                    {selectedColor === color && <Check size={20} color="white" />}
                  </YStack>
                ))}
              </XStack>
            </YStack>

            {/* Color Preview */}
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="500" color="$color">Preview</Text>
              <YStack
                backgroundColor={selectedColor}
                padding="$3"
                borderRadius="$3"
                alignItems="center"
                minHeight={60}
                justifyContent="center"
              >
                <Text color="white" fontWeight="600" fontSize="$4">
                  {watch('name') || 'Category Name'}
                </Text>
              </YStack>
            </YStack>
          </YStack>
        </Card>
      </ScrollView>
      <ConfirmModal
        visible={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={() => {
          setDeleteModal(false);
          navigation.goBack();
        }}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </YStack>
  );
}
