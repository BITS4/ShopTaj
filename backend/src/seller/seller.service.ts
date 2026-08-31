import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CreateProductDto } from '../products/dto/create-product.dto';

export class ApplySellerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shopName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

@Injectable()
export class SellerService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async apply(userId: string, dto: ApplySellerDto) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Seller application already submitted');

    return this.prisma.sellerProfile.create({
      data: { userId, shopName: dto.shopName, description: dto.description },
    });
  }

  async uploadDocuments(userId: string, files: Express.Multer.File[]) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');

    const uploaded = await Promise.all(
      files.map((f) => this.cloudinary.uploadDocument(f, 'seller-docs')),
    );
    const newUrls = uploaded.map((u) => u.secure_url);

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: { documents: { push: newUrls } },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });
    if (!profile) return null;
    return profile;
  }

  async getProducts(userId: string, page = 1, limit = 20) {
    const profile = await this.requireApprovedProfile(userId);
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId: profile.id },
        include: { images: true, category: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: { sellerId: profile.id } }),
    ]);
    return { data: products, meta: { total, page, limit } };
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const profile = await this.requireApprovedProfile(userId);
    const { variants, ...productData } = dto;

    const slug = await this.generateSlug(dto.name);
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        slug,
        sellerId: profile.id,
        variants: variants?.length
          ? { create: variants }
          : undefined,
      },
    });
    return product;
  }

  async addProductImages(userId: string, productId: string, files: Express.Multer.File[]) {
    await this.requireOwnProduct(userId, productId);
    const uploaded = await Promise.all(
      files.map((f) => this.cloudinary.uploadImage(f, 'products')),
    );
    const images = uploaded.map((u, i) => ({
      url: u.secure_url,
      publicId: u.public_id,
      isMain: i === 0,
      sortOrder: i,
    }));
    return this.prisma.product.update({
      where: { id: productId },
      data: { images: { create: images } },
      include: { images: true },
    });
  }

  async updateProduct(userId: string, productId: string, dto: Partial<CreateProductDto>) {
    await this.requireOwnProduct(userId, productId);
    const { variants: _variants, ...data } = dto;
    return this.prisma.product.update({ where: { id: productId }, data });
  }

  async deleteProduct(userId: string, productId: string) {
    await this.requireOwnProduct(userId, productId);
    return this.prisma.product.delete({ where: { id: productId } });
  }

  private async requireApprovedProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found. Complete onboarding first.');
    if (profile.status !== 'APPROVED') {
      throw new ForbiddenException(
        profile.status === 'PENDING'
          ? 'Your seller account is pending approval'
          : 'Your seller account has been rejected',
      );
    }
    return profile;
  }

  private async requireOwnProduct(userId: string, productId: string) {
    const profile = await this.requireApprovedProfile(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== profile.id) throw new ForbiddenException('Not your product');
    return product;
  }

  private async generateSlug(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = base;
    let i = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
