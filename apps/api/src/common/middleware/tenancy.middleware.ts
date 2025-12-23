import { BadRequestException, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';

type RequestWithTenant = Request & { tenantId?: string; dbClient?: PoolClient };

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenancyMiddleware.name);

  constructor(private readonly db: DatabaseService) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // Allow health/ping without tenant
    if (req.path.includes('/health')) {
      return next();
    }

    const tenantId = this.resolveTenant(req);
    if (!tenantId) {
      throw new BadRequestException('Tenant not provided');
    }

    let client: PoolClient | undefined;
    try {
      client = await this.db.getClient();
      await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant', tenantId]);
      req.tenantId = tenantId;
      req.dbClient = client;
      res.on('finish', () => client && client.release());
      next();
    } catch (error) {
      if (client) client.release();
      const err = error as Error;
      this.logger.error(`Failed to set tenant: ${tenantId}`, err?.stack);
      throw new BadRequestException('Failed to establish tenant context');
    }
  }

  private resolveTenant(req: Request): string | undefined {
    const headerTenant = req.header('x-tenant-id');
    if (headerTenant) {
      return headerTenant;
    }
    const host = req.header('x-forwarded-host') || req.headers.host;
    if (host) {
      const hostName = host.split(':')[0];
      const parts = hostName.split('.');
      if (parts.length > 2) {
        return parts[0]; // subdomain part
      }
    }
    return process.env.DEFAULT_TENANT_ID || undefined;
  }
}
