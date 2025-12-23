import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCategoryDto, CreateProductDto, UpdateProductDto, CreateVariantDto } from './dto/catalog.dto';
import { AddImageDto, ReorderImagesDto } from './dto/images.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}

  async listCategories(tenantId: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query('SELECT id, name, slug, parent_id, position, is_active FROM categories WHERE tenant_id = $1 ORDER BY position ASC', [tenantId]);
      return res.rows;
    } finally {
      client.release();
    }
  }

  async upsertCategory(tenantId: string, dto: CreateCategoryDto) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `INSERT INTO categories (id, tenant_id, name, slug, parent_id, position, is_active, created_at, updated_at)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, COALESCE($6, 0), COALESCE($7, true), now(), now())
         ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, position = EXCLUDED.position, is_active = EXCLUDED.is_active, updated_at = now()
         RETURNING id, name, slug, parent_id, position, is_active`,
        [dto.id || null, tenantId, dto.name, dto.slug, dto.parentId || null, dto.position, dto.isActive]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async listProducts(tenantId: string, filters: { q?: string; categoryId?: string }) {
    const client = await this.db.getClient();
    try {
      const params: (string | number)[] = [tenantId];
      let where = 'tenant_id = $1';
      if (filters.categoryId) {
        params.push(filters.categoryId);
        where += ` AND category_id = $${params.length}`;
      }
      if (filters.q) {
        params.push(`%${filters.q}%`);
        where += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }
      const res = await client.query(
        `SELECT id, name, slug, category_id, status, base_price_cents, currency, brand, created_at, updated_at
         FROM products WHERE ${where} ORDER BY created_at DESC LIMIT 100`,
        params
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const client = await this.db.getClient();
    try {
      const storeId = dto.storeId || (await this.getOrCreateDefaultStore(client, tenantId));
      const res = await client.query(
        `INSERT INTO products (id, tenant_id, store_id, name, slug, description, category_id, status, brand, base_price_cents, compare_at_price_cents, cost_cents, currency, sku, weight_kg, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, COALESCE($7, 'draft'), $8, $9, $10, $11, COALESCE($12,'KES'), $13, $14, now(), now())
         RETURNING id, name, slug, status, base_price_cents, currency`,
        [
          tenantId,
          storeId,
          dto.name,
          dto.slug,
          dto.description || '',
          dto.categoryId || null,
          dto.status,
          dto.brand,
          dto.basePriceCents,
          dto.compareAtPriceCents || null,
          dto.costCents || null,
          dto.currency || 'KES',
          dto.sku || null,
          dto.weightKg || null
        ]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `UPDATE products
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             category_id = COALESCE($3, category_id),
             status = COALESCE($4, status),
             brand = COALESCE($5, brand),
             base_price_cents = COALESCE($6, base_price_cents),
             compare_at_price_cents = COALESCE($7, compare_at_price_cents),
             cost_cents = COALESCE($8, cost_cents),
             currency = COALESCE($9, currency),
             sku = COALESCE($10, sku),
             weight_kg = COALESCE($11, weight_kg),
             updated_at = now()
         WHERE id = $12 AND tenant_id = $13
         RETURNING id, name, slug, status, base_price_cents, currency`,
        [
          dto.name || null,
          dto.description || null,
          dto.categoryId || null,
          dto.status || null,
          dto.brand || null,
          dto.basePriceCents || null,
          dto.compareAtPriceCents || null,
          dto.costCents || null,
          dto.currency || null,
          dto.sku || null,
          dto.weightKg || null,
          id,
          tenantId
        ]
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('Product not found');
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async addVariant(tenantId: string, productId: string, dto: CreateVariantDto) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `INSERT INTO product_variants (id, tenant_id, product_id, name, sku, barcode, price_cents, cost_cents, stock_quantity, low_stock_threshold, attributes, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, COALESCE($8,0), COALESCE($9,0), COALESCE($10,'{}'), COALESCE($11,true), now(), now())
         RETURNING id, product_id, name, sku, price_cents, stock_quantity, attributes`,
        [
          tenantId,
          productId,
          dto.name || null,
          dto.sku || null,
          dto.barcode || null,
          dto.priceCents || null,
          dto.costCents || null,
          dto.stockQuantity || 0,
          dto.lowStockThreshold || 0,
          dto.attributes || {},
          dto.isActive
        ]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async addImage(tenantId: string, productId: string, dto: AddImageDto) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `INSERT INTO product_images (id, tenant_id, product_id, variant_id, url, position, alt_text, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, COALESCE($5, 0), COALESCE($6,''), now())
         RETURNING id, product_id, variant_id, url, position, alt_text`,
        [tenantId, productId, dto.variantId || null, dto.url, dto.position || 0, dto.altText || '']
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async reorderImages(tenantId: string, productId: string, dto: ReorderImagesDto) {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      for (const item of dto.positions) {
        await client.query(
          `UPDATE product_images SET position = $1 WHERE id = $2 AND tenant_id = $3 AND product_id = $4`,
          [item.position, item.imageId, tenantId, productId]
        );
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteImage(tenantId: string, productId: string, imageId: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `DELETE FROM product_images WHERE id = $1 AND tenant_id = $2 AND product_id = $3 RETURNING id`,
        [imageId, tenantId, productId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('Image not found');
      }
      return { deleted: true };
    } finally {
      client.release();
    }
  }

  private async getOrCreateDefaultStore(
    client: { query: (text: string, params?: unknown[]) => Promise<{ rows: { id: string }[] }> },
    tenantId: string
  ) {
    const existing = await client.query<{ id: string }>('SELECT id FROM stores WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const res = await client.query<{ id: string }>(
      `INSERT INTO stores (id, tenant_id, name, slug, default_currency, is_live, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'KES', false, now(), now())
       RETURNING id`,
      [tenantId, 'Default Store', `store-${tenantId.slice(0, 6)}`]
    );
    return res.rows[0].id;
  }
}
