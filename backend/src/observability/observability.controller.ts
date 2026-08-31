import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@ApiTags('observability')
@Controller()
export class ObservabilityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check API and database readiness' })
  @ApiResponse({ status: 200, description: 'API and database are ready' })
  @ApiResponse({ status: 503, description: 'Database is unavailable' })
  async health() {
    const checkedAt = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        checks: { api: 'up', database: 'up' },
        checkedAt,
        uptimeSeconds: Math.floor(process.uptime()),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { api: 'up', database: 'down' },
        checkedAt,
      });
    }
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Expose Prometheus-compatible process metrics' })
  metrics(): Promise<string> {
    return this.metricsService.render();
  }
}
