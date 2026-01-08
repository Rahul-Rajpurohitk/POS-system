import * as ActionTypes from '../actions/ActionTypes';

const defaultState = {
  login: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  updateProfile: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  staffs: {
    status: '',
    result: [],
    error: null,
    requesting: false,
  },
  addStaff: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncAddStaffs: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  editStaff: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncEditingStaffs: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  forgotPassword: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  deletedStaffs: [],
};

export default function base(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.USER_LOGIN_REQUEST: {
      return {
        ...state,
        login: {
          ...state.login,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.USER_LOGIN_SUCCESS: {
      return {
        ...state,
        login: {
          ...state.login,
          result: action.data,
          requesting: false,
          status: 'success',
        },
      };
    }
    case ActionTypes.USER_LOGIN_FAIL: {
      return {
        ...state,
        login: {
          ...state.login,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.UPDATE_USER_REQUEST: {
      return {
        ...state,
        updateProfile: {
          ...state.updateProfile,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.UPDATE_USER_SUCCESS: {
      return {
        ...state,
        updateProfile: {
          ...state.updateProfile,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        login: {
          ...state.login,
          result: {...state.login.result, ...action.data},
        },
      };
    }
    case ActionTypes.UPDATE_USER_FAIL: {
      return {
        ...state,
        updateProfile: {
          ...state.updateProfile,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.GET_STAFFS_REQUEST: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.GET_STAFFS_SUCCESS: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          result: action.data,
          requesting: false,
          status: 'success',
        },
      };
    }
    case ActionTypes.GET_STAFFS_FAIL: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.ADD_STAFF_REQUEST: {
      return {
        ...state,
        addStaff: {
          result: null,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.ADD_STAFF_SUCCESS: {
      return {
        ...state,
        addStaff: {
          ...state.addStaff,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        staffs: {
          ...state.staffs,
          result: [...state.staffs.result, action.data],
        },
      };
    }
    case ActionTypes.ADD_STAFF_FAIL: {
      return {
        ...state,
        addStaff: {
          ...state.addStaff,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.SYNC_ADD_STAFFS_REQUEST: {
      return {
        ...state,
        syncAddStaffs: {
          ...state.syncAddStaffs,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.SYNC_ADD_STAFFS_SUCCESS: {
      return {
        ...state,
        syncAddStaffs: {
          ...state.syncAddStaffs,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        staffs: {
          ...state.staffs,
          result: [
            ...state.staffs.result.filter(
              (item) => !action.localIds.includes(item.id),
            ),
            ...action.data,
          ],
        },
      };
    }
    case ActionTypes.SYNC_ADD_STAFFS_FAIL: {
      return {
        ...state,
        syncAddStaffs: {
          ...state.syncAddStaffs,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.SYNC_UPDATE_USER_REQUEST: {
      return {
        ...state,
        updateProfile: {
          ...state.updateProfile,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.SYNC_UPDATE_USER_SUCCESS: {
      return {
        ...state,
        updateProfile: {
          ...state.updateProfile,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        login: {
          ...state.login,
          result: {token: state.login.result.token, ...action.data},
        },
      };
    }
    case ActionTypes.SYNC_UPDATE_USER_FAIL: {
      return {
        ...state,
        updateProfile: {
          ...state.updateProfile,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.DELETE_STAFF_REQUEST: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.DELETE_STAFF_SUCCESS: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          result: state.staffs.result.filter((item) => item.id !== action.id),
          status: 'success',
        },
      };
    }
    case ActionTypes.DELETE_STAFF_FAIL: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          error: action.message,
          status: 'error',
        },
      };
    }
    case ActionTypes.SAVE_STAFF_DELETED: {
      return {
        ...state,
        deletedStaffs: [...state.deletedStaffs, action.id],
        staffs: {
          ...state.staffs,
          result: state.staffs.result.filter((item) => item.id !== action.id),
          status: 'success',
        },
      };
    }
    case ActionTypes.EDIT_STAFF_REQUEST: {
      return {
        ...state,
        editStaff: {
          ...state.editStaff,
          error: null,
          status: '',
          requesting: true,
        },
      };
    }
    case ActionTypes.EDIT_STAFF_SUCCESS: {
      return {
        ...state,
        staffs: {
          ...state.staffs,
          result: state.staffs.result.map((item) =>
            item.id === action.data.id ? action.data : item,
          ),
        },
        editStaff: {
          ...state.editStaff,
          result: action.data,
          status: 'success',
          requesting: false,
        },
      };
    }
    case ActionTypes.EDIT_STAFF_FAIL: {
      return {
        ...state,
        editStaff: {
          ...state.editStaff,
          error: action.message,
          status: 'error',
          requesting: false,
        },
      };
    }
    case ActionTypes.SYNC_EDITING_STAFFS_REQUEST: {
      return {
        ...state,
        syncEditingStaffs: {
          ...state.syncEditingStaffs,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.SYNC_EDITING_STAFFS_SUCCESS: {
      return {
        ...state,
        syncEditingStaffs: {
          ...state.syncEditingStaffs,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        staffs: {
          ...state.staffs,
          result: state.staffs.result.map((item) => {
            const index = action.ids.indexOf(item.id);
            return index > -1 ? action.data[index] : item;
          }),
        },
      };
    }
    case ActionTypes.SYNC_EDITING_STAFFS_FAIL: {
      return {
        ...state,
        syncEditingStaffs: {
          ...state.syncEditingStaffs,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.SYNC_DELETING_STAFFS_SUCCESS: {
      return {
        ...state,
        deletedStaffs: state.deletedStaffs.filter(
          (id) => !action.ids.includes(id),
        ),
      };
    }
    default:
      return state;
  }
}
