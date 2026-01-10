import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { ArrowLeft, Search, Plus, Folder, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { useCategories } from '@/features/categories/hooks';
import type { ProductScreenProps } from '@/navigation/types';
import type { Category } from '@/types';

export default function CategoriesScreen({ navigation }: ProductScreenProps<'Categories'>) {
  const [search, setSearch] = useState('');

  const {
    data: categories = [],
    isLoading,
    isRefetching,
    refetch,
    error
  } = useCategories();

  const filtered = useMemo(() => {
    if (!search) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [categories, search]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading categories...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap="$3">
        <Text color="$error">Failed to load categories</Text>
        <Button variant="secondary" onPress={() => refetch()}>
          <RefreshCw size={18} />
          <Text>Retry</Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Categories</Text>
        <Button variant="primary" size="sm" onPress={() => navigation.navigate('AddCategory')}>
          <Plus size={18} color="white" />
          <Text color="white">Add</Text>
        </Button>
      </XStack>

      <YStack padding="$4" gap="$3" flex={1}>
        <XStack backgroundColor="$cardBackground" borderRadius="$2" paddingHorizontal="$3" alignItems="center" borderWidth={1} borderColor="$borderColor">
          <Search size={20} color="$placeholderColor" />
          <Input flex={1} placeholder="Search categories..." value={search} onChangeText={setSearch} borderWidth={0} backgroundColor="transparent" />
        </XStack>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <Card pressable onPress={() => navigation.navigate('EditCategory', { id: item.id })} marginBottom="$2">
              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$backgroundPress" padding="$2" borderRadius="$2">
                  <Folder size={24} color="$primary" />
                </YStack>
                <Text fontSize="$4" fontWeight="500" flex={1}>{item.name}</Text>
              </XStack>
            </Card>
          )}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">
                {search ? 'No categories match your search' : 'No categories found'}
              </Text>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
