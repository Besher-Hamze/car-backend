import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Public registration limited to 'user' or 'seller'. Admin role can NEVER be self-assigned. */
  @ApiPropertyOptional({ enum: ['user', 'seller'], default: 'user' })
  @IsOptional()
  @IsIn(['user', 'seller'])
  role?: 'user' | 'seller';
}
