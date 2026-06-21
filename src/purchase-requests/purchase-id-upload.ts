import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

export const PURCHASE_IDS_DIR = join(process.cwd(), 'uploads', 'purchase-ids');

const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

export const purchaseIdStorage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(PURCHASE_IDS_DIR, { recursive: true });
    cb(null, PURCHASE_IDS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safe = allowedExt.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

export const purchaseIdMulterLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 3,
};

const allowedMime =
  /^(image\/(jpeg|jpg|png|gif|webp|pjpeg|x-png)|application\/pdf|application\/octet-stream)$/i;

export function isAllowedPurchaseIdMime(mimetype: string, originalname: string): boolean {
  const mime = (mimetype || '').toLowerCase();
  if (allowedMime.test(mime)) return true;
  return allowedExt.has(extname(originalname || '').toLowerCase());
}

export function publicPurchaseIdPath(filename: string) {
  return `/uploads/purchase-ids/${filename}`;
}
