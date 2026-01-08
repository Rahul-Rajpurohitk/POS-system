import { get } from 'lodash';
import http from './http';

export default class User {
  static login(body) {
    return new Promise((resolve, reject) => {
      http
        .post('/users/login', body)
        .then(({ data }) => {
          const userInfo = {
            id: data._id,
            email: data.email,
            firstName: get(data, 'firstName', ''),
            lastName: get(data, 'lastName', ''),
            avatar: get(data, 'avatar', ''),
            role: data.role,
            token: data.token,
          };
          resolve({ data: userInfo });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static register(body) {
    return new Promise((resolve, reject) => {
      http
        .post('/users/register', body)
        .then(({ data }) => {
          const userInfo = {
            id: data._id,
            email: data.email,
            firstName: get(data, 'firstName', ''),
            lastName: get(data, 'lastName', ''),
            businessName: get(data, 'businessName', ''),
            avatar: get(data, 'avatar', ''),
            role: data.role,
            token: data.token,
            authType: data.authType,
          };
          resolve({ data: userInfo });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static changePassword(body) {
    return new Promise((resolve, reject) => {
      http
        .put('/users/change_password', body)
        .then(({ data }) => {
          resolve({ data });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static updateUser(body) {
    return new Promise((resolve, reject) => {
      http
        .put('/users', body)
        .then(({ data }) => {
          const userInfo = {
            id: data._id,
            email: data.email,
            firstName: get(data, 'firstName', ''),
            lastName: get(data, 'lastName', ''),
            avatar: get(data, 'avatar', ''),
            role: data.role,
          };
          resolve({ data: userInfo });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static getStaffs() {
    return new Promise((resolve, reject) => {
      http
        .get('/users/staff')
        .then(({ data }) => {
          const staffs = data.map((item) => ({
            id: item._id,
            email: item.email,
            firstName: get(item, 'firstName', ''),
            lastName: get(item, 'lastName', ''),
            avatar: get(item, 'avatar', ''),
            role: item.role,
          }));
          resolve({ data: staffs });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static addStaff(body) {
    return new Promise((resolve, reject) => {
      http
        .post('/users/staff', body)
        .then(({ data }) => {
          const staff = {
            id: data._id,
            email: data.email,
            firstName: get(data, 'firstName', ''),
            lastName: get(data, 'lastName', ''),
            avatar: get(data, 'avatar', ''),
            role: data.role,
          };
          resolve({ data: staff });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static deleteStaff(id) {
    return new Promise((resolve, reject) => {
      http
        .delete(`/users/staff/${id}`)
        .then(({ data }) => {
          resolve({ data });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static editStaff(params) {
    return new Promise((resolve, reject) => {
      http
        .put(`/users/staff/${params.id}`, params)
        .then(({ data }) => {
          const staff = {
            id: data._id,
            email: data.email,
            firstName: get(data, 'firstName', ''),
            lastName: get(data, 'lastName', ''),
            avatar: get(data, 'avatar', ''),
            role: data.role,
          };
          resolve({ data: staff });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static forgotPassword = (email) => {
    return new Promise((resolve, reject) => {
      http
        .post('/auth/forgotPassword', { email })
        .then(({ data }) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  static resetPassword = (resetData) => {
    return new Promise((resolve, reject) => {
      http
        .post('/auth/resetPassword', resetData)
        .then(({ data }) => {
          resolve(data);
        })
        .catch(reject);
    });
  };
}
