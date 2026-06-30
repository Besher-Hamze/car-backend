import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CarsModule } from './cars/cars.module';
import { AuthModule } from './auth/auth.module';
import { SparePartsModule } from './spare-parts/spare-parts.module';
import { ComparisonModule } from './comparison/comparison.module';
import { PriceEvaluationModule } from './price-evaluation/price-evaluation.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { TradeRequestsModule } from './trade-requests/trade-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/car-platform'),
        connectionFactory: (connection) => {
          console.log('✅ MongoDB connected');
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CarsModule,
    SparePartsModule,
    ComparisonModule,
    PriceEvaluationModule,
    PurchaseRequestsModule,
    TradeRequestsModule,
  ],
})
export class AppModule { }
