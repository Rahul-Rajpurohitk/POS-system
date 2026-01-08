import { Router } from 'express';
import { param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as assetsController from '../controllers/assets.controller';

const router = Router();

// Assets are public (no auth required) - served as static files
// But still rate limited to prevent abuse

// HEAD /assets/:filename - Check if asset exists
router.head(
  '/:filename',
  readLimiter,
  [param('filename').isString().notEmpty()],
  checkValidation,
  catchAsync(assetsController.checkAsset)
);

// GET /assets/:filename - Get asset
router.get(
  '/:filename',
  readLimiter,
  [param('filename').isString().notEmpty()],
  checkValidation,
  catchAsync(assetsController.getAsset)
);

// GET /assets/:filename/thumbnail - Get asset thumbnail
router.get(
  '/:filename/thumbnail',
  readLimiter,
  [
    param('filename').isString().notEmpty(),
    query('w').optional().isInt({ min: 50, max: 1000 }),
    query('h').optional().isInt({ min: 50, max: 1000 }),
  ],
  checkValidation,
  catchAsync(assetsController.getThumbnail)
);

export default router;
