import { Injectable } from '@nestjs/common';
import { Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  constructor() {
    collectDefaultMetrics({
      prefix: 'shoptaj_',
      register: this.registry,
    });

    new Gauge({
      name: 'shoptaj_info',
      help: 'Static information about the running ShopTaj backend',
      labelNames: ['version'],
      registers: [this.registry],
    }).set({ version: '1.0.0' }, 1);
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }
}
