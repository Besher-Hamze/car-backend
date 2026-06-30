import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TradeRequestsService } from './trade-requests.service';
import { RespondTradeDto } from './trade-request.dto';
import {
  isAllowedTradePhotoMime,
  tradePhotoMulterLimits,
  tradeUploadStorage,
} from './trade-photo-upload';
import {
  isAllowedTradeProofMime,
  tradeProofMulterLimits,
} from './trade-proof-upload';

type UploadedFile = {
  filename: string;
  mimetype: string;
  size: number;
  originalname: string;
};

function validatePhotos(files: UploadedFile[] | undefined): UploadedFile[] {
  if (!files?.length) {
    throw new BadRequestException('يرجى رفع صور لسيارتك');
  }
  for (const f of files) {
    if (!isAllowedTradePhotoMime(f.mimetype, f.originalname)) {
      throw new BadRequestException(`صيغة غير مدعومة: ${f.originalname}`);
    }
    if (f.size > tradePhotoMulterLimits.fileSize) {
      throw new BadRequestException(`الملف «${f.originalname}» أكبر من 10MB`);
    }
  }
  return files;
}

function validateProofDocs(files: UploadedFile[] | undefined): UploadedFile[] {
  if (!files?.length) {
    throw new BadRequestException('يرجى رفع الأوراق الثبوتية');
  }
  for (const f of files) {
    if (!isAllowedTradeProofMime(f.mimetype, f.originalname)) {
      throw new BadRequestException(`صيغة غير مدعومة: ${f.originalname}`);
    }
    if (f.size > tradeProofMulterLimits.fileSize) {
      throw new BadRequestException(`الملف «${f.originalname}» أكبر من 10MB`);
    }
  }
  return files;
}

@ApiTags('trade-requests - الداكيش')
@Controller('trade-requests')
export class TradeRequestsController {
  constructor(private readonly service: TradeRequestsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'offerPhotos', maxCount: 6 },
        { name: 'proofDocs', maxCount: 4 },
      ],
      {
        storage: tradeUploadStorage,
        limits: { ...tradePhotoMulterLimits, files: 10 },
      },
    ),
  )
  create(
    @CurrentUser() user: { userId: string },
    @Body()
    body: {
      targetCarId: string;
      offerCarId?: string;
      offerBrand?: string;
      offerModel?: string;
      offerYear?: string;
      offerPrice: string;
      offerCondition?: string;
      offerMileage?: string;
      offerEngineType?: string;
      offerHorsepower?: string;
      offerTransmission?: string;
      offerColor?: string;
      offerDescription?: string;
      requesterPhone: string;
      requesterNotes?: string;
    },
    @UploadedFiles() files: { offerPhotos?: UploadedFile[]; proofDocs?: UploadedFile[] },
  ) {
    if (!body.targetCarId) throw new BadRequestException('targetCarId مطلوب');
    const offerPhotos = validatePhotos(files?.offerPhotos);
    const proofDocs = validateProofDocs(files?.proofDocs);
    if (proofDocs.length < 2) {
      throw new BadRequestException('يرجى رفع ورقتين ثبوتيتين على الأقل');
    }
    return this.service.create(user.userId, body, offerPhotos, proofDocs);
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findMine(@CurrentUser() user: { userId: string }) {
    return this.service.findMine(user.userId);
  }

  @Get('incoming')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findIncoming(@CurrentUser() user: { userId: string; role: string }) {
    if (user.role === 'admin') {
      return this.service.findForAdmin();
    }
    return this.service.findIncoming(user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.service.findOne(id, user.userId, user.role);
  }

  @Patch(':id/respond')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  respond(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: RespondTradeDto,
  ) {
    return this.service.respond(id, user.userId, user.role, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  cancel(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.cancel(id, user.userId);
  }
}
