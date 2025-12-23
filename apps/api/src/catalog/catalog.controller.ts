import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { CreateCategoryDto, CreateProductDto, UpdateProductDto, CreateVariantDto } from './dto/catalog.dto';
import { AddImageDto, ReorderImagesDto } from './dto/images.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  async listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.catalog.listCategories(user.tenantId);
  }

  @Post('categories')
  @Roles('owner', 'staff')
  async upsertCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.upsertCategory(user.tenantId, dto);
  }

  @Get('products')
  async listProducts(
    @Query('q') q: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.catalog.listProducts(user.tenantId, { q, categoryId });
  }

  @Post('products')
  @Roles('owner', 'staff')
  async createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.createProduct(user.tenantId, dto);
  }

  @Patch('products/:id')
  @Roles('owner', 'staff')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.updateProduct(user.tenantId, id, dto);
  }

  @Post('products/:id/variants')
  @Roles('owner', 'staff')
  async addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.addVariant(user.tenantId, id, dto);
  }

  @Delete('products/:id')
  @Roles('owner', 'staff')
  async deleteProduct(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.deleteProduct(user.tenantId, id);
  }

  @Delete('categories/:id')
  @Roles('owner', 'staff')
  async deleteCategory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.deleteCategory(user.tenantId, id);
  }

  @Post('products/:id/images')
  @Roles('owner', 'staff')
  async addImage(@Param('id') id: string, @Body() dto: AddImageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.addImage(user.tenantId, id, dto);
  }

  @Post('products/:id/images/reorder')
  @Roles('owner', 'staff')
  async reorderImages(@Param('id') id: string, @Body() dto: ReorderImagesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalog.reorderImages(user.tenantId, id, dto);
  }

  @Delete('products/:id/images/:imageId')
  @Roles('owner', 'staff')
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.catalog.deleteImage(user.tenantId, id, imageId);
  }

  // Public image list for storefront
  @Get('products/:id/images')
  async listImages(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.catalog.listImages(user?.tenantId, id);
  }
}
