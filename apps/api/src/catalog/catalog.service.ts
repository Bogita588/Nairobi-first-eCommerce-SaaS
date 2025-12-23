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
        `INSERT INTO categories (id, tenant_id, name, slug, parent_id, position, is_active, description, meta_title, meta_description, hero_image_url, icon, created_at, updated_at)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, COALESCE($6, 0), COALESCE($7, true), $8, $9, $10, $11, $12, now(), now())
         ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, position = EXCLUDED.position, is_active = EXCLUDED.is_active, description = EXCLUDED.description, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, hero_image_url = EXCLUDED.hero_image_url, icon = EXCLUDED.icon, updated_at = now()
         RETURNING id, name, slug, parent_id, position, is_active, description, meta_title, meta_description, hero_image_url, icon`,
        [
          dto.id || null,
          tenantId,
          dto.name,
          dto.slug,
          dto.parentId || null,
          dto.position,
          dto.isActive,
          dto.description || null,
          dto.metaTitle || null,
          dto.metaDescription || null,
          dto.heroImageUrl || null,
          dto.icon || null
        ]
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
        where += ` AND (category_id = $${params.length} OR primary_category_id = $${params.length})`;
      }
      if (filters.q) {
        params.push(`%${filters.q}%`);
        where += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }
      const res = await client.query(
        `SELECT p.id,
                p.name,
                p.slug,
                p.category_id,
                p.primary_category_id,
                p.status,
                p.base_price_cents,
                p.currency,
                p.brand,
                p.created_at,
                p.updated_at,
                p.short_description,
                p.description,
                img.url as main_image_url
         FROM products p
         LEFT JOIN LATERAL (
           SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC, pi.created_at ASC LIMIT 1
         ) img ON TRUE
         WHERE ${where}
         ORDER BY p.created_at DESC
         LIMIT 100`,
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
      const primaryCategory = dto.primaryCategoryId || dto.categoryId || null;
      const tags = Array.isArray(dto.tags)
        ? dto.tags
        : dto.tags
        ? String(dto.tags)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const badges = Array.isArray(dto.badges)
        ? dto.badges
        : dto.badges
        ? String(dto.badges)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const res = await client.query(
        `INSERT INTO products (
           id, tenant_id, store_id, name, slug, description, short_description, category_id, primary_category_id, status, visibility, brand,
           base_price_cents, compare_at_price_cents, cost_cents, currency, sku, weight_kg,
           tags, badges, meta_title, meta_description, schema_json, canonical_url, seo_keywords,
           warranty_text, return_policy, support_whatsapp, lead_time_days, area_restrictions, delivery_fee_overrides, cod_allowed, mpesa_only_over_threshold,
           created_at, updated_at
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
           COALESCE($9, 'draft'), COALESCE($10, 'public'), $11,
           $12, $13, $14, COALESCE($15,'KES'), $16, $17,
           COALESCE($18::text[], '{}'::text[]), COALESCE($19::text[], '{}'::text[]), $20, $21, COALESCE($22::jsonb,'{}'), $23, $24,
           $25, $26, $27, $28, COALESCE($29::jsonb,'{}'), COALESCE($30::jsonb,'{}'), COALESCE($31,true), COALESCE($32,false),
           now(), now()
         )
         RETURNING id, name, slug, status, base_price_cents, currency`,
        [
          tenantId,
          storeId,
          dto.name,
          dto.slug,
          dto.description || '',
          dto.shortDescription || null,
          dto.categoryId || null,
          primaryCategory,
          dto.status,
          dto.visibility,
          dto.brand,
          dto.basePriceCents,
          dto.compareAtPriceCents || null,
          dto.costCents || null,
          dto.currency || 'KES',
          dto.sku || null,
          dto.weightKg || null,
          tags as unknown as string[],
          badges as unknown as string[],
          dto.metaTitle || null,
          dto.metaDescription || null,
          dto.schemaJson || {},
          dto.canonicalUrl || null,
          dto.seoKeywords || null,
          dto.warrantyText || null,
          dto.returnPolicy || null,
          dto.supportWhatsapp || null,
          dto.leadTimeDays || null,
          dto.areaRestrictions || {},
          dto.deliveryFeeOverrides || {},
          dto.codAllowed,
          dto.mpesaOnlyOverThreshold
        ]
      );
      const product = res.rows[0];
      await this.syncProductCategories(client, tenantId, product.id, dto.categoryIds, primaryCategory);
      return product;
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
             short_description = COALESCE($3, short_description),
             category_id = COALESCE($4, category_id),
             primary_category_id = COALESCE($5, primary_category_id),
             status = COALESCE($6, status),
             visibility = COALESCE($7, visibility),
             brand = COALESCE($8, brand),
             base_price_cents = COALESCE($9, base_price_cents),
             compare_at_price_cents = COALESCE($10, compare_at_price_cents),
             cost_cents = COALESCE($11, cost_cents),
             currency = COALESCE($12, currency),
             sku = COALESCE($13, sku),
             weight_kg = COALESCE($14, weight_kg),
             tags = COALESCE($15::text[], tags),
             badges = COALESCE($16::text[], badges),
             meta_title = COALESCE($17, meta_title),
             meta_description = COALESCE($18, meta_description),
             schema_json = COALESCE($19::jsonb, schema_json),
             canonical_url = COALESCE($20, canonical_url),
             seo_keywords = COALESCE($21, seo_keywords),
             warranty_text = COALESCE($22, warranty_text),
             return_policy = COALESCE($23, return_policy),
             support_whatsapp = COALESCE($24, support_whatsapp),
             lead_time_days = COALESCE($25, lead_time_days),
             area_restrictions = COALESCE($26::jsonb, area_restrictions),
             delivery_fee_overrides = COALESCE($27::jsonb, delivery_fee_overrides),
             cod_allowed = COALESCE($28, cod_allowed),
             mpesa_only_over_threshold = COALESCE($29, mpesa_only_over_threshold),
             updated_at = now()
         WHERE id = $30 AND tenant_id = $31
         RETURNING id, name, slug, status, base_price_cents, currency`,
        [
          dto.name || null,
          dto.description || null,
          dto.shortDescription || null,
          dto.categoryId || null,
          dto.primaryCategoryId || null,
          dto.status || null,
          dto.visibility || null,
          dto.brand || null,
          dto.basePriceCents || null,
          dto.compareAtPriceCents || null,
          dto.costCents || null,
          dto.currency || null,
          dto.sku || null,
          dto.weightKg || null,
          Array.isArray(dto.tags)
            ? (dto.tags as unknown as string[])
            : dto.tags
            ? (String(dto.tags)
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean) as unknown as string[])
            : null,
          Array.isArray(dto.badges)
            ? (dto.badges as unknown as string[])
            : dto.badges
            ? (String(dto.badges)
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean) as unknown as string[])
            : null,
          dto.metaTitle || null,
          dto.metaDescription || null,
          dto.schemaJson || null,
          dto.canonicalUrl || null,
          dto.seoKeywords || null,
          dto.warrantyText || null,
          dto.returnPolicy || null,
          dto.supportWhatsapp || null,
          dto.leadTimeDays || null,
          dto.areaRestrictions || null,
          dto.deliveryFeeOverrides || null,
          dto.codAllowed,
          dto.mpesaOnlyOverThreshold,
          id,
          tenantId
        ]
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('Product not found');
      }
      if (dto.categoryIds) {
        await this.syncProductCategories(client, tenantId, id, dto.categoryIds, dto.primaryCategoryId || dto.categoryId);
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

  async deleteProduct(tenantId: string, id: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query('DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
      if (res.rows.length === 0) {
        throw new NotFoundException('Product not found');
      }
      return { deleted: true };
    } finally {
      client.release();
    }
  }

  async deleteCategory(tenantId: string, id: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query('DELETE FROM categories WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
      if (res.rows.length === 0) {
        throw new NotFoundException('Category not found');
      }
      return { deleted: true };
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

  async listImages(tenantId: string | undefined, productId: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `SELECT id, url, alt_text, position, is_primary FROM product_images WHERE product_id = $1 ORDER BY position ASC`,
        [productId]
      );
      return res.rows;
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

  private async syncProductCategories(
    client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
    tenantId: string,
    productId: string,
    categoryIds?: string[],
    primaryCategoryId?: string | null
  ) {
    if (!categoryIds && !primaryCategoryId) return;
    await client.query('DELETE FROM product_categories WHERE tenant_id = $1 AND product_id = $2', [tenantId, productId]);
    const uniqueIds = Array.from(new Set([...(categoryIds || []), ...(primaryCategoryId ? [primaryCategoryId] : [])]));
    for (const catId of uniqueIds) {
      if (!catId) continue;
      await client.query(
        `INSERT INTO product_categories (tenant_id, product_id, category_id, position, created_at)
         VALUES ($1, $2, $3, 0, now())
         ON CONFLICT (tenant_id, product_id, category_id) DO NOTHING`,
        [tenantId, productId, catId]
      );
    }
  }
}
