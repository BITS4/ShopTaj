import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { MetricsService } from '../src/observability/metrics.service';
import { ObservabilityController } from '../src/observability/observability.controller';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Observability endpoints (e2e)', () => {
  const prisma = { $queryRaw: jest.fn() };
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ObservabilityController],
      providers: [MetricsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports a ready database', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.checks).toEqual({ api: 'up', database: 'up' });
      });
  });

  it('GET /api/health returns 503 when the database probe fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(503)
      .expect(({ body }) => {
        expect(body.status).toBe('error');
        expect(body.checks.database).toBe('down');
      });
  });

  it('GET /api/metrics exposes Prometheus text', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics')
      .expect('Content-Type', /text\/plain/)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('# HELP shoptaj_info');
        expect(text).toContain('shoptaj_process_cpu_user_seconds_total');
      });
  });
});
