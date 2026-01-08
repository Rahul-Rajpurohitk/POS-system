import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import DropdownAlert from 'react-native-dropdownalert';
import validator from 'validator';

import UserServices from '@services/UserServices';
import SecureTextInput from '@components/SecureTextInput';
import { styles as dynamicStyles } from './style';

const ChangePassword = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [confirmPass, setConfirmPass] = useState('');
  const dropdownAlertRef = useRef('');

  handleChangePassword = async () => {
    try {
      if (validator.isEmpty(oldPass.trim())
        || validator.isEmpty(newPass.trim())
        || validator.isEmpty(confirmPass.trim())) {
        throw 'Please enter old password and new password.'
      }
      if (newPass !== confirmPass) {
        throw 'The new password and confirm password do not match.'
      }
      setRequesting(true);
      await UserServices.changePassword({ oldPass, newPass, confirmPass })
        .then(() => {
          dropdownAlertRef.current.alertWithType(
            'success',
            'Success',
            'Update password success.',
          );
          setRequesting(false);
        });
    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error);
      setRequesting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CHANGE PASSWORD</Text>
      </View>
      <ScrollView style={styles.mainContainer}>
        <Text style={styles.inputLabel}>Old Password</Text>
        <SecureTextInput
          placeholder="old password"
          isDarkMode={isDarkMode}
          value={oldPass}
          onChangeText={setOldPass}
        />

        <Text style={styles.inputLabel}>New Password</Text>
        <SecureTextInput
          placeholder="new password"
          isDarkMode={isDarkMode}
          value={newPass}
          onChangeText={setNewPass}
        />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <SecureTextInput
          placeholder="confirm password"
          isDarkMode={isDarkMode}
          value={confirmPass}
          onChangeText={setConfirmPass}
        />

        <TouchableOpacity
          disabled={requesting}
          style={styles.btnSave} onPress={handleChangePassword}>
          {requesting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
              <Text style={styles.lbSave}>Change Password</Text>
            )}
        </TouchableOpacity>
      </ScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </View>
  );
}

export default ChangePassword;
