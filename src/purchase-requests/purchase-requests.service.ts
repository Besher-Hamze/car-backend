import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Car, CarStatus } from '../cars/car.schema';
import {
  PurchaseRequest,
  PurchaseRequestDocument,
  PurchaseRequestStatus,
} from './purchase-request.schema';
import { RespondPurchaseDto } from './purchase-request.dto';
import { publicPurchaseIdPath } from './purchase-id-upload';

const DEPOSIT_PERCENT = 20;
const CONTRACT_MONTHS = 2;
const REQUIRED_ID_PHOTOS = 2;

@Injectable()
export class PurchaseRequestsService {
  constructor(
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseModel: Model<PurchaseRequestDocument>,
    @InjectModel(Car.name) private readonly carModel: Model<Car>,
  ) {}

  async create(
    buyerId: string,
    carId: string,
    body: { buyerPhone: string; buyerNotes?: string },
    idFiles: { filename: string }[],
    depositProof?: { filename: string },
  ) {
    if (!body.buyerPhone?.trim()) {
      throw new BadRequestException('رقم التواصل مطلوب');
    }
    if (!idFiles || idFiles.length !== REQUIRED_ID_PHOTOS) {
      throw new BadRequestException(`يرجى رفع ${REQUIRED_ID_PHOTOS} صور للهوية`);
    }

    const car = await this.carModel.findById(carId).exec();
    if (!car || car.status !== CarStatus.PUBLISHED) {
      throw new NotFoundException('السيارة غير متاحة للشراء');
    }
    if (car.isAvailable === false) {
      throw new BadRequestException('هذه السيارة لديها طلب شراء قيد المعالجة');
    }

    const sellerId = car.sellerId?.toString();
    if (sellerId && sellerId === buyerId) {
      throw new BadRequestException('لا يمكنك شراء سيارتك');
    }

    const existing = await this.purchaseModel.findOne({
      carId: new Types.ObjectId(carId),
      buyerId: new Types.ObjectId(buyerId),
      status: PurchaseRequestStatus.PENDING,
    });
    if (existing) {
      throw new BadRequestException('لديك طلب شراء قيد المراجعة لهذه السيارة');
    }

    const depositAmount = Math.round(car.price * (DEPOSIT_PERCENT / 100) * 100) / 100;
    const buyerIdUrls = idFiles.map((f) => publicPurchaseIdPath(f.filename));

    const doc = await this.purchaseModel.create({
      carId: car._id,
      buyerId: new Types.ObjectId(buyerId),
      sellerId: car.sellerId,
      status: PurchaseRequestStatus.PENDING,
      carPrice: car.price,
      depositPercent: DEPOSIT_PERCENT,
      depositAmount,
      contractMonths: CONTRACT_MONTHS,
      buyerIdUrls,
      depositProofUrl: depositProof ? publicPurchaseIdPath(depositProof.filename) : undefined,
      buyerPhone: body.buyerPhone.trim(),
      buyerNotes: body.buyerNotes?.trim(),
      carBrand: car.brand,
      carModel: car.model,
      carYear: car.year,
      carImageUrl: car.imageUrl,
    });

    await this.carModel.updateOne({ _id: car._id }, { isAvailable: false }).exec();

    return doc;
  }

  findMine(buyerId: string) {
    return this.purchaseModel
      .find({ buyerId: new Types.ObjectId(buyerId) })
      .sort({ createdAt: -1 })
      .populate('carId', 'brand model year price imageUrl documentUrls')
      .populate('sellerId', 'name email')
      .lean()
      .exec();
  }

  findForSeller(sellerId: string) {
    return this.purchaseModel
      .find({ sellerId: new Types.ObjectId(sellerId) })
      .sort({ createdAt: -1 })
      .populate('carId', 'brand model year price imageUrl documentUrls')
      .populate('buyerId', 'name email')
      .lean()
      .exec();
  }

  /** Admin cars without seller — admin sees all pending */
  findForAdmin() {
    return this.purchaseModel
      .find()
      .sort({ createdAt: -1 })
      .populate('carId', 'brand model year price imageUrl documentUrls')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .lean()
      .exec();
  }

  async findOne(requestId: string, userId: string, role: string) {
    const req = await this.purchaseModel
      .findById(requestId)
      .populate('carId', 'brand model year price imageUrl documentUrls currency')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .lean()
      .exec();

    if (!req) throw new NotFoundException('طلب الشراء غير موجود');

    const buyerRef = req.buyerId as { _id?: Types.ObjectId } | Types.ObjectId | string;
    const sellerRef = req.sellerId as { _id?: Types.ObjectId } | Types.ObjectId | string | undefined;

    const buyerId =
      typeof buyerRef === 'object' && buyerRef && '_id' in buyerRef
        ? String(buyerRef._id)
        : String(buyerRef);
    const sellerId = sellerRef
      ? typeof sellerRef === 'object' && '_id' in sellerRef
        ? String(sellerRef._id)
        : String(sellerRef)
      : undefined;

    const isBuyer = buyerId === userId;
    const isSeller = sellerId === userId;
    const isAdmin = role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenException('غير مصرح');
    }

    return req;
  }

  async respond(
    requestId: string,
    userId: string,
    role: string,
    dto: RespondPurchaseDto,
  ) {
    const req = await this.purchaseModel.findById(requestId).exec();
    if (!req) throw new NotFoundException('طلب الشراء غير موجود');
    if (req.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('تمت معالجة هذا الطلب مسبقاً');
    }

    const isSeller = req.sellerId?.toString() === userId;
    const isAdmin = role === 'admin';
    if (!isSeller && !isAdmin) {
      throw new ForbiddenException('غير مصرح');
    }

    if (dto.action === 'accept') {
      req.status = PurchaseRequestStatus.ACCEPTED;
      req.rejectionReason = undefined;
    } else {
      req.status = PurchaseRequestStatus.REJECTED;
      req.rejectionReason = dto.reason?.trim() || 'مرفوض';
      await this.carModel
        .updateOne({ _id: req.carId }, { isAvailable: true })
        .exec();
    }

    await req.save();
    return req;
  }

  async cancel(requestId: string, buyerId: string) {
    const req = await this.purchaseModel.findById(requestId).exec();
    if (!req) throw new NotFoundException('طلب الشراء غير موجود');
    if (req.buyerId.toString() !== buyerId) {
      throw new ForbiddenException('غير مصرح');
    }
    if (req.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('لا يمكن إلغاء هذا الطلب');
    }
    req.status = PurchaseRequestStatus.CANCELLED;
    await req.save();
    await this.carModel.updateOne({ _id: req.carId }, { isAvailable: true }).exec();
    return req;
  }
}
