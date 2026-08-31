import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AdminModule } from './admin/admin.module';
import { SellerModule } from './seller/seller.module';
import { ObservabilityModule } from './observability/observability.module';
import { SentryExceptionFilter } from './observability/sentry-exception.filter';
import { sanitizeRequestPath } from './observability/request-path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configuredLevel = config.get<string>('LOG_LEVEL') ?? '';
        const allowedLevels = new Set([
          'fatal',
          'error',
          'warn',
          'info',
          'debug',
          'trace',
          'silent',
        ]);
        const level = allowedLevels.has(configuredLevel)
          ? configuredLevel
          : config.get<string>('NODE_ENV') === 'production'
            ? 'info'
            : 'debug';

        return {
          pinoHttp: {
            level,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                'req.body.password',
                'req.body.token',
                'req.body.code',
              ],
              censor: '[REDACTED]',
            },
            serializers: {
              req: (request) => ({
                id: request.id,
                method: request.method,
                url: sanitizeRequestPath(request.url),
                remoteAddress: request.remoteAddress,
                remotePort: request.remotePort,
              }),
            },
            autoLogging: {
              ignore: (request) => {
                const path = sanitizeRequestPath(request.url);
                return path === '/api/health' || path === '/api/metrics';
              },
            },
            customProps: () => ({ service: 'shoptaj-backend' }),
          },
        };
      },
    }),
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000 * 15, limit: 100 }]),
    CacheModule.register({ isGlobal: true, ttl: 60 }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    WishlistModule,
    AdminModule,
    SellerModule,
    ObservabilityModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
