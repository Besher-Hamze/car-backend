import { CarDocument } from '../cars/car.schema';
import { CreateCarDto } from '../cars/car.dto';
import { EvaluatePriceDto } from './price-evaluation.types';

/** تحويل DTO إنشاء/تعديل إلى مدخلات التقييم */
export function createCarDtoToEvaluateDto(dto: CreateCarDto | Record<string, unknown>): EvaluatePriceDto {
  const d = dto as CreateCarDto;
  return {
    brand: d.brand,
    model: d.model,
    year: Number(d.year),
    price: Number(d.price),
    mileage: d.mileage,
    category: d.category,
    engineType: d.engineType,
    engineDisplacement: d.engineDisplacement,
    horsepower: d.horsepower,
    cylinders: d.cylinders,
    transmission: d.transmission,
    driveType: d.driveType,
    seatingCapacity: d.seatingCapacity,
    color: d.color,
    imported: d.imported,
    motorCondition: d.motorCondition,
    electricalCondition: d.electricalCondition,
    oilCondition: d.oilCondition,
    chassisCondition: d.chassisCondition,
    tiresCondition: d.tiresCondition,
    engineSmokeLevel: d.engineSmokeLevel,
    accidentHistoryType: d.accidentHistoryType,
    accidentHistoryLevel: d.accidentHistoryLevel,
    currency: d.currency || 'USD',
  };
}

/** تحويل سيارة من MongoDB إلى مدخلات تقييم السعر (مطابق للباك إند + ML). */
export function carDocumentToEvaluateDto(car: CarDocument): EvaluatePriceDto {
  return {
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    category: car.category,
    engineType: car.engineType,
    engineDisplacement: car.engineDisplacement,
    horsepower: car.horsepower,
    cylinders: car.cylinders,
    torque: car.torque,
    transmission: car.transmission,
    driveType: car.driveType,
    seatingCapacity: car.seatingCapacity,
    color: car.color,
    interiorColor: car.interiorColor,
    imported: car.imported,
    motorCondition: car.motorCondition,
    electricalCondition: car.electricalCondition,
    oilCondition: car.oilCondition,
    chassisCondition: car.chassisCondition,
    tiresCondition: car.tiresCondition,
    engineSmokeLevel: car.engineSmokeLevel ?? (car.isEngineSmoking ? '100' : '0'),
    isEngineSmoking: car.isEngineSmoking,
    accidentHistoryType: car.accidentHistoryType,
    accidentHistoryLevel: car.accidentHistoryLevel,
    currency: car.currency || 'USD',
  };
}
