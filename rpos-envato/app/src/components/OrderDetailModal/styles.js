import { StyleSheet } from 'react-native'
import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    modalContainer: {
      flex: 1
    },
  });
}

export default dynamicStyles