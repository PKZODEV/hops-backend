import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, basename, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const DOCUMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
]);
const DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const FIVE_MB = 5 * 1024 * 1024;
const TEN_MB = 10 * 1024 * 1024;

/**
 * Builds an upload destination rooted under `public/<subPath>`. The
 * filename is derived from a server-generated UUID; the original
 * client-supplied name is never written to disk.
 */
function buildStorage(subPath: string) {
  return diskStorage({
    destination: join(process.cwd(), 'public', ...subPath.split('/')),
    filename: (_req, file, cb) => {
      /* `basename` neutralises any path-traversal characters the client
         may have encoded into the original filename before we read its
         extension. */
      const safeOriginal = basename(file.originalname);
      const ext = extname(safeOriginal).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

@Controller('upload')
export class UploadController {
  /** Authenticated image upload used by the admin console. */
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildStorage('uploads'),
      fileFilter: (_req, file, cb) => {
        const ext = extname(basename(file.originalname)).toLowerCase();
        if (
          !IMAGE_EXTENSIONS.has(ext) ||
          !IMAGE_MIME_TYPES.has(file.mimetype)
        ) {
          return cb(
            new BadRequestException('Only JPG, PNG, WEBP images are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: FIVE_MB },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }

  /**
   * Public document/image upload used by the registration form.
   *
   * Intentionally unauthenticated because it is invoked before the user
   * exists. Rate-limited globally; both the extension and the MIME type
   * are checked to make file-type spoofing harder.
   */
  @Post('registration-document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildStorage('uploads/documents'),
      fileFilter: (_req, file, cb) => {
        const ext = extname(basename(file.originalname)).toLowerCase();
        if (
          !DOCUMENT_EXTENSIONS.has(ext) ||
          !DOCUMENT_MIME_TYPES.has(file.mimetype)
        ) {
          return cb(
            new BadRequestException(
              'อนุญาตเฉพาะไฟล์ JPG, PNG, WEBP, PDF เท่านั้น',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: TEN_MB },
    }),
  )
  uploadRegistrationDoc(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      url: `/uploads/documents/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }
}
