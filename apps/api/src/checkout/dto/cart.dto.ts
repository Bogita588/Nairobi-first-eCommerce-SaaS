import { IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class InitCartDto {
  @IsOptional()
  @IsString()
  cartToken?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class AddItemDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class UpdateItemDto {
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class QuoteDto {
  @IsString()
  @IsNotEmpty()
  cartToken!: string;

  @IsString()
  @IsNotEmpty()
  cityArea!: string;
}

export enum PaymentMethod {
  COD = 'cod',
  PICKUP = 'pickup' // pay in-store on collection
}

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  cartToken!: string;

  @IsString()
  @IsNotEmpty()
  cityArea!: string;

  @IsString()
  @IsOptional()
  streetAddress?: string;

  @IsString()
  @IsOptional()
  deliveryInstructions?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsBoolean()
  @IsOptional()
  whatsappOptIn?: boolean;
}
