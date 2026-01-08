import moment from 'moment';
import * as ActionTypes from './ActionTypes';
import I18n from '@common/I18n';
import { changeBusiness } from '@services/SettingService';

export const changeLanguage = language => {
  return dispatch => {
    I18n.locale = language.value;
    moment.locale(language.value.substring(0, 2));
    dispatch({ type: ActionTypes.CHANGE_LANGUAGE, language });
  };
};

export const toggleDarkMode = () => {
  return dispatch => {
    dispatch({ type: ActionTypes.USER_TOGGLE_DARK_MODE });
  };
};

export const connectionInfoChange = isConnected => {
  return dispatch => {
    dispatch({ type: ActionTypes.CONNECTION_INFO_CHANGE, isConnected });
  };
};

export const changeSettingConfig = (currency, language, tax, name) => {
  return dispatch => {
    dispatch({ type: ActionTypes.CHANGE_CONFIG_SETTING_REQUEST });
    return changeBusiness(currency.code, language.value, tax, name)
      .then(() => {
        I18n.locale = language.value;
        moment.locale(language.value.substring(0, 2));
        dispatch({ type: ActionTypes.CHANGE_CONFIG_SETTING_SUCCESS, currency, tax, language, name });
      })
      .catch(error => {
        dispatch({ type: ActionTypes.CHANGE_CONFIG_SETTING_FAIL, error });
      });
  };
};

export const setNotificationIds = notificationIds => {
  return dispatch => {
    dispatch({ type: ActionTypes.SET_NOTIFICATIONS, notificationIds });
  };
};

export const readNotifcation = notificationId => {
  return dispatch => {
    dispatch({ type: ActionTypes.READ_NOTIFICATION, notificationId });
  };
};

export const selectPrinterBluetooth = connectedDevice => {
  return dispatch => {
    dispatch({ type: ActionTypes.SAVE_PRINTER, connectedDevice });
  };
};
