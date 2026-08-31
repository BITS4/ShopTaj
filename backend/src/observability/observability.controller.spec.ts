import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { ObservabilityController } from './observability.controller';

describe('ObservabilityController', () => {
  const prisma = { $queryRaw: jest.fn() };

  let controller: ObservabilityController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservabilityController],
      providers: [MetricsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(ObservabilityController);
  });

  it('reports API and database readiness', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.health()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        checks: { api: 'up', database: 'up' },
        checkedAt: expect.any(String),
        uptimeSeconds: expect.any(Number),
      }),
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns a 503-compatible exception when the database is unavailable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(controller.health()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('renders Prometheus process and application metrics', async () => {
    const metrics = await controller.metrics();

    expect(metrics).toContain('# HELP shoptaj_info');
    expect(metrics).toContain('shoptaj_info{version="1.0.0"} 1');
    expect(metrics).toContain('shoptaj_process_cpu_user_seconds_total');
  });
});
