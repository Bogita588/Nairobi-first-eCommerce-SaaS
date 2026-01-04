import { IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsString()
  eventType!: string; // product_view, add_to_cart, checkout_start, payment_result, whatsapp_handoff

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  cartId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsString()
  cityArea?: string;

  @IsOptional()
  @IsNumber()
  amountCents?: number;

  @IsOptional()
  properties?: Record<string, unknown>;
}
