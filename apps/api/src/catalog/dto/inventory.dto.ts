import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdjustInventoryDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  variantId: string;

  @IsInt()
  change: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
