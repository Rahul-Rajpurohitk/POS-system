import * as ActionTypes from '../actions/ActionTypes';

const defaultState = {
  coupons: {
    status: '',
    result: [],
    error: null,
    requesting: false,
  },
  deletedCoupons: [],
  addCoupon: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncAddCoupons: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncEditingCoupons: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  }
};

export default function base(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.GET_COUPONS_REQUEST: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.GET_COUPONS_SUCCESS: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          result: [
            ...action.data,
            ...state.coupons.result.filter(coupon => coupon.id.includes('local-')),
          ],
          requesting: false,
          status: 'success',
        }
      };
    }
    case ActionTypes.GET_COUPONS_FAIL: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.DELETE_COUPON_REQUEST: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.DELETE_COUPON_SUCCESS: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          result: state.coupons.result.filter(item => item.id !== action.id),
          status: 'success',
        }
      };
    }
    case ActionTypes.DELETE_COUPON_FAIL: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          error: action.message,
          status: 'error',
        }
      };
    }
    case ActionTypes.SAVE_COUPON_DELETED: {
      return {
        ...state,
        deletedCoupons: [...state.deletedCoupons, action.id],
        coupons: {
          ...state.coupons,
          result: state.coupons.result.filter(item => item.id !== action.id),
          status: 'success',
        }
      };
    }
    case ActionTypes.EDIT_COUPON_REQUEST: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.EDIT_COUPON_SUCCESS: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          result: state.coupons.result.map(item => item.id === action.data.id ? action.data : item),
          status: 'success',
        }
      };
    }
    case ActionTypes.EDIT_COUPON_FAIL: {
      return {
        ...state,
        coupons: {
          ...state.coupons,
          error: action.message,
          status: 'error',
        }
      };
    }
    case ActionTypes.ADD_COUPON_REQUEST: {
      return {
        ...state,
        addCoupon: {
          result: null,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.ADD_COUPON_SUCCESS: {
      return {
        ...state,
        addCoupon: {
          ...state.addCoupon,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        coupons: {
          ...state.coupons,
          result: [...state.coupons.result, action.data],
        }
      };
    }
    case ActionTypes.ADD_COUPON_FAIL: {
      return {
        ...state,
        addCoupon: {
          ...state.addCoupon,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_ADD_COUPONS_REQUEST: {
      return {
        ...state,
        syncAddCoupons: {
          ...state.syncAddCoupons,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.SYNC_ADD_COUPONS_SUCCESS: {
      return {
        ...state,
        syncAddCoupons: {
          ...state.syncAddCoupons,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        coupons: {
          ...state.coupons,
          result: [
            ...state.coupons.result.filter(item => !action.localIds.includes(item.id)),
            ...action.data,
          ],
        }
      };
    }
    case ActionTypes.SYNC_ADD_COUPONS_FAIL: {
      return {
        ...state,
        syncAddCoupons: {
          ...state.syncAddCoupons,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_EDITING_COUPONS_REQUEST: {
      return {
        ...state,
        syncEditingCoupons: {
          ...state.syncEditingCoupons,
          requesting: true,
          error: null,
          status: '',
        }
      };
    }
    case ActionTypes.SYNC_EDITING_COUPONS_SUCCESS: {
      return {
        ...state,
        syncEditingCoupons: {
          ...state.syncEditingCoupons,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        coupons: {
          ...state.coupons,
          result: state.coupons.result.map(item => {
            const index = action.ids.indexOf(item.id);
            return index > -1 ? action.data[index] : item;
          })
        }
      };
    }
    case ActionTypes.SYNC_EDITING_COUPONS_FAIL: {
      return {
        ...state,
        syncEditingCoupons: {
          ...state.syncEditingCoupons,
          error: action.message,
          requesting: false,
          status: 'error',
        }
      };
    }
    case ActionTypes.SYNC_DELETING_COUPONS_SUCCESS: {
      return {
        ...state,
        deletedCoupons: state.deletedCoupons.filter(id => !action.ids.includes(id))
      };
    }
    default:
      return state;
  }
}
