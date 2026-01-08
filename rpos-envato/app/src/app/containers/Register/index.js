import React, { useState, useRef } from 'react';
import { View, Image, Text, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { StackActions, NavigationActions } from 'react-navigation';
import DropdownAlert from 'react-native-dropdownalert';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import validator from 'validator';
import ButtonBack from '@components/ButtonBack';

import { Config, Constants } from '@common';
import SecureTextInput from '@components/SecureTextInput';
import TextInput from '@components/TextInput';
import UserServices from '@services/UserServices';
import { styles as dynamicStyles } from './style';
const { CLOSE_INTERVAL_ALERT_ERROR, CLOSE_INTERVAL_ALERT_SUCCESS } = Constants;

const Register = (props) => {
  const { navigation } = props;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requesting, setRequesting] = useState(false);
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dropdownAlertRef = useRef('');

  const handleChangePassword = async () => {
    try {
      if (
        validator.isEmpty(firstName.trim()) ||
        validator.isEmpty(lastName.trim()) ||
        validator.isEmpty(businessName.trim()) ||
        validator.isEmpty(email.trim())
      ) {
        throw 'Please enter first name, last name, business name and email.';
      }
      if (validator.isEmpty(password.trim())) {
        throw 'Password is required.';
      }
      if (!validator.isEmail(email.trim())) {
        throw 'Email is incorrect format.';
      }
      setRequesting(true);
      const params = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        password: password.trim(),
      };
      await UserServices.register(params).then(() => {
        dropdownAlertRef.current.alertWithType(
          'success',
          'Success',
          'Your account is created.',
          {},
          CLOSE_INTERVAL_ALERT_SUCCESS,
        );
        setRequesting(false);
        goToLogin();
      });
    } catch (error) {
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
      setRequesting(false);
    }
  };

  const goToLogin = () => {
    setTimeout(() => {
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LoginScreen' })],
      });
      navigation.dispatch(resetAction);
    }, 1000);
  };

  return (
    <ImageBackground
      source={require('@assets/background/background.png')}
      style={styles.container}
      imageStyle={styles.background}>
      <KeyboardAwareScrollView enableResetScrollToCoords>
        <View style={styles.mainContainer}>
          <View style={styles.backWrapper}>
            <ButtonBack onPress={() => navigation.goBack()} />
          </View>
          <Image source={Config.Logo} style={styles.logo} />
          <Text style={styles.lbLoginYourAccount}>Register to your account!</Text>
          <View style={styles.loginContainer}>
            <Text style={styles.inputTitle}>First Name</Text>
            <TextInput onChangeText={(text) => setFirstName(text)} />
            <Text style={styles.inputTitle}>Last Name</Text>
            <TextInput onChangeText={(text) => setLastName(text)} />
            <Text style={styles.inputTitle}>Business Name</Text>
            <TextInput onChangeText={(text) => setBusinessName(text)} />
            <Text style={styles.inputTitle}>Email</Text>
            <TextInput autoCapitalize="none" placeholder="email" onChangeText={(text) => setEmail(text)} />
            <Text style={styles.inputTitle}>Password</Text>
            <SecureTextInput
              placeholder="password"
              isDarkMode={isDarkMode}
              onChangeText={(text) => setPassword(text)}
            />
            <TouchableOpacity style={styles.btnLogin} onPress={handleChangePassword} disabled={requesting}>
              {requesting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.lbLogin}>REGISTER</Text>
              )}
            </TouchableOpacity>
          </View>
          <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
};

export default Register;
