import * as ActionTypes from './ActionTypes';
import CouponServices from '@services/CouponServices';

export const getCoupons = () => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.GET_COUPONS_REQUEST });

    return CouponServices.getCoupons()
      .then(({ data }) => {
        dispatch({ type: ActionTypes.GET_COUPONS_SUCCESS, data });
      })
      .catch((message) => {
        dispatch({ type: ActionTypes.GET_COUPONS_FAIL, message });
      });
  };
};

export const addCoupon = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.ADD_COUPON_REQUEST });
    const body = {
      name: params.name,
      code: params.code,
      amount: params.amount,
      expiredAt: params.expiredAt,
      type: params.type,
    };
    return CouponServices.addCoupon(body)
      .then(({ data }) => {
        dispatch({ type: ActionTypes.ADD_COUPON_SUCCESS, data });
      })
      .catch((message) => {
        dispatch({ type: ActionTypes.ADD_COUPON_FAIL, message });
      });
  };
};

export const saveCoupon = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.ADD_COUPON_SUCCESS, data: params });
  };
};

export const removeCoupon = (couponId) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.DELETE_COUPON_SUCCESS, id: couponId });
  };
};

export const saveCouponDeleted = (couponId) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.SAVE_COUPON_DELETED, id: couponId });
  };
};

export const deleteCoupon = (couponId) => (dispatch) => {
  dispatch({ type: ActionTypes.DELETE_COUPON_REQUEST });
  return CouponServices.deleteCoupon(couponId)
    .then(() => {
      dispatch({ type: ActionTypes.DELETE_COUPON_SUCCESS, id: couponId });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.DELETE_COUPON_FAIL, message });
    });
};

export const editCoupon = (params) => (dispatch) => {
  dispatch({ type: ActionTypes.EDIT_COUPON_REQUEST });
  return CouponServices.editCoupon(params)
    .then(({ data }) => {
      dispatch({ type: ActionTypes.EDIT_COUPON_SUCCESS, data });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.EDIT_COUPON_FAIL, message });
    });
};

export const saveCouponEditing = (params) => {
  return (dispatch) => {
    dispatch({ type: ActionTypes.EDIT_COUPON_SUCCESS, data: params });
  };
};

export const syncAddCoupons = (coupons) => (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_ADD_COUPONS_REQUEST });
  return Promise.all(
    coupons.map(async (params) => {
      try {
        const { data } = await CouponServices.addCoupon(params);
        return { ...data, localId: params.id };
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const localIds = data.map((item) => item.localId);
      dispatch({ type: ActionTypes.SYNC_ADD_COUPONS_SUCCESS, data, localIds });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_ADD_COUPONS_FAIL, message });
    });
};

export const syncEditingCoupons = (coupons) => (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_EDITING_COUPONS_REQUEST });
  return Promise.all(
    coupons.map(async (params) => {
      try {
        const { data } = await CouponServices.editCoupon(params);
        return data;
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const ids = data.map((item) => item.id);
      dispatch({ type: ActionTypes.SYNC_EDITING_COUPONS_SUCCESS, data, ids });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_EDITING_COUPONS_FAIL, message });
    });
};

export const syncDeletingCoupons = (coupons) => (dispatch) => {
  dispatch({ type: ActionTypes.SYNC_DELETING_COUPONS_REQUEST });
  return Promise.all(
    coupons.map(async (id) => {
      try {
        const { data } = await CouponServices.deleteCoupon(id);
        return { ...data, id };
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const ids = data.map((item) => item.id);
      dispatch({ type: ActionTypes.SYNC_DELETING_COUPONS_SUCCESS, ids });
    })
    .catch((message) => {
      dispatch({ type: ActionTypes.SYNC_DELETING_COUPONS_FAIL, message });
    });
};
