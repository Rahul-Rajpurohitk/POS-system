import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import DropdownAlert from 'react-native-dropdownalert';
import validator from 'validator';
import { useDispatch, useSelector } from 'react-redux';
import randomId from 'random-id';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Dropdown } from 'react-native-material-dropdown-v2'

import { ActionCreators } from '@actions';
import TextInput from '@components/TextInput';
import SecureTextInput from '@components/SecureTextInput';
import { Constants, ResponsiveUtils, Colors } from '@common';
import { ROLES } from '@common/data/Roles';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';

const { CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const EditStaff = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const dropdownAlertRef = useRef('');
  const dispatch = useDispatch();

  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const editStaffReducer = useSelector(state => state.userReducers.editStaff);

  useEffect(() => {
    const userInfo = navigation.getParam('data');
    setFirstName(userInfo.firstName);
    setLastName(userInfo.lastName);
    setEmail(userInfo.email);
    setRole(userInfo.role);
  }, [])

  useEffect(() => {
    if (isEditing) {
      if (editStaffReducer.status === 'success') {
        setIsEditing(false);
        editStaffSuccess();
      }
      if (editStaffReducer.status === 'error') {
        setIsEditing(false);
        editStaffFail();
      }
    }
  }, [editStaffReducer]);

  editStaffSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Staff has successfully added.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
  };

  editStaffFail = () => {
    dropdownAlertRef.current.alertWithType(
      'error',
      'Error',
      editStaffReducer.error,
      {},
      CLOSE_INTERVAL_ALERT_ERROR,
    );
  };

  handleUpdateUser = async () => {
    const { editStaff, saveStaffEditing } = ActionCreators;
    const userInfo = navigation.getParam('data');
    try {
      if (validator.isEmpty(firstName.trim())
        || validator.isEmpty(lastName.trim())
        || validator.isEmpty(email.trim())) {
        throw 'Please enter user name, email.'
      }

      setIsEditing(true);
      const params = {
        id: userInfo.id,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      }

      if (userInfo.id.includes('local-')) {
        return dispatch(saveStaffEditing(params));
      }
      if (isOfflineMode) {
        return dispatch(saveStaffEditing({ ...params, status: 'editing' }));
      }
      dispatch(editStaff(params));

    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      setIsEditing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t("editStaff.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t("editStaff.title")}</Text>
      </View>
      <KeyboardAwareScrollView
        enableResetScrollToCoords
        enableOnAndroid
      >
        <View style={styles.mainContainer}>
          <Text style={styles.inputLabel}>{I18n.t("editStaff.firstName")}</Text>
          <TextInput
            placeholder="first name"
            isDarkMode={isDarkMode}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.inputLabel}>{I18n.t("editStaff.lastName")}</Text>
          <TextInput
            placeholder="last name"
            isDarkMode={isDarkMode}
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={styles.inputLabel}>{I18n.t("editStaff.email")}</Text>
          <TextInput
            placeholder="email"
            isDarkMode={isDarkMode}
            value={email}
            onChangeText={setEmail}
          />

          {/* <Text style={styles.inputLabel}>{I18n.t("editStaff.password")}</Text>
          <SecureTextInput
            placeholder="password"
            isDarkMode={isDarkMode}
            value={password}
            onChangeText={setPassword}
          /> */}

          <Text style={styles.inputLabel}>{I18n.t("editStaff.role")}</Text>
          <Dropdown
            data={ROLES}
            fontSize={ResponsiveUtils.normalize(14)}
            renderBase={({ title }) => (
              <View style={styles.btnSelect} elevation={1}>
                <Text style={styles.selectValue}>{title || I18n.t('editStaff.selectRole')}</Text>
                <Image
                  source={isDarkMode
                    ? require('@assets/icons/ic_arrow_right.png')
                    : require('@assets/icons/ic_arrow_right_black.png')
                  }
                  style={styles.icArrowRight} />
              </View>
            )}
            pickerStyle={styles.pickerStyle}
            textColor={isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light}
            // itemColor={isDarkMode ? Colors.primaryTextColor.light : Colors.primaryTextColor.dark}
            onChangeText={(value) => setRole(value)}
            itemCount={6}
            value={role}
          />
          {/* <TextInput
            placeholder="role"
            isDarkMode={isDarkMode}
            value={role}
            onChangeText={setRole}
          /> */}

          <TouchableOpacity
            disabled={isEditing}
            style={styles.btnSave} onPress={handleUpdateUser}>
            {isEditing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Text style={styles.lbSave}>{I18n.t("editStaff.saveUser")}</Text>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
}

export default EditStaff;
