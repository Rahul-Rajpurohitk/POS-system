import React from 'react'
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native'
import { useSelector } from 'react-redux'
import { ResponsiveUtils, ThemeUtils } from '@common'
import { get } from 'lodash'

const styles = StyleSheet.create({
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
    fontSize: ResponsiveUtils.normalize(10),
    ...ThemeUtils.fontMaker({ weight: '700' }),
  }
});

const NotificationIcon = (props) => {
  const {
    screenProps
  } = props
  const notificationReducer = useSelector((state) => state.settingReducers.notification)
  const count = get(notificationReducer, 'count', 0)

  return (
    <TouchableOpacity style={styles.btnNotification} onPress={screenProps.openNotification}>
      <Image source={require('@assets/icons/ic_notifications.png')} style={styles.icNotifications} />
      {count > 0 &&
        <View style={styles.numberOfNotifications}>
          <Text style={styles.lbNumberNotifications}>{count}</Text>
        </View>
      }
    </TouchableOpacity>
  )
}

export default NotificationIcon