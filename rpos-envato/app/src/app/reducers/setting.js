import { Currencies } from '@common/data/Currencies';
import * as ActionTypes from '../actions/ActionTypes';
import { languages } from '@common/data/Languages';
import { Constants } from '@common';
import { uniq, filter } from 'lodash';
const { STATUS } = Constants;

const defaultState = {
  isDarkMode: false,
  isOfflineMode: false,
  config: {
    language: languages[0],
    currency: Currencies[0],
    tax: '0',
    name: '',
    status: '',
  },
  notification: {
    notifications: [],
    notificationRead: [],
    count: 0,
  },
  connectedDevice: null,
};

export default function base(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.USER_CHANGE_LANG: {
      return {
        ...state,
        language: action.data,
      };
    }
    case ActionTypes.USER_TOGGLE_DARK_MODE: {
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
      };
    }
    case ActionTypes.CONNECTION_INFO_CHANGE: {
      return {
        ...state,
        isOfflineMode: !action.isConnected,
      };
    }
    case ActionTypes.USER_CHANGE_CURRENCY: {
      return {
        ...state,
        currency: action.data,
      };
    }
    case ActionTypes.CHANGE_CONFIG_SETTING_SUCCESS: {
      return {
        ...state,
        config: {
          ...state.config,
          language: action.language,
          currency: action.currency,
          tax: action.tax,
          name: action.name,
          status: STATUS.SUCCESS,
        },
      };
    }
    case ActionTypes.CHANGE_CONFIG_SETTING_FAIL: {
      return {
        ...state,
        config: {
          ...state.config,
          status: STATUS.FAILED,
          error: action.error,
        },
      };
    }
    case ActionTypes.CHANGE_CONFIG_SETTING_REQUEST: {
      return {
        ...state,
        config: {
          ...state.config,
          status: STATUS.LOADING,
        },
      };
    }

    case ActionTypes.SET_NOTIFICATIONS: {
      const noticationIds = uniq(state.notification.notifications.concat(action.notificationIds));
      return {
        ...state,
        notification: {
          ...state.notification,
          notificationIds: noticationIds,
          count: filter(noticationIds, it => {
            return !state.notification.notificationRead.includes(it);
          }).length,
        },
      };
    }

    case ActionTypes.READ_NOTIFICATION: {
      const notificationRead = uniq(state.notification.notificationRead.concat(action.notificationId));
      return {
        ...state,
        notification: {
          ...state.notification,
          notificationRead: notificationRead,
          count: filter(state.notification.notificationIds, it => {
            return !notificationRead.includes(it);
          }).length,
        },
      };
    }

    case ActionTypes.CHANGE_LANGUAGE: {
      return {
        ...state,
        config: {
          ...state.config,
          language: action.language,
        },
      };
    }

    case ActionTypes.SAVE_PRINTER: {
      return {
        ...state,
        connectedDevice: action.connectedDevice,
      };
    }
    default:
      return state;
  }
}
