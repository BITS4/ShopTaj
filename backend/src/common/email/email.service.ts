import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: this.config.get('SENDGRID_API_KEY'),
      },
    });
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;
    await this.send(to, 'Verify your ShopTaj email', this.verificationTemplate(name, url));
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const url = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    await this.send(to, 'Reset your ShopTaj password', this.resetTemplate(name, url));
  }

  async sendOrderConfirmationEmail(to: string, name: string, orderId: string) {
    const url = `${this.config.get('FRONTEND_URL')}/profile/orders/${orderId}`;
    await this.send(to, 'Your ShopTaj order confirmed!', this.orderTemplate(name, orderId, url));
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('EMAIL_FROM') || 'noreply@shoptaj.com',
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  private verificationTemplate(name: string, url: string) {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Welcome to ShopTaj, ${name}!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px;margin-top:20px">Link expires in 24 hours.</p>
      </div>`;
  }

  private resetTemplate(name: string, url: string) {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Password Reset - ShopTaj</h2>
        <p>Hi ${name}, click below to reset your password:</p>
        <a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px;margin-top:20px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>`;
  }

  private orderTemplate(name: string, orderId: string, url: string) {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Order Confirmed! 🎉</h2>
        <p>Hi ${name}, your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been placed successfully.</p>
        <a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
          View Order
        </a>
      </div>`;
  }
}
