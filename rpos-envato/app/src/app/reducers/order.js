import * as ActionTypes from '../actions/ActionTypes';

const defaultState = {
  orders: {
    status: '',
    result: [],
    error: null,
    requesting: false,
  },
  addOrder: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncAddOrders: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  }
};

export default function base(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.GET_ALL_ORDERS_REQUEST: {
      return {
        ...state,
        orders: {
          ...state.orders,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.GET_ALL_ORDERS_SUCCESS: {
      return {
        ...state,
        orders: {
          ...state.orders,
          result: [
            ...action.data,
            ...state.orders.result.filter(order => order.id.includes('local-')),
          ],
          requesting: false,
          status: 'success',
        }
      };
    }
    case ActionTypes.GET_ALL_ORDERS_FAIL: {
      return {
        ...state,
        orders: {
          ...state.orders,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.ADD_ORDER_REQUEST: {
      return {
        ...state,
        addOrder: {
          result: null,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.ADD_ORDER_SUCCESS: {
      return {
        ...state,
        addOrder: {
          ...state.addOrder,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        orders: {
          ...state.orders,
          result: [...state.orders.result, action.data],
        }
      };
    }
    case ActionTypes.ADD_ORDER_FAIL: {
      return {
        ...state,
        addOrder: {
          ...state.addOrder,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_ADD_ORDERS_REQUEST: {
      return {
        ...state,
        syncAddOrders: {
          ...state.syncAddOrders,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.SYNC_ADD_ORDERS_SUCCESS: {
      return {
        ...state,
        syncAddOrders: {
          ...state.syncAddOrders,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        orders: {
          ...state.orders,
          result: [
            ...state.orders.result.filter(item => !action.localIds.includes(item.id)),
            ...action.data,
          ],
        }
      };
    }
    case ActionTypes.SYNC_ADD_ORDERS_FAIL: {
      return {
        ...state,
        syncAddOrders: {
          ...state.syncAddOrders,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }

    default:
      return state;
  }
}
