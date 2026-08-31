import { ArgumentsHost, BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter } from './sentry-exception.filter';

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('SentryExceptionFilter', () => {
  const response = {};
  const request = {
    method: 'GET',
    originalUrl: '/api/failure?token=private-value',
    user: { id: 'user-1' },
  };
  const adapter = {
    end: jest.fn(),
    isHeadersSent: jest.fn(() => false),
    reply: jest.fn(),
  };
  const adapterHost = { httpAdapter: adapter } as unknown as HttpAdapterHost;
  const host = {
    getArgByIndex: (index: number) => (index === 0 ? request : response),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  let filter: SentryExceptionFilter;
  let errorLog: jest.SpyInstance;

  beforeAll(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    errorLog.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new SentryExceptionFilter(adapterHost);
  });

  it('reports an unhandled exception with request context and preserves the 500 response', () => {
    const error = new Error('database unavailable');

    filter.catch(error, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { component: 'http', http_status: HttpStatus.INTERNAL_SERVER_ERROR },
      extra: { method: 'GET', path: '/api/failure' },
      user: { id: 'user-1' },
    });
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('keeps expected client errors out of Sentry and preserves their response', () => {
    const error = new BadRequestException('Invalid request');

    filter.catch(error, host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request',
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );
  });
});
