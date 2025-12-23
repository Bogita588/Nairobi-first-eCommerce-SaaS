import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { AddItemDto, CheckoutDto, InitCartDto, QuoteDto, UpdateItemDto } from './dto/cart.dto';
import { BadRequestException } from '@nestjs/common';

type TenantRequest = Request & { tenantId?: string };

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('cart/init')
  initCart(@Body() body: InitCartDto, @Req() req: TenantRequest) {
    return this.checkout.initCart(this.ensureTenant(req), body);
  }

  @Get('cart/:cartToken')
  getCart(@Param('cartToken') cartToken: string, @Req() req: TenantRequest) {
    return this.checkout.getCart(this.ensureTenant(req), cartToken);
  }

  @Post('cart/:cartToken/items')
  addItem(@Param('cartToken') cartToken: string, @Body() body: AddItemDto, @Req() req: TenantRequest) {
    return this.checkout.addItem(this.ensureTenant(req), cartToken, body);
  }

  @Patch('cart/:cartToken/items/:itemId')
  updateItem(
    @Param('cartToken') cartToken: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemDto,
    @Req() req: TenantRequest
  ) {
    return this.checkout.updateItem(this.ensureTenant(req), cartToken, itemId, body);
  }

  @Delete('cart/:cartToken/items/:itemId')
  deleteItem(@Param('cartToken') cartToken: string, @Param('itemId') itemId: string, @Req() req: TenantRequest) {
    return this.checkout.deleteItem(this.ensureTenant(req), cartToken, itemId);
  }

  @Post('quote')
  quote(@Body() body: QuoteDto, @Req() req: TenantRequest) {
    return this.checkout.quoteDelivery(this.ensureTenant(req), body);
  }

  @Post('submit')
  submit(@Body() body: CheckoutDto, @Req() req: TenantRequest) {
    return this.checkout.checkout(this.ensureTenant(req), body);
  }

  private ensureTenant(req: TenantRequest): string {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant missing on request');
    }
    return req.tenantId;
  }
}
