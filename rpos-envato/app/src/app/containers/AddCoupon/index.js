/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, TextInput as CustomTextInput } from 'react-native';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import DropdownAlert from 'react-native-dropdownalert';
import { useDispatch, useSelector } from 'react-redux';
import validator from 'validator';
import randomId from 'random-id';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import TextInput from '@components/TextInput';
import { ActionCreators } from '@actions';
import { Constants, Utils } from '@common';
import I18n from '@common/I18n';
import moment from 'moment';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { styles as dynamicStyles } from './style';

const { CLOSE_INTERVAL_ALERT_SUCCESS, CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const radioButtons = [
  { label: 'Fixed', value: 'fixed' },
  { label: 'Percentage', value: 'percentage' },
];

const AddCoupon = (props) => {
  const { navigation } = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();

  const [type, setType] = useState('fixed');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [expiredAt, setExpiredAt] = useState(null);
  const dropdownAlertRef = useRef('');
  const dispatch = useDispatch();
  const isOfflineMode = useSelector((state) => state.settingReducers.isOfflineMode);
  const addCouponReducer = useSelector((state) => state.couponReducers.addCoupon);
  const currency = useSelector((state) => state.settingReducers.config.currency);

  useEffect(() => {
    if (isAdding) {
      if (addCouponReducer.status === 'success') {
        setIsAdding(false);
        addCouponSuccess();
      }
      if (addCouponReducer.status === 'error') {
        setIsAdding(false);
        addCouponFail();
      }
    }
  }, [addCouponReducer]);

  const clear = () => {
    setType('fixed');
    setName('');
    setCode('');
    setAmount('');
    setExpiredAt(null);
  };

  const handleConfirmDatePicker = (date) => {
    setDatePickerVisible(false);
    setExpiredAt(date);
  };

  const handleCancelDatePicker = () => {
    setDatePickerVisible(false);
    if (expiredAt) {
      setExpiredAt(null);
    }
  };

  const addCouponSuccess = () => {
    dropdownAlertRef.current.alertWithType(
      'success',
      'Success',
      'Coupon has successfully added.',
      {},
      CLOSE_INTERVAL_ALERT_SUCCESS,
    );
    clear();
  };

  const addCouponFail = () => {
    dropdownAlertRef.current.alertWithType('error', 'Error', addCouponReducer.error, {}, CLOSE_INTERVAL_ALERT_ERROR);
  };

  const handleAddCoupon = async () => {
    const { addCoupon, saveCoupon } = ActionCreators;
    try {
      if (validator.isEmpty(code.trim()) || validator.isEmpty(name.trim())) {
        throw 'Please input name and code of coupon.';
      }
      if (!validator.isEmpty(amount) && !validator.isNumeric(amount)) {
        throw 'Please input amount is number only.';
      }

      setIsAdding(true);
      const params = {
        code: code.trim(),
        name: name.trim(),
        id: 'local-' + randomId(),
        amount: Number(amount),
        type: type,
      };

      if (expiredAt) {
        params.expiredAt = expiredAt;
      }
      if (isOfflineMode) {
        return dispatch(saveCoupon(params));
      }

      dispatch(addCoupon(params));
    } catch (error) {
      setIsAdding(false);
      dropdownAlertRef.current.alertWithType('error', 'Error', error, {}, CLOSE_INTERVAL_ALERT_ERROR);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headContainer}>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lbBack}>{I18n.t('addCoupon.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{I18n.t('addCoupon.title')}</Text>
      </View>
      <KeyboardAwareScrollView enableResetScrollToCoords enableOnAndroid>
        <View style={styles.mainContainer}>
          <Text style={styles.inputLabel}>{I18n.t('addCoupon.name')}</Text>
          <TextInput
            placeholder="Coupon name"
            isDarkMode={isDarkMode}
            value={name}
            onChangeText={(text) => setName(text)}
          />

          <Text style={styles.inputLabel}>{I18n.t('addCoupon.code')}</Text>
          <TextInput
            placeholder="0001MHG"
            isDarkMode={isDarkMode}
            value={code}
            onChangeText={(text) => setCode(text)}
          />

          <Text style={styles.inputLabel}>{I18n.t('addCoupon.type')}</Text>
          <View style={styles.radioBtnWrapper}>
            {radioButtons.map((item, index) => (
              <TouchableOpacity style={styles.btnRadio} key={index.toString()} onPress={() => setType(item.value)}>
                <Image
                  source={
                    type === item.value
                      ? require('@assets/icons/ic_radio_full.png')
                      : require('@assets/icons/ic_radio_empty.png')
                  }
                  style={styles.icRadio}
                />
                <Text style={styles.labelRadioStyle}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>{I18n.t('addCoupon.amount')}</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.prefix}>{type === 'fixed' ? currency.symbol : '%'}</Text>
            <CustomTextInput
              style={styles.inputText}
              placeholder="10.0"
              isDarkMode={isDarkMode}
              value={amount}
              onChangeText={(text) => setAmount(text)}
            />
          </View>
          <Text style={styles.inputLabel}>{I18n.t('editCoupon.expireDate')}</Text>
          <View>
            <TouchableOpacity style={styles.btnCalendar} onPress={setDatePickerVisible}>
              <Image source={require('@assets/icons/ic_calendar.png')} style={styles.icCalendar} />
              <Text style={[styles.lbChooseDate, !expiredAt && styles.dateLabel]}>
                {expiredAt ? moment(expiredAt).format('DD-MM-YYYY HH:mm A') : I18n.t('editCoupon.chooseDate')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity disabled={isAdding} style={styles.btnAddNew} onPress={handleAddCoupon}>
            {isAdding ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.lbAddNew}>{I18n.t('addCoupon.addCoupon')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <DropdownAlert ref={dropdownAlertRef} updateStatusBar={false} />
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        display="spinner"
        onConfirm={handleConfirmDatePicker}
        onCancel={handleCancelDatePicker}
      />
    </View>
  );
};

export default AddCoupon;
