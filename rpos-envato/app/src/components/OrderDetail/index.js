import React, { useRef } from 'react';
import { View, ScrollView, Text, Image, TouchableOpacity } from 'react-native';
import { Utils } from '@common';
import I18n from '@common/I18n';
import { get } from 'lodash';
import { styles as dynamicStyles } from './styles';
import { useDynamicStyleSheet } from 'react-native-dark-mode';
import moment from 'moment';
import Receipt from '../Receipt';

const OrderDetail = props => {
  const { data, currency } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const subTotal = get(data, 'payment.subTotal', 0);
  const total = get(data, 'payment.total', 0);
  const discount = get(data, 'payment.discount', 0);

  const receiptRef = useRef();
  const printReceipt = () => {
    receiptRef.current.showReceipt(data);
  };

  return (
    <ScrollView style={styles.orderDetailContainer} showsVerticalScrollIndicator={false}>
      <View onStartShouldSetResponder={() => true}>
        <Text style={styles.fieldLabel}>{I18n.t('order.customer')}</Text>
        <Text style={styles.fieldValue}>{get(data, 'customer.name', '')}</Text>

        <Text style={styles.fieldLabel}>{I18n.t('order.dateTime')}</Text>
        <Text style={styles.fieldValue}>{moment(data.createdAt).format('dddd, MMMM DD, YYYY HH:mm')}</Text>

        <Text style={styles.fieldLabel}>{I18n.t('order.shippingAddress')}</Text>
        <View style={styles.fieldRow}>
          <Image style={styles.fieldIcon} source={require('@assets/icons/ic_location.png')} />
          <Text style={styles.fieldValue}>{get(data, 'customer.address', '')}</Text>
        </View>
        <TouchableOpacity style={styles.btnViewMap}>
          <Text style={styles.lbViewMap}>{I18n.t('order.viewMap')}</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>{I18n.t('order.phone')}</Text>
        <View style={styles.fieldRow}>
          <Image style={styles.fieldIcon} source={require('@assets/icons/ic_phone.png')} />
          <Text style={styles.fieldValue}>{get(data, 'customer.phone', '')}</Text>
        </View>

        <Text style={styles.fieldLabel}>{I18n.t('order.mail')}</Text>
        <View style={styles.fieldRow}>
          <Image style={styles.fieldIcon} source={require('@assets/icons/ic_email.png')} />
          <Text style={styles.fieldValue}>{get(data, 'customer.email', '')}</Text>
        </View>

        <Text style={styles.fieldLabel}>{I18n.t('order.items')}</Text>
        {data.items.map((item, index) => (
          <View style={styles.fieldRow} key={index.toString()}>
            <Image source={{ uri: get(item, 'product.images.0', '') }} style={styles.itemImage} />
            <Text style={styles.itemName}>{get(item, 'product.name', '')}</Text>
            <Text style={styles.itemQuantity}>x{get(item, 'quantity', '')}</Text>
            <Text style={styles.price}>{Utils.formatCurrency(get(item, 'product.sellingPrice', 0), currency)}</Text>
          </View>
        ))}
        <View style={styles.borderLine} />
        <View style={styles.subTotalContainer}>
          <View style={[styles.fieldRow, styles.subtotalItem]}>
            <Text style={styles.lbSubtotal}>{I18n.t('order.subtotal')}</Text>
            <Text style={styles.price}>{Utils.formatCurrency(subTotal, currency)}</Text>
          </View>
          {!!discount && (
            <View style={[styles.fieldRow, styles.subtotalItem]}>
              <Text style={styles.lbSubtotal}>{I18n.t('order.coupon')}</Text>
              <Text style={styles.price}>- {Utils.formatCurrency(discount, currency)}</Text>
            </View>
          )}
          <View style={[styles.fieldRow, styles.subtotalItem]}>
            <Text style={styles.lbSubtotal}>{I18n.t('order.vat')}</Text>
            <Text style={styles.price}>{Utils.formatCurrency(0.1, currency)}</Text>
          </View>
          <View style={[styles.fieldRow, styles.subtotalItem]}>
            <Text style={styles.lbSubtotal}>{I18n.t('order.total')}</Text>
            <Text style={styles.price}>{Utils.formatCurrency(total, currency)}</Text>
          </View>

          <View style={styles.borderLine} />
          <View style={styles.fieldRow}>
            <Text style={styles.lbPaidByCustomer}>{I18n.t('order.paidByCustomer')}</Text>
            <TouchableOpacity style={styles.btnPaid}>
              <Text style={styles.lbPaid}>{Utils.formatCurrency(total, currency)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btnPrintReceipt} onPress={printReceipt}>
          <Text style={styles.lbPaid}>{I18n.t('order.printReceipt')}</Text>
        </TouchableOpacity>
      </View>
      <Receipt ref={receiptRef} />
    </ScrollView>
  );
};

export default OrderDetail;
