import React from 'react';
import { Text, View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Menu, MenuOptions, MenuTrigger, renderers } from 'react-native-popup-menu';
import { get } from 'lodash';
import NotificationIcon from '@components/NotificationIcon'

import { Styles as stylesCommon, ResponsiveUtils, Colors, Config, ThemeUtils } from '@common';
import PopupUserInfo from '@components/PopupUserInfo';

const { Popover } = renderers;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  icDropdown: {
    width: ResponsiveUtils.normalize(24),
    height: ResponsiveUtils.normalize(24),
    resizeMode: 'contain',
  },
  btnNotification: {
    marginRight: ResponsiveUtils.normalize(24),
    alignSelf: 'center',
  },
  icNotifications: {
    width: ResponsiveUtils.normalize(32),
    height: ResponsiveUtils.normalize(32),
    resizeMode: 'contain',
  },
  numberOfNotifications: {
    width: ResponsiveUtils.normalize(18),
    height: ResponsiveUtils.normalize(18),
    borderRadius: ResponsiveUtils.normalize(9),
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lbNumberNotifications: {
    color: '#FFF',
    fontSize: ResponsiveUtils.normalize(8),
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  userInfoWrapper: {
    paddingLeft: ResponsiveUtils.normalize(5),
    paddingRight: ResponsiveUtils.normalize(23),
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderColor.light,
  },
  avatarWrapper: {
    marginHorizontal: ResponsiveUtils.normalize(10),
    borderRadius: ResponsiveUtils.normalize(17),
    width: ResponsiveUtils.normalize(34),
    height: ResponsiveUtils.normalize(34),
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  avatar: {
    width: ResponsiveUtils.normalize(34),
    height: ResponsiveUtils.normalize(34),
    resizeMode: 'cover',
  },
  userName: {
    color: '#FFF',
    fontSize: ResponsiveUtils.normalize(12),
    ...ThemeUtils.fontMaker({ weight: '600' }),
  },
});

let menuRef = null;

export const headerWithoutButtonBack = ({ navigation, screenProps }) => ({
  header: (
    <View style={stylesCommon.headerStyle}>
      <View style={stylesCommon.headerLeft}>
        <Image source={Config.LogoHeader} style={stylesCommon.headerIcon} />
      </View>
      <TouchableOpacity style={stylesCommon.headerCenter} onPress={screenProps.openQuickLinks}>
        <Text style={stylesCommon.headerTitleStyle}>{screenProps.title}</Text>
        <Image source={require('@assets/icons/ic_dropdown.png')} style={styles.icDropdown} />
      </TouchableOpacity>
      <View style={stylesCommon.headerRight}>
        <NotificationIcon screenProps={screenProps} />
        <TouchableOpacity style={[styles.row, styles.userInfoWrapper]} onPress={() => menuRef.open()}>
          <Menu
            ref={(ref) => (menuRef = ref)}
            renderer={Popover}
            rendererProps={{
              placement: 'bottom',
              preferredPlacement: 'bottom',
              anchorStyle: {
                backgroundColor: screenProps.isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light,
              },
            }}>
            <MenuTrigger>
              <View style={styles.avatarWrapper}>
                {!!get(screenProps, 'userInfo.avatar') && (
                  <Image source={{ uri: get(screenProps, 'userInfo.avatar', '') }} style={styles.avatar} />
                )}
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsWrapper: {
                  backgroundColor: screenProps.isDarkMode
                    ? Colors.containerBgColor.dark
                    : Colors.containerBgColor.light,
                },
              }}>
              <PopupUserInfo
                isDarkMode={screenProps.isDarkMode}
                navigation={navigation}
                close={() => menuRef.close()}
                userInfo={screenProps.userInfo}
                logout={screenProps.logout}
              />
            </MenuOptions>
          </Menu>
          <Text style={styles.userName}>
            {`${get(screenProps, 'userInfo.firstName', '')} ${get(screenProps, 'userInfo.lastName', '')}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ),
});
