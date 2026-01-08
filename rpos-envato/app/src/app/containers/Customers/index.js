import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { useDispatch, useSelector } from 'react-redux';
import { slice } from 'lodash';

import { ActionCreators } from '@actions';
import SearchInput from '@components/SearchInput';
import Table from '@components/Table';
import { Constants, Utils } from '@common';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';

const { NUMBER_ITEMS_PER_PAGE, MIN_LENGTH_SEARCH } = Constants;
const configs = [
  { header: 'customers.name', property: 'name' },
  { header: 'customers.phone', property: 'phone' },
  { header: 'customers.email', property: 'email' },
  { header: 'customers.address', property: 'address' },
];

const Customers = props => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [page, setPage] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [textSearch, setTextSearch] = useState('');

  const customersReducer = useSelector(state => state.customerReducers.customers);
  const allCustomers = customersReducer.result;

  useEffect(() => {
    const { getCustomers } = ActionCreators;
    if (allCustomers.length === 0 && !customersReducer.requesting) {
      dispatch(getCustomers());
    }
  }, []);

  useEffect(() => {
    if (textSearch.length < MIN_LENGTH_SEARCH) {
      initData();
    } else {
      search(textSearch);
    }
  }, [customersReducer]);

  const initData = () => {
    setPage(1);
    setData(slice(allCustomers, 0, NUMBER_ITEMS_PER_PAGE));
  };

  const onRefresh = () => {
    const { getCustomers } = ActionCreators;
    setRefreshing(true);
    setTextSearch('');
    dispatch(getCustomers()).then(() => setRefreshing(false));
  };

  const handleLoadMore = () => {
    const start = page * NUMBER_ITEMS_PER_PAGE;
    const end = (page + 1) * NUMBER_ITEMS_PER_PAGE;
    const dataPage = slice(allCustomers, start, end);
    if (data.length === allCustomers.length || isLoadingMore || textSearch.length >= MIN_LENGTH_SEARCH) {
      return;
    }
    setIsLoadingMore(true);
    setPage(page + 1);
    setData([...data, ...dataPage]);
    setTimeout(() => setIsLoadingMore(false), 2000);
  };

  const onChangeSearch = (text = '') => {
    const q = text.trim();
    setTextSearch(q);
    if (q.length < MIN_LENGTH_SEARCH) {
      initData();
    } else {
      search(q);
    }
  };

  const search = q => {
    const result = allCustomers.filter(item => Utils.searchObject(item, ['email', 'name', 'phone', 'address'], q));
    setData(result);
  };

  const goToAddCustomer = () => {
    navigation.navigate('AddCustomerScreen');
  };

  const goToCustomerDetail = ({ item }) => {
    navigation.navigate('CustomerDetail', { customer: item });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headWrapper}>
        <SearchInput
          containerStyle={styles.searchContainer}
          placeholder={I18n.t('customers.searchCustomer')}
          onChangeText={onChangeSearch}
        />
        <View style={styles.row}>
          <TouchableOpacity style={styles.btnAddNew} onPress={goToAddCustomer}>
            <Text style={styles.lbAddNew}>{I18n.t('customers.addCustomer')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Table
        data={data}
        configs={configs}
        isDarkMode={isDarkMode}
        onPressItem={goToCustomerDetail}
        disableOnPressItem={false}
        onEndReached={handleLoadMore}
        ListFooterComponent={
          (isLoadingMore || customersReducer.requesting) && (
            <View style={styles.icLoadingMore}>
              <ActivityIndicator size="small" />
            </View>
          )
        }
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
};

export default Customers;
