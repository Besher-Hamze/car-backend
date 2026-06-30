import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondTradeDto {
  @IsEnum(['accept', 'reject'])
  action: 'accept' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** مطلوب عند القبول — رقم تواصل صاحب السيارة المعلنة */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  ownerPhone?: string;
}
