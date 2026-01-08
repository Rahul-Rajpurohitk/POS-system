import * as UserActions from './user';
import * as SettingActions from './setting';
import * as CategoryActions from './category';
import * as ProductActions from './product';
import * as OrderActions from './order';
import * as CouponActions from './coupon';
import * as CustomerActions from './customer';

export const ActionCreators = Object.assign({},
  UserActions,
  SettingActions,
  CategoryActions,
  ProductActions,
  OrderActions,
  CouponActions,
  CustomerActions,
);
