import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Car, CarDocument } from '../cars/car.schema';

type CompareField = {
  key: string;
  labelAr: string;
  unit: string;
  category: string;
  lowerIsBetter: boolean;
  format?: (v: unknown) => string | number | null;
};

const AI_LABEL_AR: Record<string, string> = {
  very_cheap: 'رخيصة جداً',
  cheap: 'رخيصة',
  fair: 'مناسبة',
  expensive: 'غالية',
  very_expensive: 'غالية جداً',
};

@Injectable()
export class ComparisonService {
  constructor(@InjectModel(Car.name) private carModel: Model<CarDocument>) {}

  async compare(carIds: string[]) {
    if (carIds.length < 2 || carIds.length > 4) {
      throw new BadRequestException('يجب اختيار سيارتين على الأقل وأربع سيارات كحد أقصى');
    }

    const cars = await this.carModel.find({ _id: { $in: carIds } }).lean();

    if (cars.length !== carIds.length) {
      throw new NotFoundException('بعض السيارات المحددة غير موجودة');
    }

    const ordered = carIds.map((id) => cars.find((c) => String(c._id) === String(id))).filter(Boolean) as typeof cars;

    const comparisonFields: CompareField[] = [
      { key: 'price', labelAr: 'السعر', unit: 'USD', category: 'pricing', lowerIsBetter: true },
      { key: 'ai_fair_price', labelAr: 'السعر العادل (AI)', unit: 'USD', category: 'pricing', lowerIsBetter: true },
      {
        key: 'ai_lable_price_ar',
        labelAr: 'تقييم AI',
        unit: '',
        category: 'pricing',
        lowerIsBetter: false,
        format: (v) => (v ? String(v) : null),
      },
      { key: 'year', labelAr: 'سنة الإنتاج', unit: '', category: 'general', lowerIsBetter: false },
      { key: 'mileage', labelAr: 'المسافة المقطوعة', unit: 'كم', category: 'general', lowerIsBetter: true },
      { key: 'horsepower', labelAr: 'قوة المحرك', unit: 'حصان', category: 'performance', lowerIsBetter: false },
      { key: 'engineDisplacement', labelAr: 'سعة المحرك', unit: 'cc', category: 'performance', lowerIsBetter: false },
      { key: 'transmission', labelAr: 'ناقل الحركة', unit: '', category: 'general', lowerIsBetter: false },
      { key: 'condition', labelAr: 'الحالة', unit: '', category: 'general', lowerIsBetter: false },
      { key: 'seatingCapacity', labelAr: 'عدد المقاعد', unit: 'مقعد', category: 'dimensions', lowerIsBetter: false },
    ];

    const comparisonData = comparisonFields
      .map((field) => {
        const values = ordered.map((car) => {
          let raw = car[field.key as keyof typeof car];
          if (field.key === 'ai_lable_price_ar' && !raw && car.ai_lable_price) {
            raw = AI_LABEL_AR[String(car.ai_lable_price)] || car.ai_lable_price;
          }
          if (field.format) raw = field.format(raw) as typeof raw;
          return raw;
        });

        const numericValues = values.filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v),
        );

        const hasText = values.some((v) => v != null && v !== '' && typeof v !== 'number');
        if (numericValues.length < 2 && !hasText) {
          return null;
        }

        let bestValue: number | null = null;
        if (numericValues.length >= 2) {
          bestValue = field.lowerIsBetter
            ? Math.min(...numericValues)
            : Math.max(...numericValues);
        }

        return {
          ...field,
          values: ordered.map((car, i) => {
            const v = values[i];
            const isNum = typeof v === 'number' && Number.isFinite(v);
            return {
              carId: car._id,
              value: v ?? '—',
              isBest: isNum && bestValue != null && v === bestValue,
            };
          }),
        };
      })
      .filter(Boolean) as NonNullable<
      ReturnType<typeof comparisonFields.map>[number]
    >[];

    const weights: Record<string, number> = {
      performance: 25,
      safety: 20,
      fuel: 20,
      pricing: 30,
      dimensions: 10,
      general: 10,
    };

    const scores = ordered.map((car) => {
      let score = 0;
      let totalWeight = 0;

      for (const field of comparisonData) {
        if (!field) continue;
        const weight = weights[field.category] || 5;
        const carValue = field.values.find((v) => String(v.carId) === String(car._id));
        if (carValue?.isBest) score += weight;
        totalWeight += weight;
      }

      return {
        carId: car._id,
        brand: car.brand,
        model: car.model,
        score: totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    return {
      cars: ordered,
      comparison: comparisonData,
      scores,
      winner: scores[0],
    };
  }
}
