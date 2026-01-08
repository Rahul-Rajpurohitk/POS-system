import React from 'react';
import { View, Image, TextInput, Platform } from 'react-native';
import { DynamicStyleSheet, useDynamicStyleSheet, useDynamicValue, DynamicValue } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

const dynamicStyles = new DynamicStyleSheet({
  searchContainer: {
    paddingHorizontal: ResponsiveUtils.normalize(18),
    paddingVertical: ResponsiveUtils.normalize(Platform.OS === 'ios' ? 10 : 2),
    flexDirection: 'row',
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    alignItems: 'center',
    borderRadius: 4,
  },
  icSearch: {
    width: ResponsiveUtils.normalize(18),
    height: ResponsiveUtils.normalize(18),
    resizeMode: 'contain',
    marginRight: ResponsiveUtils.normalize(20),
  },
  lbSearch: {
    flex: 1,
    lineHeight: ResponsiveUtils.normalize(18),
    fontSize: ResponsiveUtils.normalize(16),
    paddingVertical: 0,
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
  },
});

const SearchInput = (props) => {
  const styles = useDynamicStyleSheet(dynamicStyles);
  const lightIcSearch = require('@assets/icons/ic_search.png');
  const darkIcSearch = require('@assets/icons/ic_search_white.png');
  const icSearch = new DynamicValue(lightIcSearch, darkIcSearch);
  return (
    <View style={[styles.searchContainer, props.containerStyle]}>
      <Image source={useDynamicValue(icSearch)} style={styles.icSearch} />
      <TextInput
        style={styles.lbSearch}
        placeholderTextColor={useDynamicValue(Colors.placeholderColor.light, Colors.placeholderColor.dark)}
        {...props}
      />
    </View>
  );
}

export default SearchInput;
