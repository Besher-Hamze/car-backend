import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { CARS_UPLOAD_DIR } from './car-image-upload';
import { CAR_DOCUMENTS_DIR } from './car-document-upload';

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const docExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

/** تخزين موحّد: images → uploads/cars ، documents → uploads/documents */
export const carMultipartStorage = diskStorage({
  destination: (_req, file, cb) => {
    const isDoc = file.fieldname === 'documents';
    const dir = isDoc ? CAR_DOCUMENTS_DIR : CARS_UPLOAD_DIR;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const allowed = file.fieldname === 'documents' ? docExt : imageExt;
    const safe = allowed.has(ext) ? ext : file.fieldname === 'documents' ? '.pdf' : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

export const carMultipartLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 20,
};
