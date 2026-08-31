import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService, UpdateOrderStatusDto, CreateCouponDto } from './admin.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { CreateCategoryDto } from '../categories/categories.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { ProductsService } from '../products/products.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private cloudinary: CloudinaryService,
    private productsService: ProductsService,
  ) {}

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ── Products ──────────────────────────────────────────────────────────────
  @Get('products-list')
  getAllProducts() {
    return this.adminService.getAllProducts();
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Post('products/:id/images')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async uploadProductImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploaded = await Promise.all(
      files.map((f) => this.cloudinary.uploadImage(f, 'products')),
    );
    return this.productsService.addImages(
      id,
      uploaded.map((u) => ({ url: u.secure_url, publicId: u.public_id })),
    );
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.adminService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // ── Categories ────────────────────────────────────────────────────────────
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  @Get('orders')
  getOrders(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status: string,
  ) {
    return this.adminService.getOrders(page, limit, status);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, dto);
  }

  @Patch('orders/:id/payment')
  confirmPayment(@Param('id') id: string, @Body() body: { paymentStatus: string }) {
    return this.adminService.confirmPayment(id, body.paymentStatus);
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  @Get('users')
  getUsers(@Query('page') page: number, @Query('limit') limit: number) {
    return this.adminService.getUsers(page, limit);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id, true);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.adminService.banUser(id, false);
  }

  // ── Coupons ───────────────────────────────────────────────────────────────
  @Get('coupons')
  getCoupons() {
    return this.adminService.getCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.adminService.createCoupon(dto);
  }

  @Patch('coupons/:id/toggle')
  toggleCoupon(@Param('id') id: string) {
    return this.adminService.toggleCoupon(id);
  }

  // ── Sellers ───────────────────────────────────────────────────────────────
  @Get('sellers')
  getSellers(@Query('status') status?: string) {
    return this.adminService.getSellers(status);
  }

  @Patch('sellers/:id/approve')
  approveSeller(@Param('id') id: string) {
    return this.adminService.approveSeller(id);
  }

  @Patch('sellers/:id/reject')
  rejectSeller(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.rejectSeller(id, body.reason);
  }
}
