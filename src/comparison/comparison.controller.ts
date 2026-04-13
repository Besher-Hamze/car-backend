import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

export class CompareDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  carIds: string[];
}

@ApiTags('Comparison - المقارنة')
@Controller('compare')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Post()
  @ApiOperation({ summary: 'مقارنة بين سيارتين أو أكثر (حتى 4 سيارات)' })
  @ApiBody({ schema: { properties: { carIds: { type: 'array', items: { type: 'string' }, example: ['id1', 'id2'] } } } })
  compare(@Body() dto: CompareDto) {
    return this.comparisonService.compare(dto.carIds);
  }
}
