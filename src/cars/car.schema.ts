import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum CarStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Car {
  @Prop({ required: true, trim: true })
  brand: string;

  @Prop({ required: true, trim: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  price: number;

  @Prop({ trim: true })
  currency: string;

  @Prop({ trim: true })
  category: string;

  @Prop()
  imageUrl: string;

  @Prop([String])
  images: string[];

  /** وثائق السيارة (صور أو PDF) */
  @Prop([String])
  documentUrls: string[];

  @Prop()
  engineType: string;

  @Prop()
  engineDisplacement: number;

  @Prop()
  horsepower: number;

  @Prop()
  torque: number;

  @Prop()
  cylinders: number;

  @Prop()
  transmission: string;

  @Prop()
  driveType: string;

  @Prop()
  acceleration: number;

  @Prop()
  topSpeed: number;

  @Prop()
  fuelConsumption: number;

  @Prop()
  fuelTankCapacity: number;

  @Prop()
  length: number;

  @Prop()
  width: number;

  @Prop()
  height: number;

  @Prop()
  wheelbase: number;

  @Prop()
  weight: number;

  @Prop()
  seatingCapacity: number;

  @Prop()
  cargoVolume: number;

  @Prop()
  safetyRating: number;

  @Prop([String])
  safetyFeatures: string[];

  @Prop([String])
  techFeatures: string[];

  @Prop([String])
  comfortFeatures: string[];

  @Prop({ default: 'new' })
  condition: string;

  @Prop()
  mileage: number;

  @Prop({ trim: true })
  motorCondition: string;

  @Prop({ trim: true })
  electricalCondition: string;

  @Prop({ trim: true })
  oilCondition: string;

  @Prop({ trim: true })
  engineSmokeLevel: string;

  @Prop()
  isEngineSmoking: boolean;

  @Prop({ trim: true })
  chassisCondition: string;

  @Prop({ trim: true })
  accidentHistoryType: string;

  @Prop({ trim: true })
  accidentHistoryLevel: string;

  @Prop({ trim: true })
  tiresCondition: string;

  @Prop({ trim: true })
  color: string;

  @Prop({ trim: true })
  interiorColor: string;

  /** وارد: gulf | american | korean | local | … (لتقييم AI) */
  @Prop({ trim: true })
  imported?: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ trim: true })
  description: string;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewsCount: number;

  /** Workflow status. Sellers submit `pending`; admin moves to `published` or `rejected`. */
  @Prop({ enum: CarStatus, default: CarStatus.PUBLISHED, index: true })
  status: CarStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  sellerId?: Types.ObjectId;

  @Prop({ trim: true })
  rejectionReason?: string;

  /** تقييم السعر بالذكاء الاصطناعي — very_cheap | cheap | fair | expensive | very_expensive */
  @Prop({ trim: true, index: true })
  ai_lable_price?: string;

  @Prop({ trim: true })
  ai_lable_price_ar?: string;

  @Prop()
  ai_fair_price?: number;
}

export type CarDocument = Car & Document;
export const CarSchema = SchemaFactory.createForClass(Car);

CarSchema.index({ brand: 1, model: 1, year: 1 });
CarSchema.index({ price: 1 });
CarSchema.index({ category: 1 });
CarSchema.index({ brand: 'text', model: 'text', description: 'text' });
