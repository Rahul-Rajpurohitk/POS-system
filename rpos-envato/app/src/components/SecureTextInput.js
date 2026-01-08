import React, { useState } from 'react';
import { TextInput, StyleSheet, View, Image, TouchableOpacity } from 'react-native';

import { ResponsiveUtils, Colors, ThemeUtils } from '@common';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light,
      paddingHorizontal: ResponsiveUtils.normalize(17),
      borderRadius: 4,
      elevation: 1,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.25,
      shadowRadius: 2,
    },
    textInput: {
      flex: 1,
      paddingVertical: ResponsiveUtils.normalize(10),
      width: ResponsiveUtils.normalize(323),
      fontSize: ResponsiveUtils.normalize(16),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({ weight: '400' }),
    },
    btnShowPassword: {
      width: ResponsiveUtils.normalize(24),
      height: ResponsiveUtils.normalize(24),
      resizeMode: 'contain',
      paddingHorizontal: ResponsiveUtils.normalize(3),
    },
  });
}

const SecureTextInput = (props) => {
  const { isDarkMode } = props;
  const styles = dynamicStyles(isDarkMode);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  return (
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.textInput}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={isDarkMode ? Colors.placeholderColor.dark : Colors.placeholderColor.light}
        {...props}
      />
      <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
        <Image
          source={
            secureTextEntry
              ? require('@assets/icons/ic_eye.png')
              : require('@assets/icons/ic_close_eye.png')
          }
          style={styles.btnShowPassword}
        />
      </TouchableOpacity>
    </View>
  );
}

export default SecureTextInput;
