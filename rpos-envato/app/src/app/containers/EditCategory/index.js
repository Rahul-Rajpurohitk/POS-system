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
import {get} from 'lodash';
import DropdownAlert from 'react-native-dropdownalert';
import {Dropdown} from 'react-native-material-dropdown-v2';

import TextInput from '@components/TextInput';
import {ActionCreators} from '@actions';
import ImageServices from '@services/ImageServices';
import {Utils, Constants, ResponsiveUtils, Colors} from '@common';
import I18n from '@common/I18n';
import {styles as dynamicStyles} from './style';

const {CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR} = Constants;

const options = {
  title: 'Select Photo',
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
};

const EditCategory = (props) => {
  const {navigation} = props;
  const [photo, setPhoto] = useState('');
  const [name, setName] = useState('');
  const [parent, setParent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const dropdownAlertRef = useRef('');
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const isOfflineMode = useSelector((state) => state.settingReducers.isOfflineMode);
  const editCategoryReducer = useSelector((state) => state.categoryReducers.editCategory);
  const categoriesReducer = useSelector((state) => state.categoryReducers.categories);
  const allCategories = categoriesReducer.result;

  useEffect(() => {
    const category = navigation.getParam('data');
    setName(category.name);
    setParent(get(category, 'parent'));
    setPhoto(category.image);
  }, []);

  useEffect(() => {
    if (isEditing) {
      if (editCategoryReducer.status === 'success') {
        setIsEditing(false);
        editCategorySuccess();
      }
      if (editCategoryReducer.status === 'error') {
        setIsEditing(false);
        editCategoryFail();
      }
    }
  }, [editCategoryReducer]);

  showImagePicker = () => {
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        setPhoto(response.uri);
      }
    });
  };

  editCategorySuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Update category success.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
  };

  editCategoryFail = () => {
    dropdownAlertRef.current.alertWithType('error', 'Error', editCategoryReducer.error, {}, CLOSE_INTERVAL_ALERT_ERROR);
  };

  editCategory = async () => {
    const {editCategory, saveCategoryEditing} = ActionCreators;
    const category = navigation.getParam('data');
    try {
      if (validator.isEmpty(name.trim())) {
        throw 'Please input name of category.';
      }

      setIsEditing(true);
      let imageUri = photo;
      if (imageUri && imageUri.indexOf('http') !== 0) {
        imageUri = await Utils.compressImage({imageUri});
      }

      const params = {
        name: name.trim(),
        id: category.id,
        image: imageUri,
      };

      if (parent) {
        params.parent = parent.trim();
      }
      if (category.id.includes('local-')) {
        return dispatch(saveCategoryEditing(params));
      }
      if (isOfflineMode) {
        return dispatch(saveCategoryEditing({...params, status: 'editing'}));
      }
      if (imageUri && imageUri.indexOf('http') !== 0) {
        const imageUploaded = await ImageServices.uploadImage({uri: imageUri});
        params.image = imageUploaded.file;
      }

      dispatch(editCategory(params));
    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      setIsEditing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('editCategory.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('editCategory.title')}</Text>
      </View>
      <ScrollView style={styles.mainContainer}>
        <Text style={styles.inputLabel}>{I18n.t('editCategory.name')}</Text>
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
          disabled
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
        <Text style={styles.inputLabel}>{I18n.t('editCategory.addImage')}</Text>
        <View style={styles.imagesContainer}>
          <TouchableOpacity onPress={showImagePicker}>
            {photo ? (
              <View style={styles.imageWrapper}>
                <Image source={{uri: photo}} style={styles.categoryImage} />
                <TouchableWithoutFeedback>
                  <TouchableOpacity style={styles.btnCloseImage} onPress={() => setPhoto('')}>
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
        <TouchableOpacity disabled={isEditing} style={styles.btnAddNew} onPress={editCategory}>
          {isEditing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.lbAddNew}>{I18n.t('editCategory.saveCategory')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
};

export default EditCategory;
