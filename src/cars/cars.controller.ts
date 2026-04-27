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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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

const imageValidators = [
  new MaxFileSizeValidator({ maxSize: carImageMulterLimits.fileSize }),
  new FileTypeValidator({
    fileType: /^image\/(jpeg|png|gif|webp)$/i,
    skipMagicNumbersValidation: true,
  }),
];

/** Sellers can attach up to this many images per submission. The first one becomes the main `imageUrl`. */
const SELLER_MAX_IMAGES = 10;

@ApiTags('Cars - السيارات')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image', { storage: carImageStorage, limits: carImageMulterLimits }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['brand', 'model', 'year', 'price', 'image'],
      properties: {
        image: { type: 'string', format: 'binary' },
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
  @ApiOperation({ summary: 'إضافة سيارة جديدة مع صورة (مسؤول فقط)' })
  @ApiResponse({ status: 201, description: 'تم إضافة السيارة بنجاح' })
  create(
    @UploadedFile(new ParseFilePipe({ validators: imageValidators })) file: any,
    @Body() createCarDto: CreateCarDto,
  ) {
    return this.carsService.create(createCarDto, file.filename);
  }

  /* ======================================================================
   * Seller workflow
   * ====================================================================== */

  @Post('seller')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('images', SELLER_MAX_IMAGES, {
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
    @UploadedFiles() files: Array<{ filename: string; mimetype: string; size: number }>,
    @Body() dto: CreateSellerCarDto,
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('يرجى رفع صورة واحدة على الأقل');
    }
    /** Validate each uploaded file: enforce mime type + max size since
     *  ParseFilePipe operates on a single file only. */
    for (const f of files) {
      if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.mimetype)) {
        throw new BadRequestException(`صيغة الصورة غير مدعومة: ${f.mimetype}`);
      }
      if (f.size > carImageMulterLimits.fileSize) {
        throw new BadRequestException('حجم الصورة يتجاوز الحد المسموح (5MB)');
      }
    }
    const filenames = files.map((f) => f.filename);
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
  @UseInterceptors(FileInterceptor('image', { storage: carImageStorage, limits: carImageMulterLimits }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'تعديل بيانات سيارة (مسؤول فقط) — صورة اختيارية' })
  update(
    @Param('id') id: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false, validators: imageValidators })) file: any,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    return this.carsService.update(id, updateCarDto, file?.filename);
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
