import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CarsService } from './cars.service';
import {
  CreateCarDto,
  CreateSellerCarDto,
  QueryCarsDto,
  RejectCarDto,
  UpdateCarDto,
} from './car.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  carImageStorage,
  carImageMulterLimits,
  isAllowedCarImageMime,
} from './car-image-upload';
import {
  carDocumentMulterLimits,
  isAllowedCarDocumentMime,
} from './car-document-upload';
import { carMultipartStorage, carMultipartLimits } from './car-multipart-upload';

/** Max images per car upload. First → `imageUrl`, rest → `images`. */
const MAX_CAR_IMAGES = 10;
const MAX_CAR_DOCUMENTS = 10;

type UploadedImageFile = {
  filename: string;
  mimetype: string;
  size: number;
  originalname: string;
};

function validateUploadedImages(files: UploadedImageFile[] | undefined): UploadedImageFile[] {
  if (!files || files.length === 0) {
    throw new BadRequestException('يرجى رفع صورة واحدة على الأقل');
  }
  for (const f of files) {
    if (!isAllowedCarImageMime(f.mimetype, f.originalname)) {
      throw new BadRequestException(
        `صيغة الصورة غير مدعومة (${f.originalname || f.filename}): ${f.mimetype || 'unknown'}`,
      );
    }
    if (f.size > carImageMulterLimits.fileSize) {
      throw new BadRequestException(
        `حجم الصورة «${f.originalname || f.filename}» يتجاوز الحد المسموح (5MB)`,
      );
    }
  }
  return files;
}

function validateUploadedDocuments(files: UploadedImageFile[] | undefined): UploadedImageFile[] {
  if (!files?.length) return [];
  for (const f of files) {
    if (!isAllowedCarDocumentMime(f.mimetype, f.originalname)) {
      throw new BadRequestException(
        `صيغة الوثيقة غير مدعومة (${f.originalname || f.filename})`,
      );
    }
    if (f.size > carDocumentMulterLimits.fileSize) {
      throw new BadRequestException(
        `حجم الوثيقة «${f.originalname || f.filename}» يتجاوز الحد (10MB)`,
      );
    }
  }
  return files;
}

type UploadedFilesMap = {
  images?: UploadedImageFile[];
  documents?: UploadedImageFile[];
};

@ApiTags('Cars - السيارات')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: MAX_CAR_IMAGES },
        { name: 'documents', maxCount: MAX_CAR_DOCUMENTS },
      ],
      { storage: carMultipartStorage, limits: carMultipartLimits },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['brand', 'model', 'year', 'price', 'images'],
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور السيارة. الأولى = صورة رئيسية.',
        },
        documents: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'وثائق السيارة (صور أو PDF).',
        },
        brand: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'number' },
        price: { type: 'number' },
        currency: { type: 'string' },
        category: { type: 'string' },
        engineType: { type: 'string' },
        transmission: { type: 'string' },
        condition: { type: 'string' },
        seatingCapacity: { type: 'number' },
        description: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'إضافة سيارة جديدة مع صور (مسؤول فقط)' })
  @ApiResponse({ status: 201, description: 'تم إضافة السيارة بنجاح' })
  create(@UploadedFiles() files: UploadedFilesMap, @Body() createCarDto: CreateCarDto) {
    const validated = validateUploadedImages(files?.images);
    const docs = validateUploadedDocuments(files?.documents);
    const filenames = validated.map((f) => f.filename);
    const docNames = docs.map((f) => f.filename);
    return this.carsService.create(createCarDto, filenames, docNames);
  }

  /* ======================================================================
   * Seller workflow
   * ====================================================================== */

  @Post('seller')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('images', MAX_CAR_IMAGES, {
      storage: carImageStorage,
      limits: carImageMulterLimits,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['brand', 'model', 'year', 'price', 'images'],
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور السيارة. الأولى تُستخدم كصورة رئيسية والباقي معرض الصور.',
        },
        brand: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'number' },
        price: { type: 'number' },
        category: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'بائع: تقديم سيارة للمراجعة (تفاصيل أساسية فقط)' })
  submitBySeller(
    @UploadedFiles() files: UploadedImageFile[],
    @Body() dto: CreateSellerCarDto,
    @CurrentUser() user: any,
  ) {
    const validated = validateUploadedImages(files);
    const filenames = validated.map((f) => f.filename);
    return this.carsService.createBySeller(dto, filenames, user.userId);
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'سياراتي (للبائع)' })
  findMine(@CurrentUser() user: any) {
    return this.carsService.findBySeller(user.userId);
  }

  @Get('admin/pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'السيارات قيد المراجعة (مسؤول فقط)' })
  findPending() {
    return this.carsService.findPending();
  }

  @Patch(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نشر السيارة (مسؤول فقط)' })
  publish(@Param('id') id: string) {
    return this.carsService.publish(id);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رفض السيارة (مسؤول فقط)' })
  reject(@Param('id') id: string, @Body() dto: RejectCarDto) {
    return this.carsService.reject(id, dto.reason);
  }

  /* ====================================================================== */

  @Get()
  @ApiOperation({ summary: 'استعراض جميع السيارات مع الفلترة والبحث' })
  findAll(@Query() query: QueryCarsDto) {
    return this.carsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات المنصة' })
  getStats() {
    return this.carsService.getStats();
  }

  @Get('brands')
  @ApiOperation({ summary: 'قائمة جميع الماركات المتاحة' })
  getBrands() {
    return this.carsService.getBrands();
  }

  @Get('featured')
  @ApiOperation({ summary: 'السيارات المميزة' })
  getFeatured(@Query('limit') limit: number) {
    return this.carsService.getFeatured(limit);
  }

  @Post('seed')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إضافة بيانات تجريبية (مسؤول فقط)' })
  seed() {
    return this.carsService.seedSampleData();
  }

  @Get(':id/evaluate-price')
  @ApiOperation({ summary: 'تقييم سعر السيارة بالذكاء الاصطناعي (سوق حلب)' })
  @ApiParam({ name: 'id', description: 'معرف السيارة' })
  evaluatePrice(@Param('id') id: string) {
    return this.carsService.evaluatePrice(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل سيارة محددة' })
  @ApiParam({ name: 'id', description: 'معرف السيارة' })
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(id);
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'سيارات مشابهة' })
  getSimilar(@Param('id') id: string) {
    return this.carsService.getSimilar(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: MAX_CAR_IMAGES },
        { name: 'documents', maxCount: MAX_CAR_DOCUMENTS },
      ],
      { storage: carMultipartStorage, limits: carMultipartLimits },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور جديدة فقط.',
        },
        documents: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'وثائق جديدة (صور أو PDF).',
        },
        imageSlots: {
          type: 'string',
          description: 'JSON: [{type:"existing",url}, {type:"new"}, ...] بالترتيب النهائي',
        },
        brand: { type: 'string' },
        model: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'تعديل بيانات سيارة (مسؤول فقط)' })
  update(
    @Param('id') id: string,
    @UploadedFiles() files: UploadedFilesMap | undefined,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    const imageList = files?.images ?? [];
    const docList = files?.documents ?? [];
    if (imageList.length > 0) {
      validateUploadedImages(imageList);
    }
    const validatedDocs = validateUploadedDocuments(docList);
    const filenames = imageList.map((f) => f.filename);
    const docNames = validatedDocs.map((f) => f.filename);
    return this.carsService.update(id, updateCarDto, filenames, docNames);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف سيارة (مسؤول فقط)' })
  remove(@Param('id') id: string) {
    return this.carsService.remove(id);
  }
}
