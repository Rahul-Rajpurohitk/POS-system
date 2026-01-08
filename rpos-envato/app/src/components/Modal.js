import React from 'react';
import { Modal, Text, Image, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { ResponsiveUtils, Colors, ThemeUtils } from '@common';
import { isFunction } from 'lodash';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    mainContainer: {
      backgroundColor: isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light,
      padding: ResponsiveUtils.normalize(24),
      marginHorizontal: ResponsiveUtils.normalize(95),
      marginTop: ResponsiveUtils.normalize(85),
      marginBottom: ResponsiveUtils.normalize(60),
      borderRadius: 4,
      elevation: 2,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      flex: 1,
    },
    modalHeaderWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: ResponsiveUtils.normalize(16),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({ weight: '700' }),
    },
    icCloseModal: {
      width: ResponsiveUtils.normalize(20),
      height: ResponsiveUtils.normalize(20),
      resizeMode: 'contain',
      marginLeft: 10,
      marginBottom: 10,
    },
  });
};

const ModalComponent = (props) => {
  const {
    visible,
    onRequestClose,
    title,
    children,
    isDarkMode,
    modalStyle,
    containerStyle,
    headerWrapper,
    renderClose,
  } = props;
  const styles = dynamicStyles(isDarkMode);

  const lightIcClose = require('@assets/icons/ic_close_black.png');
  const darkIcClose = require('@assets/icons/ic_close_white.png');
  const icClose = isDarkMode ? darkIcClose : lightIcClose;

  return (
    <Modal visible={visible} transparent onRequestClose={onRequestClose}>
      <View onPress={onRequestClose} style={[styles.container, modalStyle]} activeOpacity={1}>
        <View style={{ flex: 1 }}>
          <View style={[styles.mainContainer, containerStyle]}>
            <View style={[styles.modalHeaderWrapper, headerWrapper]}>
              <Text style={styles.title}>{title}</Text>
              {isFunction(renderClose) ? (
                renderClose()
              ) : (
                <TouchableOpacity onPress={onRequestClose}>
                  <Image source={icClose} style={styles.icCloseModal} />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1 }}>{children}</View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ModalComponent;
