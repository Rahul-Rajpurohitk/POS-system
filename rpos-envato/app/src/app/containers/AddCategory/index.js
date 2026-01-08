import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {useDynamicStyleSheet, useDarkMode} from 'react-native-dark-mode';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useDispatch, useSelector} from 'react-redux';
import validator from 'validator';
import randomId from 'random-id';
import DropdownAlert from 'react-native-dropdownalert';
import {Dropdown} from 'react-native-material-dropdown-v2';

import TextInput from '@components/TextInput';
import {ActionCreators} from '@actions';
import ImageServices from '@services/ImageServices';
import {Utils, Constants, ResponsiveUtils, Colors} from '@common';
import I18n from '@common/I18n';
import {filter} from 'lodash';
import {styles as dynamicStyles} from './style';

const {CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR} = Constants;

const options = {
  title: 'Select Photo',
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
};

const AddCategory = (props) => {
  const {navigation} = props;
  const [photo, setPhoto] = useState('');
  const [name, setName] = useState('');
  const [parent, setParent] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const dropdownAlertRef = useRef('');
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const isOfflineMode = useSelector((state) => state.settingReducers.isOfflineMode);
  const addCategoryReducer = useSelector((state) => state.categoryReducers.addCategory);
  const categoriesReducer = useSelector((state) => state.categoryReducers.categories);
  const allCategories = filter(categoriesReducer.result, (val) => !val.parent);

  useEffect(() => {
    if (isAdding) {
      if (addCategoryReducer.status === 'success') {
        setIsAdding(false);
        addCategorySuccess();
      }
      if (addCategoryReducer.status === 'error') {
        setIsAdding(false);
        addCategoryFail();
      }
    }
  }, [addCategoryReducer]);

  showImagePicker = () => {
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        setPhoto(response);
      }
    });
  };

  clear = () => {
    setParent(null);
    setName('');
    setPhoto('');
  };

  addCategorySuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Category has successfully added.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
    clear();
  };

  addCategoryFail = () => {
    dropdownAlertRef.current.alertWithType('error', 'Error', addCategoryReducer.error, {}, CLOSE_INTERVAL_ALERT_ERROR);
  };

  addCategory = async () => {
    const {addCategory, saveCategory} = ActionCreators;
    try {
      if (validator.isEmpty(name.trim())) {
        throw 'Please input name of category.';
      }

      setIsAdding(true);
      const params = {
        name: name.trim(),
        id: 'local-' + randomId(),
      };
      if (parent) {
        params.parent = parent.trim();
      }
      if (photo) {
        const fileUri = await Utils.compressImage({imageUri: photo.uri});
        params.image = fileUri;
      }

      if (isOfflineMode) {
        return dispatch(saveCategory(params));
      }

      if (params.image) {
        const file = {uri: params.image, name: photo.name};
        const imageUploaded = await ImageServices.uploadImage(file);
        params.image = imageUploaded.file;
      }

      dispatch(addCategory(params));
    } catch (error) {
      setIsAdding(false);
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('addCategory.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('addCategory.title')}</Text>
      </View>
      <ScrollView style={styles.mainContainer}>
        <Text style={styles.inputLabel}>{I18n.t('addCategory.name')}</Text>
        <TextInput
          placeholder="category name"
          isDarkMode={isDarkMode}
          value={name}
          onChangeText={(text) => setName(text)}
        />
        <Text style={styles.inputLabel}>{I18n.t('addCategory.parent')}</Text>
        <Dropdown
          data={allCategories.map((item) => ({label: item.name, value: item.id}))}
          fontSize={ResponsiveUtils.normalize(14)}
          renderBase={({title}) => (
            <View style={styles.btnSelect} elevation={1}>
              <Text style={styles.selectValue}>{title || I18n.t('addCategory.selectCategory')}</Text>
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
          value={parent}
          textColor={isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light}
          onChangeText={(value) => setParent(value)}
          itemCount={6}
        />
        <Text style={styles.inputLabel}>{I18n.t('addCategory.addImage')}</Text>
        <View style={styles.imagesContainer}>
          <TouchableOpacity onPress={showImagePicker}>
            {photo ? (
              <View style={styles.imageWrapper}>
                <Image source={{uri: photo.uri}} style={styles.categoryImage} />
                <TouchableWithoutFeedback>
                  <TouchableOpacity style={styles.btnCloseImage} onPress={() => setPhoto(null)}>
                    <View style={styles.icCloseCircle}>
                      <Image source={require('@assets/icons/ic_close_circle.png')} style={styles.icCloseImage} />
                    </View>
                  </TouchableOpacity>
                </TouchableWithoutFeedback>
              </View>
            ) : (
              <View style={[styles.imageWrapper, styles.btnAddImage]}>
                <Image source={require('@assets/icons/ic_add_photo.png')} style={styles.icAddPhoto} />
              </View>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity disabled={isAdding} style={styles.btnAddNew} onPress={addCategory}>
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.lbAddNew}>{I18n.t('addCategory.addCategory')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
};

export default AddCategory;
