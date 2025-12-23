import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/inventory.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('adjust')
  @Roles('owner', 'staff')
  async adjust(@Body() dto: AdjustInventoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventory.adjust(user.tenantId, dto);
  }
}
