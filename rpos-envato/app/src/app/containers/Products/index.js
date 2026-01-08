import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useDynamicStyleSheet, useDarkMode} from 'react-native-dark-mode';
import {useDispatch, useSelector} from 'react-redux';
import {slice} from 'lodash';

import {ActionCreators} from '@actions';
import SearchInput from '@components/SearchInput';
import Table from '@components/Table';
import {styles as dynamicStyles} from './style';
import {ResponsiveUtils, Constants, Utils} from '@common';
import I18n from '@common/I18n';

const {NUMBER_ITEMS_PER_PAGE, MIN_LENGTH_SEARCH} = Constants;
const configs = [
  {
    header: 'products.image',
    comlumnStyle: {paddingLeft: ResponsiveUtils.normalize(48)},
    isImage: true,
    property: 'images.0',
  },
  {header: 'products.name', property: 'name'},
  {header: 'products.sku', property: 'sku'},
  {header: 'products.quantity', property: 'quantity'},
  {
    header: 'products.price',
    property: 'sellingPrice',
    format: (value, currency) => {
      return Utils.formatCurrency(value, currency);
    },
  },
];

const Products = (props) => {
  const {navigation} = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [textSearch, setTextSearch] = useState('');
  const [isRefreshing, setRefreshing] = useState(false);
  const productsReducer = useSelector(
    (state) => state.productReducers.products,
  );
  const allProducts = productsReducer.result;
  const currency = useSelector((state) => state.settingReducers.config.currency);

  useEffect(() => {
    const {getAllProducts} = ActionCreators;
    if (allProducts.length === 0 && !productsReducer.requesting) {
      dispatch(getAllProducts());
    }
  }, []);

  useEffect(() => {
    if (textSearch.length < MIN_LENGTH_SEARCH) {
      initData();
    } else {
      search(textSearch);
    }
  }, [productsReducer]);

  const initData = () => {
    setPage(1);
    setData(slice(allProducts, 0, NUMBER_ITEMS_PER_PAGE));
  };

  const onRefresh = () => {
    const {getAllProducts} = ActionCreators;
    setRefreshing(true);
    setTextSearch('');
    dispatch(getAllProducts()).then(() => setRefreshing(false));
  };

  const goToAddProduct = () => {
    navigation.navigate('AddProductScreen');
  };

  const goToProductDetail = ({item}) => {
    navigation.navigate('ProductDetailScreen', {product: item});
  };

  const handleLoadMore = () => {
    const start = page * NUMBER_ITEMS_PER_PAGE;
    const end = (page + 1) * NUMBER_ITEMS_PER_PAGE;
    const dataPage = slice(allProducts, start, end);
    if (
      data.length === allProducts.length ||
      isLoadingMore ||
      textSearch.length >= MIN_LENGTH_SEARCH
    ) {
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

  const search = (q) => {
    const result = allProducts.filter((item) =>
      Utils.searchObject(item, ['name', 'sku', 'desc'], q),
    );
    setData(result);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headWrapper}>
        <SearchInput
          containerStyle={styles.searchContainer}
          placeholder={I18n.t('products.searchProduct')}
          onChangeText={onChangeSearch}
        />
        <View style={styles.row}>
          <TouchableOpacity style={styles.btnAddNew} onPress={goToAddProduct}>
            <Text style={styles.lbAddNew}>{I18n.t('products.addProduct')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Table
        data={data}
        configs={configs}
        currency={currency}
        isDarkMode={isDarkMode}
        onPressItem={goToProductDetail}
        disableOnPressItem={false}
        onEndReached={handleLoadMore}
        ListFooterComponent={
          (isLoadingMore || productsReducer.requesting) && (
            <View style={styles.icLoadingMore}>
              <ActivityIndicator size="small" />
            </View>
          )
        }
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

export default Products;
