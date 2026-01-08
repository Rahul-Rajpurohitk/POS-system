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
import randomId from 'random-id';
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

const AddCustomer = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();

  const [photo, setPhoto] = useState(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const dropdownAlertRef = useRef(null);
  const dispatch = useDispatch();
  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const addCustomerReducer = useSelector(state => state.customerReducers.addCustomer);

  useEffect(() => {
    if (isAdding) {
      if (addCustomerReducer.status === 'success') {
        setIsAdding(false);
        addCustomerSuccess();
      }
      if (addCustomerReducer.status === 'error') {
        setIsAdding(false);
        addCustomerFail();
      }
    }
  }, [addCustomerReducer]);

  clear = () => {
    setEmail('');
    setName('');
    setPhoto(null);
    setAddress('');
    setPhone('');
  }

  addCustomerSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Customer has successfully added.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
    clear();
  };

  addCustomerFail = () => {
    dropdownAlertRef.current.alertWithType(
      'error',
      'Error',
      addCustomerReducer.error,
      {},
      CLOSE_INTERVAL_ALERT_ERROR,
    );
  };

  addCustomer = async () => {
    const { addCustomer, saveCustomer } = ActionCreators;

    const params = {
      email: email.trim(),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      id: 'local-' + randomId(),
    }
    try {
      if (validator.isEmpty(params.email) || validator.isEmpty(params.name)) {
        throw 'Please input name and email of customer.'
      }

      if (!validator.isEmail(params.email)) {
        throw 'Please enter a valid email address.'
      }

      if (!validator.isEmpty(params.phone) && !validator.isMobilePhone(phone.trim())) {
        throw 'Please enter a valid phone number.'
      }

      setIsAdding(true);
      if (photo) {
        const fileUri = await Utils.compressImage({ imageUri: photo.uri });
        params.avatar = fileUri;
      }

      if (isOfflineMode) {
        return dispatch(saveCustomer(params));
      }

      if (params.avatar) {
        const file = { uri: params.avatar, name: photo.name }
        const imageUploaded = await ImageServices.uploadImage(file);
        params.avatar = imageUploaded.file;
      }

      dispatch(addCustomer(params));
    } catch (error) {
      setIsAdding(false);
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
    }
  }

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
  }

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('addCustomer.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('addCustomer.title')}</Text>
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
              <Image source={{ uri: photo.uri }} style={styles.avatar} />
            ) : (
                <Image
                  source={require('@assets/icons/ic_add_photo.png')}
                  style={styles.icAddPhoto}
                />
              )}
          </TouchableOpacity>
          <Text style={styles.inputLabel}>{I18n.t('addCustomer.nameCustomer')}</Text>
          <TextInput
            placeholder="name"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setName(text)}
            value={name}
          />

          <Text style={styles.inputLabel}>{I18n.t('addCustomer.email')}</Text>
          <TextInput
            placeholder="customer@gmail.com"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setEmail(text)}
            value={email}
          />

          <Text style={styles.inputLabel}>{I18n.t('addCustomer.phone')}</Text>
          <TextInput
            placeholder="093 8765 6528"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setPhone(text)}
            keyboardType="number-pad"
            value={phone}
          />

          <Text style={styles.inputLabel}>{I18n.t('addCustomer.address')}</Text>
          <TextInput
            placeholder="7797 Julianne Ford"
            isDarkMode={isDarkMode}
            onChangeText={(text) => setAddress(text)}
            value={address}
          />

          <TouchableOpacity disabled={isAdding} style={styles.btnAddNew} onPress={addCustomer}>
            {isAdding ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Text style={styles.lbAddNew}>{I18n.t('addCustomer.addCustomer')}</Text>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
}

export default AddCustomer;
