/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useDynamicStyleSheet } from 'react-native-dark-mode';
import { useDispatch, useSelector } from 'react-redux';
import { slice, get } from 'lodash';
import moment from 'moment';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { ActionCreators } from '@actions';
import { Constants, Utils } from '@common';
import I18n from '@common/I18n';
import SearchInput from '@components/SearchInput';
import OrderDetail from '@components/OrderDetail';
import { styles as dynamicStyles } from './style';

const { NUMBER_ITEMS_PER_PAGE, MIN_LENGTH_SEARCH } = Constants;

const OrderItem = ({ styles, item, onPress, selected, currency }) => {
  return (
    <TouchableOpacity style={styles.order} onPress={onPress}>
      <Text style={[styles.lbOrderId, selected && styles.lbOrderIdActive]}>{item.number}</Text>
      <Text style={[styles.lbOrderTotalAmount, selected && styles.lbOrderIdActive]}>
        {Utils.formatCurrency(get(item, 'payment.total', 0), currency, { precision: 0 })}
      </Text>
    </TouchableOpacity>
  );
};

const HistoryTab = ({
  styles,
  data,
  onPressItem,
  handleLoadMore,
  setDatePickerVisible,
  dateFilter,
  selectedItem,
  onChangeTextSearch,
  isLoading,
  currency,
}) => {
  return (
    <View style={styles.searchContainer}>
      <SearchInput placeholder={I18n.t('order.searchOrders')} onChangeText={onChangeTextSearch} />
      <TouchableOpacity style={styles.btnCalendar} onPress={setDatePickerVisible}>
        <Image source={require('@assets/icons/ic_calendar.png')} style={styles.icCalendar} />
        <Text style={styles.lbChooseDate}>
          {dateFilter ? moment(dateFilter).format('DD-MM-YYYY') : I18n.t('order.chooseDate')}
        </Text>
      </TouchableOpacity>
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <OrderItem
            styles={styles}
            item={item}
            selected={item.id === selectedItem}
            currency={currency}
            onPress={() => onPressItem({ item })}
          />
        )}
        keyExtractor={item => item.id}
        onEndReached={handleLoadMore}
        extraData={selectedItem}
        ListFooterComponent={
          isLoading && (
            <View style={styles.icLoadingMore}>
              <ActivityIndicator size="small" />
            </View>
          )
        }
      />
    </View>
  );
};

const Order = () => {
  const styles = useDynamicStyleSheet(dynamicStyles);
  const dispatch = useDispatch();
  const [page, setPage] = useState(0);
  const [data, setData] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [textSearch, setTextSearch] = useState('');
  const ordersReducer = useSelector(state => state.orderReducers.orders);
  const allOrders = ordersReducer.result;
  const currency = useSelector(state => state.settingReducers.config.currency);
  const connectedDevice = useSelector(state => state.settingReducers.connectedDevice);

  useEffect(() => {
    const { getAllOrders } = ActionCreators;
    if (allOrders.length === 0 && !ordersReducer.requesting) {
      dispatch(getAllOrders());
    }
  }, []);

  useEffect(() => {
    if (textSearch.length >= MIN_LENGTH_SEARCH || dateFilter) {
      search(dateFilter, textSearch);
    } else {
      initData();
    }
  }, [ordersReducer]);

  const initData = () => {
    setPage(1);
    setData(slice(allOrders, 0, NUMBER_ITEMS_PER_PAGE));
    setOrderDetail(get(allOrders, '0'));
  };

  const handleLoadMore = () => {
    const start = page * NUMBER_ITEMS_PER_PAGE;
    const end = (page + 1) * NUMBER_ITEMS_PER_PAGE;
    const dataPage = slice(allOrders, start, end);
    if (data.length === allOrders.length || isLoadingMore || textSearch.length >= MIN_LENGTH_SEARCH || dateFilter)
      return;

    setIsLoadingMore(true);
    setPage(page + 1);
    setData([...data, ...dataPage]);
    setTimeout(() => setIsLoadingMore(false), 2000);
  };

  const handleConfirmDatePicker = date => {
    setDatePickerVisible(false);
    setDateFilter(date);
    search(date, textSearch);
  };

  const handleCancelDatePicker = () => {
    setDatePickerVisible(false);
    if (dateFilter) {
      search(null, textSearch);
      setDateFilter(null);
    }
  };

  const onChangeSearch = (text = '') => {
    setTextSearch(text.trim());
    search(dateFilter, text.trim());
  };

  const search = (date, text) => {
    let result = allOrders;
    if (date) {
      result = allOrders.filter(item => moment(item.createdAt).isSame(moment(date), 'day'));
    }
    if (text.length > 1) {
      result = result.filter(item =>
        Utils.searchObject(item, ['customer.name', 'customer.email', 'customer.address', 'number'], text),
      );
    }
    if (!date && text.length < MIN_LENGTH_SEARCH) {
      initData();
    }
    setData(result);
    setOrderDetail(get(result, '0'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <HistoryTab
          data={data}
          styles={styles}
          tabLabel={I18n.t('order.history')}
          onPressItem={({ item }) => setOrderDetail(item)}
          handleLoadMore={handleLoadMore}
          setDatePickerVisible={() => setDatePickerVisible(true)}
          dateFilter={dateFilter}
          selectedItem={orderDetail && orderDetail.id}
          onChangeTextSearch={onChangeSearch}
          isLoading={isLoadingMore || ordersReducer.requesting}
          currency={currency}
        />
      </View>
      <View style={styles.rightContainer}>{orderDetail && <OrderDetail data={orderDetail} currency={currency} />}</View>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        display="spinner"
        onConfirm={handleConfirmDatePicker}
        onCancel={handleCancelDatePicker}
      />
    </View>
  );
};

export default Order;
