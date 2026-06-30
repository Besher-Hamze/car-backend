import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

export const TRADE_PHOTOS_DIR = join(process.cwd(), 'uploads', 'trade-photos');
export const TRADE_PROOFS_DIR = join(process.cwd(), 'uploads', 'trade-proofs');

const photoExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const proofExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

export const tradePhotoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(TRADE_PHOTOS_DIR, { recursive: true });
    cb(null, TRADE_PHOTOS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safe = photoExt.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

/** تخزين موحّد لصور السيارة والأوراق الثبوتية */
export const tradeUploadStorage = diskStorage({
  destination: (_req, file, cb) => {
    const dir = file.fieldname === 'proofDocs' ? TRADE_PROOFS_DIR : TRADE_PHOTOS_DIR;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const allowed = file.fieldname === 'proofDocs' ? proofExt : photoExt;
    const safe = allowed.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

export const tradePhotoMulterLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 6,
};

const allowedMime =
  /^(image\/(jpeg|jpg|png|gif|webp|pjpeg|x-png)|application\/octet-stream)$/i;

export function isAllowedTradePhotoMime(mimetype: string, originalname: string): boolean {
  const mime = (mimetype || '').toLowerCase();
  if (allowedMime.test(mime)) return true;
  return photoExt.has(extname(originalname || '').toLowerCase());
}

export function publicTradePhotoPath(filename: string) {
  return `/uploads/trade-photos/${filename}`;
}
