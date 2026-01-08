import mongoose, { Schema, Document, Types } from 'mongoose';
import { LogType } from '../types/enums';

// Interface for Log document
export interface ILog extends Document {
  type: LogType;
  content: string;
  payload: {
    productId?: string;
    orderId?: string;
    customerId?: string;
    categoryId?: string;
    couponId?: string;
  };
  userId: string;
  userName: string;
  businessId: string;
  createdAt: Date;
}

// Log Schema
const LogSchema = new Schema<ILog>(
  {
    type: {
      type: String,
      enum: Object.values(LogType),
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    payload: {
      productId: { type: String },
      orderId: { type: String },
      customerId: { type: String },
      categoryId: { type: String },
      couponId: { type: String },
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: '',
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'logs',
  }
);

// Indexes for common queries
LogSchema.index({ businessId: 1, createdAt: -1 });
LogSchema.index({ businessId: 1, type: 1 });
LogSchema.index({ 'payload.productId': 1 });
LogSchema.index({ 'payload.orderId': 1 });

// Static method to format log for response
LogSchema.statics.detailForManager = function (log: ILog) {
  return {
    id: log._id,
    type: log.type,
    content: log.content,
    payload: log.payload,
    user: {
      id: log.userId,
      name: log.userName,
    },
    createdAt: log.createdAt,
  };
};

// Create and export the model
export const Log = mongoose.model<ILog>('Log', LogSchema);

export default Log;
