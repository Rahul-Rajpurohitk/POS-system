import React from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ResponsiveUtils, Colors } from '@common';
import Modal from './Modal';
import moment from 'moment';
import HTMLView from './HTMLView';
import { get } from 'lodash';
import { ActionCreators } from '@actions';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    modal: {
      flex: 1,
      alignItems: 'flex-end',
    },
    container: {
      flex: 1,
      width: ResponsiveUtils.normalize(364),
      padding: 0,
      paddingVertical: ResponsiveUtils.normalize(24),
      marginHorizontal: 0,
      marginTop: 0,
      marginBottom: 0,
      borderRadius: 0,
    },
    headerWrapper: {
      marginLeft: ResponsiveUtils.normalize(24),
      marginRight: ResponsiveUtils.normalize(30),
    },
    list: {
      marginTop: ResponsiveUtils.normalize(30),
    },
    separatorImage: {
      height: ResponsiveUtils.normalize(1),
      backgroundColor: '#D8D8D8',
    },
    item: {
      marginLeft: ResponsiveUtils.normalize(24),
      marginRight: ResponsiveUtils.normalize(30),
      paddingVertical: ResponsiveUtils.normalize(20),
    },
    row: {
      flexDirection: 'row',
    },
    contentContainer: {
      marginTop: ResponsiveUtils.normalize(10),
    },
    time: {
      flex: 1,
      fontSize: ResponsiveUtils.normalize(12),
      color: '#74787C',
    },
    dotUnRead: {
      height: 10,
      width: 10,
      borderRadius: 6,
      backgroundColor: Colors.primaryColor.light,
    },
    icNotificationTypleWrapper: {
      marginRight: ResponsiveUtils.normalize(7),
      width: ResponsiveUtils.normalize(30),
      height: ResponsiveUtils.normalize(30),
      borderRadius: ResponsiveUtils.normalize(15),
      backgroundColor: '#EEEEEE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    icNotificationType: {
      width: ResponsiveUtils.normalize(16),
      height: ResponsiveUtils.normalize(16),
      resizeMode: 'contain',
    },
    massage: {
      fontSize: ResponsiveUtils.normalize(13),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
    },
  });
};

const ModalNotification = (props) => {
  const { visible, onRequestClose, isDarkMode, data, loadMoreData, loading } = props;
  const styles = dynamicStyles(isDarkMode);
  const dispatch = useDispatch();
  const notificationReducer = useSelector((state) => state.settingReducers.notification);
  const notificationRead = get(notificationReducer, 'notificationRead', []);

  const readNotification = (item) => {
    if (notificationRead.includes(item._id)) return;
    const { readNotifcation } = ActionCreators;
    dispatch(readNotifcation(item._id));
  };

  renderRow = ({ item }) => (
    <TouchableOpacity style={styles.item} activeOpacity={0.8} onPress={() => readNotification(item)}>
      <View style={styles.row}>
        <Text style={styles.time}>{moment(item.createdAt).fromNow()}</Text>
        {!notificationRead.includes(item._id) && <View style={styles.dotUnRead} />}
      </View>
      <View style={[styles.row, styles.contentContainer]}>
        <View style={styles.icNotificationTypleWrapper}>
          <Image source={require('@assets/icons/ic_notification_person.png')} style={styles.icNotificationType} />
        </View>
        <View style={{ flex: 1 }}>
          <HTMLView html={item.content} isDarkMode={isDarkMode} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      title="NOTIFICATION"
      isDarkMode={isDarkMode}
      modalStyle={styles.modal}
      containerStyle={styles.container}
      headerWrapper={styles.headerWrapper}>
      <FlatList
        style={styles.list}
        data={data}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={styles.separatorImage} />}
        keyExtractor={(item, index) => index.toString()}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.1}
      />
      {loading && (
        <View style={{ flex: 1, marginTop: 10, alignItems: 'center' }}>
          <ActivityIndicator size="small" />
        </View>
      )}
    </Modal>
  );
};

export default ModalNotification;
