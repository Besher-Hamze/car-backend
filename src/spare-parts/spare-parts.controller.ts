import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';

@ApiTags('Spare Parts - قطع الغيار')
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Get()
  @ApiOperation({ summary: 'استعراض قطع الغيار مع فلترة' })
  findAll(@Query() query: any) {
    return this.sparePartsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'تصنيفات قطع الغيار' })
  getCategories() {
    return this.sparePartsService.getCategories();
  }

  @Post('seed')
  @ApiOperation({ summary: 'إضافة بيانات قطع الغيار التجريبية' })
  seed() {
    return this.sparePartsService.seedSampleData();
  }

  @Get('car/:carId')
  @ApiOperation({ summary: 'قطع الغيار المتوافقة مع سيارة محددة' })
  findByCar(@Param('carId') carId: string) {
    return this.sparePartsService.findByCarId(carId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل قطعة غيار' })
  findOne(@Param('id') id: string) {
    return this.sparePartsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'إضافة قطعة غيار جديدة' })
  create(@Body() dto: any) {
    return this.sparePartsService.create(dto);
  }
}
