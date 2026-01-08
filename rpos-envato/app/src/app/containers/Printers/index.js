/* eslint-disable no-alert */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform, FlatList } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import { useDispatch, useSelector } from 'react-redux';
import { ActionCreators } from '@actions';
import { Constants } from '@common';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';
import { BluetoothManager } from 'react-native-bluetooth-escpos-printer';
import BluetoothStateManager from 'react-native-bluetooth-state-manager';
import * as Global from '../../common/Global';
import PrinterManagement from '../../common/PrinterManagement';
import Icon from 'react-native-vector-icons/FontAwesome';
import _ from 'lodash';

const Printers = props => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const [isScanning, setIsScanning] = useState(false);
  const [foundDs, setFoundDs] = useState([]);
  const [paired, setPaired] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const connectedDevice = useSelector(state => state.settingReducers.connectedDevice);
  const dispatch = useDispatch();

  const renderFoundItem = (item, index) => {
    if (!item.address) {
      return <View />;
    }
    const isLoading = connecting && selectedItem && selectedItem.address == item.address;

    return (
      <View style={styles.item} key={index}>
        <View style={styles.itemContent}>
          {item.name != undefined && item.name != null && item.name.trim().length > 0 && (
            <Text style={styles.name}>{item.name}</Text>
          )}
          <Text style={styles.address}>{item.address}</Text>
        </View>
        <TouchableOpacity style={styles.btnConnect} onPress={() => connectDevice(item)}>
          {isLoading && <ActivityIndicator />}
          {!isLoading && <Text>Connect</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPairedItem = (item, index) => {
    if (!item.address) {
      return <View />;
    }
    const isShow = !connectedDevice || connectedDevice.name !== item.name;

    return (
      <View style={styles.item} key={index}>
        <View style={styles.itemContent}>
          {item.name !== undefined && item.name != null && item.name.trim().length > 0 && (
            <Text style={styles.name}>{item.name}</Text>
          )}
          <Text style={styles.address}>{item.address}</Text>
        </View>
        {isShow && (
          <TouchableOpacity style={styles.btnConnect} onPress={() => selectDevice(item)}>
            <Text>Select</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const connectDevice = item => {
    setSelectedItem(item);
    setConnecting(true);
    PrinterManagement.connect(
      item.address,
      () => {
        setConnecting(false);
        PrinterManagement.setConnectedDevice(item);
        dispatch(ActionCreators.selectPrinterBluetooth(item));
        setFoundDs(_.filter(foundDs, o => o.address !== item.address));
        setPaired([...paired, item]);
      },
      e => {
        setConnecting(false);
        alert(e);
      },
    );
  };

  const scanDevices = async () => {
    try {
      setIsScanning(true);
      let enabled = await BluetoothManager.isBluetoothEnabled();
      if (enabled === 'false' && Platform.OS === 'android') {
        enabled = await BluetoothStateManager.requestToEnable();
        if (!enabled) {
          setIsScanning(false);
          return alert('Please turn on bluetooth');
        }
      } else if (enabled === 'false' && Platform.OS === 'ios') {
        setIsScanning(false);
        return alert('Please turn on bluetooth');
      }
      PrinterManagement.scanDevices(() => {
        setIsScanning(false);
      });
    } catch (error) {
      setIsScanning(false);
      alert(error);
    }
  };

  const selectDevice = device => {
    dispatch(ActionCreators.selectPrinterBluetooth(device));
  };

  useEffect(() => {
    Global.EventEmitter.addEventListener(Constants.EVENT_DEVICE_FOUND, device => {
      if (_.findIndex(foundDs, o => o.address === device.address) === -1 && device.name) {
        const newItems = [...foundDs, device];
        setFoundDs(newItems);
      }
    });
    Global.EventEmitter.addEventListener(Constants.EVENT_DEVICE_ALREADY_PAIRED, items => {
      setPaired(items);
    });
  }, [foundDs]);

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('addCategory.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('printer.title')}</Text>
      </View>
      <ScrollView style={styles.mainContainer}>
        {paired.length > 0 && (
          <View>
            <Text style={styles.section}>Paired: </Text>
            {paired.map(renderPairedItem)}
          </View>
        )}
        {foundDs.length > 0 && (
          <View>
            <Text style={styles.section}>Found: </Text>
            {foundDs.map(renderFoundItem)}
          </View>
        )}
      </ScrollView>
      <TouchableOpacity disabled={isScanning} style={styles.btnAddNew} onPress={scanDevices}>
        <Icon name={isScanning ? 'stop' : 'search'} size={15} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

export default Printers;
