// comparison.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Car, CarDocument } from '../cars/car.schema';

@Injectable()
export class ComparisonService {
  constructor(@InjectModel(Car.name) private carModel: Model<CarDocument>) { }

  async compare(carIds: string[]) {
    if (carIds.length < 2 || carIds.length > 4) {
      throw new BadRequestException('يجب اختيار سيارتين على الأقل وأربع سيارات كحد أقصى');
    }

    const cars = await this.carModel.find({ _id: { $in: carIds } }).lean();

    if (cars.length !== carIds.length) {
      throw new NotFoundException('بعض السيارات المحددة غير موجودة');
    }

    // Build comparison matrix
    const comparisonFields = [
      { key: 'price', labelAr: 'السعر', unit: 'ريال', category: 'pricing', lowerIsBetter: true },
      { key: 'year', labelAr: 'سنة الإنتاج', unit: '', category: 'general', lowerIsBetter: false },
      { key: 'horsepower', labelAr: 'قوة المحرك', unit: 'حصان', category: 'performance', lowerIsBetter: false },
      { key: 'torque', labelAr: 'عزم الدوران', unit: 'نيوتن.متر', category: 'performance', lowerIsBetter: false },
      { key: 'acceleration', labelAr: '0-100 كم/س', unit: 'ثانية', category: 'performance', lowerIsBetter: true },
      { key: 'topSpeed', labelAr: 'السرعة القصوى', unit: 'كم/س', category: 'performance', lowerIsBetter: false },
      { key: 'fuelConsumption', labelAr: 'استهلاك الوقود', unit: 'لتر/100كم', category: 'fuel', lowerIsBetter: true },
      { key: 'fuelTankCapacity', labelAr: 'سعة خزان الوقود', unit: 'لتر', category: 'fuel', lowerIsBetter: false },
      { key: 'seatingCapacity', labelAr: 'عدد المقاعد', unit: 'مقعد', category: 'dimensions', lowerIsBetter: false },
      { key: 'cargoVolume', labelAr: 'حجم الصندوق', unit: 'لتر', category: 'dimensions', lowerIsBetter: false },
      { key: 'safetyRating', labelAr: 'تقييم السلامة', unit: 'نجوم', category: 'safety', lowerIsBetter: false },
      { key: 'weight', labelAr: 'وزن السيارة', unit: 'كجم', category: 'dimensions', lowerIsBetter: true },
    ];

    const comparisonData = comparisonFields.map(field => {
      const values = cars.map(car => car[field.key]);
      const numericValues = values.filter(v => v !== undefined && v !== null) as number[];
      let bestValue: number | null = null;

      if (numericValues.length > 0) {
        bestValue = field.lowerIsBetter
          ? Math.min(...numericValues)
          : Math.max(...numericValues);
      }

      return {
        ...field,
        values: cars.map(car => ({
          carId: car._id,
          value: car[field.key],
          isBest: numericValues.length > 0 && car[field.key] === bestValue,
        })),
      };
    });

    // Score each car (0-100)
    const scores = cars.map(car => {
      let score = 0;
      let totalWeight = 0;

      const weights = {
        performance: 25,
        safety: 20,
        fuel: 20,
        pricing: 20,
        dimensions: 15,
      };

      comparisonData.forEach(field => {
        const weight = weights[field.category] || 5;
        const carValue = field.values.find(v => String(v.carId) === String(car._id));
        if (carValue?.isBest) {
          score += weight;
        }
        totalWeight += weight;
      });

      return {
        carId: car._id,
        brand: car.brand,
        model: car.model,
        score: Math.round((score / totalWeight) * 100),
      };
    });

    scores.sort((a, b) => b.score - a.score);

    return {
      cars,
      comparison: comparisonData,
      scores,
      winner: scores[0],
    };
  }
}
