import * as ActionTypes from '../actions/ActionTypes';

const defaultState = {
  customers: {
    status: '',
    result: [],
    error: null,
    requesting: false,
  },
  deletedCustomers: [],
  addCustomer: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncAddCustomers: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncEditingCustomers: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  }
};

export default function base(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.GET_CUSTOMERS_REQUEST: {
      return {
        ...state,
        customers: {
          ...state.customers,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.GET_CUSTOMERS_SUCCESS: {
      return {
        ...state,
        customers: {
          ...state.customers,
          result: [
            ...action.data,
            ...state.customers.result.filter(customer => customer.id.includes('local-')),
          ],
          requesting: false,
          status: 'success',
        }
      };
    }
    case ActionTypes.GET_CUSTOMERS_FAIL: {
      return {
        ...state,
        customers: {
          ...state.customers,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.DELETE_CUSTOMER_REQUEST: {
      return {
        ...state,
        customers: {
          ...state.customers,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.DELETE_CUSTOMER_SUCCESS: {
      return {
        ...state,
        customers: {
          ...state.customers,
          result: state.customers.result.filter(item => item.id !== action.id),
          status: 'success',
        }
      };
    }
    case ActionTypes.DELETE_CUSTOMER_FAIL: {
      return {
        ...state,
        customers: {
          ...state.customers,
          error: action.message,
          status: 'error',
        }
      };
    }
    case ActionTypes.SAVE_CUSTOMER_DELETED: {
      return {
        ...state,
        deletedCustomers: [...state.deletedCustomers, action.id],
        customers: {
          ...state.customers,
          result: state.customers.result.filter(item => item.id !== action.id),
          status: 'success',
        }
      };
    }
    case ActionTypes.EDIT_CUSTOMER_REQUEST: {
      return {
        ...state,
        customers: {
          ...state.customers,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.EDIT_CUSTOMER_SUCCESS: {
      return {
        ...state,
        customers: {
          ...state.customers,
          result: state.customers.result.map(item => item.id === action.data.id ? action.data : item),
          status: 'success',
        }
      };
    }
    case ActionTypes.EDIT_CUSTOMER_FAIL: {
      return {
        ...state,
        customers: {
          ...state.customers,
          error: action.message,
          status: 'error',
        }
      };
    }
    case ActionTypes.ADD_CUSTOMER_REQUEST: {
      return {
        ...state,
        addCustomer: {
          result: null,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.ADD_CUSTOMER_SUCCESS: {
      return {
        ...state,
        addCustomer: {
          ...state.addCustomer,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        customers: {
          ...state.customers,
          result: [...state.customers.result, action.data],
        }
      };
    }
    case ActionTypes.ADD_CUSTOMER_FAIL: {
      return {
        ...state,
        addCustomer: {
          ...state.addCustomer,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_ADD_CUSTOMERS_REQUEST: {
      return {
        ...state,
        syncAddCustomers: {
          ...state.syncAddCustomers,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.SYNC_ADD_CUSTOMERS_SUCCESS: {
      return {
        ...state,
        syncAddCustomers: {
          ...state.syncAddCustomers,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        customers: {
          ...state.customers,
          result: [
            ...state.customers.result.filter(item => !action.localIds.includes(item.id)),
            ...action.data,
          ],
        }
      };
    }
    case ActionTypes.SYNC_ADD_CUSTOMERS_FAIL: {
      return {
        ...state,
        syncAddCustomers: {
          ...state.syncAddCustomers,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_EDITING_CUSTOMERS_REQUEST: {
      return {
        ...state,
        syncEditingCustomers: {
          ...state.syncEditingCustomers,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.SYNC_EDITING_CUSTOMERS_SUCCESS: {
      return {
        ...state,
        syncEditingCustomers: {
          ...state.syncEditingCustomers,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        customers: {
          ...state.customers,
          result: state.customers.result.map(item => {
            const index = action.ids.indexOf(item.id);
            return index > -1 ? action.data[index] : item;
          })
        }
      };
    }
    case ActionTypes.SYNC_EDITING_CUSTOMERS_FAIL: {
      return {
        ...state,
        syncEditingCustomers: {
          ...state.syncEditingCustomers,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_DELETING_CUSTOMERS_SUCCESS: {
      return {
        ...state,
        deletedCustomers: state.deletedCustomers.filter(id => !action.ids.includes(id))
      };
    }

    default:
      return state;
  }
}
