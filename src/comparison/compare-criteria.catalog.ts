export type CompareMode = 'basic' | 'all';

export type CompareCriterionDef = {
  key: string;
  labelAr: string;
  unit: string;
  lowerIsBetter: boolean;
  /** يُعرض في الجدول لكن لا يدخل SAW */
  displayOnly?: boolean;
};

export const BASIC_CRITERION_KEYS = ['price', 'mileage', 'engine', 'year'] as const;

/** حقول نموذج إضافة السيارة — الوضع «حسب الكل» */
export const ALL_MODE_FIELDS: CompareCriterionDef[] = [
  { key: 'price', labelAr: 'السعر', unit: 'USD', lowerIsBetter: true },
  { key: 'ai_fair_price', labelAr: 'السعر العادل (AI)', unit: 'USD', lowerIsBetter: true },
  { key: 'ai_lable_price', labelAr: 'تقييم AI', unit: '', lowerIsBetter: false },
  { key: 'year', labelAr: 'سنة الإنتاج', unit: '', lowerIsBetter: false },
  { key: 'mileage', labelAr: 'المسافة المقطوعة', unit: 'كم', lowerIsBetter: true },
  { key: 'horsepower', labelAr: 'قوة المحرك', unit: 'حصان', lowerIsBetter: false },
  { key: 'engineDisplacement', labelAr: 'سعة المحرك', unit: 'cc', lowerIsBetter: false },
  { key: 'transmission', labelAr: 'ناقل الحركة', unit: '', lowerIsBetter: false, displayOnly: true },
  { key: 'condition', labelAr: 'الحالة', unit: '', lowerIsBetter: false },
  { key: 'seatingCapacity', labelAr: 'عدد المقاعد', unit: 'مقعد', lowerIsBetter: false },
];

/** أوزان ثابتة للوضع «حسب الكل» — من الأهم للأقل (مجموع 100%) */
export const ALL_MODE_PRIORITY: Array<{ key: string; weight: number }> = [
  { key: 'price', weight: 16 },
  { key: 'mileage', weight: 15 },
  { key: 'year', weight: 13 },
  { key: 'ai_fair_price', weight: 11 },
  { key: 'ai_lable_price', weight: 11 },
  { key: 'horsepower', weight: 11 },
  { key: 'engineDisplacement', weight: 10 },
  { key: 'condition', weight: 8 },
  { key: 'seatingCapacity', weight: 5 },
];

export const ALL_CRITERION_CATALOG: CompareCriterionDef[] = [
  ...ALL_MODE_FIELDS,
  { key: 'engine', labelAr: 'المحرك (حصان)', unit: 'حصان', lowerIsBetter: false },
];

export const CRITERION_BY_KEY = new Map(
  ALL_CRITERION_CATALOG.map((c) => [c.key, c]),
);

const AI_LABEL_AR: Record<string, string> = {
  very_cheap: 'رخيصة جداً',
  cheap: 'رخيصة',
  fair: 'مناسبة',
  expensive: 'غالية',
  very_expensive: 'غالية جداً',
};

/** أقل = أفضل للمشتري */
const AI_PRICE_SCORE: Record<string, number> = {
  very_cheap: 100,
  cheap: 85,
  fair: 60,
  expensive: 35,
  very_expensive: 15,
};

const CONDITION_SCORE: Record<string, number> = {
  new: 100,
  certified: 90,
  used: 70,
};

const CONDITION_LABEL_AR: Record<string, string> = {
  new: 'جديدة',
  used: 'مستعملة',
  certified: 'معتمدة',
};

export function extractCriterionDisplayValue(
  car: Record<string, unknown>,
  key: string,
): string | number | null {
  if (key === 'engine') {
    const hp = Number(car.horsepower);
    if (Number.isFinite(hp) && hp > 0) return hp;
    const cc = Number(car.engineDisplacement);
    if (Number.isFinite(cc) && cc > 0) return cc;
    return null;
  }

  if (key === 'ai_lable_price') {
    if (car.ai_lable_price_ar) return String(car.ai_lable_price_ar);
    const code = car.ai_lable_price;
    if (code) return AI_LABEL_AR[String(code)] ?? String(code);
    return null;
  }

  if (key === 'condition') {
    const c = car.condition;
    if (!c) return null;
    return CONDITION_LABEL_AR[String(c)] ?? String(c);
  }

  if (key === 'transmission') {
    const t = car.transmission;
    return t ? String(t) : null;
  }

  if (key === 'ai_fair_price') {
    const n = Number(car.ai_fair_price);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const raw = car[key];
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  return String(raw);
}

export function extractCriterionValue(
  car: Record<string, unknown>,
  key: string,
): number | null {
  const def = CRITERION_BY_KEY.get(key);
  if (def?.displayOnly) return null;

  if (key === 'engine') {
    const hp = Number(car.horsepower);
    if (Number.isFinite(hp) && hp > 0) return hp;
    const cc = Number(car.engineDisplacement);
    if (Number.isFinite(cc) && cc > 0) return cc;
    return null;
  }

  if (key === 'ai_lable_price') {
    const code = car.ai_lable_price;
    if (code && AI_PRICE_SCORE[String(code)] != null) {
      return AI_PRICE_SCORE[String(code)];
    }
    return null;
  }

  if (key === 'condition') {
    const c = car.condition;
    if (c && CONDITION_SCORE[String(c)] != null) {
      return CONDITION_SCORE[String(c)];
    }
    return null;
  }

  if (key === 'ai_fair_price') {
    const n = Number(car.ai_fair_price);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  if (!def) return null;

  const raw = car[key];
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= 0 && def.lowerIsBetter === false) {
    if (['horsepower', 'engineDisplacement', 'seatingCapacity', 'year'].includes(key)) {
      return null;
    }
  }
  return n;
}

export function buildBasicDefaultCriteria(): Array<{ key: string; weight: number; order: number }> {
  const keys = [...BASIC_CRITERION_KEYS];
  const base = Math.floor(100 / keys.length);
  let remainder = 100 - base * keys.length;
  return keys.map((key, order) => {
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder -= 1;
    return { key, weight: base + extra, order };
  });
}

export function buildAllModeCriteria(): Array<{ key: string; weight: number; order: number }> {
  return ALL_MODE_PRIORITY.map((c, order) => ({
    key: c.key,
    weight: c.weight,
    order,
  }));
}

export function buildEqualWeightCriteria(mode: CompareMode): Array<{ key: string; weight: number; order: number }> {
  return mode === 'all' ? buildAllModeCriteria() : buildBasicDefaultCriteria();
}

export function getCriterionMeta(key: string): CompareCriterionDef {
  if (key === 'engine') {
    return { key: 'engine', labelAr: 'المحرك (حصان)', unit: 'حصان', lowerIsBetter: false };
  }
  return CRITERION_BY_KEY.get(key) ?? { key, labelAr: key, unit: '', lowerIsBetter: false };
}

/** صفوف العرض للوضع «حسب الكل» */
export function getAllModeComparisonFields(): CompareCriterionDef[] {
  return ALL_MODE_FIELDS;
}
