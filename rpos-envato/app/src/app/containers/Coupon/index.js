/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { useDispatch, useSelector } from 'react-redux';

import { ActionCreators } from '@actions';
import { Utils, Constants } from '@common';
import I18n from '@common/I18n';
import SearchInput from '@components/SearchInput';
import Table from '@components/Table';
import { styles as dynamicStyles } from './style';
const { MIN_LENGTH_SEARCH } = Constants;

const configs = [
  { header: 'coupons.name', property: 'name' },
  { header: 'coupons.code', property: 'code' },
  { header: 'coupons.type', property: 'typeName' },
  { header: 'coupons.actions', actions: ['edit', 'delete'] },
];

const getTypeName = (item, currency) => {
  if (item.type === 'fixed') {
    return Utils.formatCurrency(item.amount, currency, { precision: 0 });
  }
  return item.amount + '%';
};
const refactorData = (data, currency) => {
  return data.map((item) => ({
    ...item,
    typeName: getTypeName(item, currency),
  }));
};

const Coupon = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [textSearch, setTextSearch] = useState('');
  const [isRefreshing, setRefreshing] = useState(false);
  const couponsReducer = useSelector((state) => state.couponReducers.coupons);
  const isOfflineMode = useSelector((state) => state.settingReducers.isOfflineMode);
  const currency = useSelector((state) => state.settingReducers.config.currency);
  const allCoupons = couponsReducer.result;
  const dataRefactor = refactorData(allCoupons, currency);

  useEffect(() => {
    const { getCoupons } = ActionCreators;
    if (allCoupons.length === 0 && !couponsReducer.requesting) {
      dispatch(getCoupons());
    }
  }, []);

  useEffect(() => {
    if (textSearch.length < MIN_LENGTH_SEARCH) {
      setData(dataRefactor);
    } else {
      search(textSearch);
    }
  }, [couponsReducer]);

  const onRefresh = () => {
    const { getCoupons } = ActionCreators;
    setRefreshing(true);
    setTextSearch('');
    dispatch(getCoupons()).then(() => setRefreshing(false));
  };

  const goToAddCustomer = () => {
    navigation.navigate('AddCouponScreen');
  };

  const onChangeSearch = (text = '') => {
    const q = text.trim();
    setTextSearch(q);
    if (q.length < MIN_LENGTH_SEARCH) {
      setData(dataRefactor);
    } else {
      search(q);
    }
  };

  const search = (q) => {
    const result = dataRefactor.filter((item) => Utils.searchObject(item, ['code', 'name'], q));
    setData(result);
  };

  const handlePressAction = ({ type, item }) => {
    if (type === 'delete') {
      Alert.alert(
        'Delete confirm',
        `Are you sure you want to delete coupon: ${item.name}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          { text: 'OK', onPress: () => deleteCoupon(item) },
        ],
        { cancelable: false },
      );
    } else if (type === 'edit') {
      navigation.navigate('EditCoupon', { data: item });
    }
  };

  const deleteCoupon = (item) => {
    const { removeCoupon, saveCouponDeleted, deleteCoupon } = ActionCreators;
    const couponId = item.id;
    if (couponId.includes('local-')) {
      return dispatch(removeCoupon(couponId));
    }
    if (isOfflineMode) {
      return dispatch(saveCouponDeleted(couponId));
    }
    dispatch(deleteCoupon(couponId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headWrapper}>
        <SearchInput
          containerStyle={styles.searchContainer}
          placeholder={I18n.t('coupons.searchCoupon')}
          onChangeText={onChangeSearch}
        />
        <TouchableOpacity style={styles.btnAddNew} onPress={goToAddCustomer}>
          <Text style={styles.lbAddNew}>{I18n.t('coupons.addCoupon')}</Text>
        </TouchableOpacity>
      </View>
      <Table
        data={data}
        configs={configs}
        isDarkMode={isDarkMode}
        handlePressAction={handlePressAction}
        ListFooterComponent={
          couponsReducer.requesting &&
          !isRefreshing && (
            <View style={styles.icLoadingMore}>
              <ActivityIndicator size="small" />
            </View>
          )
        }
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
};

export default Coupon;
