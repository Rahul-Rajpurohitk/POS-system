import React, { useState, useRef } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { X, Plus, Tag } from '@tamagui/lucide-icons';

const COLORS = {
  primary: '#3B82F6',
  tagBg: '#EFF6FF',
  tagBorder: '#BFDBFE',
  tagText: '#1E40AF',
};

// Common product tags for suggestions
const COMMON_TAGS = [
  'bestseller',
  'new',
  'sale',
  'featured',
  'organic',
  'vegan',
  'gluten-free',
  'popular',
  'limited',
  'seasonal',
  'premium',
  'eco-friendly',
];

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add tag and press Enter...',
  suggestions = COMMON_TAGS,
  maxTags = 10,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;
    if (value.includes(trimmedTag)) return;
    if (value.length >= maxTags) return;

    onChange([...value, trimmedTag]);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s.toLowerCase())
  );

  return (
    <YStack gap="$2" position="relative">
      {/* Tag chips */}
      {value.length > 0 && (
        <XStack flexWrap="wrap" gap="$1">
          {value.map((tag) => (
            <XStack
              key={tag}
              backgroundColor={COLORS.tagBg}
              borderWidth={1}
              borderColor={COLORS.tagBorder}
              borderRadius="$2"
              paddingHorizontal="$2"
              paddingVertical={4}
              alignItems="center"
              gap="$1"
            >
              <Tag size={12} color={COLORS.tagText} />
              <Text fontSize={12} color={COLORS.tagText} fontWeight="500">
                {tag}
              </Text>
              {!disabled && (
                <YStack
                  marginLeft="$1"
                  padding={2}
                  borderRadius="$1"
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '$backgroundPress' }}
                  onPress={() => handleRemoveTag(tag)}
                >
                  <X size={12} color={COLORS.tagText} />
                </YStack>
              )}
            </XStack>
          ))}
        </XStack>
      )}

      {/* Input */}
      {!disabled && value.length < maxTags && (
        <XStack
          backgroundColor="$background"
          borderRadius="$2"
          borderWidth={1}
          borderColor="$borderColor"
          paddingHorizontal="$3"
          paddingVertical="$2"
          alignItems="center"
          gap="$2"
        >
          <Plus size={16} color="$colorSecondary" />
          <Input
            ref={inputRef}
            flex={1}
            value={inputValue}
            onChangeText={setInputValue}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            borderWidth={0}
            backgroundColor="transparent"
            size="$3"
            paddingHorizontal={0}
          />
          {inputValue && (
            <YStack
              backgroundColor={COLORS.primary}
              borderRadius="$1"
              paddingHorizontal="$2"
              paddingVertical={2}
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
              onPress={() => handleAddTag(inputValue)}
            >
              <Text fontSize={11} color="white" fontWeight="500">
                Add
              </Text>
            </YStack>
          )}
        </XStack>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          marginTop="$1"
          backgroundColor="$cardBackground"
          borderRadius="$2"
          borderWidth={1}
          borderColor="$borderColor"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.15}
          shadowRadius={12}
          elevation={8}
          zIndex={100}
          maxHeight={200}
          overflow="hidden"
        >
          {filteredSuggestions.slice(0, 6).map((suggestion) => (
            <XStack
              key={suggestion}
              paddingHorizontal="$3"
              paddingVertical="$2"
              alignItems="center"
              gap="$2"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '$backgroundHover' }}
              onPress={() => handleAddTag(suggestion)}
            >
              <Tag size={14} color="$colorSecondary" />
              <Text fontSize={13} color="$color">
                {suggestion}
              </Text>
            </XStack>
          ))}
        </YStack>
      )}

      {/* Helper text */}
      <Text fontSize={11} color="$colorSecondary">
        {value.length}/{maxTags} tags {value.length >= maxTags && '(max reached)'}
      </Text>
    </YStack>
  );
}

export default TagInput;
