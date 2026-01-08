import http from './http';

export default class Category {
  static getCoupons() {
    return new Promise((resolve, reject) => {
      http
        .get('/coupons')
        .then(({ data }) => {
          const coupons = data.map((item) => ({
            code: item.code,
            type: item.type,
            name: item.name,
            amount: item.amount,
            expiredAt: item.expiredAt,
            id: item._id,
          }));
          resolve({ data: coupons });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static addCoupon(body) {
    return new Promise((resolve, reject) => {
      http
        .post('/coupons', body)
        .then(({ data }) => {
          const coupon = {
            code: data.code,
            type: data.type,
            name: data.name,
            amount: data.amount,
            expiredAt: data.expiredAt,
            id: data._id,
          };
          resolve({ data: coupon });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static deleteCoupon(id) {
    return new Promise((resolve, reject) => {
      http
        .delete(`/coupons/${id}`)
        .then(({ data }) => {
          resolve({ data });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static editCoupon(params) {
    return new Promise((resolve, reject) => {
      http
        .put(`/coupons/${params.id}`, params)
        .then(({ data }) => {
          const coupon = {
            code: data.code,
            type: data.type,
            name: data.name,
            amount: data.amount,
            expiredAt: data.expiredAt,
            id: data._id,
          };
          resolve({ data: coupon });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
