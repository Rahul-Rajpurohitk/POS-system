import React from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {get} from 'lodash';

import {ResponsiveUtils, ThemeUtils, Colors, Config} from '@common';

const menus = [
  {name: 'Edit Profile', route: 'EditProfileScreen'},
  {name: 'Change Password ', route: 'ChangePassword'},
  {name: 'Settings', route: 'Setting'},
  {name: 'Help', link: Config.HelpLink},
];

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    container: {
      width: ResponsiveUtils.normalize(340),
      paddingVertical: ResponsiveUtils.normalize(8),
    },
    userInfo: {
      marginHorizontal: ResponsiveUtils.normalize(24),
      marginVertical: ResponsiveUtils.normalize(16),
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrapper: {
      marginRight: ResponsiveUtils.normalize(16),
      width: ResponsiveUtils.normalize(76),
      height: ResponsiveUtils.normalize(76),
      borderRadius: ResponsiveUtils.normalize(38),
      overflow: 'hidden',
      backgroundColor: '#D8D8D8',
    },
    avatar: {
      width: ResponsiveUtils.normalize(76),
      height: ResponsiveUtils.normalize(76),
      resizeMode: 'cover',
    },
    userName: {
      fontSize: ResponsiveUtils.normalize(18),
      color: isDarkMode
        ? Colors.primaryTextColor.dark
        : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({weight: '700'}),
    },
    userId: {
      marginTop: ResponsiveUtils.normalize(5),
      fontSize: ResponsiveUtils.normalize(13),
      color: '#B1AEAE',
      ...ThemeUtils.fontMaker({weight: '400'}),
    },
    border: {
      height: 1,
      backgroundColor: isDarkMode
        ? Colors.borderColor.dark
        : Colors.borderColor.light,
      marginVertical: ResponsiveUtils.normalize(8),
    },
    menuItem: {
      paddingHorizontal: ResponsiveUtils.normalize(24),
      paddingVertical: ResponsiveUtils.normalize(8),
    },
    menuText: {
      fontSize: ResponsiveUtils.normalize(14),
      color: isDarkMode
        ? Colors.primaryTextColor.dark
        : Colors.primaryTextColor.light,
      ...ThemeUtils.fontMaker({weight: '400'}),
    },
  });
};

const PopupUserInfo = (props) => {
  const {isDarkMode, navigation, close, userInfo, logout} = props;
  const styles = dynamicStyles(isDarkMode);

  const goTo = (page) => {
    close();
    if (page.route) {
      navigation.navigate(page.route);
    } else if (page.link) {
      Linking.openURL(page.link)
        .then(() => {})
        .catch((e) => {});
    }
  };

  const onPressLogout = () => {
    close();
    logout();
  };

  if (!userInfo) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <View style={styles.avatarWrapper}>
          {!!userInfo.avatar && (
            <Image source={{uri: userInfo.avatar}} style={styles.avatar} />
          )}
        </View>
        <View>
          <Text style={styles.userName}>
            {`${userInfo.firstName} ${userInfo.lastName}`}
          </Text>
          <Text style={styles.userId}>{userInfo.email}</Text>
        </View>
      </View>
      <View style={styles.border} />
      {menus.map((item, index) => (
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => goTo(item)}
          key={index.toString()}>
          <Text style={styles.menuText}>{item.name}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.border} />
      <TouchableOpacity style={styles.menuItem} onPress={onPressLogout}>
        <Text style={styles.menuText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PopupUserInfo;
