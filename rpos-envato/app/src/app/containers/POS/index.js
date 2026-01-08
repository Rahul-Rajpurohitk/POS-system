/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useReducer } from 'react';
import { View, TextInput, Image, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useDynamicStyleSheet, useDarkMode, useDynamicValue } from 'react-native-dark-mode';
import { Dropdown } from 'react-native-material-dropdown-v2';
import { SwipeListView } from 'react-native-swipe-list-view';
import { useDispatch, useSelector } from 'react-redux';
import { slice, get } from 'lodash';
import DropdownAlert from 'react-native-dropdownalert';
import randomId from 'random-id';
import moment from 'moment';

import { ResponsiveUtils, Colors, Constants, Utils } from '@common';
import ProductItem from '@components/ProductItem';
import OrderItem from '@components/OrderItem';
import Modal from '@components/Modal';
import ModalSelect from '@components/ModalSelect';
import I18n from '@common/I18n';
import { ActionCreators } from '@actions';
import { styles as dynamicStyles } from './style';
import Receipt from '../../../components/Receipt';

const { NUMBER_ITEMS_PER_PAGE, NUMBER_OF_ORDER_LENGTH } = Constants;

const renderDropdown = ({ data = [], styles, isDarkMode, onSelectValue }) => {
  let dropdownData = data.map(item => ({ value: item.id, label: item.name }));
  dropdownData = [{ value: null, label: I18n.t('pos.allCategories') }, ...dropdownData];
  return (
    <Dropdown
      label="select a category"
      data={dropdownData}
      fontSize={ResponsiveUtils.normalize(14)}
      renderBase={({ title }) => (
        <View style={styles.dropdownContainer} elevation={2}>
          <Text style={styles.lbSelectValue}>{title || I18n.t('pos.selectCategory')}</Text>
          <Image source={require('@assets/icons/ic_arrow_dropdown.png')} style={styles.icDropdown} />
        </View>
      )}
      pickerStyle={styles.pickerStyle}
      textColor={isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light}
      // itemColor={isDarkMode ? Colors.primaryTextColor.light : Colors.primaryTextColor.dark}
      onChangeText={(value, index, data) => onSelectValue(value)}
      itemCount={6}
    />
  );
};

const POS = props => {
  const { navigation } = props;
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isShowModalCoupon, setVisibleModalCoupon] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [textSearch, setTextSearch] = useState('');
  const [visbleSelectCustomer, setVisbleSelectCustomer] = useState(false);
  const [customerSelected, setCustomerSelected] = useState(null);
  const [couponSelected, setCouponSelected] = useState(null);
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const dropdownAlertRef = useRef('');
  const receiptRef = useRef('');

  const lightIcSearch = require('@assets/icons/ic_search.png');
  const darkIcSearch = require('@assets/icons/ic_search_white.png');
  const icSearch = isDarkMode ? darkIcSearch : lightIcSearch;

  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const productsReducer = useSelector(state => state.productReducers.products);
  const addOrderReducer = useSelector(state => state.orderReducers.addOrder);
  const categoriesReducer = useSelector(state => state.categoryReducers.categories);
  const customersReducer = useSelector(state => state.customerReducers.customers);
  const settingConfigReducer = useSelector(state => state.settingReducers.config);
  const VAT = parseFloat(get(settingConfigReducer, 'tax', '0'));
  const couponsReducer = useSelector(state => state.couponReducers.coupons);
  const currency = useSelector(state => state.settingReducers.config.currency);
  const allCoupons = couponsReducer.result;
  const allCustomers = customersReducer.result;
  const allCategories = categoriesReducer.result;
  const allProducts = productsReducer.result;
  const allCouponAvailable = allCoupons.filter(
    item => !item.expiredAt || moment(item.expiredAt).isAfter(moment().toISOString(), 'minutes'),
  );

  let subTotal = 0;
  orders.forEach(item => (subTotal = subTotal + get(item, 'product.sellingPrice', 0) * item.quantity));
  subTotal = Math.round(subTotal * 10) / 10;
  let discount = couponSelected
    ? couponSelected.type === 'percentage'
      ? (subTotal * couponSelected.amount) / 100
      : couponSelected.amount
    : 0;
  discount = Math.round(discount);
  const vat = VAT > 0 ? Math.round(VAT * subTotal) / 100 : 0;
  let total = Math.round((subTotal - discount + vat) * 10) / 10;

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    initData();
  }, [productsReducer]);

  useEffect(() => {
    if (orders.length > 0) {
      if (addOrderReducer.status === 'success') {
        dropdownAlertRef.current.alertWithType('success', 'Success', 'Order has successfully added.');
        clear();
        receiptRef.current.showReceipt(addOrderReducer.result);
      }
      if (addOrderReducer.status === 'error') {
        dropdownAlertRef.current.alertWithType('error', 'Error', addOrderReducer.error);
      }
    }
  }, [addOrderReducer]);

  const initData = () => {
    setPage(1);
    setProducts(slice(allProducts, 0, NUMBER_ITEMS_PER_PAGE));
  };

  const clear = () => {
    setCouponSelected(null);
    setCustomerSelected(null);
    setOrders([]);
  };

  const handleLoadMore = () => {
    const start = page * NUMBER_ITEMS_PER_PAGE;
    const end = (page + 1) * NUMBER_ITEMS_PER_PAGE;
    const dataPage = slice(allProducts, start, end);
    if (products.length === allProducts.length || isLoadingMore || isSearching) {
      return;
    }
    setIsLoadingMore(true);
    setPage(page + 1);
    setProducts([...products, ...dataPage]);
    setTimeout(() => setIsLoadingMore(false), 2000);
  };

  const getData = () => {
    const { getAllProducts, getCategories, getCustomers, getCoupons } = ActionCreators;
    if (allProducts.length === 0) {
      dispatch(getAllProducts());
    }
    if (allCategories.length === 0) {
      dispatch(getCategories());
    }
    if (allCustomers.length === 0) {
      dispatch(getCustomers());
    }
    if (allCoupons.length === 0) {
      dispatch(getCoupons());
    }
  };

  const addProductToOrders = product => {
    const exist = orders.filter(item => item.product.id === product.id);
    if (exist.length > 0) {
      const newOrders = orders.map(item =>
        item.product.id === product.id ? { product, quantity: item.quantity + 1 } : item,
      );
      setOrders(newOrders);
    } else {
      const newOrders = [...orders, { product, quantity: 1 }];
      setOrders(newOrders);
    }
  };

  const removeItem = product => {
    const newOrder = orders.filter(item => item.product.id !== product.id);
    setOrders(newOrder);
  };

  const onChangeQuantity = (productId, quantity) => {
    const newOrders = orders.map(item => (item.product.id === productId ? { ...item, quantity } : item));
    setOrders(newOrders);
  };

  const onChangeSearch = (text = '') => {
    setTextSearch(text.trim());
    search(categoryFilter, text.trim());
  };

  const onSelectCategory = categoryId => {
    setCategoryFilter(categoryId);
    search(categoryId, textSearch);
  };

  const search = (categoryId, text) => {
    setIsSearching(true);
    let result = allProducts;
    if (categoryId) {
      result = allProducts.filter(item => item.category && item.category.id === categoryId);
    }
    if (text.length > 1) {
      result = result.filter(item => Utils.searchObject(item, ['name', 'sku', 'desc'], text));
    }
    if (!categoryId && text.length < 2) {
      initData();
      setIsSearching(false);
      return;
    }
    setProducts(result);
  };

  const onSelectCustomer = item => {
    setCustomerSelected({ id: item.value, name: item.label });
    setVisbleSelectCustomer(false);
  };

  const getTypeName = item => {
    if (item.type === 'fixed') {
      return Utils.formatCurrency(item.amount, currency, { precision: 0 });
    }
    return item.amount + '%' + ` (${Utils.formatCurrency(subTotal * (item.amount / 100), currency, { precision: 0 })})`;
  };

  const checkout = () => {
    const { addOrder, saveOrder } = ActionCreators;
    try {
      let params = { items: orders };
      if (customerSelected) {
        const customer = allCustomers.filter(customer => customer.id === customerSelected.id);
        params.customer = customer[0];
      }

      if (couponSelected) {
        params = { ...params, coupon: couponSelected.id };
      }

      if (isOfflineMode) {
        return dispatch(
          saveOrder({
            ...params,
            payment: {
              subTotal: subTotal,
              discount: discount,
              total: total,
            },
            id: 'local-' + randomId(),
            number: '# LOCAL-' + randomId(NUMBER_OF_ORDER_LENGTH, '0'),
          }),
        );
      }
      dispatch(addOrder(params));
    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error);
    }
  };

  const gotoAddCustomer = () => {
    setVisbleSelectCustomer(false);
    navigation.navigate('AddCustomerScreen');
  };

  const onSelectCouponHandler = item => {
    setCouponSelected(item);
    setVisibleModalCoupon(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <View style={styles.searchContainer}>
          <Image source={useDynamicValue(icSearch)} style={styles.icSearch} />
          <TextInput
            onChangeText={onChangeSearch}
            style={styles.textSearch}
            placeholder={I18n.t('pos.searchProducts')}
            placeholderTextColor={useDynamicValue(Colors.placeholderColor.light, Colors.placeholderColor.dark)}
          />
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.groupTitleContainer}>
            <Text style={styles.groupTitle}>{I18n.t('pos.categories')}</Text>
            {renderDropdown({
              data: allCategories,
              styles,
              isDarkMode,
              onSelectValue: onSelectCategory,
            })}
          </View>
          <View style={{ flex: 1 }}>
            <FlatList
              data={products}
              renderItem={({ item }) => (
                <ProductItem
                  item={item}
                  isDarkMode={isDarkMode}
                  onPress={() => addProductToOrders(item)}
                  currency={currency}
                />
              )}
              numColumns={4}
              keyExtractor={(item, index) => index.toString()}
              onEndReached={handleLoadMore}
              ListFooterComponent={
                (isLoadingMore || productsReducer.requesting) && (
                  <View style={styles.icLoadingMore}>
                    <ActivityIndicator size="small" />
                  </View>
                )
              }
            />
          </View>
        </View>
      </View>

      <View style={styles.rightContainer}>
        <View style={styles.groupTitleContainer}>
          <Text style={styles.groupTitle}>{I18n.t('pos.products')}</Text>
        </View>
        {orders.length > 0 && (
          <FlatList
            data={[1]}
            renderItem={({ item }) => (
              <>
                <SwipeListView
                  data={orders}
                  renderItem={({ item }) => (
                    <OrderItem
                      item={item}
                      isDarkMode={isDarkMode}
                      onChange={value => onChangeQuantity(item.product.id, value)}
                      currency={currency}
                    />
                  )}
                  renderHiddenItem={({ item }) => (
                    <View style={styles.hiddenSwipeOut}>
                      <View />
                      <TouchableOpacity style={styles.btnDelete} onPress={() => removeItem(item.product)}>
                        <Image source={require('@assets/icons/ic_delete.png')} style={styles.icDelete} />
                      </TouchableOpacity>
                    </View>
                  )}
                  keyExtractor={(item, index) => item.product.id}
                  closeOnRowPress
                  closeOnScroll
                  disableRightSwipe
                  leftOpenValue={0}
                  rightOpenValue={-60}
                  scrollEnabled={false}
                />
                <View style={[styles.row, styles.addCouponContainer]}>
                  <Text style={styles.lbAddCoupon}>{get(couponSelected, 'code', I18n.t('pos.addCoupon'))}</Text>
                  <TouchableOpacity onPress={() => setVisibleModalCoupon(true)}>
                    <Image source={require('@assets/icons/icon_add.png')} style={styles.icAdd} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.row, styles.addCustomerContainer]}>
                  <Text style={styles.lbAddCoupon}>{get(customerSelected, 'name', I18n.t('pos.addCustomer'))}</Text>
                  <TouchableOpacity onPress={() => setVisbleSelectCustomer(true)}>
                    <Image source={require('@assets/icons/icon_add.png')} style={styles.icAdd} />
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <Text style={styles.lbAddCoupon}>{I18n.t('pos.subTotal')}</Text>
                  <Text style={styles.lbSubtotal}>{Utils.formatCurrency(subTotal, currency)}</Text>
                </View>
                {couponSelected && (
                  <View style={styles.row}>
                    <Text style={styles.lbAddCoupon}>{I18n.t('pos.discount')}</Text>
                    <Text style={styles.lbSubtotal}>-{Utils.formatCurrency(discount, currency)}</Text>
                  </View>
                )}
                {VAT > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.lbAddCoupon}>
                      {I18n.t('pos.vat')}
                      {`(${VAT}%)`}
                    </Text>
                    <Text style={styles.lbSubtotal}>{Utils.formatCurrency(vat, currency)}</Text>
                  </View>
                )}
                <View style={styles.borderLine} />
                <View style={styles.row}>
                  <Text style={styles.lbAddCoupon}>{I18n.t('pos.total')}</Text>
                  <Text style={[styles.lbSubtotal, styles.lbTotal]}>{Utils.formatCurrency(total, currency)}</Text>
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.btnCheckout} onPress={checkout}>
                    {addOrderReducer.requesting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.lbCheckout}>{I18n.t('pos.checkout')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          />
        )}
      </View>

      <Modal
        visible={isShowModalCoupon}
        onRequestClose={() => setVisibleModalCoupon(false)}
        isDarkMode={isDarkMode}
        modalStyle={styles.modalStyle}
        title={I18n.t('pos.chooseCoupon')}>
        <View style={styles.couponsWrapper}>
          {allCouponAvailable.map((item, index) => (
            <TouchableOpacity onPress={() => onSelectCouponHandler(item)} style={styles.couponItem} key={item.id}>
              <Text style={styles.couponName}>{item.name}</Text>
              <Text style={styles.couponCode}>{`${item.code}: ${getTypeName(item)}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      <ModalSelect
        visible={visbleSelectCustomer}
        onRequestClose={() => setVisbleSelectCustomer(false)}
        isDarkMode={isDarkMode}
        title="SELECT A CUSTOMER"
        selected={get(customerSelected, 'id')}
        data={allCustomers.map(item => ({ label: item.name, value: item.id }))}
        onSelect={({ item }) => onSelectCustomer(item)}
        renderClose={() => {
          return (
            <TouchableOpacity style={styles.btnAddCustomer} onPress={gotoAddCustomer} activeOpacity={0.6}>
              <Text style={styles.textBtnCustomer}>{I18n.t('pos.addCustomer')}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
      <Receipt ref={receiptRef} />
    </View>
  );
};

function mapStateToProps(state) {
  return {
    userReducers: state.userReducers,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(ActionCreators, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(POS);
