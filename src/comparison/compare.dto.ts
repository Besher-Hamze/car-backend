import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { BASIC_CRITERION_KEYS, type CompareMode } from './compare-criteria.catalog';

export type BasicCriterionKey = (typeof BASIC_CRITERION_KEYS)[number];

export class CompareCriterionDto {
  @IsIn([...BASIC_CRITERION_KEYS])
  key: BasicCriterionKey;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CompareDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  carIds: string[];

  @IsOptional()
  @IsIn(['basic', 'all'])
  mode?: CompareMode;

  /** للوضع الأساسي فقط — اختيار المعايير وأوزانها (مجموع 100%) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompareCriterionDto)
  criteria?: CompareCriterionDto[];
}
