import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { WhatsAppModule } from '../common/whatsapp/whatsapp.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    ProductsModule,
    CategoriesModule,
    CloudinaryModule,
    WhatsAppModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
