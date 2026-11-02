import mongoose, { Document, Model, Schema } from 'mongoose';

export type NotificationType =
  | 'order'
  | 'payout'
  | 'reseller'
  | 'product'
  | 'wallet'
  | 'system';

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId;
  resellerId?: mongoose.Types.ObjectId;
  forAdmin: boolean;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    resellerId: { type: Schema.Types.ObjectId, ref: 'Reseller', index: true },
    forAdmin: { type: Boolean, default: false, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['order', 'payout', 'reseller', 'product', 'wallet', 'system'],
      default: 'system',
    },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ resellerId: 1, createdAt: -1 });
NotificationSchema.index({ forAdmin: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;

