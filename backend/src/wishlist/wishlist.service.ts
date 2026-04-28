import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: { include: { images: { where: { isMain: true }, take: 1 } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, productId: string) {
    const exists = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (exists) throw new ConflictException('Already in wishlist');
    return this.prisma.wishlist.create({ data: { userId, productId } });
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, productId } });
    return { message: 'Removed from wishlist' };
  }
}
