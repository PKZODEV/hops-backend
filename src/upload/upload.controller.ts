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
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const imageStorage = diskStorage({
  destination: join(process.cwd(), 'public', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const docStorage = diskStorage({
  destination: join(process.cwd(), 'public', 'uploads', 'documents'),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('upload')
export class UploadController {
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageStorage,
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException('Only JPG, PNG, WEBP images are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/${file.filename}`;
    return { url, filename: file.filename, size: file.size };
  }

  /**
   * Public document/image upload — used by the public registration form.
   * Accepts images and PDFs up to 10 MB.
   */
  @Post('registration-document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: docStorage,
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException('อนุญาตเฉพาะไฟล์ JPG, PNG, WEBP, PDF เท่านั้น'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadRegistrationDoc(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/documents/${file.filename}`;
    return { url, filename: file.filename, size: file.size };
  }
}
