import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        emailVerifyToken,
        cart: { create: {} },
      },
    });

    await this.email.sendVerificationEmail(user.email, user.fullName, emailVerifyToken);

    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(dto: LoginDto, res: any) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException('Account suspended');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user, res);
  }

  async googleLogin(googleUser: any, res: any) {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          ...googleUser,
          isEmailVerified: true,
          cart: { create: {} },
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId },
      });
    }

    return this.generateTokens(user, res);
  }

  async refresh(refreshToken: string, res: any) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { token: refreshToken } });
    return this.generateTokens(stored.user, res);
  }

  async logout(userId: string, res: any) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new BadRequestException('Invalid verification token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If that email exists, a reset link was sent.' };

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await this.email.sendPasswordResetEmail(user.email, user.fullName, resetToken);
    return { message: 'If that email exists, a reset link was sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Password reset successfully' };
  }

  private async generateTokens(user: any, res: any) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
    });

    const rawRefresh = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: rawRefresh, expiresAt },
    });

    res.cookie('refresh_token', rawRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
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
      },
    };
  }
}
