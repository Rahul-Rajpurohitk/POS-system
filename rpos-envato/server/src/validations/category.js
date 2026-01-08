import Category from '../models/category';
import Services from '../services/index';
const { body, param } = require('express-validator');

export default {
  validateAdd: [
    body('name').exists().withMessage('name is required'),
    body('image')
      .optional()
      .custom((value) => {
        return Services.file.checkFileFromClient(value);
      }),
    body('parent')
      .optional()
      .custom((value) => {
        return Category.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found');
          }
        });
      }),
  ],
  validateEdit: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return Category.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found');
          }
        });
      }),
    body('image')
      .optional()
      .custom((value) => {
        return Services.file.checkFileFromClient(value);
      }),
    body('parent')
      .optional()
      .custom((value) => {
        return Category.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found');
          }
        });
      }),
  ],
  validateDelete: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return Category.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found');
          }
        });
      }),
  ],
};
