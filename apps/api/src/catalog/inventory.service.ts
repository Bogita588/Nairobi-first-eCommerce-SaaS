import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AdjustInventoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly db: DatabaseService) {}

  async adjust(tenantId: string, dto: AdjustInventoryDto) {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        'SELECT id, stock_quantity FROM product_variants WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [dto.variantId, tenantId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('Variant not found');
      }
      const currentQty = res.rows[0].stock_quantity || 0;
      const newQty = currentQty + dto.change;
      await client.query(
        'UPDATE product_variants SET stock_quantity = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3',
        [newQty, dto.variantId, tenantId]
      );
      await client.query(
        `INSERT INTO inventory_movements (id, tenant_id, product_id, variant_id, change, reason, reference_type, reference_id, note, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [tenantId, dto.productId, dto.variantId, dto.change, dto.reason, dto.referenceType || null, dto.referenceId || null, dto.note || null]
      );
      await client.query('COMMIT');
      return { variantId: dto.variantId, previous: currentQty, current: newQty };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
