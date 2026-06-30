import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum TradeRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/** من يدفع فرق النقد */
export enum CashDirection {
  /** أنا أدفع الفرق (سيارتي أرخص) */
  REQUESTER_PAYS = 'requester_pays',
  /** أنت تدفع لي الفرق (سيارتي أغلى) */
  OWNER_PAYS = 'owner_pays',
}

@Schema({ timestamps: true })
export class TradeRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Car', required: true, index: true })
  targetCarId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  requesterId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  ownerId?: Types.ObjectId;

  @Prop({ enum: TradeRequestStatus, default: TradeRequestStatus.PENDING, index: true })
  status: TradeRequestStatus;

  /** سيارة المعروض مدرجة على المنصة (اختياري) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Car' })
  offerCarId?: Types.ObjectId;

  @Prop({ trim: true })
  offerBrand?: string;

  @Prop({ trim: true })
  offerModel?: string;

  @Prop()
  offerYear?: number;

  @Prop({ required: true })
  offerPrice: number;

  @Prop({ trim: true })
  offerCondition?: string;

  @Prop()
  offerMileage?: number;

  @Prop({ trim: true })
  offerEngineType?: string;

  @Prop()
  offerHorsepower?: number;

  @Prop({ trim: true })
  offerTransmission?: string;

  @Prop({ trim: true })
  offerColor?: string;

  @Prop({ trim: true })
  offerDescription?: string;

  @Prop({ type: [String], default: [] })
  offerImageUrls: string[];

  /** أوراق ثبوتية (هوية، سند، إلخ) */
  @Prop({ type: [String], default: [] })
  proofDocUrls: string[];

  @Prop({ required: true })
  targetCarPrice: number;

  @Prop({ required: true })
  cashDifference: number;

  @Prop({ enum: CashDirection, required: true })
  cashDirection: CashDirection;

  @Prop({ required: true, trim: true })
  requesterPhone: string;

  /** يُضاف عند القبول */
  @Prop({ trim: true })
  ownerPhone?: string;

  @Prop({ trim: true })
  requesterNotes?: string;

  @Prop({ trim: true })
  rejectionReason?: string;

  @Prop({ trim: true })
  targetCarBrand?: string;

  @Prop({ trim: true })
  targetCarModel?: string;

  @Prop()
  targetCarYear?: number;

  @Prop({ trim: true })
  targetCarImageUrl?: string;
}

export type TradeRequestDocument = TradeRequest & Document;
export const TradeRequestSchema = SchemaFactory.createForClass(TradeRequest);
