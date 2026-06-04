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
import { FilesInterceptor } from '@nestjs/platform-express';
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
import { carImageStorage, carImageMulterLimits } from './car-image-upload';

/** Max images per car upload (seller submit + admin create/update). First → `imageUrl`, rest → `images`. */
const MAX_CAR_IMAGES = 10;

type UploadedImageFile = { filename: string; mimetype: string; size: number };

function validateUploadedImages(files: UploadedImageFile[] | undefined): UploadedImageFile[] {
  if (!files || files.length === 0) {
    throw new BadRequestException('يرجى رفع صورة واحدة على الأقل');
  }
  for (const f of files) {
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.mimetype)) {
      throw new BadRequestException(`صيغة الصورة غير مدعومة: ${f.mimetype}`);
    }
    if (f.size > carImageMulterLimits.fileSize) {
      throw new BadRequestException('حجم الصورة يتجاوز الحد المسموح (5MB)');
    }
  }
  return files;
}

@ApiTags('Cars - السيارات')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
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
          description: 'صور السيارة. الأولى = صورة رئيسية، الباقي معرض.',
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
  create(@UploadedFiles() files: UploadedImageFile[], @Body() createCarDto: CreateCarDto) {
    const validated = validateUploadedImages(files);
    const filenames = validated.map((f) => f.filename);
    return this.carsService.create(createCarDto, filenames);
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
    FilesInterceptor('images', MAX_CAR_IMAGES, {
      storage: carImageStorage,
      limits: carImageMulterLimits,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور جديدة فقط. استخدم imageSlots لترتيبها مع الصور الحالية.',
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
  @ApiOperation({ summary: 'تعديل بيانات سيارة (مسؤول فقط) — صور اختيارية' })
  update(
    @Param('id') id: string,
    @UploadedFiles() files: UploadedImageFile[] | undefined,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    const list = files ?? [];
    if (list.length > 0) {
      for (const f of list) {
        if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.mimetype)) {
          throw new BadRequestException(`صيغة الصورة غير مدعومة: ${f.mimetype}`);
        }
        if (f.size > carImageMulterLimits.fileSize) {
          throw new BadRequestException('حجم الصورة يتجاوز الحد المسموح (5MB)');
        }
      }
    }
    const filenames = list.map((f) => f.filename);
    return this.carsService.update(id, updateCarDto, filenames);
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
