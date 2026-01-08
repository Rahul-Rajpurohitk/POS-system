import * as ActionTypes from './ActionTypes';
import validator from 'validator';

import UserServices from '@services/UserServices';

export const login = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.USER_LOGIN_REQUEST });
    const { email, password } = params;

    if (!validator.isEmail(email)) {
      return dispatch({
        type: ActionTypes.USER_LOGIN_FAIL,
        message: 'Email is incorrect format',
      });
    }
    if (password.length === 0) {
      return dispatch({
        type: ActionTypes.USER_LOGIN_FAIL,
        message: 'The password is required',
      });
    }

    return UserServices.login(params)
      .then(({ data }) => {
        dispatch({ type: ActionTypes.USER_LOGIN_SUCCESS, data });
      })
      .catch((message) => {
        dispatch({ type: ActionTypes.USER_LOGIN_FAIL, message });
      });
  };
};

export const updateUser = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.UPDATE_USER_REQUEST });

    return UserServices.updateUser(params)
      .then(({ data }) => {
        dispatch({ type: ActionTypes.UPDATE_USER_SUCCESS, data });
      })
      .catch((message) => {
        dispatch({ type: ActionTypes.UPDATE_USER_FAIL, message });
      });
  };
};

export const saveUserEditing = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.UPDATE_USER_SUCCESS, data: params });
  };
};

export const getStaffs = () => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.GET_STAFFS_REQUEST });

    return UserServices.getStaffs()
      .then(({ data }) => {
        dispatch({ type: ActionTypes.GET_STAFFS_SUCCESS, data });
      })
      .catch((message) => {
        dispatch({ type: ActionTypes.GET_STAFFS_FAIL, message });
      });
  };
};

export const addStaff = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.ADD_STAFF_REQUEST });

    return UserServices.addStaff(params)
      .then(({ data }) => {
        dispatch({ type: ActionTypes.ADD_STAFF_SUCCESS, data });
      })
      .catch((message) => {
        dispatch({ type: ActionTypes.ADD_STAFF_FAIL, message });
      });
  };
};

export const saveStaff = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.ADD_STAFF_SUCCESS, data: params });
  };
};

export const syncAddStaffs = (staffs) => (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_ADD_STAFFS_REQUEST });
  return Promise.all(
    staffs.map(async (params) => {
      try {
        const { data } = await UserServices.addStaff(params);
        return { ...data, localId: params.id };
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const localIds = data.map((item) => item.localId);
      dispatch({ type: ActionTypes.SYNC_ADD_STAFFS_SUCCESS, data, localIds });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_ADD_STAFFS_FAIL, message });
    });
};

export const removeStaff = (userId) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.DELETE_STAFF_SUCCESS, id: userId });
  };
};

export const saveStaffDeleted = (userId) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.SAVE_STAFF_DELETED, id: userId });
  };
};

export const deleteStaff = (userId) => (dispatch) => {
  dispatch({ type: ActionTypes.DELETE_STAFF_REQUEST });
  return UserServices.deleteStaff(userId)
    .then(() => {
      dispatch({ type: ActionTypes.DELETE_STAFF_SUCCESS, id: userId });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.DELETE_STAFF_FAIL, message });
    });
};

export const sycUpdateUser = (params) => async (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_UPDATE_USER_REQUEST });

  if (params.avatar) {
    const imageUploaded = await ImageServices.uploadImage({ uri: params.avatar });
    params.avatar = imageUploaded.file;
  }

  return UserServices.updateUser(params)
    .then(({ data }) => {
      dispatch({ type: ActionTypes.SYNC_UPDATE_USER_SUCCESS, data });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_UPDATE_USER_FAIL, message });
    });
};

export const editStaff = (params) => (dispatch) => {
  dispatch({ type: ActionTypes.EDIT_STAFF_REQUEST });
  return UserServices.editStaff(params)
    .then(({ data }) => {
      dispatch({ type: ActionTypes.EDIT_STAFF_SUCCESS, data });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.EDIT_STAFF_FAIL, message });
    });
};

export const saveStaffEditing = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.EDIT_STAFF_SUCCESS, data: params });
  };
};

export const logout = () => (dispatch) => {
  return dispatch({ type: 'USER_LOGOUT' });
};

export const syncEditingStaffs = (staffs) => (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_EDITING_STAFFS_REQUEST });
  return Promise.all(
    staffs.map(async (params) => {
      try {
        const { data } = await UserServices.editStaff(params);
        return data;
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const ids = data.map((item) => item.id);
      dispatch({ type: ActionTypes.SYNC_EDITING_STAFFS_SUCCESS, data, ids });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_EDITING_STAFFS_FAIL, message });
    });
};

export const syncDeletingStaffs = (staffs) => (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_DELETING_STAFFS_REQUEST });
  return Promise.all(
    staffs.map(async (id) => {
      try {
        const { data } = await UserServices.deleteStaff(id);
        return { ...data, id };
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const ids = data.map((item) => item.id);
      dispatch({ type: ActionTypes.SYNC_DELETING_STAFFS_SUCCESS, ids });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_DELETING_STAFFS_FAIL, message });
    });
};
