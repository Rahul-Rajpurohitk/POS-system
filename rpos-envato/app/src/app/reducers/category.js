import * as ActionTypes from '../actions/ActionTypes';

const defaultState = {
  categories: {
    status: '',
    result: [],
    error: null,
    requesting: false,
  },
  deletedCategories: [],
  addCategory: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  editCategory: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncAddCategories: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
  syncEditingCategories: {
    status: '',
    result: null,
    error: null,
    requesting: false,
  },
};

export default function base(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.GET_CATEGORIES_REQUEST: {
      return {
        ...state,
        categories: {
          ...state.categories,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.GET_CATEGORIES_SUCCESS: {
      return {
        ...state,
        categories: {
          ...state.categories,
          result: [
            ...action.data,
            ...state.categories.result.filter((category) =>
              category.id.includes('local-'),
            ),
          ],
          requesting: false,
          status: 'success',
        },
      };
    }
    case ActionTypes.GET_CATEGORIES_FAIL: {
      return {
        ...state,
        categories: {
          ...state.categories,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.ADD_CATEGORY_REQUEST: {
      return {
        ...state,
        addCategory: {
          result: null,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.ADD_CATEGORY_SUCCESS: {
      return {
        ...state,
        addCategory: {
          ...state.addCategory,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        categories: {
          ...state.categories,
          result: [...state.categories.result, action.data],
        },
      };
    }
    case ActionTypes.ADD_CATEGORY_FAIL: {
      return {
        ...state,
        addCategory: {
          ...state.addCategory,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.DELETE_CATEGORY_REQUEST: {
      return {
        ...state,
        categories: {
          ...state.categories,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.DELETE_CATEGORY_SUCCESS: {
      return {
        ...state,
        categories: {
          ...state.categories,
          result: state.categories.result.filter(
            (item) => item.id !== action.id,
          ),
          status: 'success',
        },
      };
    }
    case ActionTypes.DELETE_CATEGORY_FAIL: {
      return {
        ...state,
        categories: {
          ...state.categories,
          error: action.message,
          status: 'error',
        },
      };
    }
    case ActionTypes.SAVE_CATEGORY_DELETED: {
      return {
        ...state,
        deletedCategories: [...state.deletedCategories, action.id],
        categories: {
          ...state.categories,
          result: state.categories.result.filter(
            (item) => item.id !== action.id,
          ),
          status: 'success',
        },
      };
    }
    case ActionTypes.EDIT_CATEGORY_REQUEST: {
      return {
        ...state,
        editCategory: {
          requesting: true,
          error: null,
          result: null,
          status: '',
        },
      };
    }
    case ActionTypes.EDIT_CATEGORY_SUCCESS: {
      return {
        ...state,
        editCategory: {
          ...state.editCategory,
          result: action.data,
          status: 'success',
          requesting: false,
        },
        categories: {
          ...state.categories,
          result: state.categories.result.map((item) =>
            item.id === action.data.id ? action.data : item,
          ),
        },
      };
    }
    case ActionTypes.EDIT_CATEGORY_FAIL: {
      return {
        ...state,
        editCategory: {
          ...state.editCategory,
          error: action.message,
          status: 'error',
          requesting: false,
        },
      };
    }
    case ActionTypes.SYNC_ADD_CATEGORY_REQUEST: {
      return {
        ...state,
        syncAddCategories: {
          ...state.syncAddCategories,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.SYNC_ADD_CATEGORY_SUCCESS: {
      return {
        ...state,
        syncAddCategories: {
          ...state.syncAddCategories,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        categories: {
          ...state.categories,
          result: [
            ...state.categories.result.filter(
              (item) => !action.localIds.includes(item.id),
            ),
            ...action.data,
          ],
        },
      };
    }
    case ActionTypes.SYNC_ADD_CATEGORY_FAIL: {
      return {
        ...state,
        syncAddCategories: {
          ...state.syncAddCategories,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.SYNC_EDITING_CATEGORIES_REQUEST: {
      return {
        ...state,
        syncEditingCategories: {
          ...state.syncEditingCategories,
          requesting: true,
          error: null,
          status: '',
        },
      };
    }
    case ActionTypes.SYNC_EDITING_CATEGORIES_SUCCESS: {
      return {
        ...state,
        syncEditingCategories: {
          ...state.syncEditingCategories,
          result: action.data,
          requesting: false,
          status: 'success',
        },
        categories: {
          ...state.categories,
          result: state.categories.result.map((item) => {
            const index = action.ids.indexOf(item.id);
            return index > -1 ? action.data[index] : item;
          }),
        },
      };
    }
    case ActionTypes.SYNC_EDITING_CATEGORIES_FAIL: {
      return {
        ...state,
        syncEditingCategories: {
          ...state.syncEditingCategories,
          error: action.message,
          requesting: false,
          status: 'error',
        },
      };
    }
    case ActionTypes.SYNC_DELETING_CATEGORIES_SUCCESS: {
      return {
        ...state,
        deletedCategories: state.deletedCategories.filter(
          (id) => !action.ids.includes(id),
        ),
      };
    }
    default:
      return state;
  }
}
