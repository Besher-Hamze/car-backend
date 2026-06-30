import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

export const TRADE_PROOFS_DIR = join(process.cwd(), 'uploads', 'trade-proofs');

const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

export const tradeProofStorage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(TRADE_PROOFS_DIR, { recursive: true });
    cb(null, TRADE_PROOFS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safe = allowedExt.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

export const tradeProofMulterLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 4,
};

const allowedMime =
  /^(image\/(jpeg|jpg|png|gif|webp|pjpeg|x-png)|application\/pdf|application\/octet-stream)$/i;

export function isAllowedTradeProofMime(mimetype: string, originalname: string): boolean {
  const mime = (mimetype || '').toLowerCase();
  if (allowedMime.test(mime)) return true;
  return allowedExt.has(extname(originalname || '').toLowerCase());
}

export function publicTradeProofPath(filename: string) {
  return `/uploads/trade-proofs/${filename}`;
}
