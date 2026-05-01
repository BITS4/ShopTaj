import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;
  private uploadDir: string;

  constructor(private config: ConfigService) {
    const cloudName = config.get('CLOUDINARY_CLOUD_NAME') || '';
    const apiKey = config.get('CLOUDINARY_API_KEY') || '';
    const apiSecret = config.get('CLOUDINARY_API_SECRET') || '';

    const isPlaceholder = (v: string) => !v || v.startsWith('your_');

    if (!isPlaceholder(cloudName) && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret)) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.isConfigured = true;
      this.logger.log('✅ Cloudinary configured');
    } else {
      // Fall back: save directly to web/public/uploads so Next.js serves them at /uploads/filename
      // Go up from process.cwd() (which is the backend folder when running with nest start)
      const backendRoot = process.cwd();
      const projectRoot = path.resolve(backendRoot, '..');
      this.uploadDir = path.join(projectRoot, 'web', 'public', 'uploads');
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.warn(`⚠️  Cloudinary not configured — saving images to: ${this.uploadDir}`);
      } catch (e) {
        this.logger.warn(`⚠️  Could not create uploads dir: ${e}`);
      }
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<{ secure_url: string; public_id: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP, GIF allowed');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 5MB');
    }

    if (this.isConfigured) {
      // ── Upload to Cloudinary ─────────────────────────────────────────────
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: `shoptaj/${folder}`, resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          },
        ).end(file.buffer);
      });
    } else {
      // ── Save locally as fallback ─────────────────────────────────────────
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${uuidv4()}.${ext}`;
      const filePath = path.join(this.uploadDir, filename);

      try {
        fs.writeFileSync(filePath, file.buffer);
        // Serve via Next.js frontend (public folder) — avoids CORS and remote image config issues
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const url = `${frontendUrl}/uploads/${filename}`;
        return { secure_url: url, public_id: filename };
      } catch {
        throw new BadRequestException(
          'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to backend/.env',
        );
      }
    }
  }

  async deleteImage(publicId: string) {
    if (this.isConfigured) {
      return cloudinary.uploader.destroy(publicId);
    }
    // Delete local file
    try {
      const filePath = path.join(this.uploadDir, publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return { result: 'ok' };
  }
}
