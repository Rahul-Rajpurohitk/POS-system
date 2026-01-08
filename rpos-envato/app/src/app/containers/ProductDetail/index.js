import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import DropdownAlert from 'react-native-dropdownalert';
import HTMLView from '../../../components/HTMLView';
import ProductLogModal from '@components/ProductLogModal';
import { ActionCreators } from '@actions';
import { Constants, Utils } from '@common';
import I18n from '@common/I18n';
import { styles as dynamicStyles, SMALL_IMAGE_WIDTH } from './style';
const { CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const ProductDetail = (props) => {
  const { navigation } = props;
  const [largePhoto, setLargePhoto] = useState(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [product, setProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShowLogs, setIsShowLogs] = useState(false);
  const flatListRef = useRef(null);
  const dropdownAlertRef = useRef('');
  const styles = useDynamicStyleSheet(dynamicStyles);
  const dispatch = useDispatch();
  const isDarkMode = useDarkMode();

  const isOfflineMode = useSelector((state) => state.settingReducers.isOfflineMode);
  const productsReducer = useSelector((state) => state.productReducers.products);
  const currency = useSelector((state) => state.settingReducers.config.currency);

  useEffect(() => {
    const data = navigation.getParam('product');
    setProduct(data);
    console.log(data)
    setLargePhoto(get(data, 'images.0', ''));
  }, []);

  useEffect(() => {
    if (isDeleting) {
      if (productsReducer.status === 'success') {
        setIsDeleting(false);
        dropdownAlertRef.current.alertWithType('success', 'Success', 'Product has successfully deleted.');
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      }
      if (productsReducer.status === 'error') {
        setIsDeleting(false);
        dropdownAlertRef.current.alertWithType('error', 'Error', productsReducer.error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      }
    }
  }, [productsReducer]);

  goToEditProduct = () => {
    navigation.navigate('EditProduct', {
      data: product,
      refreshData: (data) => setProduct(data),
    });
  };

  handlePressDelete = () => {
    Alert.alert(
      'Delete confirm',
      `Are you sure you want to delete product: ${product.name}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        { text: 'OK', onPress: () => deleteProduct() },
      ],
      { cancelable: false },
    );
  };

  deleteProduct = () => {
    const { removeProduct, saveProductDeleted, deleteProduct } = ActionCreators;
    const productId = product.id;
    setIsDeleting(true);
    if (productId.includes('local-')) {
      return dispatch(removeProduct(productId));
    }
    if (isOfflineMode) {
      return dispatch(saveProductDeleted(productId));
    }
    dispatch(deleteProduct(productId));
  };

  onPressArrow = (increment) => {
    const scrollToIndex = increment + scrollIndex;
    if (scrollToIndex < 0 || scrollToIndex > product.images.length - 4) return;
    scrollSlideToIndex(scrollToIndex);
  };

  handleScrollImages = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const currentItem = Math.round(x / SMALL_IMAGE_WIDTH);
    scrollSlideToIndex(currentItem);
  };

  scrollSlideToIndex = (index) => {
    flatListRef.current.scrollToIndex({ index });
    setScrollIndex(index);
  };

  renderImageItem = ({ item }) => (
    <TouchableOpacity style={styles.smallImageContainer} onPress={() => setLargePhoto(item)}>
      <Image source={{ uri: item }} style={styles.smallImage} />
    </TouchableOpacity>
  );

  renderLeftContainer = () => (
    <View style={styles.leftContainer}>
      <View style={styles.largeImageContainer}>
        {!!largePhoto && <Image source={{ uri: largePhoto }} style={styles.largeImage} />}
      </View>
      <View>
        <FlatList
          horizontal
          data={get(product, 'images', [])}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => renderImageItem({ item })}
          ItemSeparatorComponent={() => <View style={styles.separatorImage} />}
          showsHorizontalScrollIndicator={false}
          ref={flatListRef}
          onMomentumScrollEnd={handleScrollImages}
        />
        <TouchableOpacity onPress={() => onPressArrow(-1)} style={styles.btnMoveLeft}>
          <Image source={require('@assets/icons/ic_arrow_left.png')} style={styles.icArrow} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPressArrow(1)} style={styles.btnMoveRight}>
          <Image source={require('@assets/icons/ic_arrow_right.png')} style={styles.icArrow} />
        </TouchableOpacity>
      </View>
    </View>
  );
    
  renderRightContainer = () => (
    <ScrollView style={styles.rightContainer}>
      <View style={styles.row}>
        <Text style={[styles.column, styles.tableHeader]}>{I18n.t('productDetail.category')}</Text>
        <Text style={[styles.column, styles.tableRow]}>{get(product, 'category.name')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.column, styles.tableHeader]}>{I18n.t('productDetail.sku')}</Text>
        <Text style={[styles.column, styles.tableRow]}>{product.sku}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.column, styles.tableHeader]}>{I18n.t('productDetail.quantity')}</Text>
        <Text style={[styles.column, styles.tableRow]}>{product.quantity}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.column, styles.tableHeader]}>{I18n.t('productDetail.price')}</Text>
        <Text style={[styles.column, styles.tableRow]}>{Utils.formatCurrency(product.sellingPrice, currency)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.column, styles.tableHeader]}>{I18n.t('productDetail.SellingPrice')}</Text>
        <Text style={[styles.column, styles.tableRow]}>{Utils.formatCurrency(product.sellingPrice, currency)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.column, styles.tableHeader]}>{I18n.t('productDetail.purchasePrice')}</Text>
        <Text style={[styles.column, styles.tableRow]}>{Utils.formatCurrency(product.purchasePrice, currency)}</Text>
      </View>
      <View style={styles.descriptionWrapper}>
        <Text style={styles.tableHeader}>{I18n.t('productDetail.description')}:</Text>
        <View style={styles.description}>
          <HTMLView html={product.desc} isDarkMode={isDarkMode} />
        </View>
      </View>
    </ScrollView>
  );

  if (!product)
    return (
      <View style={{ marginTop: 10, alignItems: 'center' }}>
        <ActivityIndicator size="small" />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('productDetail.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{product.name}</Text>
        <TouchableOpacity onPress={() => setIsShowLogs(true)} style={[styles.row, styles.btnAction, styles.btnView]}>
          <Image source={require('@assets/icons/ic_list.png')} style={styles.icAction} />
          <Text style={styles.lbAction}>{I18n.t('productDetail.viewLog')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToEditProduct} style={[styles.row, styles.btnAction, styles.btnEdit]}>
          <Image source={require('@assets/icons/ic_edit_white.png')} style={styles.icAction} />
          <Text style={styles.lbAction}>{I18n.t('productDetail.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePressDelete} style={[styles.row, styles.btnAction]}>
          <Image source={require('@assets/icons/ic_delete.png')} style={styles.icAction} />
          <Text style={styles.lbAction}>{I18n.t('productDetail.delete')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mainContainer}>
        {renderLeftContainer()}
        {renderRightContainer()}
      </View>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
      <ProductLogModal
        visible={isShowLogs}
        onRequestClose={() => setIsShowLogs(false)}
        isDarkMode={isDarkMode}
        productId={product.id}
      />
    </View>
  );
};

export default ProductDetail;
