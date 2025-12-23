import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => (value === '' ? undefined : value))
  storeId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  primaryCategoryId?: string;

  @IsOptional()
  visibility?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsNumber()
  basePriceCents: number;

  @IsOptional()
  @IsNumber()
  compareAtPriceCents?: number;

  @IsOptional()
  @IsNumber()
  costCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()).filter(Boolean) : value))
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()).filter(Boolean) : value))
  badges?: string[];

  @IsOptional()
  metaTitle?: string;

  @IsOptional()
  metaDescription?: string;

  @IsOptional()
  schemaJson?: Record<string, unknown>;

  @IsOptional()
  canonicalUrl?: string;

  @IsOptional()
  seoKeywords?: string[];

  @IsOptional()
  warrantyText?: string;

  @IsOptional()
  returnPolicy?: string;

  @IsOptional()
  supportWhatsapp?: string;

  @IsOptional()
  leadTimeDays?: number;

  @IsOptional()
  areaRestrictions?: Record<string, unknown>;

  @IsOptional()
  deliveryFeeOverrides?: Record<string, unknown>;

  @IsOptional()
  codAllowed?: boolean;

  @IsOptional()
  mpesaOnlyOverThreshold?: boolean;

  @IsOptional()
  categoryIds?: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  primaryCategoryId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  basePriceCents?: number;

  @IsOptional()
  @IsNumber()
  compareAtPriceCents?: number;

  @IsOptional()
  @IsNumber()
  costCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()).filter(Boolean) : value))
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()).filter(Boolean) : value))
  badges?: string[];

  @IsOptional()
  metaTitle?: string;

  @IsOptional()
  metaDescription?: string;

  @IsOptional()
  schemaJson?: Record<string, unknown>;

  @IsOptional()
  canonicalUrl?: string;

  @IsOptional()
  seoKeywords?: string[];

  @IsOptional()
  warrantyText?: string;

  @IsOptional()
  returnPolicy?: string;

  @IsOptional()
  supportWhatsapp?: string;

  @IsOptional()
  leadTimeDays?: number;

  @IsOptional()
  areaRestrictions?: Record<string, unknown>;

  @IsOptional()
  deliveryFeeOverrides?: Record<string, unknown>;

  @IsOptional()
  codAllowed?: boolean;

  @IsOptional()
  mpesaOnlyOverThreshold?: boolean;

  @IsOptional()
  categoryIds?: string[];
}

export class CreateVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  priceCents?: number;

  @IsOptional()
  @IsNumber()
  costCents?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
