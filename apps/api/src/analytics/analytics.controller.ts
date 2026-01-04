import { Body, Controller, Get, Post, Query, Req, VERSION_NEUTRAL } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { CreateEventDto } from './dto/event.dto';

type TenantRequest = Request & { tenantId?: string };

@Controller({ path: 'events', version: VERSION_NEUTRAL })
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post()
  async log(@Body() dto: CreateEventDto, @Req() req: TenantRequest) {
    const tenantId = req.tenantId || process.env.DEFAULT_TENANT_ID;
    return this.analytics.logEvent(tenantId as string, dto);
  }

  @Get()
  async list(@Req() req: TenantRequest, @Query('limit') limit?: string) {
    const tenantId = req.tenantId || process.env.DEFAULT_TENANT_ID;
    const lim = limit ? parseInt(limit, 10) : 100;
    return this.analytics.listEvents(tenantId as string, lim);
  }

  @Get('summary')
  async summary(@Req() req: TenantRequest, @Query('days') days?: string) {
    const tenantId = req.tenantId || process.env.DEFAULT_TENANT_ID;
    const windowDays = days ? parseInt(days, 10) : 7;
    return this.analytics.summary(tenantId as string, windowDays);
  }
}
