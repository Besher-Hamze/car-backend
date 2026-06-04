import { PriceEvaluationResult } from './price-evaluation.types';
import { PriceEvaluationService } from './price-evaluation.service';
import { EvaluatePriceDto } from './price-evaluation.types';

export type AiPriceFields = {
  ai_lable_price?: string;
  ai_lable_price_ar?: string;
  ai_fair_price?: number;
};

/** حقول MongoDB من نتيجة تقييم السعر */
export function aiFieldsFromEvaluation(result: PriceEvaluationResult): AiPriceFields {
  return {
    ai_lable_price: result.label,
    ai_lable_price_ar: result.labelAr,
    ai_fair_price: result.fairPrice,
  };
}

export async function fetchAiFields(
  service: PriceEvaluationService,
  dto: EvaluatePriceDto,
): Promise<AiPriceFields> {
  try {
    const result = await service.evaluate(dto);
    return aiFieldsFromEvaluation(result);
  } catch {
    return {};
  }
}
