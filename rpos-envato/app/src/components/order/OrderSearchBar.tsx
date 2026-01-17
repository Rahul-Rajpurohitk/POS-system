/**
 * OrderSearchBar - Advanced search with debounce and recent searches
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import { XStack, YStack, Text, Input } from 'tamagui';
import { Search, X, Clock, Command } from '@tamagui/lucide-icons';

interface OrderSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  recentSearches?: string[];
  onClearRecent?: () => void;
  onSelectRecent?: (query: string) => void;
  debounceMs?: number;
  showShortcut?: boolean;
}

export function OrderSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search orders, customers, items...',
  recentSearches = [],
  onClearRecent,
  onSelectRecent,
  debounceMs = 300,
  showShortcut = true,
}: OrderSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<any>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced change handler
  const handleChange = useCallback((text: string) => {
    setLocalValue(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onChange(text);
    }, debounceMs);
  }, [onChange, debounceMs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    if (recentSearches.length > 0 && !localValue) {
      setShowRecent(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding to allow click on recent item
    setTimeout(() => setShowRecent(false), 200);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleSelectRecent = (query: string) => {
    setLocalValue(query);
    onChange(query);
    setShowRecent(false);
    onSelectRecent?.(query);
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSubmit?.();
  };

  return (
    <YStack position="relative" zIndex={100}>
      <XStack
        backgroundColor={isFocused ? '$background' : '$backgroundHover'}
        borderRadius="$3"
        paddingHorizontal="$4"
        paddingVertical="$2.5"
        alignItems="center"
        borderWidth={isFocused ? 2 : 1}
        borderColor={isFocused ? '#3B82F6' : '$borderColor'}
        gap="$2"
      >
        <Search size={18} color={isFocused ? '#3B82F6' : '$colorSecondary'} />
        <Input
          ref={inputRef}
          flex={1}
          placeholder={placeholder}
          value={localValue}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          borderWidth={0}
          backgroundColor="transparent"
          size="$3"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {localValue ? (
          <XStack
            padding="$1"
            borderRadius="$2"
            backgroundColor="$backgroundHover"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$borderColor' }}
            onPress={handleClear}
          >
            <X size={16} color="$colorSecondary" />
          </XStack>
        ) : showShortcut && Platform.OS === 'web' ? (
          <XStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$1"
            backgroundColor="$backgroundHover"
            alignItems="center"
            gap="$1"
          >
            <Command size={12} color="$colorSecondary" />
            <Text fontSize={11} color="$colorSecondary" fontWeight="500">K</Text>
          </XStack>
        ) : null}
      </XStack>

      {/* Recent searches dropdown */}
      {showRecent && recentSearches.length > 0 && (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          marginTop="$2"
          backgroundColor="$cardBackground"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$borderColor"
          shadowColor="rgba(0,0,0,0.1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={1}
          shadowRadius={8}
          overflow="hidden"
        >
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <Text fontSize={12} fontWeight="600" color="$colorSecondary">Recent Searches</Text>
            {onClearRecent && (
              <Text
                fontSize={11}
                color="#3B82F6"
                cursor="pointer"
                onPress={onClearRecent}
              >
                Clear All
              </Text>
            )}
          </XStack>
          {recentSearches.slice(0, 5).map((query, index) => (
            <XStack
              key={index}
              paddingHorizontal="$3"
              paddingVertical="$2.5"
              alignItems="center"
              gap="$2"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '$backgroundHover' }}
              onPress={() => handleSelectRecent(query)}
            >
              <Clock size={14} color="$colorSecondary" />
              <Text fontSize={13} color="$color" flex={1}>{query}</Text>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}

export default OrderSearchBar;
