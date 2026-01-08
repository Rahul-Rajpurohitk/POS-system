import * as ActionTypes from './ActionTypes';

import CategoryServices from '@services/CategoryServices';
import ImageServices from '@services/ImageServices';

export const getCategories = () => {
  return (dispatch) => {
    dispatch({type: ActionTypes.GET_CATEGORIES_REQUEST});

    return CategoryServices.getCategories()
      .then(({data}) => {
        dispatch({type: ActionTypes.GET_CATEGORIES_SUCCESS, data});
      })
      .catch((message) => {
        dispatch({type: ActionTypes.GET_CATEGORIES_FAIL, message});
      });
  };
};

export const addCategory = (params) => {
  return (dispatch) => {
    dispatch({type: ActionTypes.ADD_CATEGORY_REQUEST});
    const body = {
      name: params.name,
      parent: params.parent,
      image: params.image,
    };
    return CategoryServices.addCategory(body)
      .then(({data}) => {
        dispatch({type: ActionTypes.ADD_CATEGORY_SUCCESS, data});
      })
      .catch((message) => {
        dispatch({type: ActionTypes.ADD_CATEGORY_FAIL, message});
      });
  };
};

export const saveCategory = (params) => {
  return (dispatch) => {
    dispatch({type: ActionTypes.ADD_CATEGORY_SUCCESS, data: params});
  };
};

export const removeCategory = (categoryId) => {
  return (dispatch) => {
    dispatch({type: ActionTypes.DELETE_CATEGORY_SUCCESS, id: categoryId});
  };
};

export const saveCategoryDeleted = (categoryId) => {
  return (dispatch) => {
    dispatch({type: ActionTypes.SAVE_CATEGORY_DELETED, id: categoryId});
  };
};

export const deleteCategory = (categoryId) => (dispatch) => {
  dispatch({type: ActionTypes.DELETE_CATEGORY_REQUEST});
  return CategoryServices.deleteCategory(categoryId)
    .then(() => {
      dispatch({type: ActionTypes.DELETE_CATEGORY_SUCCESS, id: categoryId});
    })
    .catch((message) => {
      dispatch({type: ActionTypes.DELETE_CATEGORY_FAIL, message});
    });
};

export const editCategory = (params) => (dispatch) => {
  dispatch({type: ActionTypes.EDIT_CATEGORY_REQUEST});
  return CategoryServices.editCategory(params)
    .then(({data}) => {
      dispatch({type: ActionTypes.EDIT_CATEGORY_SUCCESS, data});
    })
    .catch((message) => {
      dispatch({type: ActionTypes.EDIT_CATEGORY_FAIL, message});
    });
};

export const saveCategoryEditing = (params) => {
  return (dispatch) => {
    dispatch({type: ActionTypes.EDIT_CATEGORY_SUCCESS, data: params});
  };
};

export const syncAddCategory = (categories) => (dispatch) => {
  dispatch({type: ActionTypes.SYNC_ADD_CATEGORY_REQUEST});
  return Promise.all(
    categories.map(async (item) => {
      let params = item;
      try {
        if (params.image) {
          const imageUploaded = await ImageServices.uploadImage({
            uri: params.image,
          });
          params.image = imageUploaded.file;
        }
        const {data} = await CategoryServices.addCategory(params);
        return {...data, localId: params.id};
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const localIds = data.map((item) => item.localId);
      dispatch({type: ActionTypes.SYNC_ADD_CATEGORY_SUCCESS, data, localIds});
    })
    .catch((message) => {
      dispatch({type: ActionTypes.SYNC_ADD_CATEGORY_FAIL, message});
    });
};

export const syncEditingCategories = (categories) => (dispatch) => {
  dispatch({type: ActionTypes.SYNC_EDITING_CATEGORIES_REQUEST});
  return Promise.all(
    categories.map(async (item) => {
      let params = item;
      try {
        if (params.image && params.image.indexOf('http') !== 0) {
          const imageUploaded = await ImageServices.uploadImage({
            uri: params.image,
          });
          params.image = imageUploaded.file;
        }
        const {data} = await CategoryServices.editCategory(params);
        return data;
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const ids = data.map((item) => item.id);
      dispatch({type: ActionTypes.SYNC_EDITING_CATEGORIES_SUCCESS, data, ids});
    })
    .catch((message) => {
      dispatch({type: ActionTypes.SYNC_EDITING_CATEGORIES_FAIL, message});
    });
};

export const syncDeletingCategories = (categories) => (dispatch) => {
  dispatch({type: ActionTypes.SYNC_DELETING_CATEGORIES_REQUEST});
  return Promise.all(
    categories.map(async (id) => {
      try {
        const {data} = await CategoryServices.deleteCategory(id);
        return {...data, id};
      } catch (error) {
        return error;
      }
    }),
  )
    .then((arrayOfValuesOrErrors) => {
      const data = arrayOfValuesOrErrors.filter((item) => !!item.id);
      const ids = data.map((item) => item.id);
      dispatch({type: ActionTypes.SYNC_DELETING_CATEGORIES_SUCCESS, ids});
    })
    .catch((message) => {
      dispatch({type: ActionTypes.SYNC_DELETING_CATEGORIES_FAIL, message});
    });
};
