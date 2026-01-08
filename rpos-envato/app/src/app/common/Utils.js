import { get, last, map } from 'lodash';
import ImageResizer from 'react-native-image-resizer';
import I18n from '@common/I18n';

import { QUICK_LINKS } from '@common/data/QuickLinks';

const COMPRESS_FORMAT = 'JPEG';
const QUANLITY = 100;
const NEW_WIDTH = 500;
const NEW_HEIGHT = 500;

function Utils() { }

Utils.formatCurrency = (value, currency, config) => {
  return I18n.toCurrency(value || 0, {
    precision: 1,
    format: currency.isSuffix ? '%n%u' : '%u%n',
    unit: currency.symbol,
    ...config,
  });
};

Utils.getPageTitle = (nav) => {
  if (!nav) {
    return null;
  }
  const routes = get(nav, 'routes.0.routes');
  if (!routes) {
    return null;
  }

  const profileScreens = ['EditProfileScreen', 'ChangePassword'];
  const currentPage = last(routes);
  if (profileScreens.includes(currentPage.routeName)) {
    return I18n.t('quickLinks.profile');
  }

  const pageInfo = QUICK_LINKS.filter(
    (item) => item.key === currentPage.routeName,
  );
  const pageName = get(pageInfo, '0.name');
  return I18n.t(pageName);
};

Utils.compressImage = async ({ imageUri, quality = QUANLITY }) => {
  try {
    const response = await ImageResizer.createResizedImage(
      imageUri,
      NEW_WIDTH,
      NEW_HEIGHT,
      COMPRESS_FORMAT,
      quality,
    );
    return response.uri;
  } catch (error) {
    return null;
  }
};

Utils.searchObject = (obj, keys, value) => {
  if (obj === undefined || value === undefined) {
    throw new Error(
      'First argument should be an object followed by a value you want to find',
    );
  }

  if (typeof value === 'string') {
    value = value.toLowerCase();
  }

  if (obj.constructor !== Object) {
    throw new Error('First argument must be of type Object');
  }

  let valueExists = false;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    valueExists = get(obj, key, '').toLowerCase().indexOf(value) > -1;
    if (valueExists) {
      return valueExists;
    }
  }
  return valueExists;
};

Utils.queryParams = (params) => {
  return map(Object.keys(params), key => {
    const value = params[key]
    return `${key}=${value}`
  }).join('&')
}

export default Utils;
