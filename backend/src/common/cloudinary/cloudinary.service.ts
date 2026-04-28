import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
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

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `shoptaj/${folder}`, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        },
      ).end(file.buffer);
    });
  }

  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
