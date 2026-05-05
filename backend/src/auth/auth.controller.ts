import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { IsEmail as ValidEmail, IsString as ValidString, Length, IsPhoneNumber } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

class VerifyCodeDto {
  @ValidEmail() email: string;
  @ValidString() @Length(6, 6) code: string;
}

class SendPhoneOtpDto {
  @ValidString() phone: string;
}

class VerifyPhoneOtpDto {
  @ValidString() @Length(6, 6) otp: string;
}

class ResendCodeDto {
  @ValidEmail() email: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 * 15 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 * 15 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 * 15 } })
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  verifyCode(@Body() dto: VerifyCodeDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.verifyCode(dto.email, dto.code, res);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 * 15 } })
  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendCode(dto.email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException('No refresh token');
    return this.authService.refresh(token, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(user.id, res);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 * 15 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.googleLogin(req.user, res);
  }

  @Post('send-phone-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  sendPhoneOtp(@CurrentUser() user: any, @Body() dto: SendPhoneOtpDto) {
    return this.authService.sendPhoneOtp(user.id, dto.phone);
  }

  @Post('verify-phone-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  verifyPhoneOtp(@CurrentUser() user: any, @Body() dto: VerifyPhoneOtpDto) {
    return this.authService.verifyPhoneOtp(user.id, dto.otp);
  }
}
