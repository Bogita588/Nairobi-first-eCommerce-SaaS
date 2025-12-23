import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog/public')
export class CatalogPublicController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  async listCategories(@Query('tenantId') tenantId: string) {
    return this.catalog.listCategories(tenantId);
  }

  @Get('products')
  async listProducts(@Query('tenantId') tenantId: string, @Query('q') q?: string, @Query('categoryId') categoryId?: string) {
    return this.catalog.listProducts(tenantId, { q, categoryId });
  }

  @Get('products/:id/images')
  async listImages(@Param('id') id: string) {
    return this.catalog.listImages(undefined, id);
  }
}
