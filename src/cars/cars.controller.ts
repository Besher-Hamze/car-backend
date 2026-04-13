import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, UseGuards, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CarsService } from './cars.service';
import { CreateCarDto, QueryCarsDto, UpdateCarDto } from './car.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { carImageStorage, carImageMulterLimits } from './car-image-upload';

const imageValidators = [
  new MaxFileSizeValidator({ maxSize: carImageMulterLimits.fileSize }),
  new FileTypeValidator({
    fileType: /^image\/(jpeg|png|gif|webp)$/i,
    skipMagicNumbersValidation: true,
  }),
];

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
  create(@UploadedFile(new ParseFilePipe({ validators: imageValidators })) file: any, @Body() createCarDto: CreateCarDto) {
    return this.carsService.create(createCarDto, file.filename);
  }

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
  update(@Param('id') id: string, @UploadedFile(new ParseFilePipe({ fileIsRequired: false, validators: imageValidators })) file: any, @Body() updateCarDto: UpdateCarDto) {
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
