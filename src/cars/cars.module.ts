import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Car, CarSchema } from './car.schema';
import { CarsService } from './cars.service';
import { CarsController } from './cars.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Car.name, schema: CarSchema }]),
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService, MongooseModule],
})
export class CarsModule {}
