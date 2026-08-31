import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import type { SellerProfile, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/email/email.service';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';
import type { GoogleAuthUser } from './strategies/google.strategy';

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

interface AuthCookieResponse {
  cookie(name: string, value: string, options?: CookieOptions): unknown;
  clearCookie(name: string, options?: CookieOptions): unknown;
}

type TokenUser = Pick<
  User,
  'id' | 'email' | 'fullName' | 'role' | 'avatarUrl' | 'isEmailVerified'
> & {
  sellerProfile?: Pick<SellerProfile, 'status'> | null;
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private whatsapp: WhatsAppService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // Purge stale unverified accounts (older than 24 h) in the background
    this.prisma.user.deleteMany({
      where: { isEmailVerified: false, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }).catch(() => {});

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (exists) {
      if (exists.isEmailVerified) throw new ConflictException('Email already in use');
      // Unverified account still within the 24 h window — refresh code and resend
      const code = generateCode();
      await this.prisma.user.update({
        where: { id: exists.id },
        data: { verifyCode: code, verifyCodeExpiry: new Date(Date.now() + CODE_EXPIRY_MS) },
      });
      this.email
        .sendVerificationCode(exists.email, exists.fullName, code)
        .catch((error) => this.logEmailError(error));
      return { message: 'A new verification code has been sent to your email.' };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const code = generateCode();
    const codeExpiry = new Date(Date.now() + CODE_EXPIRY_MS);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.accountType === 'SELLER' ? 'SELLER' : 'USER',
        verifyCode: code,
        verifyCodeExpiry: codeExpiry,
        cart: { create: {} },
      },
    });

    // Fire-and-forget — never block the response waiting for email
    this.email
      .sendVerificationCode(user.email, user.fullName, code)
      .catch((error) => this.logEmailError(error));
    return { message: 'Registration successful. Enter the 6-digit code to verify your account.' };
  }

  // ─── Resend code ──────────────────────────────────────────────────────────
  async resendCode(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If that email exists, a new code has been sent.' };
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    const code = generateCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verifyCode: code, verifyCodeExpiry: new Date(Date.now() + CODE_EXPIRY_MS) },
    });
    this.email
      .sendVerificationCode(user.email, user.fullName, code)
      .catch((error) => this.logEmailError(error));
    return { message: 'New code sent.' };
  }

  // ─── Verify 6-digit code ──────────────────────────────────────────────────
  async verifyCode(email: string, code: string, res: AuthCookieResponse) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Invalid code');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');
    if (!user.verifyCode || user.verifyCode !== code.trim()) {
      throw new BadRequestException('Incorrect code. Please try again.');
    }
    if (!user.verifyCodeExpiry || user.verifyCodeExpiry < new Date()) {
      throw new BadRequestException('Code has expired. Please request a new one.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, verifyCode: null, verifyCodeExpiry: null },
    });

    // Auto-login after verification
    return this.generateTokens(user, res);
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, res: AuthCookieResponse) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException('Account suspended');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified) {
      const code = generateCode();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { verifyCode: code, verifyCodeExpiry: new Date(Date.now() + CODE_EXPIRY_MS) },
      });
      this.email
        .sendVerificationCode(user.email, user.fullName, code)
        .catch((error) => this.logEmailError(error));
      throw new UnauthorizedException(
        `EMAIL_NOT_VERIFIED:${user.email}:A 6-digit code has been sent to your email. Please enter it to continue.`,
      );
    }

    return this.generateTokens(user, res);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────
  async googleLogin(googleUser: unknown, res: AuthCookieResponse) {
    if (!this.isGoogleAuthUser(googleUser)) {
      throw new UnauthorizedException('Invalid Google profile');
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: { ...googleUser, isEmailVerified: true, cart: { create: {} } },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId, isEmailVerified: true },
      });
    }
    return this.generateTokens(user, res);
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  async refresh(refreshToken: string, res: AuthCookieResponse) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return this.generateTokens(stored.user, res);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(userId: string, res: AuthCookieResponse) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  // ─── Legacy token-based verify (backward compat) ──────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new BadRequestException('Invalid verification token');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });
    return { message: 'Email verified successfully' };
  }

  // ─── Forgot password ──────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If that email exists, a reset code was sent.' };

    const code = generateCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: code, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });
    this.email
      .sendPasswordResetCode(user.email, user.fullName, code)
      .catch((error) => this.logEmailError(error));
    return { message: 'If that email exists, a reset code was sent.' };
  }

  // ─── Reset password ───────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: dto.token, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('Invalid or expired code');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Password reset successfully' };
  }

  // ─── Token generation ─────────────────────────────────────────────────────
  private async generateTokens(user: TokenUser, res: AuthCookieResponse) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
    });

    const rawRefresh = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId: user.id, token: rawRefresh, expiresAt } });

    res.cookie('refresh_token', rawRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // 'none' required for cross-origin (frontend on shop-taj.com, backend on railway.app)
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: expiresAt,
      path: '/',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        sellerStatus: user.sellerProfile?.status ?? null,
      },
    };
  }

  // ─── Phone verification ────────────────────────────────────────────────────
  async sendPhoneOtp(userId: string, phone: string) {
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    const otp = generateCode();
    const expiry = new Date(Date.now() + CODE_EXPIRY_MS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { phone: normalized, phoneOtp: otp, phoneOtpExpiry: expiry },
    });

    await this.whatsapp.sendOtp(normalized, otp);
    return { message: 'OTP sent' };
  }

  async verifyPhoneOtp(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phoneOtp || !user.phoneOtpExpiry)
      throw new BadRequestException('No OTP requested');
    if (user.phoneOtpExpiry < new Date())
      throw new BadRequestException('OTP expired');
    if (user.phoneOtp !== otp)
      throw new BadRequestException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isPhoneVerified: true, phoneOtp: null, phoneOtpExpiry: null },
    });
    return { message: 'Phone verified' };
  }

  private logEmailError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Email delivery failed: ${message}`);
  }

  private isGoogleAuthUser(value: unknown): value is GoogleAuthUser {
    if (typeof value !== 'object' || value === null) return false;

    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.googleId === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.fullName === 'string' &&
      (candidate.avatarUrl === undefined ||
        candidate.avatarUrl === null ||
        typeof candidate.avatarUrl === 'string')
    );
  }
}
