import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';
import { CompareDto } from './compare.dto';

@ApiTags('Comparison - المقارنة')
@Controller('compare')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Post()
  @ApiOperation({ summary: 'مقارنة سيارات — أساسي (سعر/كيلومتراج/محرك/سنة) أو حسب الكل' })
  compare(@Body() dto: CompareDto) {
    return this.comparisonService.compare(dto.carIds, dto.mode ?? 'basic', dto.criteria);
  }
}
