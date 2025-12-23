import { Controller, Get, Header, Req } from '@nestjs/common';
import { Request } from 'express';
import { SeoService } from './seo.service';

type TenantRequest = Request & { tenantId?: string };

@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(@Req() req: TenantRequest) {
    const tenantId = req.tenantId || (process.env.DEFAULT_TENANT_ID as string);
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
    return this.seo.sitemap(tenantId, `http://${host}`);
  }

  @Get('areas')
  async areas() {
    return this.seo.areas();
  }
}
