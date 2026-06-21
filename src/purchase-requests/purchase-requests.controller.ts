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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PurchaseRequestsService } from './purchase-requests.service';
import { RespondPurchaseDto } from './purchase-request.dto';
import {
  isAllowedPurchaseIdMime,
  purchaseIdMulterLimits,
  purchaseIdStorage,
} from './purchase-id-upload';

type UploadedFile = {
  filename: string;
  mimetype: string;
  size: number;
  originalname: string;
};

function validateIdFiles(files: UploadedFile[] | undefined): UploadedFile[] {
  if (!files?.length) {
    throw new BadRequestException('يرجى رفع صورتين للهوية');
  }
  for (const f of files) {
    if (!isAllowedPurchaseIdMime(f.mimetype, f.originalname)) {
      throw new BadRequestException(`صيغة غير مدعومة: ${f.originalname}`);
    }
    if (f.size > purchaseIdMulterLimits.fileSize) {
      throw new BadRequestException(`الملف «${f.originalname}» أكبر من 10MB`);
    }
  }
  return files;
}

@ApiTags('purchase-requests')
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idPhotos', maxCount: 2 },
        { name: 'depositProof', maxCount: 1 },
      ],
      { storage: purchaseIdStorage, limits: purchaseIdMulterLimits },
    ),
  )
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: { carId: string; buyerPhone: string; buyerNotes?: string },
    @UploadedFiles()
    files: { idPhotos?: UploadedFile[]; depositProof?: UploadedFile[] },
  ) {
    if (!body.carId) throw new BadRequestException('carId مطلوب');
    const idPhotos = validateIdFiles(files?.idPhotos);
    if (idPhotos.length !== 2) {
      throw new BadRequestException('يرجى رفع صورتين للهوية بالضبط');
    }
    const depositProof = files?.depositProof?.[0];
    if (depositProof && !isAllowedPurchaseIdMime(depositProof.mimetype, depositProof.originalname)) {
      throw new BadRequestException('صيغة إثبات الدفع غير مدعومة');
    }
    return this.service.create(
      user.userId,
      body.carId,
      { buyerPhone: body.buyerPhone, buyerNotes: body.buyerNotes },
      idPhotos,
      depositProof,
    );
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findMine(@CurrentUser() user: { userId: string }) {
    return this.service.findMine(user.userId);
  }

  @Get('seller')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  findSeller(@CurrentUser() user: { userId: string; role: string }) {
    if (user.role === 'admin') {
      return this.service.findForAdmin();
    }
    return this.service.findForSeller(user.userId);
  }

  @Patch(':id/respond')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  respond(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: RespondPurchaseDto,
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
