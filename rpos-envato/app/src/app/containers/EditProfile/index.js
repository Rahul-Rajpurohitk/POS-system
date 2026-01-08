import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import validator from 'validator';
import DropdownAlert from 'react-native-dropdownalert';

import TextInput from '@components/TextInput';
import { ActionCreators } from '@actions';
import { Utils, Constants } from '@common';
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

const EditProfile = (props) => {
  const { navigation } = props;
  const [photo, setPhoto] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const userReducer = useSelector(state => state.userReducers.login);
  const updateProfileReducer = useSelector(state => state.userReducers.updateProfile);
  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const dropdownAlertRef = useRef('');

  useEffect(() => {
    const userInfo = userReducer.result;
    setFirstName(userInfo.firstName);
    setLastName(userInfo.lastName);
    setEmail(userInfo.email);
    setPhoto(userInfo.avatar);
  }, [])

  useEffect(() => {
    if (isEditing) {
      if (updateProfileReducer.status === 'success') {
        editUserSuccess();
        setIsEditing(false);
      }
      if (updateProfileReducer.status === 'error') {
        editUserFail();
        setIsEditing(false);
      }
    }
  }, [updateProfileReducer]);

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

  editUserSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Update customer success.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
  };

  editUserFail = () => {
    dropdownAlertRef.current.alertWithType(
      'error',
      'Error',
      updateProfileReducer.error,
      {},
      CLOSE_INTERVAL_ALERT_ERROR
    );
  };

  handleEditUser = async () => {
    const { updateUser, saveUserEditing } = ActionCreators;

    const params = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    }

    try {
      setIsEditing(true);

      if (validator.isEmpty(params.email) || !validator.isEmail(params.email)) {
        throw 'Please enter a valid email address.'
      }

      if (validator.isEmpty(params.firstName) || validator.isEmpty(params.lastName)) {
        throw 'Please enter first name and last name.'
      }

      let imageUri = photo;
      if (photo && photo.indexOf('http') !== 0) {
        imageUri = await Utils.compressImage({ imageUri });
      }

      if (isOfflineMode) {
        dispatch(saveUserEditing({ ...params, status: 'editing', avatar: imageUri }));
        return;
      }

      if (photo && photo.indexOf('http') !== 0) {
        const imageUploaded = await ImageServices.uploadImage({ uri: imageUri });
        params.avatar = imageUploaded.file;
      }

      dispatch(updateUser(params));
    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      setIsEditing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>EDIT PROFILE</Text>
      </View>
      <ScrollView style={styles.mainContainer}>
        <TouchableOpacity
          style={styles.btnAddImage}
          onPress={showImagePicker}
        >
          {!!photo && (
            <Image source={{ uri: photo }} style={styles.avatar} />
          )}
          {!photo && <Image
            source={require('@assets/icons/ic_add_photo.png')}
            style={styles.icAddPhoto}
          />}
        </TouchableOpacity>
        <Text style={styles.inputLabel}>First name</Text>
        <TextInput
          placeholder="First name"
          isDarkMode={isDarkMode}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.inputLabel}>Last name</Text>
        <TextInput
          placeholder="Last name"
          isDarkMode={isDarkMode}
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          onChangeText={setFirstName}
          placeholder="user@gmail.com"
          isDarkMode={isDarkMode}
          value={email}
        />

        <TouchableOpacity style={styles.btnSave} onPress={handleEditUser}>
          {isEditing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
              <Text style={styles.lbSave}>Save</Text>
            )}
        </TouchableOpacity>
      </ScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
}

export default EditProfile;
