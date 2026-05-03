import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

type Provider = 'gmail' | 'resend' | 'none';

@Injectable()
export class EmailService {
  private provider: Provider = 'none';
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private fromAddress = 'ShopTaj <noreply@shoptaj.com>';
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    this.init();
  }

  private init() {
    const gmailUser = this.config.get<string>('GMAIL_USER') || '';
    const gmailPass = this.config.get<string>('GMAIL_APP_PASSWORD') || '';
    const resendKey = this.config.get<string>('RESEND_API_KEY') || '';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    const isReal = (v: string) => v && !v.startsWith('your_') && v.length > 6;

    // In production: use Resend (no SMTP port blocks).
    // In development: prefer Gmail so real codes arrive during local testing.
    if (isProd && isReal(resendKey)) {
      this.provider = 'resend';
      this.resend = new Resend(resendKey);
      const from = this.config.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
      this.fromAddress = `ShopTaj <${from}>`;
      this.logger.log(`✅ Email: using Resend (from: ${this.fromAddress})`);

    } else if (!isProd && isReal(gmailUser) && isReal(gmailPass)) {
      this.provider = 'gmail';
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });
      this.fromAddress = `ShopTaj <${gmailUser}>`;
      this.logger.log(`✅ Email: using Gmail (${gmailUser})`);

    } else if (isReal(resendKey)) {
      this.provider = 'resend';
      this.resend = new Resend(resendKey);
      const from = this.config.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
      this.fromAddress = `ShopTaj <${from}>`;
      this.logger.log(`✅ Email: using Resend (from: ${this.fromAddress})`);

    } else {
      this.provider = 'none';
      this.logger.warn('⚠️  Email: not configured — codes will only appear in this terminal');
    }
  }

  async sendVerificationCode(to: string, name: string, code: string) {
    this.logCode(to, code);
    await this.send(to, `${code} is your ShopTaj verification code`,
      this.codeTemplate(name, code, 'Verify your email', 10));
  }

  async sendPasswordResetCode(to: string, name: string, code: string) {
    this.logCode(to, code);
    await this.send(to, `${code} is your ShopTaj password reset code`,
      this.codeTemplate(name, code, 'Reset your password', 60));
  }

  async sendOrderConfirmationEmail(to: string, name: string, orderId: string) {
    const url = `${this.config.get('FRONTEND_URL')}/profile/orders/${orderId}`;
    await this.send(to, 'Your ShopTaj order is confirmed! 🎉', this.orderTemplate(name, orderId, url));
  }

  private logCode(to: string, code: string) {
    this.logger.log('━'.repeat(52));
    this.logger.log(`📧  To: ${to}`);
    this.logger.log(`🔑  CODE: ${code}`);
    this.logger.log('━'.repeat(52));
  }

  private async send(to: string, subject: string, html: string) {
    if (this.provider === 'gmail' && this.transporter) {
      try {
        await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
        this.logger.log(`✅ Email sent via Gmail to ${to}`);
      } catch (err: any) {
        this.logger.error(`❌ Gmail error: ${err.message}`);
      }

    } else if (this.provider === 'resend' && this.resend) {
      try {
        const result = await this.resend.emails.send({ from: this.fromAddress, to, subject, html });
        if ((result as any).error) {
          this.logger.error(`❌ Resend error: ${JSON.stringify((result as any).error)}`);
        } else {
          this.logger.log(`✅ Email sent via Resend to ${to}`);
        }
      } catch (err: any) {
        this.logger.error(`❌ Resend error: ${err?.message}`);
      }
    }
  }

  private codeTemplate(name: string, code: string, title: string, expiryMinutes: number) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800">ShopTaj</h1>
        </td></tr>
        <tr><td style="padding:40px;text-align:center">
          <h2 style="margin:0 0 8px;color:#111;font-size:22px">${title}</h2>
          <p style="margin:0 0 32px;color:#666;font-size:15px">Hi <b>${name}</b>, your verification code is:</p>
          <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:16px;padding:28px 40px;display:inline-block;margin-bottom:28px">
            <span style="font-size:48px;font-weight:900;letter-spacing:14px;color:#6366f1;font-family:monospace">${code}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0">Expires in <b>${expiryMinutes} minutes</b></p>
        </td></tr>
        <tr><td style="background:#f8f8fc;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;color:#bbb;font-size:12px">If you didn't request this, ignore this email.<br>© ${new Date().getFullYear()} ShopTaj</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private orderTemplate(name: string, orderId: string, url: string) {
    return `<!DOCTYPE html><html>
<body style="font-family:sans-serif;background:#f4f4f8;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px">ShopTaj</h1>
    </div>
    <div style="padding:36px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🎉</div>
      <h2 style="margin:0 0 12px;color:#111">Order Confirmed!</h2>
      <p style="color:#666;margin:0 0 24px">Hi <b>${name}</b>, your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been placed.</p>
      <a href="${url}" style="background:#6366f1;color:#fff;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;display:inline-block">Track My Order</a>
    </div>
    <div style="background:#f8f8fc;padding:16px;text-align:center;border-top:1px solid #eee">
      <p style="margin:0;color:#bbb;font-size:12px">© ${new Date().getFullYear()} ShopTaj</p>
    </div>
  </div>
</body></html>`;
  }
}
