import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import { get } from 'lodash';

import { ResponsiveUtils, Colors, Utils, ThemeUtils } from '@common';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    productItem: {
      backgroundColor: isDarkMode ? Colors.selectBgColor.dark : Colors.selectBgColor.light,
      marginLeft: ResponsiveUtils.normalize(16),
      marginVertical: ResponsiveUtils.normalize(10),
      width: ResponsiveUtils.normalize(130),
      height: ResponsiveUtils.normalize(148),
      borderRadius: 6,
      // elevation: 2,
      // shadowOffset: {
      //   width: 0,
      //   height: 1,
      // },
      // shadowOpacity: 0.25,
      // shadowRadius: 2,
      alignItems: 'center',
    }, 
    productImage: {
      marginTop: ResponsiveUtils.normalize(7),
      width: ResponsiveUtils.normalize(80),
      height: ResponsiveUtils.normalize(80),
      resizeMode: 'contain',
    },
    productImageEmpty: {
      marginTop: ResponsiveUtils.normalize(7),
      width: ResponsiveUtils.normalize(80),
      height: ResponsiveUtils.normalize(80),
    },
    productName: {
      textAlign: 'center',
      fontSize: ResponsiveUtils.normalize(14),
      marginHorizontal: 4,
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({ weight: '500' }),
    },
    productPrice: {
      marginTop: ResponsiveUtils.normalize(5),
      fontSize: ResponsiveUtils.normalize(12),
      color: '#74787c',
      ...ThemeUtils.fontMaker({ weight: '400' }),
    }
  });
}

const ProductItem = ({ item, isDarkMode, onPress, currency }) => {
  const styles = dynamicStyles(isDarkMode);
  const image = get(item, 'images.0');
  return (
    <TouchableOpacity style={styles.productItem} onPress={onPress}>
      {image ? (
        <Image style={styles.productImage} source={{ uri: image }} />
      ) : (
          <View style={styles.productImageEmpty} />
        )
      }
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>
        {Utils.formatCurrency(item.sellingPrice, currency, { precision: 0 })}
      </Text>
    </TouchableOpacity>
  );
}

export default ProductItem;
