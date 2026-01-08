import {persistCombineReducers} from 'redux-persist';
import storage from '@react-native-community/async-storage';
import {createWhitelistFilter} from 'redux-persist-transform-filter';

import userReducers from './user';
import settingReducers from './setting';
import categoryReducers from './category';
import productReducers from './product';
import orderReducers from './order';
import couponReducers from './coupon';
import customerReducers from './customer';

const config = {
  key: 'root',
  storage,
  transforms: [
    createWhitelistFilter('userReducers', [
      'login.result',
      'staffs.result',
      'deletedStaffs',
    ]),
    createWhitelistFilter('settingReducers'),
    createWhitelistFilter('categoryReducers', [
      'categories.result',
      'deletedCategories',
    ]),
    createWhitelistFilter('productReducers', [
      'products.result',
      'deletedProducts',
    ]),
    createWhitelistFilter('orderReducers', ['orders.result']),
    createWhitelistFilter('couponReducers', [
      'coupons.result',
      'deletedCoupons',
    ]),
    createWhitelistFilter('customerReducers', [
      'customers.result',
      'deletedCustomers',
    ]),
  ],
};

const appReducer = persistCombineReducers(config, {
  userReducers,
  settingReducers,
  categoryReducers,
  productReducers,
  orderReducers,
  couponReducers,
  customerReducers,
});

export default (state, action) => {
  if (action.type === 'USER_LOGOUT') {
    storage.removeItem('persist:root');
    state = undefined;
  }
  return appReducer(state, action);
};
