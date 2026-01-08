import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import validator from 'validator';
import DropdownAlert from 'react-native-dropdownalert';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import TextInput from '@components/TextInput';
import { ActionCreators } from '@actions';
import ImageServices from '@services/ImageServices';
import { Utils, Constants } from '@common';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';

const { CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const options = {
  title: 'Select Photo',
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
};

const EditCustomer = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();

  const [photo, setPhoto] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const dropdownAlertRef = useRef(null);
  const dispatch = useDispatch();
  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const customersReducer = useSelector(state => state.customerReducers.customers);

  useEffect(() => {
    const customer = navigation.getParam('data');
    setName(customer.name);
    setEmail(customer.email);
    setPhoto(customer.avatar);
    setPhone(customer.phone);
    setAddress(customer.address);
  }, [])

  useEffect(() => {
    if (isEditing) {
      if (customersReducer.status === 'success') {
        setIsEditing(false);
        editCustomerSuccess();
      }
      if (customersReducer.status === 'error') {
        setIsEditing(false);
        editCustomerFail();
      }
    }
  }, [customersReducer]);

  editCustomerSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Update customer success.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
    const updateCustomerDetail = navigation.getParam('updateCustomer');
    const customer = navigation.getParam('data');
    const newData = customersReducer.result.filter(item => item.id === customer.id);
    updateCustomerDetail(newData[0]);
    setTimeout(() => { navigation.goBack(); }, 2000);
  };

  editCustomerFail = () => {
    dropdownAlertRef.current.alertWithType(
      'error',
      'Error',
      customersReducer.error,
      {},
      CLOSE_INTERVAL_ALERT_ERROR,
    );
  };

  handleEditCustomer = async () => {
    const { editCustomer, saveCustomerEditing } = ActionCreators;
    const customer = navigation.getParam('data');
    try {
      const params = {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        id: customer.id,
      }

      if (validator.isEmpty(params.email) || validator.isEmpty(params.name)) {
        throw 'Please input name and email of customer.';
      }

      if (!validator.isEmail(params.email)) {
        throw 'Please enter a valid email address.';
      }

      if (!validator.isEmpty(params.phone) && !validator.isMobilePhone(phone.trim())) {
        throw 'Please enter a valid phone number.'
      }

      setIsEditing(true);
      let imageUri = photo;
      if (photo && photo.indexOf('http') !== 0) {
        imageUri = await Utils.compressImage({ imageUri: photo });
      }

      if (customer.id.includes('local-')) {
        return dispatch(saveCustomerEditing({ ...params, avatar: imageUri }));
      }
      if (isOfflineMode) {
        return dispatch(saveCustomerEditing({ ...params, avatar: imageUri, status: 'editing' }));
      }

      if (photo && photo.indexOf('http') !== 0) {
        const imageUploaded = await ImageServices.uploadImage({ uri: imageUri });
        params.avatar = imageUploaded.file;
      }

      dispatch(editCustomer(params));
    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      setIsEditing(false);
    }
  }

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
  }

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('editCustomer.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('editCustomer.title')}</Text>
      </View>
      <KeyboardAwareScrollView
        enableResetScrollToCoords
        enableOnAndroid
      >
        <View style={styles.mainContainer}>
          <TouchableOpacity
            style={styles.btnAddImage}
            onPress={showImagePicker}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
                <Image
                  source={require('@assets/icons/ic_add_photo.png')}
                  style={styles.icAddPhoto}
                />
              )}
          </TouchableOpacity>
          <Text style={styles.inputLabel}>{I18n.t('editCustomer.nameCustomer')}</Text>
          <TextInput
            placeholder="Name"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setName(text)}
            value={name}
          />

          <Text style={styles.inputLabel}>{I18n.t('editCustomer.email')}</Text>
          <TextInput
            placeholder="customer@gmail.com"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setEmail(text)}
            value={email}
          />

          <Text style={styles.inputLabel}>{I18n.t('editCustomer.phone')}</Text>
          <TextInput
            placeholder="093 8765 6528"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setPhone(text)}
            keyboardType="number-pad"
            value={phone}
          />

          <Text style={styles.inputLabel}>{I18n.t('editCustomer.address')}</Text>
          <TextInput
            placeholder="7797 Julianne Ford"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setAddress(text)}
            value={address}
          />

          <TouchableOpacity disabled={isEditing} style={styles.btnAddNew} onPress={handleEditCustomer}>
            {isEditing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Text style={styles.lbAddNew}>{I18n.t('editCustomer.saveCustomer')}</Text>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
}

export default EditCustomer;
