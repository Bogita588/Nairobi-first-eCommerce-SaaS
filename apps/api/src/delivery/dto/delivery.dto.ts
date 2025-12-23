import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string; // pickup_mtaani, manual, other

  @IsOptional()
  config?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateDeliveryOrderDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDeliveryStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string; // pending, dispatched, in_transit, delivered, failed

  @IsOptional()
  @IsNumber()
  etaMinutes?: number;

  @IsOptional()
  @IsString()
  trackingCode?: string;
}
