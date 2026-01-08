import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { launchImageLibrary } from 'react-native-image-picker';
import validator from 'validator';
import randomId from 'random-id';
import DropdownAlert from 'react-native-dropdownalert';
import { useDispatch, useSelector } from 'react-redux';
import { Dropdown } from 'react-native-material-dropdown-v2';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RichEditor, RichToolbar } from 'react-native-pell-rich-editor';

import { ActionCreators } from '@actions';
import { Utils, Constants, ResponsiveUtils, Colors } from '@common';
import I18n from '@common/I18n';
import TextInput from '@components/TextInput';
import ImageServices from '@services/ImageServices';
import { styles as dynamicStyles } from './style';

const { CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const options = {
  title: 'Select Photo',
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
};

const AddProduct = props => {
  const { navigation } = props;
  const [photos, setPhotos] = useState([]);
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [desc, setDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const dropdownAlertRef = useRef('');
  const dispatch = useDispatch();

  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const categoriesReducer = useSelector(state => state.categoryReducers.categories);
  const addProductReducer = useSelector(state => state.productReducers.addProduct);
  const currency = useSelector(state => state.settingReducers.config.currency);
  const allCategories = categoriesReducer.result;
  const textEditor = useRef(null);

  useEffect(() => {
    getCategories();
  }, []);

  useEffect(() => {
    if (isAdding) {
      if (addProductReducer.status === 'success') {
        setIsAdding(false);
        addProductSuccess();
      }
      if (addProductReducer.status === 'error') {
        setIsAdding(false);
        addProductFail();
      }
    }
  }, [addProductReducer]);

  getCategories = () => {
    if (allCategories.length > 0) return;
    const { getCategories } = ActionCreators;
    dispatch(getCategories());
  };

  showImagePicker = () => {
    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        setPhotos([...photos, response.uri]);
      }
    });
  };

  clear = () => {
    setSku('');
    setName('');
    setCategory(null);
    setQuantity('');
    setSellingPrice('');
    setPurchasePrice('');
    setDesc('');
  };

  addProductSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Product has successfully added.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
    clear();
  };

  addProductFail = () => {
    dropdownAlertRef.current.alertWithType('error', 'Error', addProductReducer.error, {}, CLOSE_INTERVAL_ALERT_ERROR);
  };

  useEffect(() => {
    textEditor.current.setContentHTML('');
  }, [textEditor]);

  addProduct = async () => {
    const { addProduct, saveProduct } = ActionCreators;
    try {
      if (validator.isEmpty(sku.trim()) || validator.isEmpty(name.trim())) {
        throw 'Please input name and sku of product.';
      }
      if (!purchasePrice || !sellingPrice || !validator.isFloat(purchasePrice) || !validator.isFloat(sellingPrice)) {
        throw 'Please enter product price is number.';
      }

      setIsAdding(true);
      let htmlDesc = await textEditor.current?.getContentHtml();
      const params = {
        sku: sku.trim(),
        name: name.trim(),
        id: 'local-' + randomId(),
        desc: htmlDesc,
        sellingPrice: parseFloat(sellingPrice),
        purchasePrice: parseFloat(purchasePrice),
      };

      if (!!quantity && validator.isNumeric(quantity)) params.quantity = quantity;
      if (photos.length > 0) {
        const images = await Promise.all(
          photos.map(async uri => {
            const fileUri = await Utils.compressImage({ imageUri: uri });
            return fileUri;
          }),
        );
        params.images = images;
      }

      if (isOfflineMode) {
        if (category) {
          const selectedCategory = allCategories.filter(item => item.id === category);
          params.category = selectedCategory[0];
        }
        return dispatch(saveProduct(params));
      }

      if (params.images) {
        const images = await Promise.all(
          params.images.map(async uri => {
            const imageUploaded = await ImageServices.uploadImage({ uri });
            return imageUploaded.file;
          }),
        );
        params.images = images;
      }
      if (category) {
        params.category = category;
      }
      dispatch(addProduct(params));
    } catch (error) {
      setIsAdding(false);
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('addProducts.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('addProducts.title')}</Text>
      </View>
      <KeyboardAwareScrollView enableResetScrollToCoords enableOnAndroid>
        <View style={styles.mainContainer}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.inputLabel}>{I18n.t('addProducts.productName')}</Text>
              <TextInput value={name} isDarkMode={isDarkMode} placeholder="Flower cup" onChangeText={setName} />
            </View>
            <View style={styles.inputSkuWrapper}>
              <Text style={styles.inputLabel}>{I18n.t('addProducts.sku')}*</Text>
              <TextInput value={sku} isDarkMode={isDarkMode} placeholder="SKU30001" onChangeText={setSku} />
            </View>
          </View>
          <Text style={styles.inputLabel}>{I18n.t('addProducts.chooseCategory')}</Text>
          <Dropdown
            data={allCategories.map(item => ({ label: item.name, value: item.id }))}
            fontSize={ResponsiveUtils.normalize(14)}
            renderBase={({ title }) => (
              <View style={styles.btnSelect} elevation={1}>
                <Text style={styles.selectValue}>{title || I18n.t('addProducts.selectCategory')}</Text>
                <Image
                  source={
                    isDarkMode
                      ? require('@assets/icons/ic_arrow_right.png')
                      : require('@assets/icons/ic_arrow_right_black.png')
                  }
                  style={styles.icArrowRight}
                />
              </View>
            )}
            pickerStyle={styles.pickerStyle}
            textColor={isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light}
            // itemColor={isDarkMode ? Colors.primaryTextColor.light : Colors.primaryTextColor.dark}
            onChangeText={value => setCategory(value)}
            itemCount={6}
          />
          <Text style={styles.inputLabel}>{I18n.t('addProducts.description')}</Text>
          <RichToolbar editor={textEditor} />
          <RichEditor ref={textEditor} style={{ minHeight: 100 }} />
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.inputLabel}>{I18n.t('addProducts.quantity')}</Text>
              <TextInput
                value={quantity}
                isDarkMode={isDarkMode}
                placeholder="287"
                keyboardType="number-pad"
                onChangeText={setQuantity}
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.inputLabel}>{I18n.t('addProducts.sellingPrice')}*</Text>
              <TextInput
                value={sellingPrice}
                isDarkMode={isDarkMode}
                placeholder={Utils.formatCurrency(20.8, currency)}
                keyboardType="number-pad"
                onChangeText={setSellingPrice}
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.inputLabel}>{I18n.t('addProducts.purchasePrice')}*</Text>
              <TextInput
                value={purchasePrice}
                isDarkMode={isDarkMode}
                placeholder={Utils.formatCurrency(24.0, currency)}
                keyboardType="number-pad"
                onChangeText={setPurchasePrice}
              />
            </View>
          </View>
          <Text style={styles.inputLabel}>{I18n.t('addProducts.addImage')}</Text>
          <View style={styles.imagesContainer}>
            <TouchableOpacity style={[styles.imageWrapper, styles.btnAddImage]} onPress={showImagePicker}>
              <Image source={require('@assets/icons/ic_add_photo.png')} style={styles.icAddPhoto} />
            </TouchableOpacity>
            {photos.map((uri, index) => (
              <View style={styles.imageWrapper} key={index.toString()}>
                <Image source={{ uri }} style={styles.categoryImage} />
                <TouchableOpacity
                  style={styles.btnCloseImage}
                  onPress={() => setPhotos(photos.filter(item => uri !== item))}>
                  <View style={styles.icCloseCircle}>
                    <Image source={require('@assets/icons/ic_close_circle.png')} style={styles.icCloseImage} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity disabled={isAdding} style={styles.btnAddNew} onPress={addProduct}>
            {isAdding ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.lbAddNew}>{I18n.t('addProducts.addProduct')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
};

export default AddProduct;
