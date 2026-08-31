import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../common/email/email.service';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const now = new Date('2026-08-31T10:00:00.000Z');
  const user = {
    id: 'user-1',
    email: 'buyer@example.com',
    fullName: 'Test Buyer',
    phone: '+992900000001',
    passwordHash: 'stored-password-hash',
    role: 'USER',
    avatarUrl: null,
    isBanned: false,
    isEmailVerified: true,
    verifyCode: null,
    verifyCodeExpiry: null,
    phoneOtp: null,
    phoneOtpExpiry: null,
  };

  const prisma = {
    user: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn() };
  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'unit-test-secret',
    JWT_ACCESS_EXPIRES: '15m',
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  };
  const email = {
    sendPasswordResetCode: jest.fn(),
    sendVerificationCode: jest.fn(),
  };
  const whatsapp = { sendOtp: jest.fn() };
  const response = {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
  };

  let service: AuthService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.deleteMany.mockResolvedValue({ count: 0 });
    prisma.refreshToken.create.mockResolvedValue({});
    email.sendPasswordResetCode.mockResolvedValue(undefined);
    email.sendVerificationCode.mockResolvedValue(undefined);
    whatsapp.sendOtp.mockResolvedValue(undefined);
    jwt.sign.mockReturnValue('signed-access-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: EmailService, useValue: email },
        { provide: WhatsAppService, useValue: whatsapp },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('register', () => {
    const dto = {
      fullName: 'New Buyer',
      email: 'new@example.com',
      phone: '+992900000002',
      password: 'StrongPass123!',
      accountType: 'SELLER' as const,
    };

    it('hashes the password, creates the account, and sends a six-digit code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({
        ...user,
        ...data,
        id: 'new-user',
      }));

      await expect(service.register(dto)).resolves.toEqual({
        message:
          'Registration successful. Enter the 6-digit code to verify your account.',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: dto.email,
          passwordHash: 'new-password-hash',
          role: 'SELLER',
          verifyCode: expect.stringMatching(/^\d{6}$/),
        }),
      });
      expect(email.sendVerificationCode).toHaveBeenCalledWith(
        dto.email,
        dto.fullName,
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('rejects an email that already belongs to a verified account', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refreshes verification for an existing unverified account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        isEmailVerified: false,
      });
      prisma.user.update.mockResolvedValue({});

      await expect(service.register(dto)).resolves.toEqual({
        message: 'A new verification code has been sent to your email.',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: expect.objectContaining({
          verifyCode: expect.stringMatching(/^\d{6}$/),
          verifyCodeExpiry: new Date(now.getTime() + 10 * 60 * 1000),
        }),
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects a wrong password without creating tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { email: user.email, password: 'WrongPassword' },
          response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('issues a new code and rejects login for an unverified account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        isEmailVerified: false,
      });
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.login(
          { email: user.email, password: 'StrongPass123!' },
          response,
        ),
      ).rejects.toThrow('EMAIL_NOT_VERIFIED');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: expect.objectContaining({
          verifyCode: expect.stringMatching(/^\d{6}$/),
        }),
      });
      expect(email.sendVerificationCode).toHaveBeenCalledTimes(1);
    });

    it('returns an access token and stores the refresh token in a secure cookie', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.login(
          { email: user.email, password: 'StrongPass123!' },
          response,
        ),
      ).resolves.toEqual({
        accessToken: 'signed-access-token',
        user: expect.objectContaining({ id: user.id, email: user.email }),
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: user.id, email: user.email },
        { secret: 'unit-test-secret', expiresIn: '15m' },
      );
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          token: expect.any(String),
        }),
      });
      expect(response.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
    });
  });

  describe('verifyCode', () => {
    it('marks the email verified and automatically logs the user in', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        isEmailVerified: false,
        verifyCode: '123456',
        verifyCodeExpiry: new Date(now.getTime() + 60_000),
      });
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.verifyCode(user.email, ' 123456 ', response),
      ).resolves.toEqual(
        expect.objectContaining({ accessToken: 'signed-access-token' }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          verifyCode: null,
          verifyCodeExpiry: null,
        },
      });
    });

    it('rejects an incorrect code without updating the user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        isEmailVerified: false,
        verifyCode: '123456',
        verifyCodeExpiry: new Date(now.getTime() + 60_000),
      });

      await expect(
        service.verifyCode(user.email, '999999', response),
      ).rejects.toThrow('Incorrect code');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an expired code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        isEmailVerified: false,
        verifyCode: '123456',
        verifyCodeExpiry: new Date(now.getTime() - 1),
      });

      await expect(
        service.verifyCode(user.email, '123456', response),
      ).rejects.toThrow('Code has expired');
    });
  });

  it('rejects an expired refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(now.getTime() - 1),
      user,
    });

    await expect(service.refresh('expired-token', response)).rejects.toThrow(
      'Invalid or expired refresh token',
    );
  });

  it('resets the password and revokes existing sessions', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

    await expect(
      service.resetPassword({ token: '654321', password: 'NewPassword123!' }),
    ).resolves.toEqual({ message: 'Password reset successfully' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        passwordHash: 'new-password-hash',
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
  });

  it('normalizes a phone number before sending an OTP', async () => {
    prisma.user.update.mockResolvedValue({});

    await expect(service.sendPhoneOtp(user.id, '992900000001')).resolves.toEqual(
      { message: 'OTP sent' },
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: expect.objectContaining({
        phone: '+992900000001',
        phoneOtp: expect.stringMatching(/^\d{6}$/),
      }),
    });
    expect(whatsapp.sendOtp).toHaveBeenCalledWith(
      '+992900000001',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('distinguishes a missing phone OTP from an invalid one', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, phoneOtp: null });

    await expect(service.verifyPhoneOtp(user.id, '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
