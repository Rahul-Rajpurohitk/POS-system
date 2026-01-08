import http from './http';

export default class Customer {

  static getCustomers() {
    return new Promise((resolve, reject) => {
      http.get('/customers/sync').then(({ data }) => {
        const customers = data.map((item) => ({
          name: item.name,
          avatar: item.avatar,
          email: item.email,
          phone: item.phone,
          address: item.address,
          id: item._id
        }));
        resolve({ data: customers });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static addCustomer(body) {
    return new Promise((resolve, reject) => {
      http.post('/customers', body).then(({ data }) => {
        const customer = {
          name: data.name,
          avatar: data.avatar,
          email: data.email,
          phone: data.phone,
          address: data.address,
          id: data._id
        }
        resolve({ data: customer });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static deleteCustomer(id) {
    return new Promise((resolve, reject) => {
      http.delete(`/customers/${id}`).then(({ data }) => {
        resolve({ data });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static editCustomer(params) {
    return new Promise((resolve, reject) => {
      http.put(`/customers/${params.id}`, params).then(({ data }) => {
        const customer = {
          name: data.name,
          avatar: data.avatar,
          email: data.email,
          phone: data.phone,
          address: data.address,
          id: data._id
        }
        resolve({ data: customer });
      }).catch(error => {
        reject(error);
      });
    });
  }
}
