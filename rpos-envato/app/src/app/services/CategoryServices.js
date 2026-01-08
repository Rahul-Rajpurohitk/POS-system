import http from './http';

export default class Category {
  static getCategories() {
    return new Promise((resolve, reject) => {
      http
        .get('/categories')
        .then(({data}) => {
          const categories = data.map((item) => ({
            parent: item.parent,
            image: item.image,
            name: item.name,
            id: item._id,
          }));
          resolve({data: categories});
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static addCategory(body) {
    return new Promise((resolve, reject) => {
      http
        .post('/categories', body)
        .then(({data}) => {
          const category = {
            parent: data.parent,
            image: data.image,
            name: data.name,
            id: data._id,
          };
          resolve({data: category});
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static deleteCategory(id) {
    return new Promise((resolve, reject) => {
      http
        .delete(`/categories/${id}`)
        .then(({data}) => {
          resolve({data});
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static editCategory(params) {
    return new Promise((resolve, reject) => {
      http
        .put(`/categories/${params.id}`, params)
        .then(({data}) => {
          const category = {
            parent: data.parent,
            image: data.image,
            name: data.name,
            id: data._id,
          };
          resolve({data: category});
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
