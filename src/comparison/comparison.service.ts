import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Car, CarDocument } from '../cars/car.schema';
import { CompareCriterionDto } from './compare.dto';
import {
  buildAllModeCriteria,
  buildBasicDefaultCriteria,
  extractCriterionDisplayValue,
  extractCriterionValue,
  getAllModeComparisonFields,
  getCriterionMeta,
  type CompareMode,
} from './compare-criteria.catalog';

type CompareField = {
  key: string;
  labelAr: string;
  unit: string;
  category: string;
  lowerIsBetter: boolean;
  format?: (v: unknown) => string | number | null;
};

type ComparisonRow = CompareField & {
  values: Array<{ carId: Types.ObjectId; value: unknown; isBest: boolean }>;
};

type CarLean = Car & { _id: Types.ObjectId };

type ResolvedCriterion = { key: string; weight: number; order: number };

@Injectable()
export class ComparisonService {
  constructor(@InjectModel(Car.name) private carModel: Model<CarDocument>) {}

  async compare(
    carIds: string[],
    mode: CompareMode = 'basic',
    criteriaInput?: CompareCriterionDto[],
  ) {
    if (carIds.length < 2 || carIds.length > 4) {
      throw new BadRequestException('يجب اختيار سيارتين على الأقل وأربع سيارات كحد أقصى');
    }

    const criteria = this.resolveCriteria(mode, criteriaInput);

    const cars = await this.carModel.find({ _id: { $in: carIds } }).lean();

    if (cars.length !== carIds.length) {
      throw new NotFoundException('بعض السيارات المحددة غير موجودة');
    }

    const ordered = carIds
      .map((id) => cars.find((c) => String(c._id) === String(id)))
      .filter(Boolean) as CarLean[];

    const comparisonFields: CompareField[] = getAllModeComparisonFields().map((f) => ({
      key: f.key,
      labelAr: f.labelAr,
      unit: f.unit,
      category: 'general',
      lowerIsBetter: f.lowerIsBetter,
    }));

    const comparisonData = comparisonFields
      .map((field) => this.buildComparisonRow(field, ordered))
      .filter((row): row is ComparisonRow => row != null);

    const criteriaUsed = criteria.map((c, i) => {
      const meta = getCriterionMeta(c.key);
      return {
        key: c.key,
        labelAr: meta.labelAr,
        weight: c.weight,
        order: c.order ?? i,
        unit: meta.unit,
        lowerIsBetter: meta.lowerIsBetter,
      };
    });

    const normalizedByCriterion = new Map<string, number[]>();
    for (const c of criteria) {
      const meta = getCriterionMeta(c.key);
      const raw = ordered.map((car) =>
        extractCriterionValue(car as unknown as Record<string, unknown>, c.key),
      );
      normalizedByCriterion.set(c.key, this.normalizeScores(raw, meta.lowerIsBetter));
    }

    const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

    const scores = ordered.map((car, carIndex) => {
      let weightedSum = 0;
      const breakdown = criteria.map((c) => {
        const meta = getCriterionMeta(c.key);
        const norm = normalizedByCriterion.get(c.key)?.[carIndex] ?? 0;
        const contribution = (c.weight / totalWeight) * norm;
        weightedSum += contribution;
        return {
          key: c.key,
          labelAr: meta.labelAr,
          weight: c.weight,
          rawValue: extractCriterionValue(car as unknown as Record<string, unknown>, c.key),
          normalizedScore: Math.round(norm * 100),
          weightedContribution: Math.round(contribution * 100),
        };
      });

      return {
        carId: car._id,
        brand: car.brand,
        model: car.model,
        score: Math.round(weightedSum * 100),
        breakdown,
      };
    });

    scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      for (const c of criteria) {
        const aIdx = ordered.findIndex((x) => String(x._id) === String(a.carId));
        const bIdx = ordered.findIndex((x) => String(x._id) === String(b.carId));
        const aNorm = normalizedByCriterion.get(c.key)?.[aIdx] ?? 0;
        const bNorm = normalizedByCriterion.get(c.key)?.[bIdx] ?? 0;
        if (bNorm !== aNorm) return bNorm - aNorm;
      }
      return 0;
    });

    const priorityRows =
      mode === 'all'
        ? this.buildAllModePriorityRows(ordered, criteria, normalizedByCriterion)
        : this.buildPriorityComparisonRows(ordered, criteria, normalizedByCriterion);

    return {
      cars: ordered,
      comparison: comparisonData,
      criteriaUsed,
      compareMode: mode,
      priorityComparison: priorityRows,
      scores,
      winner: scores[0],
      scoringMethod: 'SAW',
    };
  }

  private resolveCriteria(
    mode: CompareMode,
    criteriaInput?: CompareCriterionDto[],
  ): ResolvedCriterion[] {
    if (mode === 'all') {
      return buildAllModeCriteria();
    }

    if (criteriaInput?.length) {
      const raw = criteriaInput.filter((c) => c.weight > 0);
      if (!raw.length) {
        throw new BadRequestException('اختر معياراً واحداً على الأقل للمقارنة');
      }
      const sum = raw.reduce((s, c) => s + c.weight, 0);
      if (Math.abs(sum - 100) > 0.5) {
        throw new BadRequestException('مجموع أوزان المعايير يجب أن يساوي 100%');
      }
      return [...raw]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c, i) => ({ key: c.key, weight: c.weight, order: c.order ?? i }));
    }

    return buildBasicDefaultCriteria();
  }

  /** SAW normalization: 0–1 where 1 = best among compared cars */
  private normalizeScores(values: (number | null)[], lowerIsBetter: boolean): number[] {
    const valid = values
      .map((v, i) => ({ v, i }))
      .filter((x): x is { v: number; i: number } => x.v != null && Number.isFinite(x.v));

    const result = values.map(() => 0);

    if (valid.length === 0) return result;
    if (valid.length === 1) {
      result[valid[0].i] = 1;
      return result;
    }

    const nums = valid.map((x) => x.v);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min;

    for (const { v, i } of valid) {
      if (range === 0) {
        result[i] = 1;
      } else {
        const norm = (v - min) / range;
        result[i] = lowerIsBetter ? 1 - norm : norm;
      }
    }

    return result;
  }

  private buildComparisonRow(field: CompareField, ordered: CarLean[]): ComparisonRow | null {
    const values = ordered.map((car) =>
      extractCriterionDisplayValue(car as unknown as Record<string, unknown>, field.key),
    );

    const numericValues = values.filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    );

    const hasText = values.some((v) => v != null && v !== '' && typeof v !== 'number');
    if (numericValues.length < 1 && !hasText) return null;
    if (values.every((v) => v == null || v === '')) return null;

    let bestValue: number | null = null;
    if (numericValues.length >= 2) {
      bestValue = field.lowerIsBetter ? Math.min(...numericValues) : Math.max(...numericValues);
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
  }

  private buildAllModePriorityRows(
    ordered: CarLean[],
    criteria: ResolvedCriterion[],
    normalizedByCriterion: Map<string, number[]>,
  ) {
    const fields = getAllModeComparisonFields();
    return fields.map((f, order) => {
      const displayValues = ordered.map((car) =>
        extractCriterionDisplayValue(car as unknown as Record<string, unknown>, f.key),
      );
      const rawValues = ordered.map((car) =>
        extractCriterionValue(car as unknown as Record<string, unknown>, f.key),
      );
      const normalized = normalizedByCriterion.get(f.key) ?? [];
      let bestRaw: number | null = null;
      const numeric = rawValues.filter((v): v is number => v != null);
      if (numeric.length >= 2) {
        bestRaw = f.lowerIsBetter ? Math.min(...numeric) : Math.max(...numeric);
      }
      const crit = criteria.find((c) => c.key === f.key);

      return {
        key: f.key,
        labelAr: f.labelAr,
        unit: f.unit,
        weight: crit?.weight ?? 0,
        order,
        lowerIsBetter: f.lowerIsBetter,
        values: ordered.map((car, i) => {
          const raw = rawValues[i];
          const display = displayValues[i];
          const isNum = raw != null && Number.isFinite(raw);
          return {
            carId: car._id,
            value: display ?? raw ?? '—',
            normalizedScore: Math.round((normalized[i] ?? 0) * 100),
            isBest: isNum && bestRaw != null && raw === bestRaw,
          };
        }),
      };
    });
  }

  private buildPriorityComparisonRows(
    ordered: CarLean[],
    criteria: ResolvedCriterion[],
    normalizedByCriterion: Map<string, number[]>,
  ) {
    return criteria.map((c) => {
      const meta = getCriterionMeta(c.key);
      const displayValues = ordered.map((car) =>
        extractCriterionDisplayValue(car as unknown as Record<string, unknown>, c.key),
      );
      const rawValues = ordered.map((car) =>
        extractCriterionValue(car as unknown as Record<string, unknown>, c.key),
      );
      const normalized = normalizedByCriterion.get(c.key) ?? [];
      let bestRaw: number | null = null;
      const numeric = rawValues.filter((v): v is number => v != null);
      if (numeric.length >= 2) {
        bestRaw = meta.lowerIsBetter ? Math.min(...numeric) : Math.max(...numeric);
      }

      return {
        key: c.key,
        labelAr: meta.labelAr,
        unit: meta.unit,
        weight: c.weight,
        order: c.order,
        lowerIsBetter: meta.lowerIsBetter,
        values: ordered.map((car, i) => {
          const raw = rawValues[i];
          const display = displayValues[i];
          const isNum = raw != null && Number.isFinite(raw);
          return {
            carId: car._id,
            value: display ?? raw ?? '—',
            normalizedScore: Math.round((normalized[i] ?? 0) * 100),
            isBest: isNum && bestRaw != null && raw === bestRaw,
          };
        }),
      };
    });
  }
}
