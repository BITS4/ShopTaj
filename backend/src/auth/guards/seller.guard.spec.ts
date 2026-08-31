import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SellerGuard } from './seller.guard';

describe('SellerGuard', () => {
  const request: { user?: { role: Role } } = {};
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  const guard = new SellerGuard();

  beforeEach(() => {
    delete request.user;
  });

  it.each([Role.SELLER, Role.ADMIN])('allows the %s role', (role) => {
    request.user = { role };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects customers and unauthenticated requests', () => {
    request.user = { role: Role.USER };

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Seller account required'),
    );

    delete request.user;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
