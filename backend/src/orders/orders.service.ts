import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: { include: { product: { select: { name: true } } } } },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { data: orders, meta: { total, page, limit } };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: { include: { images: { where: { isMain: true }, take: 1 } } }, variant: true } },
        shippingAddress: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancel(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING') throw new ForbiddenException('Only pending orders can be cancelled');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }
}
