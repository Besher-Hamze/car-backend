// spare-part.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SparePartDocument = SparePart & Document;

@Schema({ timestamps: true })
export class SparePart {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  nameAr: string;

  @Prop({ required: true })
  category: string; // engine, brakes, suspension, electrical, body, interior, filters

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'SAR' })
  currency: string;

  @Prop()
  partNumber: string;

  @Prop({ required: true })
  brand: string; // part manufacturer

  @Prop([String])
  compatibleCarBrands: string[]; // Toyota, BMW, etc.

  @Prop([String])
  compatibleModels: string[]; // specific models

  @Prop([{ type: Types.ObjectId, ref: 'Car' }])
  compatibleCars: Types.ObjectId[];

  @Prop()
  imageUrl: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop()
  warranty: string; // e.g., "12 months"

  @Prop({ default: 'original' })
  quality: string; // original, oem, aftermarket

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewsCount: number;
}

export const SparePartSchema = SchemaFactory.createForClass(SparePart);
SparePartSchema.index({ name: 'text', nameAr: 'text', partNumber: 'text' });
SparePartSchema.index({ category: 1, compatibleCarBrands: 1 });
