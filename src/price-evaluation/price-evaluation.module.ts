import { Module } from '@nestjs/common';
import { PriceEvaluationController } from './price-evaluation.controller';
import { PriceEvaluationService } from './price-evaluation.service';

@Module({
  controllers: [PriceEvaluationController],
  providers: [PriceEvaluationService],
  exports: [PriceEvaluationService],
})
export class PriceEvaluationModule {}
