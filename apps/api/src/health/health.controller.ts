import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { PoolClient } from 'pg';
import { HealthService } from './health.service';

type HealthRequest = Request & { tenantId?: string; dbClient?: PoolClient };

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Req() req: HealthRequest) {
    const db = await this.healthService.checkDatabase(req.dbClient);
    return {
      status: 'ok',
      tenant: req.tenantId || null,
      db
    };
  }
}
