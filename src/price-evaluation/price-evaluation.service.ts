import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EvaluatePriceDto,
  MarketCatalogFull,
  PriceEvaluationResult,
} from './price-evaluation.types';

type RawCatalog = Record<string, Record<string, unknown>>;

@Injectable()
export class PriceEvaluationService {
  private readonly logger = new Logger(PriceEvaluationService.name);
  private readonly mlServiceUrl: string;
  private catalogCache: MarketCatalogFull | null = null;

  constructor(private configService: ConfigService) {
    this.mlServiceUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://localhost:8002',
    );
  }

  async evaluate(dto: EvaluatePriceDto): Promise<PriceEvaluationResult> {
    try {
      const res = await fetch(`${this.mlServiceUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`ML service error ${res.status}: ${err}`);
        throw new ServiceUnavailableException('خدمة تقييم السعر غير متاحة حالياً');
      }

      return res.json() as Promise<PriceEvaluationResult>;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      this.logger.error(`ML service unreachable: ${e}`);
      throw new ServiceUnavailableException(
        'تعذّر الاتصال بخدمة تقييم السعر. تأكد من تشغيل ml-service.',
      );
    }
  }

  getCatalog(): MarketCatalogFull {
    if (this.catalogCache) return this.catalogCache;
    const path = this.resolveCatalogPath();
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as RawCatalog;
    this.catalogCache = raw as MarketCatalogFull;
    return this.catalogCache;
  }

  private resolveCatalogPath(): string {
    const candidates = [
      join(__dirname, '..', 'cars', 'data', 'catalog.json'),
      join(process.cwd(), 'dist', 'cars', 'data', 'catalog.json'),
      join(process.cwd(), 'src', 'cars', 'data', 'catalog.json'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    throw new ServiceUnavailableException(
      'ملف كتalog السوق غير موجود. شغّل: python ml-service/scripts/generate_data.py',
    );
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.mlServiceUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.modelLoaded === true;
    } catch {
      return false;
    }
  }
}
