import { get } from 'lodash';
import * as ActionTypes from './ActionTypes';

import OrderServices from '@services/OrderServices';

export const getAllOrders = () => {
  return dispatch => {
    dispatch({ type: ActionTypes.GET_ALL_ORDERS_REQUEST });

    return OrderServices.getAllOrders()
      .then(({ data }) => {
        dispatch({ type: ActionTypes.GET_ALL_ORDERS_SUCCESS, data });
      })
      .catch(message => {
        dispatch({ type: ActionTypes.GET_ALL_ORDERS_FAIL, message });
      });
  };
};

export const addOrder = (params) => dispatch => {
  dispatch({ type: ActionTypes.ADD_ORDER_REQUEST });
  const body = {
    ...params,
    items: params.items.map(item => ({
      product: item.product.id, quantity: item.quantity
    }))
  }
  if (params.customer) {
    body.customer = params.customer.id;
  }

  return OrderServices.addOrder(body)
    .then(({ data }) => {
      const order = {
        ...data,
        items: params.items,
        customer: params.customer,
      }
      dispatch({ type: ActionTypes.ADD_ORDER_SUCCESS, data: order });
    })
    .catch(message => {
      dispatch({ type: ActionTypes.ADD_ORDER_FAIL, message });
    });
};

export const saveOrder = (params) => dispatch => {
  dispatch({ type: ActionTypes.ADD_ORDER_SUCCESS, data: params });
};

export const syncAddOrders = (orders) => (dispatch, getState) => {
  dispatch({ type: ActionTypes.SYNC_ADD_ORDERS_REQUEST });
  const state = getState();
  return Promise.all(orders.map(async (order) => {
    try {
      const items = order.items.map(item => {
        let productId = item.product.id;
        if (productId.includes('local-')) {
          const allProducts = state.productReducers.products.result;
          const newProduct = allProducts.filter(product => product.localId === productId);
          if (newProduct.length > 0) {
            productId = newProduct[0].id
          } else {
            throw 'product is not exist: ' + productId;
          }
        }
        return { product: productId, quantity: item.quantity }
      });

      let customerId = get(order, 'customer.id');
      if (customerId && customerId.includes('local-')) {
        const allCustomer = state.customerReducers.customers.result;
        const newCustomer = allCustomer.filter(customer => customer.localId === customerId);
        if (newCustomer.length > 0) {
          customerId = newCustomer[0].id
        } else {
          throw 'customer is not exist: ' + customerId;
        }
      }

      let body = { ...order, items };
      if (customerId) body.customer = customerId;

      if (order.coupon && order.coupon.includes('local-')) {
        const allCoupon = state.couponReducers.coupons.result;
        const newCoupon = allCoupon.filter(coupon => coupon.localId === order.coupon);
        if (newCoupon.length > 0) {
          body.coupon = newCoupon[0].id
        } else {
          throw 'coupon is not exist: ' + order.coupon;
        }
      }

      const { data } = await OrderServices.addOrder(body);
      return {
        ...data,
        items: order.items,
        customer: order.customer,
        localId: order.id,
      }
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    console.log('arrayOfValuesOrErrors: ', arrayOfValuesOrErrors);
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const localIds = data.map(item => item.localId);
    dispatch({ type: ActionTypes.SYNC_ADD_ORDERS_SUCCESS, data, localIds });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_ADD_ORDERS_FAIL, message });
  })
};
