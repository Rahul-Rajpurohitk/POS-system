import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import { get } from 'lodash';
import NumericInput from 'react-native-numeric-input';

import { ResponsiveUtils, Colors, Utils, ThemeUtils } from '@common';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    orderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: ResponsiveUtils.normalize(16),
      backgroundColor: isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light,
    },
    numbericInputBtn: {
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
    },
    orderProductImage: {
      width: ResponsiveUtils.normalize(50),
      height: ResponsiveUtils.normalize(50),
      resizeMode: 'contain',
      marginRight: ResponsiveUtils.normalize(10),
    },
    btnDelete: {
      backgroundColor: '#ff5066',
      justifyContent: 'center',
      alignItems: 'center',
      width: 60,
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
    },
    icDelete: {
      width: ResponsiveUtils.normalize(20),
      height: ResponsiveUtils.normalize(20),
      resizeMode: 'contain',
    },
    btnEditOrder: {
      paddingHorizontal: ResponsiveUtils.normalize(5),
      marginRight: ResponsiveUtils.normalize(12),
    },
    icEdit: {
      width: ResponsiveUtils.normalize(12),
      height: ResponsiveUtils.normalize(12),
      resizeMode: 'contain',
    },
    productInfo: {
      flex: 1,
      marginTop: ResponsiveUtils.normalize(20),
      marginBottom: ResponsiveUtils.normalize(17),
    },
    productName: {
      fontSize: ResponsiveUtils.normalize(12),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({ weight: '500' }),
    },
    lbProductPrice: {
      textAlign: 'right',
      width: ResponsiveUtils.normalize(70),
      fontSize: ResponsiveUtils.normalize(13),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({ weight: '400' }),
    },
    numbersLimit: {
      fontSize: ResponsiveUtils.normalize(12),
      color: '#b1aeae',
      ...ThemeUtils.fontMaker({ weight: '400' }),
    },
  })
}

const OrderItem = ({ item, isDarkMode, currency, onChange = () => { } }) => {
  const numbericButtonBg = isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light;
  const numbericValueColor = isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light;
  const image = get(item, 'product.images.0', '');
  const styles = dynamicStyles(isDarkMode);
  const totalPrice = get(item, 'product.sellingPrice', 0) * item.quantity;
  return (
    <View style={styles.orderItem}>
      <Image source={{ uri: image }} style={styles.orderProductImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.product.name}</Text>
        <Text style={styles.numbersLimit}>{item.product.quantity} Items</Text>
      </View>
      <TouchableOpacity style={styles.btnEditOrder}>
        <Image source={require('@assets/icons/ic_edit.png')} style={styles.icEdit} />
      </TouchableOpacity>
      <NumericInput
        minValue={1}
        initValue={item.quantity}
        onChange={onChange}
        totalWidth={ResponsiveUtils.normalize(70)}
        totalHeight={ResponsiveUtils.normalize(24)}
        rounded
        editable={false}
        borderColor="#e0e0e0"
        textColor={numbericValueColor}
        iconStyle={styles.numbericInputBtn}
        rightButtonBackgroundColor={numbericButtonBg}
        leftButtonBackgroundColor={numbericButtonBg}
      />
      <Text style={styles.lbProductPrice}>
        {Utils.formatCurrency(totalPrice, currency)}
      </Text>
    </View>
  );
}

export default OrderItem;