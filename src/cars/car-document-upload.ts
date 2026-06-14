import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

export const CAR_DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'documents');

const allowedDocExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

export const carDocumentStorage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(CAR_DOCUMENTS_DIR, { recursive: true });
    cb(null, CAR_DOCUMENTS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safe = allowedDocExt.has(ext) ? ext : '.pdf';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

export const carDocumentMulterLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 10,
};

const allowedDocMime =
  /^(image\/(jpeg|jpg|png|gif|webp|pjpeg|x-png)|application\/pdf|application\/octet-stream)$/i;

export function isAllowedCarDocumentMime(mimetype: string, originalname: string): boolean {
  const mime = (mimetype || '').toLowerCase();
  if (allowedDocMime.test(mime)) return true;
  const ext = extname(originalname || '').toLowerCase();
  return allowedDocExt.has(ext);
}

export function publicCarDocumentPath(filename: string) {
  return `/uploads/documents/${filename}`;
}
