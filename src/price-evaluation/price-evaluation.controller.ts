import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PriceEvaluationService } from './price-evaluation.service';
import { EvaluatePriceDto } from './price-evaluation.types';

@ApiTags('Price Evaluation - تقييم السعر')
@Controller('price-evaluation')
export class PriceEvaluationController {
  constructor(private readonly priceEvaluationService: PriceEvaluationService) {}

  @Get('health')
  @ApiOperation({ summary: 'حالة خدمة تقييم السعر' })
  async health() {
    const modelLoaded = await this.priceEvaluationService.isHealthy();
    return { status: 'ok', modelLoaded, city: 'حلب' };
  }

  @Get('catalog')
  @ApiOperation({
    summary: 'ماركات وموديلات السوق (بيانات حقيقية)',
    description: 'من car.json + market.json + model.json — للاقتراح التلقائي في النماذج',
  })
  getCatalog() {
    return this.priceEvaluationService.getCatalog();
  }

  @Post('evaluate')
  @ApiOperation({
    summary: 'تقييم سعر سيارة',
    description: 'يقارن السعر المُدخل بالسعر العادل المتوقع في سوق حلب',
  })
  evaluate(@Body() dto: EvaluatePriceDto) {
    return this.priceEvaluationService.evaluate(dto);
  }
}
