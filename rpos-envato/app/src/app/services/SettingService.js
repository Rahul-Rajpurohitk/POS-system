import http from './http';
import { get } from 'lodash';
import { Utils } from '@common';

export const changeBusiness = async (currency, language, tax, name) => {
  try {
    return (await http.put('/businesses', { currency, language, tax, name })).data;
  } catch (error) {
    throw get(error, ['response', 'data', 'message'], error.message);
  }
};

export const getBusiness = async (params) => {
  try {
    const queryParams = Utils.queryParams(params);
    return (await http.get(`businesses/logs?${queryParams}`)).data;
  } catch (error) {
    throw get(error, ['response', 'data', 'message'], error.message);
  }
};
