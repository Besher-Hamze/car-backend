import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Car, CarSchema } from '../cars/car.schema';
import { TradeRequest, TradeRequestSchema } from './trade-request.schema';
import { TradeRequestsController } from './trade-requests.controller';
import { TradeRequestsService } from './trade-requests.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TradeRequest.name, schema: TradeRequestSchema },
      { name: Car.name, schema: CarSchema },
    ]),
  ],
  controllers: [TradeRequestsController],
  providers: [TradeRequestsService],
  exports: [TradeRequestsService],
})
export class TradeRequestsModule {}
