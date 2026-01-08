import React from 'react';
import {View} from 'react-native';
import Modal from '@components/Modal';
import OrderDetail from '@components/OrderDetail';
import dynamicStyles from './styles';

const OrderDetailModal = (props) => {
  const {visible, onRequestClose, title, isDarkMode, data, currency} = props;
  const styles = dynamicStyles(isDarkMode);

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      title={title}
      isDarkMode={isDarkMode}
      containerStyle={styles.modalContainer}>
      <View style={{flex: 1}}>
        <OrderDetail data={data} currency={currency} />
      </View>
    </Modal>
  );
};

export default OrderDetailModal;
