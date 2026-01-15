import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import type { Category } from '@/types';

interface CategoryTileProps {
  category: Category;
  onPress: () => void;
}

export function CategoryTile({ category, onPress }: CategoryTileProps) {
  const stripColor = category.color || '#3B82F6';

  return (
    <XStack
      backgroundColor="$cardBackground"
      borderRadius="$3"
      overflow="hidden"
      minHeight={100}
      cursor="pointer"
      borderWidth={1}
      borderColor="$borderColor"
      hoverStyle={{
        backgroundColor: '$backgroundHover',
        borderColor: stripColor,
      }}
      pressStyle={{
        opacity: 0.9,
        scale: 0.98,
      }}
      onPress={onPress}
    >
      {/* Color strip on left */}
      <YStack
        width={5}
        backgroundColor={stripColor}
      />
      {/* Content */}
      <YStack
        flex={1}
        padding="$3"
        justifyContent="center"
      >
        <Text
          fontSize="$4"
          fontWeight="600"
          color="$color"
          numberOfLines={2}
        >
          {category.name}
        </Text>
      </YStack>
    </XStack>
  );
}
