/** مواصفات موديل من بيانات السوق الحقيقية */
export interface CatalogModelSpec {
  category: string;
  year_ref: number;
  hp: number;
  cc: number;
  trans: string;
  base: number;
  count: number;
  min_year: number;
  max_year: number;
  by_year?: Record<string, number>;
}

/** ماركة → موديل → مواصفات */
export type MarketCatalogFull = Record<string, Record<string, CatalogModelSpec>>;

/** ماركة → قائمة موديلات (مشتق من الكتالوج الكامل) */
export type MarketCatalog = Record<string, string[]>;

export type PriceLabel =
  | 'very_cheap'
  | 'cheap'
  | 'fair'
  | 'expensive'
  | 'very_expensive';

export interface PriceEvaluationResult {
  listedPrice: number;
  fairPrice: number;
  difference: number;
  differencePercent: number;
  priceRatio: number;
  label: PriceLabel;
  labelAr: string;
  confidence: 'high' | 'medium' | 'low';
  city: string;
  currency: string;
  priceSource?: string;
}

/** مطابق لحقول Car + ML service */
export interface EvaluatePriceDto {
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage?: number;
  category?: string;
  engineType?: string;
  engineDisplacement?: number;
  horsepower?: number;
  cylinders?: number;
  torque?: number;
  transmission?: string;
  driveType?: string;
  seatingCapacity?: number;
  color?: string;
  interiorColor?: string;
  imported?: string;
  motorCondition?: string;
  electricalCondition?: string;
  oilCondition?: string;
  chassisCondition?: string;
  tiresCondition?: string;
  engineSmokeLevel?: string;
  isEngineSmoking?: boolean;
  accidentHistoryType?: string;
  accidentHistoryLevel?: string;
  currency?: string;
}

export const PRICE_LABEL_STYLES: Record<
  PriceLabel,
  { bg: string; text: string; border: string }
> = {
  very_cheap: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  cheap: { bg: 'bg-lime-500/15', text: 'text-lime-400', border: 'border-lime-500/40' },
  fair: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  expensive: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40' },
  very_expensive: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40' },
};
