import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SparePart, SparePartDocument } from './spare-part.schema';

@Injectable()
export class SparePartsService {
  constructor(@InjectModel(SparePart.name) private sparePartModel: Model<SparePartDocument>) {}

  async findAll(query: any) {
    const { search, category, brand, quality, compatibleCarBrand, minPrice, maxPrice, page = 1, limit = 12 } = query;
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

  async findOne(id: string): Promise<SparePartDocument> {
    const part = await this.sparePartModel.findById(id).populate('compatibleCars');
    if (!part) throw new NotFoundException('قطعة الغيار غير موجودة');
    return part;
  }

  async findByCarId(carId: string) {
    return this.sparePartModel.find({ compatibleCars: carId }).lean();
  }

  async getCategories() {
    return this.sparePartModel.distinct('category');
  }

  async create(dto: any) {
    return new this.sparePartModel(dto).save();
  }

  async seedSampleData() {
    // Logic as seen in dist/spare-parts/spare-parts.service.js
    const existing = await this.sparePartModel.countDocuments();
    if (existing > 0) return { message: 'البيانات موجودة', count: existing };
    const parts = [/* reconstructed from JS ... */];
    const result = await this.sparePartModel.insertMany(parts);
    return { message: 'تم إضافة بيانات قطع الغيار التجريبية', count: result.length };
  }
}
