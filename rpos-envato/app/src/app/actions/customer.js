import * as ActionTypes from './ActionTypes';

import CustomerServices from '@services/CustomerServices';
import ImageServices from '@services/ImageServices';

export const getCustomers = () => {
  return dispatch => {
    dispatch({ type: ActionTypes.GET_CUSTOMERS_REQUEST });

    return CustomerServices.getCustomers()
      .then(({ data }) => {
        dispatch({ type: ActionTypes.GET_CUSTOMERS_SUCCESS, data });
      })
      .catch(message => {
        dispatch({ type: ActionTypes.GET_CUSTOMERS_FAIL, message });
      });
  };
};

export const addCustomer = (params) => {
  return dispatch => {
    dispatch({ type: ActionTypes.ADD_CUSTOMER_REQUEST });
    const body = {
      name: params.name,
      email: params.email,
      phone: params.phone,
      avatar: params.avatar,
      address: params.address,
    }

    return CustomerServices.addCustomer(body)
      .then(({ data }) => {
        dispatch({ type: ActionTypes.ADD_CUSTOMER_SUCCESS, data });
      })
      .catch(message => {
        dispatch({ type: ActionTypes.ADD_CUSTOMER_FAIL, message });
      });
  };
};

export const saveCustomer = (params) => {
  return dispatch => {
    dispatch({ type: ActionTypes.ADD_CUSTOMER_SUCCESS, data: params });
  };
};

export const removeCustomer = (customerId) => {
  return dispatch => {
    dispatch({ type: ActionTypes.DELETE_CUSTOMER_SUCCESS, id: customerId });
  };
};

export const saveCustomerDeleted = (customerId) => {
  return dispatch => {
    dispatch({ type: ActionTypes.SAVE_CUSTOMER_DELETED, id: customerId });
  };
};

export const deleteCustomer = (customerId) => dispatch => {
  dispatch({ type: ActionTypes.DELETE_CUSTOMER_REQUEST });
  return CustomerServices.deleteCustomer(customerId)
    .then(() => {
      dispatch({ type: ActionTypes.DELETE_CUSTOMER_SUCCESS, id: customerId });
    })
    .catch(message => {
      dispatch({ type: ActionTypes.DELETE_CUSTOMER_FAIL, message });
    });
};

export const editCustomer = (params) => dispatch => {
  dispatch({ type: ActionTypes.EDIT_CUSTOMER_REQUEST });
  return CustomerServices.editCustomer(params)
    .then(({ data }) => {
      dispatch({ type: ActionTypes.EDIT_CUSTOMER_SUCCESS, data });
    })
    .catch(message => {
      dispatch({ type: ActionTypes.EDIT_CUSTOMER_FAIL, message });
    });
};

export const saveCustomerEditing = (params) => {
  return dispatch => {
    dispatch({ type: ActionTypes.EDIT_CUSTOMER_SUCCESS, data: params });
  };
};

export const syncAddCustomers = (customers) => dispatch => {
  dispatch({ type: ActionTypes.SYNC_ADD_CUSTOMERS_REQUEST });
  return Promise.all(customers.map(async (item) => {
    let params = item;
    try {
      if (params.avatar) {
        const imageUploaded = await ImageServices.uploadImage({ uri: params.avatar });
        params.avatar = imageUploaded.file;
      }
      const { data } = await CustomerServices.addCustomer(params);
      return { ...data, localId: params.id };
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const localIds = data.map(item => item.localId);
    dispatch({ type: ActionTypes.SYNC_ADD_CUSTOMERS_SUCCESS, data, localIds });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_ADD_CUSTOMERS_FAIL, message });
  })
};

export const syncEditingCustomers = (customers) => dispatch => {
  dispatch({ type: ActionTypes.SYNC_EDITING_CUSTOMERS_REQUEST });
  return Promise.all(customers.map(async (item) => {
    let params = item;
    try {
      if (params.avatar && params.avatar.indexOf('http') !== 0) {
        const imageUploaded = await ImageServices.uploadImage({ uri: params.avatar });
        params.avatar = imageUploaded.file;
      }
      const { data } = await CustomerServices.editCustomer(params);
      return data;
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const ids = data.map(item => item.id);
    dispatch({ type: ActionTypes.SYNC_EDITING_CUSTOMERS_SUCCESS, data, ids });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_EDITING_CUSTOMERS_FAIL, message });
  })
};

export const syncDeletingCustomers = (customers) => dispatch => {
  dispatch({ type: ActionTypes.SYNC_DELETING_CUSTOMERS_REQUEST });
  return Promise.all(customers.map(async (id) => {
    try {
      const { data } = await CustomerServices.deleteCustomer(id)
      return { ...data, id };
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const ids = data.map(item => item.id);
    dispatch({ type: ActionTypes.SYNC_DELETING_CUSTOMERS_SUCCESS, ids });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_DELETING_CUSTOMERS_FAIL, message });
  })
};
