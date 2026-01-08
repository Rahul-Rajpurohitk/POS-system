import React, { useState, forwardRef, useEffect } from 'react';
import { Modal, Image, TouchableWithoutFeedback, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Styles, Utils, ResponsiveUtils, ThemeUtils } from '@common';
import moment from 'moment';
import PrinterManagement from '../app/common/PrinterManagement';
import Config from '../app/common/Config';
import { get } from 'lodash';
import { useSelector } from 'react-redux';
import I18n from '@common/I18n';
import { DynamicStyleSheet, useDynamicStyleSheet } from 'react-native-dark-mode';

const Receipt = ({}, ref) => {
  const [order, setOrder] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const configSetting = useSelector(state => state.settingReducers.config);
  const currency = useSelector(state => state.settingReducers.config.currency);

  const styles = useDynamicStyleSheet(dynamicStyles);

  const showReceipt = item => {
    setOrder(item);
    setTimeout(() => {
      setIsVisible(true);
    }, 500);
  };
  ref && (ref.current = { showReceipt });

  const printByText = async () => {
    return PrinterManagement.printReceipt({ order }, configSetting, currency);
  };

  const subTotal = get(order, 'payment.subTotal', 0);
  const total = get(order, 'payment.total', 0);
  const discount = get(order, 'payment.discount', 0);

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={() => setIsVisible(false)}>
      <TouchableWithoutFeedback onPress={() => setIsVisible(false)}>
        <View style={styles.container}>
          {order && (
            <TouchableWithoutFeedback onPress={() => {}}>
              <>
                <View style={styles.content}>
                  <Image source={Config.Logo} style={styles.logo} />
                  <Text style={[styles.boldText, styles.centerText]}>{configSetting.name}</Text>
                  <View style={[styles.line, { marginTop: 20 }]} />
                  <View style={styles.row}>
                    <Text style={styles.label}>Date and Time</Text>
                    <Text style={styles.text}>{moment().format('lll')}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Order Number</Text>
                    <Text style={styles.text}>{order.number}</Text>
                  </View>
                  <View style={[styles.line, { marginBottom: 20 }]} />

                  <View style={styles.row}>
                    <Text style={styles.boldText1}>Items</Text>
                    <Text style={styles.boldText2}>Qty</Text>
                    <Text style={styles.boldText3}>Amount</Text>
                  </View>
                  {order.items.map((item, index) => {
                    return (
                      <View key={index}>
                        <View style={styles.line} />
                        <View style={styles.row}>
                          <Text style={styles.text1}>{item.product.name}</Text>
                          <Text style={styles.text2}>{item.quantity}</Text>
                          <Text style={styles.text3}>
                            {Utils.formatCurrency(get(item, 'product.sellingPrice', 0), currency)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.line} />
                  <View style={[styles.row, { marginTop: 10 }]}>
                    <Text style={styles.labelBold}>Subtotal</Text>
                    <Text style={styles.value}>{Utils.formatCurrency(subTotal, currency)}</Text>
                  </View>
                  {!!discount && (
                    <View style={styles.row}>
                      <Text style={styles.labelBold}>Discount</Text>
                      <Text style={styles.value}>-{Utils.formatCurrency(discount, currency)}</Text>
                    </View>
                  )}

                  <View style={styles.line} />
                  <View style={styles.row}>
                    <Text style={styles.labelBold}>Total</Text>
                    <Text style={styles.total}>{Utils.formatCurrency(total, currency)}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.btnPrintReceipt} onPress={printByText}>
                  <Text style={styles.lbPaid}>{I18n.t('order.printReceipt')}</Text>
                </TouchableOpacity>
              </>
            </TouchableWithoutFeedback>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const dynamicStyles = new DynamicStyleSheet({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: ResponsiveUtils.normalize(400),
    backgroundColor: '#FFFFFF',
    paddingVertical: ResponsiveUtils.normalize(10),
    paddingHorizontal: ResponsiveUtils.normalize(10),
  },
  logo: {
    width: ResponsiveUtils.normalize(50),
    height: ResponsiveUtils.normalize(50),
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: ResponsiveUtils.normalize(10),
  },
  boldText: {
    fontSize: ResponsiveUtils.normalize(16),
    ...Styles.LatoBold,
    color: '#000',
  },
  text: {
    fontSize: ResponsiveUtils.normalize(16),
    color: '#000',
  },
  label: {
    fontSize: ResponsiveUtils.normalize(16),
    color: '#000',
    flex: 1,
    marginRight: ResponsiveUtils.normalize(10),
  },
  centerText: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ResponsiveUtils.normalize(12),
  },
  line: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#f4f4f4',
  },
  boldText1: {
    fontSize: ResponsiveUtils.normalize(16),
    ...Styles.LatoBold,
    color: '#000',
    width: '60%',
  },
  boldText2: {
    fontSize: ResponsiveUtils.normalize(16),
    ...Styles.LatoBold,
    color: '#000',
    width: '20%',
  },
  boldText3: {
    fontSize: ResponsiveUtils.normalize(16),
    ...Styles.LatoBold,
    color: '#000',
    width: '20%',
    textAlign: 'right',
  },
  text1: {
    fontSize: ResponsiveUtils.normalize(16),
    width: '60%',
    color: '#000',
  },
  text2: {
    fontSize: ResponsiveUtils.normalize(16),
    width: '20%',
    color: '#000',
  },
  text3: {
    fontSize: ResponsiveUtils.normalize(16),
    width: '20%',
    color: '#000',
    textAlign: 'right',
    ...Styles.LatoBold,
  },
  labelBold: {
    fontSize: ResponsiveUtils.normalize(16),
    color: '#000',
    flex: 1,
    marginRight: ResponsiveUtils.normalize(10),
    ...Styles.LatoBold,
  },
  value: {
    fontSize: ResponsiveUtils.normalize(16),
    color: '#000',
    ...Styles.LatoBold,
  },
  total: {
    fontSize: ResponsiveUtils.normalize(24),
    color: '#000',
    ...Styles.LatoBold,
  },
  lbPaid: {
    color: '#FFF',
    fontSize: ResponsiveUtils.normalize(16),
  },
  btnPrintReceipt: {
    width: ResponsiveUtils.normalize(400),
    paddingVertical: ResponsiveUtils.normalize(15),
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    alignItems: 'center',
    borderRadius: 4,
    marginTop: 10,
  },
});
export default forwardRef(Receipt);
