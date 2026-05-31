import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.role === 'SELLER' || user?.role === 'ADMIN') return true;
    throw new ForbiddenException('Seller account required');
  }
}
