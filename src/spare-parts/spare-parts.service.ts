// spare-parts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SparePart, SparePartDocument } from './spare-part.schema';

export interface QuerySparePartsDto {
  search?: string;
  category?: string;
  brand?: string;
  quality?: string;
  compatibleCarBrand?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class SparePartsService {
  constructor(
    @InjectModel(SparePart.name) private sparePartModel: Model<SparePartDocument>,
  ) {}

  async findAll(query: QuerySparePartsDto) {
    const { search, category, brand, quality, compatibleCarBrand,
            minPrice, maxPrice, page = 1, limit = 12 } = query;

    const filter: any = {};
    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (quality) filter.quality = quality;
    if (compatibleCarBrand) filter.compatibleCarBrands = { $in: [compatibleCarBrand] };
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.sparePartModel.find(filter).skip(skip).limit(limit).lean(),
      this.sparePartModel.countDocuments(filter),
    ]);

    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<SparePart> {
    const part = await this.sparePartModel.findById(id).populate('compatibleCars');
    if (!part) throw new NotFoundException('قطعة الغيار غير موجودة');
    return part;
  }

  async findByCarId(carId: string): Promise<SparePart[]> {
    return this.sparePartModel
      .find({ compatibleCars: carId })
      .lean();
  }

  async getCategories(): Promise<string[]> {
    return this.sparePartModel.distinct('category');
  }

  async create(dto: any): Promise<SparePart> {
    return new this.sparePartModel(dto).save();
  }

  async seedSampleData() {
    const existing = await this.sparePartModel.countDocuments();
    if (existing > 0) return { message: 'البيانات موجودة', count: existing };

    const parts = [
      { name: 'Oil Filter', nameAr: 'فلتر الزيت', category: 'filters', price: 45, partNumber: 'OF-001', brand: 'Bosch', compatibleCarBrands: ['Toyota', 'Hyundai', 'Kia'], quality: 'oem', stock: 250, warranty: '6 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'فلتر زيت عالي الجودة يضمن نقاء زيت المحرك', rating: 4.6, reviewsCount: 89 },
      { name: 'Air Filter', nameAr: 'فلتر الهواء', category: 'filters', price: 85, partNumber: 'AF-002', brand: 'Mann', compatibleCarBrands: ['BMW', 'Mercedes-Benz', 'Audi'], quality: 'original', stock: 120, warranty: '12 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'فلتر هواء أصلي لمحركات الأداء العالي', rating: 4.8, reviewsCount: 56 },
      { name: 'Brake Pads', nameAr: 'تيل الفرامل', category: 'brakes', price: 320, partNumber: 'BP-003', brand: 'Brembo', compatibleCarBrands: ['BMW', 'Porsche', 'Mercedes-Benz'], quality: 'original', stock: 80, warranty: '24 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'تيل فرامل بريمبو للأداء العالي والأمان القصوى', rating: 4.9, reviewsCount: 134 },
      { name: 'Spark Plugs Set', nameAr: 'شمعات الإشعال', category: 'engine', price: 180, partNumber: 'SP-004', brand: 'NGK', compatibleCarBrands: ['Toyota', 'Honda', 'Nissan'], quality: 'original', stock: 200, warranty: '12 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'شمعات إشعال NGK عالية الأداء لمحركات البنزين', rating: 4.7, reviewsCount: 78 },
      { name: 'Shock Absorber', nameAr: 'ماص الصدمات', category: 'suspension', price: 890, partNumber: 'SA-005', brand: 'KYB', compatibleCarBrands: ['Toyota', 'Honda', 'Hyundai', 'Kia'], quality: 'oem', stock: 45, warranty: '24 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'ماص صدمات احترافي يوفر راحة استثنائية في القيادة', rating: 4.5, reviewsCount: 43 },
      { name: 'Timing Belt Kit', nameAr: 'طقم السير الزمني', category: 'engine', price: 650, partNumber: 'TB-006', brand: 'Gates', compatibleCarBrands: ['Toyota', 'Lexus'], quality: 'original', stock: 30, warranty: '24 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'طقم سير زمني كامل مع بكرات الشد', rating: 4.8, reviewsCount: 62 },
      { name: 'Battery 75Ah', nameAr: 'بطارية 75 أمبير', category: 'electrical', price: 420, partNumber: 'BAT-007', brand: 'Bosch', compatibleCarBrands: ['Toyota', 'BMW', 'Mercedes-Benz', 'Hyundai'], quality: 'original', stock: 95, warranty: '24 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'بطارية بوش 75 أمبير موثوقة لجميع الأجواء', rating: 4.6, reviewsCount: 167 },
      { name: 'Windshield Wipers', nameAr: 'مساحات الزجاج', category: 'body', price: 95, partNumber: 'WW-008', brand: 'Bosch', compatibleCarBrands: ['Toyota', 'BMW', 'Mercedes-Benz', 'Hyundai', 'Kia'], quality: 'oem', stock: 300, warranty: '6 months', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', description: 'مساحات هجينة لتنظيف مثالي في جميع الأجواء', rating: 4.4, reviewsCount: 234 },
    ];

    const result = await this.sparePartModel.insertMany(parts);
    return { message: 'تم إضافة بيانات قطع الغيار التجريبية', count: result.length };
  }
}
