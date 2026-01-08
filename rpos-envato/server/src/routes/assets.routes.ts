import { Router } from 'express';
import { param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import * as assetsController from '../controllers/assets.controller';

const router = Router();

// Assets are public (no auth required) - served as static files

// HEAD /assets/:filename - Check if asset exists
router.head(
  '/:filename',
  [param('filename').isString().notEmpty()],
  checkValidation,
  assetsController.checkAsset
);

// GET /assets/:filename - Get asset
router.get(
  '/:filename',
  [param('filename').isString().notEmpty()],
  checkValidation,
  assetsController.getAsset
);

// GET /assets/:filename/thumbnail - Get asset thumbnail
router.get(
  '/:filename/thumbnail',
  [
    param('filename').isString().notEmpty(),
    query('w').optional().isInt({ min: 50, max: 1000 }),
    query('h').optional().isInt({ min: 50, max: 1000 }),
  ],
  checkValidation,
  assetsController.getThumbnail
);

export default router;
