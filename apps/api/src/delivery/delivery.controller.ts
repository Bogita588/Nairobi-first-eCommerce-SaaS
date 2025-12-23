import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreatePartnerDto, CreateDeliveryOrderDto, UpdateDeliveryStatusDto } from './dto/delivery.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get('partners')
  listPartners(@CurrentUser() user: AuthenticatedUser) {
    return this.delivery.listPartners(user.tenantId);
  }

  @Post('partners')
  @Roles('owner', 'staff')
  createPartner(@Body() dto: CreatePartnerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.delivery.createPartner(user.tenantId, dto);
  }

  @Get('orders')
  listDeliveries(@CurrentUser() user: AuthenticatedUser) {
    return this.delivery.listDeliveryOrders(user.tenantId);
  }

  @Post('orders')
  @Roles('owner', 'staff')
  createDeliveryOrder(@Body() dto: CreateDeliveryOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.delivery.createDeliveryOrder(user.tenantId, dto);
  }

  @Patch('orders/:id/status')
  @Roles('owner', 'staff')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.delivery.updateStatus(user.tenantId, id, dto);
  }
}
