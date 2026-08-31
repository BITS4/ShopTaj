import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const handler = () => undefined;
  class TestController {}

  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const request: { user?: { role: Role } } = {};
  const context = {
    getClass: () => TestController,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    delete request.user;
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows routes without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, TestController]);
  });

  it('allows a user with one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.SELLER]);
    request.user = { role: Role.SELLER };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects missing users and users without a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);

    request.user = { role: Role.USER };
    expect(guard.canActivate(context)).toBe(false);
  });
});
