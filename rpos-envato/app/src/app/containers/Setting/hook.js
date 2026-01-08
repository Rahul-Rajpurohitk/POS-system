/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Currencies } from '@common/data/Currencies';
import I18n from '@common/I18n';
import { find, get } from 'lodash';
import { ActionCreators } from '@actions';
import { Constants } from '@common';
import validator from 'validator';
const { STATUS, CLOSE_INTERVAL_ALERT_ERROR } = Constants;

const SettingHook = () => {
  const settingConfigReducer = useSelector((state) => state.settingReducers.config);
  const isDarkMode = useSelector((state) => state.settingReducers.isDarkMode);
  const [currency, setCurrency] = useState(settingConfigReducer.currency);
  const [language, setLanguage] = useState(settingConfigReducer.language);
  const [visibleLangModal, setVisibleLangModal] = useState(false);
  const [visibleCurrencyModal, setVisibleCurrencyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tax, setTax] = useState(get(settingConfigReducer, ['tax'], 0));
  const [name, setName] = useState(get(settingConfigReducer, ['name'], ''));
  const dispatch = useDispatch();
  const alertRef = useRef();

  const onChangeLang = ({ item }) => {
    setLanguage(item);
    setVisibleLangModal(false);
  };

  const onChangeCurrency = ({ item }) => {
    const curr = find(Currencies, (it) => it.code === item.value);
    setCurrency(curr);
    setVisibleCurrencyModal(false);
  };

  const handleToggleDarkMode = () => {
    const { toggleDarkMode } = ActionCreators;
    dispatch(toggleDarkMode());
  };

  const onChangeConfig = () => {
    try {
      if (validator.isEmpty(name.trim())) {
        throw 'Please enter business name';
      }
      const { changeSettingConfig } = ActionCreators;
      setLoading(true);
      dispatch(changeSettingConfig(currency, language, tax, name));
    } catch (error) {
      showMessageError(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) {
      const { status, error } = settingConfigReducer;
      if (settingConfigReducer.status !== STATUS.LOADING) {
        setLoading(false);
        if (status === STATUS.SUCCESS) {
          showMessage('info', 'INFO', I18n.t('setting.changeSuccess'), 3000);
        }
        if (status === STATUS.FAILED) {
          showMessageError(error);
        }
      }
    }
  }, [settingConfigReducer]);

  const showMessageError = (message) => {
    showMessage('error', 'Error', message);
  };

  const showMessage = (type, title, msg, timeout = CLOSE_INTERVAL_ALERT_ERROR) => {
    alertRef.current.alertWithType(type, title, msg, {}, timeout);
  };

  return {
    settingConfig: settingConfigReducer,
    currency,
    language,
    visibleLangModal,
    setVisibleLangModal,
    visibleCurrencyModal,
    setVisibleCurrencyModal,
    onChangeLang,
    onChangeCurrency,
    handleToggleDarkMode,
    isDarkMode,
    loading,
    tax,
    setTax,
    onChangeConfig,
    alertRef,
    name,
    setName,
  };
};

export default SettingHook;
