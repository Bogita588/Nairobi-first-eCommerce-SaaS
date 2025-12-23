import { IsArray, IsInt, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class AddImageDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsInt()
  position?: number;
}

export class ReorderImagesDto {
  @IsArray()
  positions: { imageId: string; position: number }[];
}
