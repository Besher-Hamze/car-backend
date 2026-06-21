import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum PurchaseRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class PurchaseRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Car', required: true, index: true })
  carId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  sellerId?: Types.ObjectId;

  @Prop({ enum: PurchaseRequestStatus, default: PurchaseRequestStatus.PENDING, index: true })
  status: PurchaseRequestStatus;

  @Prop({ required: true })
  carPrice: number;

  @Prop({ default: 20 })
  depositPercent: number;

  @Prop({ required: true })
  depositAmount: number;

  @Prop({ default: 2 })
  contractMonths: number;

  /** صورتان للهوية (مشتري + طرف ثانٍ أو وجه/ظهر) */
  @Prop({ type: [String], required: true })
  buyerIdUrls: string[];

  @Prop()
  depositProofUrl?: string;

  @Prop({ trim: true })
  buyerPhone: string;

  @Prop({ trim: true })
  buyerNotes?: string;

  @Prop({ trim: true })
  rejectionReason?: string;

  @Prop({ trim: true })
  carBrand?: string;

  @Prop({ trim: true })
  carModel?: string;

  @Prop()
  carYear?: number;

  @Prop()
  carImageUrl?: string;
}

export type PurchaseRequestDocument = PurchaseRequest & Document;
export const PurchaseRequestSchema = SchemaFactory.createForClass(PurchaseRequest);
