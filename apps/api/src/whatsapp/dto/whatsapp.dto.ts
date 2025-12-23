import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendTemplateDto {
  @IsString()
  @IsNotEmpty()
  toPhone!: string;

  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @IsOptional()
  variables?: Record<string, string>;

  @IsOptional()
  @IsString()
  cartId?: string;
}

export class InboundMessageDto {
  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;
}
