jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(() => class MockPassportAuthGuard {}),
}));

describe('JwtAuthGuard', () => {
  it('delegates authentication to the jwt Passport strategy', () => {
    jest.isolateModules(() => {
      const { AuthGuard } = jest.requireMock('@nestjs/passport') as {
        AuthGuard: jest.Mock;
      };
      const { JwtAuthGuard } = jest.requireActual(
        './jwt-auth.guard',
      ) as typeof import('./jwt-auth.guard');

      expect(AuthGuard).toHaveBeenCalledWith('jwt');
      expect(new JwtAuthGuard()).toBeInstanceOf(JwtAuthGuard);
    });
  });
});
