import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

export const CARS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'cars');

const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const carImageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(CARS_UPLOAD_DIR, { recursive: true });
    cb(null, CARS_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safe = allowedExt.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

export const carImageMulterLimits = {
  fileSize: 5 * 1024 * 1024,
  files: 10,
};

const allowedMime = /^image\/(jpeg|jpg|png|gif|webp|pjpeg|x-png)$/i;

export function isAllowedCarImageMime(mimetype: string, originalname: string): boolean {
  const mime = (mimetype || '').toLowerCase();
  if (allowedMime.test(mime)) return true;
  const ext = extname(originalname || '').toLowerCase();
  return allowedExt.has(ext);
}

export function publicCarImagePath(filename: string) {
  return `/uploads/cars/${filename}`;
}
