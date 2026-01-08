import React from 'react'
import {
  Text,
  ImageBackground,
  View,
  Image
} from 'react-native'
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import TextInput from '@components/TextInput'
import ButtonLoading from '@components/ButtonLoading'
import ButtonBack from '@components/ButtonBack'
import SecureTextInput from '@components/SecureTextInput'
import I18n from '@common/I18n'
import DropdownAlert from 'react-native-dropdownalert'
import { styles as dynamicStyles } from './styles'
import { Config } from '@common'
import ForgotPasswordHook from './hook'

const ForgotPassword = (props) => {
  const { navigation } = props
  const styles = useDynamicStyleSheet(dynamicStyles)
  const isDarkMode = useDarkMode()
  const {
    setEmail,
    dropdownAlertRef,
    onForgotPassword,
    loading,
    tokenReset,
    setCode,
    setPassword,
    email,
    code,
    password,
    onResetPassword
  } = ForgotPasswordHook(navigation)

  const onBack = () => {
    navigation.goBack()
  }

  return (
    <ImageBackground
      source={require('@assets/background/background.png')}
      style={styles.container}
      imageStyle={styles.background}>
      <KeyboardAwareScrollView enableResetScrollToCoords>
        <View style={styles.mainContainer}>
          <View style={styles.backWrapper}>
            <ButtonBack onPress={onBack} />
          </View>
          <Image source={Config.Logo} style={styles.logo} />
          <Text style={styles.forgotPasswordLabel}>{I18n.t('forgotPassword.title')}</Text>
          <View style={styles.forgotContainer}>
            {
              tokenReset ? (
                <>
                  <Text style={styles.inputTitle}>{I18n.t('forgotPassword.code')}</Text>
                  <TextInput
                    autoCapitalize="none"
                    placeholder={I18n.t('forgotPassword.inputCode')}
                    onChangeText={setCode}
                    value={code}
                  />
                  <Text style={styles.inputTitle}>{I18n.t('forgotPassword.newPassword')}</Text>
                  <SecureTextInput
                    placeholder={I18n.t('forgotPassword.inputPassword')}
                    isDarkMode={isDarkMode}
                    onChangeText={setPassword}
                    value={password}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.inputTitle}>{I18n.t('forgotPassword.email')}</Text>
                  <TextInput
                    autoCapitalize="none"
                    placeholder={I18n.t('forgotPassword.inputtEmail')}
                    onChangeText={setEmail}
                    value={email}
                  />
                </>
              )
            }
            <View style={styles.btnWrapper}>
              {
                tokenReset ? (
                  <ButtonLoading
                    text={I18n.t('forgotPassword.resetPassword')}
                    loading={loading}
                    style={styles.btnForgot}
                    styleText={styles.btnTextLogin}
                    onPress={onResetPassword}
                  />
                ) : (
                  <ButtonLoading
                    text={'Submit'}
                    loading={loading}
                    style={styles.btnForgot}
                    styleText={styles.btnTextLogin}
                    onPress={onForgotPassword}
                  />
                )
              }
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
    </ImageBackground>
  )
}

export default ForgotPassword