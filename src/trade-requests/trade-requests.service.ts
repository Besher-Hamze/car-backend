import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Car, CarDocument, CarStatus } from '../cars/car.schema';
import {
  CashDirection,
  TradeRequest,
  TradeRequestDocument,
  TradeRequestStatus,
} from './trade-request.schema';
import { RespondTradeDto } from './trade-request.dto';
import { publicTradePhotoPath } from './trade-photo-upload';
import { publicTradeProofPath } from './trade-proof-upload';

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 6;
const MIN_PROOF_DOCS = 2;
const MAX_PROOF_DOCS = 4;

type CreateBody = {
  targetCarId: string;
  offerCarId?: string;
  offerBrand?: string;
  offerModel?: string;
  offerYear?: string;
  offerPrice: string;
  offerCondition?: string;
  offerMileage?: string;
  offerEngineType?: string;
  offerHorsepower?: string;
  offerTransmission?: string;
  offerColor?: string;
  offerDescription?: string;
  requesterPhone: string;
  requesterNotes?: string;
};

function resolveCashDirection(targetPrice: number, offerPrice: number): CashDirection {
  if (offerPrice > targetPrice) return CashDirection.OWNER_PAYS;
  return CashDirection.REQUESTER_PAYS;
}

@Injectable()
export class TradeRequestsService {
  constructor(
    @InjectModel(TradeRequest.name)
    private readonly tradeModel: Model<TradeRequestDocument>,
    @InjectModel(Car.name) private readonly carModel: Model<CarDocument>,
  ) {}

  async create(
    requesterId: string,
    body: CreateBody,
    photoFiles: { filename: string }[],
    proofFiles: { filename: string }[],
  ) {
    if (!body.requesterPhone?.trim()) {
      throw new BadRequestException('رقم التواصل مطلوب');
    }
    if (!photoFiles?.length || photoFiles.length < MIN_PHOTOS) {
      throw new BadRequestException(`يرجى رفع ${MIN_PHOTOS} صورة على الأقل لسيارتك`);
    }
    if (photoFiles.length > MAX_PHOTOS) {
      throw new BadRequestException(`الحد الأقصى ${MAX_PHOTOS} صور`);
    }
    if (!proofFiles?.length || proofFiles.length < MIN_PROOF_DOCS) {
      throw new BadRequestException(`يرجى رفع ${MIN_PROOF_DOCS} أوراق ثبوتية على الأقل`);
    }
    if (proofFiles.length > MAX_PROOF_DOCS) {
      throw new BadRequestException(`الحد الأقصى ${MAX_PROOF_DOCS} أوراق ثبوتية`);
    }

    const offerPrice = Number(body.offerPrice);
    if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
      throw new BadRequestException('سعر سيارتك المقدّر غير صالح');
    }

    const targetCar = await this.carModel.findById(body.targetCarId).exec();
    if (!targetCar || targetCar.status !== CarStatus.PUBLISHED) {
      throw new NotFoundException('السيارة المطلوبة غير متاحة');
    }
    if (targetCar.isAvailable === false) {
      throw new BadRequestException('السيارة المطلوبة مباعة أو محجوزة');
    }

    const ownerId = targetCar.sellerId?.toString();
    if (ownerId && ownerId === requesterId) {
      throw new BadRequestException('لا يمكنك إرسال داكيش على سيارتك');
    }

    const existing = await this.tradeModel.findOne({
      targetCarId: targetCar._id,
      requesterId: new Types.ObjectId(requesterId),
      status: TradeRequestStatus.PENDING,
    });
    if (existing) {
      throw new BadRequestException('لديك طلب داكيش قيد المراجعة لهذه السيارة');
    }

    let offerBrand = body.offerBrand?.trim();
    let offerModel = body.offerModel?.trim();
    let offerYear = body.offerYear ? Number(body.offerYear) : undefined;
    let offerCarId: Types.ObjectId | undefined;
    let offerCondition = body.offerCondition?.trim();
    let offerMileage = body.offerMileage ? Number(body.offerMileage) : undefined;
    let offerEngineType = body.offerEngineType?.trim();
    let offerHorsepower = body.offerHorsepower ? Number(body.offerHorsepower) : undefined;
    let offerTransmission = body.offerTransmission?.trim();
    let offerColor = body.offerColor?.trim();

    if (body.offerCarId?.trim()) {
      const listed = await this.carModel.findById(body.offerCarId).exec();
      if (!listed) throw new NotFoundException('سيارتك المدرجة غير موجودة');
      if (listed.sellerId?.toString() !== requesterId) {
        throw new ForbiddenException('يمكنك اختيار سياراتك فقط');
      }
      if (listed.status !== CarStatus.PUBLISHED || listed.isAvailable === false) {
        throw new BadRequestException('السيارة المعروضة في الداكيش غير متاحة');
      }
      offerCarId = listed._id as Types.ObjectId;
      offerBrand = listed.brand;
      offerModel = listed.model;
      offerYear = listed.year;
      if (!offerCondition) offerCondition = listed.condition;
      if (offerMileage == null) offerMileage = listed.mileage;
      if (!offerEngineType) offerEngineType = listed.engineType;
      if (offerHorsepower == null) offerHorsepower = listed.horsepower;
      if (!offerTransmission) offerTransmission = listed.transmission;
      if (!offerColor) offerColor = listed.color;
    }

    if (!offerBrand || !offerModel || !offerYear) {
      throw new BadRequestException('أدخل ماركة وموديل وسنة سيارتك أو اختر سيارة مدرجة');
    }

    const cashDifference = Math.round(Math.abs(targetCar.price - offerPrice) * 100) / 100;
    const cashDirection = resolveCashDirection(targetCar.price, offerPrice);
    const offerImageUrls = photoFiles.map((f) => publicTradePhotoPath(f.filename));
    const proofDocUrls = proofFiles.map((f) => publicTradeProofPath(f.filename));

    return this.tradeModel.create({
      targetCarId: targetCar._id,
      requesterId: new Types.ObjectId(requesterId),
      ownerId: targetCar.sellerId,
      status: TradeRequestStatus.PENDING,
      offerCarId,
      offerBrand,
      offerModel,
      offerYear,
      offerPrice,
      offerCondition,
      offerMileage,
      offerEngineType,
      offerHorsepower,
      offerTransmission,
      offerColor,
      offerDescription: body.offerDescription?.trim(),
      offerImageUrls,
      proofDocUrls,
      targetCarPrice: targetCar.price,
      cashDifference,
      cashDirection,
      requesterPhone: body.requesterPhone.trim(),
      requesterNotes: body.requesterNotes?.trim(),
      targetCarBrand: targetCar.brand,
      targetCarModel: targetCar.model,
      targetCarYear: targetCar.year,
      targetCarImageUrl: targetCar.imageUrl,
    });
  }

  findMine(requesterId: string) {
    return this.tradeModel
      .find({ requesterId: new Types.ObjectId(requesterId) })
      .sort({ createdAt: -1 })
      .populate('targetCarId', 'brand model year price imageUrl')
      .populate('ownerId', 'name email')
      .populate('offerCarId', 'brand model year price imageUrl')
      .lean()
      .exec()
      .then((rows) => rows.map((r) => this.maskPhones(r, requesterId, 'requester')));
  }

  findIncoming(ownerId: string) {
    return this.tradeModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .populate('targetCarId', 'brand model year price imageUrl')
      .populate('requesterId', 'name email')
      .populate('offerCarId', 'brand model year price imageUrl')
      .lean()
      .exec()
      .then((rows) => rows.map((r) => this.maskPhones(r, ownerId, 'owner')));
  }

  findForAdmin() {
    return this.tradeModel
      .find()
      .sort({ createdAt: -1 })
      .populate('targetCarId', 'brand model year price imageUrl')
      .populate('requesterId', 'name email')
      .populate('ownerId', 'name email')
      .lean()
      .exec();
  }

  async findOne(requestId: string, userId: string, role: string) {
    const req = await this.tradeModel
      .findById(requestId)
      .populate('targetCarId', 'brand model year price imageUrl currency')
      .populate('requesterId', 'name email')
      .populate('ownerId', 'name email')
      .populate('offerCarId', 'brand model year price imageUrl')
      .lean()
      .exec();

    if (!req) throw new NotFoundException('طلب الداكيش غير موجود');

    const requesterRef = req.requesterId as { _id?: Types.ObjectId } | Types.ObjectId | string;
    const ownerRef = req.ownerId as { _id?: Types.ObjectId } | Types.ObjectId | string | undefined;

    const requesterId =
      typeof requesterRef === 'object' && requesterRef && '_id' in requesterRef
        ? String(requesterRef._id)
        : String(requesterRef);
    const ownerId = ownerRef
      ? typeof ownerRef === 'object' && '_id' in ownerRef
        ? String(ownerRef._id)
        : String(ownerRef)
      : undefined;

    const isRequester = requesterId === userId;
    const isOwner = ownerId === userId;
    const isAdmin = role === 'admin';

    if (!isRequester && !isOwner && !isAdmin) {
      throw new ForbiddenException('غير مصرح');
    }

    const mode = isRequester ? 'requester' : isOwner ? 'owner' : 'admin';
    return this.maskPhones(req, userId, mode);
  }

  private maskPhones(
    req: TradeRequest & Record<string, unknown>,
    userId: string,
    mode: 'requester' | 'owner' | 'admin',
  ) {
    if (mode === 'admin' || req.status === TradeRequestStatus.ACCEPTED) {
      return req;
    }

    const out = { ...req };
    if (mode === 'owner') {
      out.requesterPhone = '••••••••••';
      out.ownerPhone = undefined;
    } else if (mode === 'requester') {
      out.ownerPhone = undefined;
    }
    return out;
  }

  async respond(requestId: string, userId: string, role: string, dto: RespondTradeDto) {
    const req = await this.tradeModel.findById(requestId).exec();
    if (!req) throw new NotFoundException('طلب الداكيش غير موجود');
    if (req.status !== TradeRequestStatus.PENDING) {
      throw new BadRequestException('تمت معالجة هذا الطلب مسبقاً');
    }

    const isOwner = req.ownerId?.toString() === userId;
    const isAdmin = role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('غير مصرح');
    }

    if (dto.action === 'accept') {
      if (!dto.ownerPhone?.trim()) {
        throw new BadRequestException('أدخل رقم تواصلك عند القبول');
      }

      const tradedCarIds = [req.targetCarId, req.offerCarId].filter(
        (id): id is Types.ObjectId => id != null,
      );
      const unavailableCar = await this.carModel
        .findOne({
          _id: { $in: tradedCarIds },
          isAvailable: false,
        })
        .select('_id')
        .lean()
        .exec();
      if (unavailableCar) {
        throw new BadRequestException('إحدى سيارات الداكيش لم تعد متاحة');
      }

      req.status = TradeRequestStatus.ACCEPTED;
      req.ownerPhone = dto.ownerPhone.trim();
      req.rejectionReason = undefined;

      await this.carModel
        .updateMany(
          { _id: { $in: tradedCarIds } },
          { $set: { isAvailable: false } },
        )
        .exec();
    } else {
      req.status = TradeRequestStatus.REJECTED;
      req.rejectionReason = dto.reason?.trim() || 'مرفوض';
    }

    await req.save();
    return req;
  }

  async cancel(requestId: string, requesterId: string) {
    const req = await this.tradeModel.findById(requestId).exec();
    if (!req) throw new NotFoundException('طلب الداكيش غير موجود');
    if (req.requesterId.toString() !== requesterId) {
      throw new ForbiddenException('غير مصرح');
    }
    if (req.status !== TradeRequestStatus.PENDING) {
      throw new BadRequestException('لا يمكن إلغاء هذا الطلب');
    }
    req.status = TradeRequestStatus.CANCELLED;
    await req.save();
    return req;
  }
}
