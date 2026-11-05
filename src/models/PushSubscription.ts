import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: mongoose.Types.ObjectId;
  role?: string;
  resellerId?: mongoose.Types.ObjectId;
  subdomain?: string;
  userAgent?: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, default: 'guest' },
  resellerId: { type: Schema.Types.ObjectId, ref: 'Reseller' },
  subdomain: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
