import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellerGuard } from '../auth/guards/seller.guard';
import { SellerService, ApplySellerDto } from './seller.service';
import { CreateProductDto } from '../products/dto/create-product.dto';

@ApiTags('seller')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SellerGuard)
@Controller('seller')
export class SellerController {
  constructor(private sellerService: SellerService) {}

  @Post('apply')
  apply(@Request() req: any, @Body() dto: ApplySellerDto) {
    return this.sellerService.apply(req.user.id, dto);
  }

  @Post('documents')
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage() }))
  uploadDocuments(
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.sellerService.uploadDocuments(req.user.id, files);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return this.sellerService.getProfile(req.user.id);
  }

  @Get('products')
  getProducts(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.sellerService.getProducts(req.user.id, +page, +limit);
  }

  @Post('products')
  createProduct(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.sellerService.createProduct(req.user.id, dto);
  }

  @Post('products/:id/images')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  uploadImages(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.sellerService.addProductImages(req.user.id, id, files);
  }

  @Patch('products/:id')
  updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.sellerService.updateProduct(req.user.id, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Request() req: any, @Param('id') id: string) {
    return this.sellerService.deleteProduct(req.user.id, id);
  }
}
