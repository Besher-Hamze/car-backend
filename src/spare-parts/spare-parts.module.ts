import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SparePart, SparePartSchema } from './spare-part.schema';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SparePart.name, schema: SparePartSchema }]),
  ],
  controllers: [SparePartsController],
  providers: [SparePartsService],
  exports: [SparePartsService],
})
export class SparePartsModule { }
