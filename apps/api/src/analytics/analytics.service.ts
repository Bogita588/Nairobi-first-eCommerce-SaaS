import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateEventDto } from './dto/event.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async logEvent(tenantId: string, dto: CreateEventDto) {
    const client = await this.db.getClient();
    try {
      await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant', tenantId]);
      await client.query(
        `INSERT INTO events (
           tenant_id, event_type, product_id, order_id, cart_id, session_id, channel, device, city_area, amount_cents, properties, occurred_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::jsonb,'{}'), now()
         )`,
        [
          tenantId,
          dto.eventType,
          dto.productId || null,
          dto.orderId || null,
          dto.cartId || null,
          dto.sessionId || null,
          dto.channel || 'web',
          dto.device || null,
          dto.cityArea || null,
          dto.amountCents || null,
          dto.properties || {}
        ]
      );
      return { status: 'ok' };
    } finally {
      client.release();
    }
  }

  async listEvents(tenantId: string, limit = 100) {
    const client = await this.db.getClient();
    try {
      await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant', tenantId]);
      const res = await client.query(
        `SELECT id, event_type, product_id, order_id, cart_id, channel, device, city_area, amount_cents, properties, occurred_at
         FROM events
         WHERE tenant_id = $1
         ORDER BY occurred_at DESC
         LIMIT $2`,
        [tenantId, Math.min(limit, 500)]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async summary(tenantId: string, days = 7) {
    const client = await this.db.getClient();
    try {
      await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant', tenantId]);
      const window = `${Math.max(days, 1)} days`;
      const counts = await client.query(
        `SELECT event_type, count(*) as count
         FROM events
         WHERE occurred_at >= now() - $2::interval
         GROUP BY event_type`,
        [tenantId, window]
      );
      const topProducts = await client.query(
        `SELECT p.id, p.name, coalesce(img.url,'') as main_image_url,
                sum(CASE WHEN e.event_type='product_view' THEN 1 ELSE 0 END) as views,
                sum(CASE WHEN e.event_type='add_to_cart' THEN 1 ELSE 0 END) as add_to_carts
         FROM events e
         JOIN products p ON p.id = e.product_id
         LEFT JOIN LATERAL (
           SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position, pi.created_at LIMIT 1
         ) img ON TRUE
         WHERE e.occurred_at >= now() - $2::interval
         GROUP BY p.id, p.name, img.url
         ORDER BY add_to_carts DESC NULLS LAST, views DESC NULLS LAST
         LIMIT 6`,
        [tenantId, window]
      );
      return {
        counts: counts.rows,
        topProducts: topProducts.rows
      };
    } finally {
      client.release();
    }
  }
}
