import http from './http';
import { Utils } from '@common'

export default class Category {

  static getAllProducts() {
    return new Promise((resolve, reject) => {
      http.get('/products/sync').then(({ data }) => {
        const products = data.map((item) => {
          const product = {
            name: item.name,
            id: item._id,
            sku: item.sku,
            images: item.images,
            desc: item.desc,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            purchasePrice: item.purchasePrice,
          }
          if (item.category) {
            product.category = {
              code: item.category.code,
              name: item.category.name,
              image: item.category.image,
              id: item.category._id,
            }
          }
          return product;
        });
        resolve({ data: products });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static addProduct(body) {
    return new Promise((resolve, reject) => {
      http.post('/products', body).then(({ data }) => {
        const product = {
          name: data.name,
          id: data._id,
          sku: data.sku,
          images: data.images,
          desc: data.desc,
          quantity: data.quantity,
          sellingPrice: data.sellingPrice,
          purchasePrice: data.purchasePrice,
        }
        if (data.category) {
          product.category = {
            code: data.category.code,
            name: data.category.name,
            image: data.category.image,
            id: data.category._id,
          }
        }
        resolve({ data: product });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static deleteProduct(id) {
    return new Promise((resolve, reject) => {
      http.delete(`/products/${id}`).then(({ data }) => {
        resolve({ data });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static editProduct(params) {
    return new Promise((resolve, reject) => {
      http.put(`/products/${params.id}`, params).then(({ data }) => {
        const product = {
          name: data.name,
          id: data._id,
          sku: data.sku,
          images: data.images,
          desc: data.desc,
          quantity: data.quantity,
          sellingPrice: data.sellingPrice,
          purchasePrice: data.purchasePrice,
        }
        if (data.category) {
          product.category = {
            code: data.category.code,
            name: data.category.name,
            image: data.category.image,
            id: data.category._id,
          }
        }
        resolve({ data: product });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static getProductLog(productId, params) {
    const queryParams = Utils.queryParams(params)
    return new Promise((resolve, reject) => {
      http.get(`/products/${productId}/logs?${queryParams}`)
        .then(({ data }) => {
          resolve(data)
        })
        .catch(reject)
    })
  }
}
