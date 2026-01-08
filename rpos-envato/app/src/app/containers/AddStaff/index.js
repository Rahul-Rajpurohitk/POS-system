import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import DropdownAlert from 'react-native-dropdownalert';
import validator from 'validator';
import { useDispatch, useSelector } from 'react-redux';
import randomId from 'random-id';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ActionCreators } from '@actions';
import TextInput from '@components/TextInput';
import SecureTextInput from '@components/SecureTextInput';
import { Constants } from '@common';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';

const { CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const AddStaff = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const dropdownAlertRef = useRef('');
  const dispatch = useDispatch();

  const isOfflineMode = useSelector(state => state.settingReducers.isOfflineMode);
  const addStaffReducer = useSelector(state => state.userReducers.addStaff);

  useEffect(() => {
    if (isAdding) {
      if (addStaffReducer.status === 'success') {
        setIsAdding(false);
        addStaffSuccess();
      }
      if (addStaffReducer.status === 'error') {
        setIsAdding(false);
        addStaffFail();
      }
    }
  }, [addStaffReducer]);

  addStaffSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Staff has successfully added.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
    clear();
  };

  addStaffFail = () => {
    dropdownAlertRef.current.alertWithType(
      'error',
      'Error',
      addStaffReducer.error,
      {},
      CLOSE_INTERVAL_ALERT_ERROR,
    );
  };

  clear = () => {
    setFirstName('');
    setLastName('');
    setPassword('');
    setEmail('');
  }

  handleAddUser = async () => {
    const { addStaff, saveStaff } = ActionCreators;
    try {
      if (validator.isEmpty(firstName.trim())
        || validator.isEmpty(lastName.trim())
        || validator.isEmpty(password.trim())
        || validator.isEmpty(email.trim())) {
        throw 'Please enter user name, email, password.'
      }

      setIsAdding(true);
      const params = {
        id: 'local-' + randomId(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password.trim(),
      }

      if (isOfflineMode) {
        return dispatch(saveStaff(params));
      }
      dispatch(addStaff(params));

    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      setIsAdding(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t("addUser.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t("addUser.title")}</Text>
      </View>
      <KeyboardAwareScrollView
        enableResetScrollToCoords
        enableOnAndroid
      >
        <View style={styles.mainContainer}>
          <Text style={styles.inputLabel}>{I18n.t("addUser.firstName")}</Text>
          <TextInput
            placeholder="first name"
            isDarkMode={isDarkMode}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.inputLabel}>{I18n.t("addUser.lastName")}</Text>
          <TextInput
            placeholder="last name"
            isDarkMode={isDarkMode}
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={styles.inputLabel}>{I18n.t("addUser.email")}</Text>
          <TextInput
            placeholder="email"
            isDarkMode={isDarkMode}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>{I18n.t("addUser.password")}</Text>
          <SecureTextInput
            placeholder="password"
            isDarkMode={isDarkMode}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            disabled={isAdding}
            style={styles.btnSave} onPress={handleAddUser}>
            {isAdding ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Text style={styles.lbSave}>{I18n.t("addUser.addUser")}</Text>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
}

export default AddStaff;
