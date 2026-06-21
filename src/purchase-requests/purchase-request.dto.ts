import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondPurchaseDto {
  @IsEnum(['accept', 'reject'])
  action: 'accept' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
