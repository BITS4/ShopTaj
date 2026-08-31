import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { sanitizeRequestPath } from './request-path';

interface RequestContext {
  method?: string;
  originalUrl?: string;
  url?: string;
  user?: { id?: string };
}

/**
 * Reports server failures to Sentry, then delegates response handling to
 * Nest's default exception filter so status codes and response bodies remain
 * unchanged. Expected client errors are deliberately excluded.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const request = host.switchToHttp().getRequest<RequestContext>();
      Sentry.captureException(exception, {
        tags: {
          component: 'http',
          http_status: status,
        },
        extra: {
          method: request?.method,
          path: sanitizeRequestPath(request?.originalUrl ?? request?.url),
        },
        user: request?.user?.id ? { id: request.user.id } : undefined,
      });
    }

    super.catch(exception, host);
  }
}
