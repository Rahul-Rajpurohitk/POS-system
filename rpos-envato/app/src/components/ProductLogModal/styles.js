import { StyleSheet } from 'react-native';
import { ResponsiveUtils } from '@common';

export const dynamicStyles = isDarkMode => {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      marginHorizontal: ResponsiveUtils.normalize(150),
      marginTop: ResponsiveUtils.normalize(120),
      marginBottom: ResponsiveUtils.normalize(110),
    },
    itemWrapper: {
      paddingVertical: ResponsiveUtils.normalize(10),
      paddingHorizontal: ResponsiveUtils.normalize(5),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    separatorImage: {
      height: ResponsiveUtils.normalize(1),
      backgroundColor: '#D8D8D8',
    },
    list: {
      marginTop: ResponsiveUtils.normalize(10),
    },
    time: {
      color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    },
  });
};
