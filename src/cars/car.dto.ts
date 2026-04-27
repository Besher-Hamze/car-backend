import { IsString, IsNumber, IsOptional, IsArray, Min, Max, Matches, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const SCORE_STRING = /^(0|10|20|30|40|50|60|70|80|90|100)$/;

export class CreateCarDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2024 })
  @Type(() => Number)
  @IsNumber()
  year: number;

  @ApiProperty({ example: 120000 })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'sedan' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: 'gasoline' })
  @IsOptional()
  @IsString()
  engineType?: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  engineDisplacement?: number;

  @ApiPropertyOptional({ example: 203 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  horsepower?: number;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  torque?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cylinders?: number;

  @ApiPropertyOptional({ example: 'automatic' })
  @IsOptional()
  @IsString()
  transmission?: string;

  @ApiPropertyOptional({ example: 'FWD' })
  @IsOptional()
  @IsString()
  driveType?: string;

  @ApiPropertyOptional({ example: 8.3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  acceleration?: number;

  @ApiPropertyOptional({ example: 210 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  topSpeed?: number;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fuelConsumption?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fuelTankCapacity?: number;

  @ApiPropertyOptional({ example: 4885 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ example: 1840 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 1445 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 2825 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  wheelbase?: number;

  @ApiPropertyOptional({ example: 1575 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  seatingCapacity?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cargoVolume?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  safetyRating?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  safetyFeatures?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  techFeatures?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  comfortFeatures?: string[];

  @ApiPropertyOptional({ example: 'new' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mileage?: number;

  @ApiPropertyOptional({ description: 'موتور — 0–100 خطوة 10' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  motorCondition?: string;

  @ApiPropertyOptional({ description: 'حالة الكهرباء — 0–100' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  electricalCondition?: string;

  @ApiPropertyOptional({ description: 'زيت — 0–100' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  oilCondition?: string;

  @ApiPropertyOptional({ description: 'مبخوخة — "0" لا، "100" نعم' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @IsIn(['0', '100'])
  engineSmokeLevel?: string;

  @ApiPropertyOptional({ description: 'شاسيه — 0–100' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  chassisCondition?: string;

  @ApiPropertyOptional({ enum: ['full_cut', 'half_cut', 'none'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsIn(['full_cut', 'half_cut', 'none'])
  accidentHistoryType?: string;

  @ApiPropertyOptional({ description: 'قصة / نص قصة — 0–100' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  accidentHistoryLevel?: string;

  @ApiPropertyOptional({ description: 'حالة الدواليب — 0–100' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  tiresCondition?: string;

  @ApiPropertyOptional({ example: 'Pearl White' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  interiorColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCarDto extends PartialType(CreateCarDto) {}

/** Slim payload for sellers when submitting a car for review.
 * Only basic identity/marketing fields — admin fills in the rest. */
export class CreateSellerCarDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2024 })
  @Type(() => Number)
  @IsNumber()
  year: number;

  @ApiProperty({ example: 18000 })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'sedan' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'سيارة بحالة ممتازة، فحص كامل…' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class RejectCarDto {
  @ApiPropertyOptional({ example: 'الصورة غير واضحة، يرجى رفع صورة أفضل' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryCarsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  engineType?: string;

  @ApiPropertyOptional({ example: 'automatic' })
  @IsOptional()
  @IsString()
  transmission?: string;

  @ApiPropertyOptional({ example: 'AWD' })
  @IsOptional()
  @IsString()
  driveType?: string;

  @ApiPropertyOptional({ example: 'White' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minHorsepower?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxHorsepower?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minSeats?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minMileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxMileage?: number;

  /* Score-based condition filters (0..100 step 10). Sends min score. */
  @ApiPropertyOptional({ description: '0..100 step 10' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  minMotorCondition?: string;

  @ApiPropertyOptional({ description: '0..100 step 10' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  minElectricalCondition?: string;

  @ApiPropertyOptional({ description: '0..100 step 10' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  minOilCondition?: string;

  @ApiPropertyOptional({ description: '0..100 step 10' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  minChassisCondition?: string;

  @ApiPropertyOptional({ description: '0..100 step 10' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @Matches(SCORE_STRING)
  minTiresCondition?: string;

  @ApiPropertyOptional({ enum: ['0', '100'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @IsIn(['0', '100'])
  engineSmokeLevel?: string;

  @ApiPropertyOptional({ enum: ['full_cut', 'half_cut', 'none'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @IsIn(['full_cut', 'half_cut', 'none'])
  accidentHistoryType?: string;

  /** 'all' = include all statuses (admin only). Otherwise restricted to specific statuses. */
  @ApiPropertyOptional({ enum: ['pending', 'published', 'rejected', 'all'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 12;

  @ApiPropertyOptional({ example: 'price' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc';
}
