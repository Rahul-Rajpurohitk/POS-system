import React from 'react';
import {TextInput, StyleSheet} from 'react-native';

import {ResponsiveUtils, Colors, ThemeUtils} from '@common';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    input: {
      marginHorizontal: ResponsiveUtils.normalize(1),
      paddingVertical: ResponsiveUtils.normalize(10),
      paddingHorizontal: ResponsiveUtils.normalize(20),
      fontSize: ResponsiveUtils.normalize(16),
      color: isDarkMode
        ? Colors.primaryTextColor.dark
        : Colors.primaryTextColor.light,
      backgroundColor: isDarkMode
        ? Colors.containerBgColor.dark
        : Colors.containerBgColor.light,
      borderRadius: 4,
      elevation: 1,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      ...ThemeUtils.fontMaker({weight: '400'}),
    },
  });
};

const TextInputComponent = (props) => {
  const {isDarkMode} = props;
  const styles = dynamicStyles(isDarkMode);

  return (
    <TextInput
      style={styles.input}
      placeholderTextColor={
        isDarkMode
          ? Colors.placeholderColor.dark
          : Colors.placeholderColor.light
      }
      {...props}
    />
  );
};

export default TextInputComponent;
