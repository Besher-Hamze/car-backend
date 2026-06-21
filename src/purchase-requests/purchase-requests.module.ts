import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Car, CarSchema } from '../cars/car.schema';
import { PurchaseRequest, PurchaseRequestSchema } from './purchase-request.schema';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Car.name, schema: CarSchema },
    ]),
  ],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
