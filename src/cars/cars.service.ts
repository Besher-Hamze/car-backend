import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { join } from 'path';
import * as fs from 'fs';
import { Car, CarDocument, CarStatus } from './car.schema';
import { publicCarImagePath, CARS_UPLOAD_DIR } from './car-image-upload';
import {
  CreateCarDto,
  CreateSellerCarDto,
  QueryCarsDto,
  UpdateCarDto,
} from './car.dto';
import { PriceEvaluationService } from '../price-evaluation/price-evaluation.service';
import {
  carDocumentToEvaluateDto,
  createCarDtoToEvaluateDto,
} from '../price-evaluation/car-to-evaluate.dto';
import { fetchAiFields } from '../price-evaluation/apply-ai-fields';

@Injectable()
export class CarsService {
  constructor(
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    private readonly priceEvaluationService: PriceEvaluationService,
  ) { }

  private async withAiEvaluation<T extends Record<string, unknown>>(
    payload: T,
    evaluateDto: ReturnType<typeof createCarDtoToEvaluateDto>,
  ): Promise<T> {
    const ai = await fetchAiFields(this.priceEvaluationService, evaluateDto);
    return { ...payload, ...ai };
  }

  /** Admin path: car is created already published and fully detailed.
   *  First uploaded file → `imageUrl`, the rest → `images`. */
  async create(createCarDto: CreateCarDto, imageFilenames: string[]): Promise<CarDocument> {
    if (!imageFilenames || imageFilenames.length === 0) {
      throw new BadRequestException('يجب رفع صورة واحدة على الأقل');
    }
    const { imageUrl: _ignore, images: _ignoreImages, ...rest } = createCarDto;
    const [first, ...restNames] = imageFilenames;
    const base = {
      ...rest,
      imageUrl: publicCarImagePath(first),
      images: restNames.map((name) => publicCarImagePath(name)),
      status: CarStatus.PUBLISHED,
    };
    const withAi = await this.withAiEvaluation(base, createCarDtoToEvaluateDto(createCarDto));
    const car = new this.carModel(withAi);
    return car.save();
  }

  /** Seller path: minimal details, status=pending, hidden from public until admin publishes.
   *  The first uploaded file becomes the main `imageUrl`; the rest go into `images`. */
  async createBySeller(
    dto: CreateSellerCarDto,
    imageFilenames: string[],
    sellerId: string,
  ): Promise<CarDocument> {
    if (!imageFilenames || imageFilenames.length === 0) {
      throw new BadRequestException('يجب رفع صورة واحدة على الأقل');
    }
    const [first, ...rest] = imageFilenames;
    const base = {
      ...dto,
      imageUrl: publicCarImagePath(first),
      images: rest.map((name) => publicCarImagePath(name)),
      currency: 'USD',
      status: CarStatus.PENDING,
      sellerId: new Types.ObjectId(sellerId),
    };
    const withAi = await this.withAiEvaluation(base, createCarDtoToEvaluateDto(dto));
    const car = new this.carModel(withAi);
    return car.save();
  }

  /** All cars submitted by a given seller, newest first. */
  async findBySeller(sellerId: string) {
    return this.carModel
      .find({ sellerId: new Types.ObjectId(sellerId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  /** Cars awaiting admin review. */
  async findPending() {
    return this.carModel
      .find({ status: CarStatus.PENDING })
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  async publish(id: string): Promise<CarDocument> {
    const existing = await this.carModel.findById(id);
    if (!existing) throw new NotFoundException('السيارة غير موجودة');
    const ai = await fetchAiFields(
      this.priceEvaluationService,
      carDocumentToEvaluateDto(existing),
    );
    const car = await this.carModel.findByIdAndUpdate(
      id,
      { status: CarStatus.PUBLISHED, rejectionReason: null, ...ai },
      { new: true },
    );
    if (!car) throw new NotFoundException('السيارة غير موجودة');
    return car;
  }

  async reject(id: string, reason?: string): Promise<CarDocument> {
    const car = await this.carModel.findByIdAndUpdate(
      id,
      { status: CarStatus.REJECTED, rejectionReason: reason },
      { new: true },
    );
    if (!car) throw new NotFoundException('السيارة غير موجودة');
    return car;
  }

  async findAll(query: QueryCarsDto) {
    const {
      search, brand, category, condition, engineType,
      transmission, driveType, color,
      minPrice, maxPrice, minYear, maxYear,
      minHorsepower, maxHorsepower, minSeats, minMileage, maxMileage,
      minMotorCondition, minElectricalCondition, minOilCondition,
      minChassisCondition, minTiresCondition,
      engineSmokeLevel, accidentHistoryType,
      status,
      page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc',
    } = query;

    const filter: any = {};

    /** Status visibility:
     *  - 'all'              → no status filter (admin)
     *  - explicit value     → exact match (admin)
     *  - undefined (public) → only published, including legacy docs without a status field. */
    if (status === 'all') {
      // no constraint
    } else if (status) {
      filter.status = status;
    } else {
      filter.$or = [
        { status: CarStatus.PUBLISHED },
        { status: { $exists: false } },
      ];
    }

    if (search) filter.$text = { $search: search };
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (engineType) filter.engineType = engineType;
    if (transmission) filter.transmission = transmission;
    if (driveType) filter.driveType = driveType;
    if (color) filter.color = { $regex: color, $options: 'i' };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (minYear !== undefined || maxYear !== undefined) {
      filter.year = {};
      if (minYear !== undefined) filter.year.$gte = minYear;
      if (maxYear !== undefined) filter.year.$lte = maxYear;
    }

    if (minHorsepower !== undefined || maxHorsepower !== undefined) {
      filter.horsepower = {};
      if (minHorsepower !== undefined) filter.horsepower.$gte = minHorsepower;
      if (maxHorsepower !== undefined) filter.horsepower.$lte = maxHorsepower;
    }

    if (minSeats !== undefined) {
      filter.seatingCapacity = { $gte: minSeats };
    }

    if (minMileage !== undefined || maxMileage !== undefined) {
      filter.mileage = {};
      if (minMileage !== undefined) filter.mileage.$gte = minMileage;
      if (maxMileage !== undefined) filter.mileage.$lte = maxMileage;
    }

    /** Scores are stored as discrete strings ('0','10'..'100').
     * Use $in with the valid subset to avoid lexicographic comparison. */
    const scoresAtLeast = (min: string): string[] => {
      const n = parseInt(min, 10);
      if (!Number.isFinite(n)) return [];
      const out: string[] = [];
      for (let v = n; v <= 100; v += 10) out.push(String(v));
      return out;
    };
    if (minMotorCondition) filter.motorCondition = { $in: scoresAtLeast(minMotorCondition) };
    if (minElectricalCondition) filter.electricalCondition = { $in: scoresAtLeast(minElectricalCondition) };
    if (minOilCondition) filter.oilCondition = { $in: scoresAtLeast(minOilCondition) };
    if (minChassisCondition) filter.chassisCondition = { $in: scoresAtLeast(minChassisCondition) };
    if (minTiresCondition) filter.tiresCondition = { $in: scoresAtLeast(minTiresCondition) };

    if (engineSmokeLevel) filter.engineSmokeLevel = engineSmokeLevel;
    if (accidentHistoryType) filter.accidentHistoryType = accidentHistoryType;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [cars, total] = await Promise.all([
      this.carModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.carModel.countDocuments(filter),
    ]);

    return {
      data: cars,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CarDocument> {
    let car = await this.carModel.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
    if (!car) throw new NotFoundException(`السيارة غير موجودة`);
    if (!car.ai_lable_price) {
      const ai = await fetchAiFields(
        this.priceEvaluationService,
        carDocumentToEvaluateDto(car),
      );
      if (ai.ai_lable_price) {
        car = await this.carModel.findByIdAndUpdate(id, ai, { new: true });
      }
    }
    return car!;
  }

  /** تقييم سعر سيارة محفوظة — يمرّر كل مواصفاتها للـ ML. */
  async evaluatePrice(id: string) {
    const car = await this.carModel.findById(id);
    if (!car) throw new NotFoundException('السيارة غير موجودة');
    return this.priceEvaluationService.evaluate(carDocumentToEvaluateDto(car));
  }

  async update(
    id: string,
    updateCarDto: UpdateCarDto,
    newImageFilenames: string[] = [],
  ): Promise<CarDocument> {
    const existing = await this.carModel.findById(id);
    if (!existing) throw new NotFoundException(`السيارة غير موجودة`);

    const { imageUrl: _stripUrl, images: _stripImages, imageSlots, ...rest } = updateCarDto;
    const payload: any = { ...rest };

    const built = this.buildImageFieldsFromSlots(imageSlots, newImageFilenames);
    if (built) {
      const oldUrls = [existing.imageUrl, ...(existing.images || [])].filter(Boolean) as string[];
      const newUrls = [built.imageUrl, ...built.images];
      for (const url of oldUrls) {
        if (url.startsWith('/uploads/') && !newUrls.includes(url)) {
          this.unlinkUploadedFile(url);
        }
      }
      payload.imageUrl = built.imageUrl;
      payload.images = built.images;
    }

    existing.set(payload);
    const withAi = await this.withAiEvaluation(
      payload,
      carDocumentToEvaluateDto(existing),
    );
    const car = await this.carModel.findByIdAndUpdate(id, withAi, { new: true });
    if (!car) throw new NotFoundException(`السيارة غير موجودة`);
    return car;
  }

  /** Resolve final `imageUrl` + `images` from optional slot JSON and newly uploaded files. */
  private buildImageFieldsFromSlots(
    imageSlotsJson: string | undefined,
    newFilenames: string[],
  ): { imageUrl: string; images: string[] } | null {
    if (!imageSlotsJson) {
      if (!newFilenames.length) return null;
      const [first, ...rest] = newFilenames;
      return {
        imageUrl: publicCarImagePath(first),
        images: rest.map((name) => publicCarImagePath(name)),
      };
    }

    let slots: Array<{ type: string; url?: string }>;
    try {
      slots = JSON.parse(imageSlotsJson);
    } catch {
      throw new BadRequestException('صيغة imageSlots غير صالحة');
    }
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new BadRequestException('يجب الاحتفاظ بصورة واحدة على الأقل');
    }

    let newIdx = 0;
    const urls: string[] = [];
    for (const slot of slots) {
      if (slot.type === 'existing' && slot.url) {
        urls.push(slot.url);
      } else if (slot.type === 'new') {
        if (newIdx >= newFilenames.length) {
          throw new BadRequestException('عدد الصور الجديدة لا يطابق الطلب');
        }
        urls.push(publicCarImagePath(newFilenames[newIdx++]));
      }
    }
    if (newIdx !== newFilenames.length) {
      throw new BadRequestException('عدد الصور الجديدة لا يطابق الطلب');
    }
    if (urls.length === 0) {
      throw new BadRequestException('يجب الاحتفاظ بصورة واحدة على الأقل');
    }
    return { imageUrl: urls[0], images: urls.slice(1) };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.carModel.findById(id);
    if (!doc) throw new NotFoundException(`السيارة غير موجودة`);
    if (doc.imageUrl?.startsWith('/uploads/')) {
      this.unlinkUploadedFile(doc.imageUrl);
    }
    await this.carModel.findByIdAndDelete(id);
  }

  private unlinkUploadedFile(publicPath: string): void {
    try {
      const rel = publicPath.replace(/^\//, '');
      const full = join(process.cwd(), rel);
      if (fs.existsSync(full) && full.startsWith(CARS_UPLOAD_DIR)) {
        fs.unlinkSync(full);
      }
    } catch { }
  }

  /** Mongo filter that matches only publicly visible cars
   *  (legacy docs without a status field are treated as published). */
  private publicVisibleFilter() {
    return {
      $or: [{ status: CarStatus.PUBLISHED }, { status: { $exists: false } }],
    };
  }

  async getBrands(): Promise<string[]> {
    return this.carModel.distinct('brand', this.publicVisibleFilter());
  }

  async getStats() {
    const visible = this.publicVisibleFilter();
    const [totalCars, brands, categories] = await Promise.all([
      this.carModel.countDocuments(visible),
      this.carModel.distinct('brand', visible),
      this.carModel.aggregate([
        { $match: visible },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    const priceStats = await this.carModel.aggregate([
      { $match: visible },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]);
    return {
      totalCars,
      totalBrands: brands.length,
      categories,
      priceStats: priceStats[0] || {},
    };
  }

  async getFeatured(limit = 6): Promise<Car[]> {
    return this.carModel
      .find({ isAvailable: true, ...this.publicVisibleFilter() })
      .sort({ views: -1, rating: -1 })
      .limit(limit)
      .lean() as any;
  }

  async getSimilar(id: string, limit = 4): Promise<Car[]> {
    const car = await this.carModel.findById(id);
    if (!car) throw new NotFoundException('السيارة غير موجودة');
    return this.carModel.find({
      _id: { $ne: id },
      ...this.publicVisibleFilter(),
      $or: [{ brand: car.brand }, { category: car.category, price: { $gte: car.price * 0.8, $lte: car.price * 1.2 } }],
    }).limit(limit).lean() as any;
  }

  async seedSampleData() {
    const existing = await this.carModel.countDocuments();
    if (existing > 0) return { message: 'البيانات موجودة بالفعل', count: existing };

    const seedPath = join(__dirname, 'data', 'aleppo-seed.json');
    if (!fs.existsSync(seedPath)) {
      throw new BadRequestException(
        'ملف بيانات حلب غير موجود. شغّل: python ml-service/scripts/generate_data.py',
      );
    }

    const raw = fs.readFileSync(seedPath, 'utf-8');
    const sampleCars = JSON.parse(raw) as Record<string, unknown>[];

    const cleaned = sampleCars.map(({ fairPrice, priceRatio, priceLabel, priceLabelAr, ...car }) => ({
      ...car,
      status: CarStatus.PUBLISHED,
    }));

    const result = await this.carModel.insertMany(cleaned);
    return {
      message: 'تم إضافة بيانات سيارات حلب التجريبية بنجاح',
      count: result.length,
      city: 'حلب',
    };
  }
}
