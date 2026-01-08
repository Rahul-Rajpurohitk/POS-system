import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { StackActions, NavigationActions } from 'react-navigation';
import { useDispatch, useSelector } from 'react-redux';
import DropdownAlert from 'react-native-dropdownalert';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ActionCreators } from '@actions';
import { Config, Constants } from '@common';
import http from '@services/http';
import SecureTextInput from '@components/SecureTextInput';
import TextInput from '@components/TextInput';
import { styles as dynamicStyles } from './style';

const { CLOSE_INTERVAL_ALERT_ERROR } = Constants;

export default Login = (props) => {
  const { navigation } = props;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginReducer = useSelector((state) => state.userReducers.login);
  const dispatch = useDispatch();
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dropdownAlertRef = useRef('');

  useEffect(() => {
    checkLogin();
    return () => {
      // almost same as componentWillUnmount
    };
  }, [loginReducer]);

  const checkLogin = () => {
    if (loginReducer.requesting) {
      return;
    }

    if (
      loginReducer.status === 'success' ||
      (loginReducer.result && loginReducer.result.token)
    ) {
      const resetAction = StackActions.reset({
        index: 0,
        actions: [
          NavigationActions.navigate({ routeName: 'MainStackNavigator' }),
        ],
      });
      navigation.dispatch(resetAction);
      http.setAuthorizationHeader(loginReducer.result.token);
    } else if (loginReducer.status === 'error') {
      dropdownAlertRef.current.alertWithType(
        'error',
        'Error',
        loginReducer.error,
        {},
        CLOSE_INTERVAL_ALERT_ERROR,
      );
    }
  };

  const handleLogin = () => {
    const { login } = ActionCreators;
    dispatch(login({ email, password }));
  };

  const goToRegister = () => {
    navigation.navigate('RegisterScreen');
  };

  const goToForgotPassword = () => {
    navigation.navigate('ForgotPasswordScreen')
  }

  return (
    <ImageBackground
      source={require('@assets/background/background.png')}
      style={styles.container}
      imageStyle={styles.background}>
      <KeyboardAwareScrollView enableResetScrollToCoords>
        <View style={styles.mainContainer}>
          <Image source={Config.Logo} style={styles.logo} />
          <Text style={styles.lbLoginYourAccount}>Log in to your account!</Text>
          <View style={styles.loginContainer}>
            <Text style={styles.inputTitle}>Email</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="email"
              onChangeText={(text) => setEmail(text)}
            />
            <Text style={styles.inputTitle}>Password</Text>
            <SecureTextInput
              placeholder="password"
              isDarkMode={isDarkMode}
              onChangeText={(text) => setPassword(text)}
            />
            <TouchableOpacity
              style={styles.btnLogin}
              onPress={handleLogin}
              disabled={loginReducer.requesting}>
              {loginReducer.requesting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.lbLogin}>LOG IN</Text>
              )}
            </TouchableOpacity>
            <View style={styles.actionWrapper}>
              <TouchableOpacity
                onPress={goToForgotPassword}
                style={styles.btnRegister}>
                <Text>Forgot password</Text>
              </TouchableOpacity>
              {Config.EnableRegister && (
                <TouchableOpacity
                  onPress={goToRegister}
                  style={styles.btnRegister}>
                  <Text>Register</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
          <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
};
