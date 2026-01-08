import { get } from 'lodash';
import * as ActionTypes from './ActionTypes';

import ProductServices from '@services/ProductServices';
import ImageServices from '@services/ImageServices';

export const getAllProducts = () => {
  return dispatch => {
    dispatch({ type: ActionTypes.GET_ALL_PRODUCTS_REQUEST });

    return ProductServices.getAllProducts()
      .then(({ data }) => {
        dispatch({ type: ActionTypes.GET_ALL_PRODUCTS_SUCCESS, data });
      })
      .catch(message => {
        dispatch({ type: ActionTypes.GET_ALL_PRODUCTS_FAIL, message });
      });
  };
};

export const addProduct = (params) => dispatch => {
  dispatch({ type: ActionTypes.ADD_PRODUCT_REQUEST });
  const body = {
    sku: params.sku,
    name: params.name,
    category: params.category,
    quantity: params.quantity,
    sellingPrice: params.sellingPrice,
    purchasePrice: params.purchasePrice,
    images: params.images,
    desc: params.desc,
  }
  return ProductServices.addProduct(body)
    .then(({ data }) => {
      dispatch({ type: ActionTypes.ADD_PRODUCT_SUCCESS, data });
    })
    .catch(message => {
      dispatch({ type: ActionTypes.ADD_PRODUCT_FAIL, message });
    });
};

export const saveProduct = (params) => {
  return dispatch => {
    dispatch({ type: ActionTypes.ADD_PRODUCT_SUCCESS, data: params });
  };
};

export const removeProduct = (productId) => {
  return dispatch => {
    dispatch({ type: ActionTypes.DELETE_PRODUCT_SUCCESS, id: productId });
  };
};

export const saveProductDeleted = (productId) => {
  return dispatch => {
    dispatch({ type: ActionTypes.SAVE_PRODUCT_DELETED, id: productId });
  };
};

export const deleteProduct = (productId) => dispatch => {
  dispatch({ type: ActionTypes.DELETE_PRODUCT_REQUEST });
  return ProductServices.deleteProduct(productId)
    .then(() => {
      dispatch({ type: ActionTypes.DELETE_PRODUCT_SUCCESS, id: productId });
    })
    .catch(message => {
      dispatch({ type: ActionTypes.DELETE_PRODUCT_FAIL, message });
    });
};

export const editProduct = (params) => dispatch => {
  dispatch({ type: ActionTypes.EDIT_PRODUCT_REQUEST });
  return ProductServices.editProduct(params)
    .then(({ data }) => {
      dispatch({ type: ActionTypes.EDIT_PRODUCT_SUCCESS, data });
    })
    .catch(message => {
      dispatch({ type: ActionTypes.EDIT_PRODUCT_FAIL, message });
    });
};

export const saveProductEditing = (params) => {
  return dispatch => {
    dispatch({ type: ActionTypes.EDIT_PRODUCT_SUCCESS, data: params });
  };
};

export const syncAddProducts = (products) => (dispatch, getState) => {
  dispatch({ type: ActionTypes.SYNC_ADD_PRODUCTS_REQUEST });
  return Promise.all(products.map(async (item) => {
    let params = item;
    try {
      let categoryId = get(item, 'category.id');
      if (categoryId && categoryId.includes('local-')) {
        const state = getState();
        const allCategories = state.categoryReducers.categories.result;
        const newCategory = allCategories.filter(category => category.localId === categoryId);
        if (newCategory.length > 0) {
          categoryId = newCategory[0].id
        } else {
          throw 'category is not exist' + categoryId;
        }
      }
      if (categoryId) {
        params.category = categoryId;
      }

      if (params.images && params.images.length > 0) {
        const images = await Promise.all(params.images.map(async (uri) => {
          const imageUploaded = await ImageServices.uploadImage({ uri });
          return imageUploaded.file;
        }));
        params.images = images;
      }
      const { data } = await ProductServices.addProduct(params);
      return { ...data, localId: params.id };
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const localIds = data.map(item => item.localId);
    dispatch({ type: ActionTypes.SYNC_ADD_PRODUCTS_SUCCESS, data, localIds });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_ADD_PRODUCTS_FAIL, message });
  })
};

export const syncEditingProducts = (products) => (dispatch, getState) => {
  dispatch({ type: ActionTypes.SYNC_EDITING_PRODUCTS_REQUEST });
  return Promise.all(products.map(async (item) => {
    let params = item;
    try {
      let categoryId = get(item, 'category.id');
      if (categoryId && categoryId.includes('local-')) {
        const state = getState();
        const allCategories = state.categoryReducers.categories.result;
        const newCategory = allCategories.filter(category => category.localId === categoryId);
        if (newCategory.length > 0) {
          categoryId = newCategory[0].id
        } else {
          throw 'category is not exist' + categoryId;
        }
      }
      if (categoryId) {
        params.category = categoryId;
      }

      let images = get(params, 'images', []);
      if (images.length > 0) {
        const uploadedImageUris = images.filter(item => item.indexOf('http') === 0);
        const compressImageUris = images.filter(item => item.indexOf('http') !== 0);
        if (compressImageUris) {
          const uploadResult = await Promise.all(compressImageUris.map(async (uri) => {
            const imageUploaded = await ImageServices.uploadImage({ uri });
            return imageUploaded.file;
          }));
          images = [...uploadedImageUris, ...uploadResult];
        }
      }
      params.images = images;
      const { data } = await ProductServices.editProduct(params);
      return data;
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const ids = data.map(item => item.id);
    dispatch({ type: ActionTypes.SYNC_EDITING_PRODUCTS_SUCCESS, data, ids });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_EDITING_PRODUCTS_FAIL, message });
  })
};

export const syncDeletingProducts = (products) => dispatch => {
  dispatch({ type: ActionTypes.SYNC_DELETING_PRODUCTS_REQUEST });
  return Promise.all(products.map(async (id) => {
    try {
      const { data } = await ProductServices.deleteProduct(id)
      return { ...data, id };
    } catch (error) {
      return error;
    }
  })).then((arrayOfValuesOrErrors) => {
    const data = arrayOfValuesOrErrors.filter(item => !!item.id);
    const ids = data.map(item => item.id);
    dispatch({ type: ActionTypes.SYNC_DELETING_PRODUCTS_SUCCESS, ids });
  }).catch(message => {
    dispatch({ type: ActionTypes.SYNC_DELETING_PRODUCTS_FAIL, message });
  })
};
