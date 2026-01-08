import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { QUICK_LINKS } from '@common/data/QuickLinks';
import { Colors, ResponsiveUtils, ThemeUtils } from '@common';
import { useDarkMode } from 'react-native-dark-mode';
import I18n from '@common/I18n';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.primaryColor.light,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnClose: {
      position: 'absolute',
      top: 0,
      right: 0,
      paddingTop: ResponsiveUtils.normalize(44),
      paddingRight: ResponsiveUtils.normalize(44),
    },
    icClose: {
      height: ResponsiveUtils.normalize(24),
      width: ResponsiveUtils.normalize(24),
      resizeMode: 'stretch',
    },
    mainContainer: {
      marginHorizontal: ResponsiveUtils.normalize(180),
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    quickLinkItem: {
      backgroundColor: isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light,
      width: ResponsiveUtils.normalize(206),
      height: ResponsiveUtils.normalize(144),
      marginHorizontal: ResponsiveUtils.normalize(5),
      marginVertical: ResponsiveUtils.normalize(5),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 4,
    },
    qickLinkIcon: {
      width: ResponsiveUtils.normalize(50),
      height: ResponsiveUtils.normalize(50),
      resizeMode: 'contain',
      marginBottom: ResponsiveUtils.normalize(18),
    },
    qickLinkText: {
      fontSize: ResponsiveUtils.normalize(12),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({ weight: '600' }),
    },
  });
}

const ModalQuickLinks = (props) => {
  const { visible, close, openQuickLink } = props;
  const isDarkMode = useDarkMode();
  const styles = dynamicStyles(isDarkMode);

  return (
    <Modal
      visible={visible}
      transparent={false}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.btnClose} onPress={close}>
          <Image
            source={require('@assets/icons/ic_close_white.png')}
            style={styles.icClose}
          />
        </TouchableOpacity>
        <View style={styles.mainContainer}>
          {QUICK_LINKS.map((link, index) => (
            <TouchableOpacity
              onPress={() => openQuickLink(link)}
              style={styles.quickLinkItem}
              key={index.toString()}>
              <Image source={link.image} style={styles.qickLinkIcon} />
              <Text style={styles.qickLinkText}>{I18n.t(link.name)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export default ModalQuickLinks;
