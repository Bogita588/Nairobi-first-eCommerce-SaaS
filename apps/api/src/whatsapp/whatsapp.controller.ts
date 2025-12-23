import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { SendTemplateDto, InboundMessageDto } from './dto/whatsapp.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Request } from 'express';

type TenantRequest = Request & { tenantId?: string };

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('send-template')
  @Roles('owner', 'staff')
  sendTemplate(@Body() dto: SendTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.whatsapp.sendTemplate(user.tenantId, dto);
  }

  // Webhook/inbound handler (unauthenticated but tenant header is expected)
  @Post('webhook')
  inbound(@Body() dto: InboundMessageDto, @Req() req: TenantRequest) {
    const tenantId = req.tenantId || process.env.DEFAULT_TENANT_ID;
    return this.whatsapp.inbound(tenantId as string, dto);
  }
}
